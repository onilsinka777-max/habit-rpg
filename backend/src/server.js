const cors = require("cors");
const express = require("express");
const prisma = require("./prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { ensureDailyQuests } = require("./questGenerator");
const { computeAutoClass, CLASS_LABELS, CLASS_TITLES } = require("./mastery");
const { ensureWeeklyLegendaryQuest } = require("./legendaryWeekly");
const { getCoachAdvice } = require("./aiCoach");
const { NPCS, getNpc, getAvailableNpcs } = require("./npc");
const {
  BRANCHES, DIFFICULTIES, DIFFICULTY_REWARDS,
  getXpToNextLevel, getAchievements, getGoldMultiplier,
  getMasteryMultipliers, getEffectiveMasteryPath, startOfToday, endOfToday,
  DAILY_LOGIN_BONUS_GOLD, DAILY_LOGIN_BONUS_XP, applyXpGain,
  CLAN_UNLOCK_LEVEL, MASTERY_UNLOCK_LEVEL, MASTERY_PATHS,
  MASTERY_GRAPH, NODE_DIFFICULTY_REWARDS,
  REPEATABLE_SHOP_EFFECTS, getAvailableNodes, MAX_CUSTOM_QUESTS_PER_DAY,
} = require("./constants");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "super-secret-key";
const CLAN_BANNER_ICONS  = ["🏋️","📚","💡","⏰","🎯","🔥","🧠","📈","⏱️","🥇"];
const CLAN_BANNER_COLORS = ["#fb923c","#8d8cf8","#fb7878","#34d399","#38bdf8","#f5b637","#f472b6","#22d3ee"];
const CLAN_TAG_CHARS     = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

const CHEST_MILESTONES = {
  7:  { name:"Обычный сундук",     icon:"📦", gold:50,  xp:0   },
  14: { name:"Редкий сундук",      icon:"🎁", gold:100, xp:50  },
  21: { name:"Эпический сундук",   icon:"💜", gold:200, xp:100 },
  28: { name:"Легендарный сундук", icon:"🏆", gold:500, xp:200 },
};

function randomClanTag(n=6){let o="";for(let i=0;i<n;i++)o+=CLAN_TAG_CHARS[Math.floor(Math.random()*CLAN_TAG_CHARS.length)];return o;}
async function generateUniqueClanTag(){let t,e=true;while(e){t=randomClanTag();e=!!(await prisma.clan.findUnique({where:{tag:t}}));}return t;}
function getMasteryState(user){const raw=user.masteryChoices?JSON.parse(user.masteryChoices):{};return new Set(raw.completed||[]);}

const ACHIEVEMENT_META={
  first_quest:   {label:"Первый шаг",      desc:"Выполни первый квест",              icon:"🌟", xpReward:15},
  streak_3:      {label:"Тройная серия",   desc:"3 дня подряд",                      icon:"✨", xpReward:25},
  streak_7:      {label:"Огонь недели",    desc:"7 дней подряд",                     icon:"🔥", xpReward:75},
  streak_14:     {label:"Верный путь",     desc:"14 дней подряд",                    icon:"💎", xpReward:150},
  streak_30:     {label:"Хранитель",       desc:"30 дней подряд",                    icon:"⚡", xpReward:350},
  level_5:       {label:"Молодой боец",    desc:"Достигни 5 уровня",                 icon:"🗡️", xpReward:30},
  level_10:      {label:"Воин общины",     desc:"Достигни 10 уровня",                icon:"⚔️", xpReward:100},
  level_25:      {label:"Идущий по пути",  desc:"Достигни 25 уровня",                icon:"🗺️", xpReward:300},
  level_50:      {label:"Ветеран",         desc:"Достигни 50 уровня",                icon:"👑", xpReward:1000},
  quests_10:     {label:"Начало пути",     desc:"Выполни 10 квестов",                icon:"📜", xpReward:30},
  quests_50:     {label:"Пятидесятник",    desc:"Выполни 50 квестов",                icon:"🏅", xpReward:150},
  quests_100:    {label:"Сотня",           desc:"Выполни 100 квестов",               icon:"💯", xpReward:400},
  quests_250:    {label:"Легион",          desc:"Выполни 250 квестов",               icon:"🏆", xpReward:800},
  legendary_done:{label:"Легендарный",     desc:"Выполни первый легендарный квест",  icon:"⚔️", xpReward:200},
  all_branches:  {label:"Гармония",        desc:"Выполни 5 квестов в каждой ветке",  icon:"☯️", xpReward:120},
  chain_first:   {label:"Сила цепи",       desc:"Заверши шаг в цепочке квестов",     icon:"⛓️", xpReward:100},
  pomodoro_10:   {label:"Мастер фокуса",   desc:"Заверши 10 помодоро-сессий",        icon:"⏱️", xpReward:80},
  social_first:  {label:"Первый союзник",  desc:"Добавь первого друга",              icon:"🤝", xpReward:50},
};

function computeTitle(count){if(count>=4)return"Легенда";if(count>=1)return"Игрок";return"Новичок";}

function computePetState(pet,streak){
  const h=(Date.now()-new Date(pet.lastFed).getTime())/3600000;
  const hunger=Math.min(100,Math.round(h*4));
  const mood=Math.max(0,Math.min(100,pet.mood-Math.max(0,hunger-50)));
  const stage=streak>=30?"adult":streak>=14?"baby":"egg";
  return{...pet,hunger,mood,stage,canFeed:h>=1};
}

async function handlePostComplete(userId,streak,level,taskType){
  const completedCount=await prisma.task.count({where:{userId,completed:true}});
  const legendaryCount=await prisma.task.count({where:{userId,completed:true,type:"legendary"}});
  const branchCounts=await prisma.task.groupBy({by:["branch"],where:{userId,completed:true},_count:{id:true}});
  const allBranchDone=["discipline","fitness","self_development","knowledge"].every(b=>(branchCounts.find(x=>x.branch===b)?._count.id||0)>=5);
  const pomodoroCount=await prisma.task.count({where:{userId,completed:true,type:"pomodoro"}}).catch(()=>0);
  const existing=await prisma.achievement.findMany({where:{userId},select:{type:true}});
  const existingSet=new Set(existing.map(a=>a.type));
  const conditions={
    first_quest:completedCount>=1,
    streak_3:streak>=3,
    streak_7:streak>=7,
    streak_14:streak>=14,
    streak_30:streak>=30,
    level_5:level>=5,
    level_10:level>=10,
    level_25:level>=25,
    level_50:level>=50,
    quests_10:completedCount>=10,
    quests_50:completedCount>=50,
    quests_100:completedCount>=100,
    quests_250:completedCount>=250,
    legendary_done:legendaryCount>=1,
    all_branches:allBranchDone,
    pomodoro_10:pomodoroCount>=10,
  };
  const toGrant=Object.entries(conditions).filter(([t,v])=>v&&!existingSet.has(t)).map(([t])=>t);
  let newAchievements=[];
  if(toGrant.length>0){
    await prisma.achievement.createMany({data:toGrant.map(type=>({userId,type}))});
    const newTitle=computeTitle(existing.length+toGrant.length);
    const u=await prisma.user.findUnique({where:{id:userId}});
    // Grant XP for each achievement
    let bonusXp=0;
    for(const t of toGrant){bonusXp+=(ACHIEVEMENT_META[t]?.xpReward||0);}
    const updates={};
    if(u.title!==newTitle)updates.title=newTitle;
    if(bonusXp>0){const{xp,level:nl}=applyXpGain(u.xp,u.level,bonusXp);updates.xp=xp;updates.level=nl;}
    if(Object.keys(updates).length>0)await prisma.user.update({where:{id:userId},data:updates});
    newAchievements=toGrant.map(type=>({type,...ACHIEVEMENT_META[type]}));
  }
  let petCreated=false;
  if(streak>=7){const pet=await prisma.pet.findUnique({where:{userId}});if(!pet){await prisma.pet.create({data:{userId}});petCreated=true;}}
  return{newAchievements,petCreated};
}

app.get("/",async(req,res)=>{const u=await prisma.user.count();res.json({message:"SERVER WORKS",users:u});});

// ── AUTH ─────────────────────────────────────────────────────────────────────
app.post("/auth/register",async(req,res)=>{
  try{
    const{email,password}=req.body;
    if(await prisma.user.findUnique({where:{email}}))return res.status(400).json({message:"User already exists"});
    const user=await prisma.user.create({data:{email,password:await bcrypt.hash(password,10),gold:50}});
    // Welcome quest
    await prisma.task.create({data:{title:"Добро пожаловать, Герой!",description:"Выполни этот квест и получи стартовый бонус.",branch:"discipline",type:"custom",difficulty:"easy",xpReward:100,goldReward:50,expiresAt:new Date(Date.now()+7*24*60*60*1000),userId:user.id}}).catch(()=>{});
    res.status(201).json({id:user.id,email:user.email});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/auth/login",async(req,res)=>{
  try{
    const{email,password}=req.body;
    const user=await prisma.user.findUnique({where:{email}});
    if(!user||!(await bcrypt.compare(password,user.password)))return res.status(400).json({message:"Invalid credentials"});
    res.json({token:jwt.sign({userId:user.id},JWT_SECRET,{expiresIn:"7d"})});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

const authMiddleware=(req,res,next)=>{
  try{
    const h=req.headers.authorization;
    if(!h)return res.status(401).json({message:"No token"});
    const decoded=jwt.verify(h.split(" ")[1],JWT_SECRET);
    req.userId=decoded.userId;
    prisma.user.update({where:{id:req.userId},data:{lastActiveAt:new Date()}}).catch(()=>{});
    next();
  }catch(e){return res.status(401).json({message:"Invalid token"});}
};

// ── ME ───────────────────────────────────────────────────────────────────────
app.get("/me",authMiddleware,async(req,res)=>{
  let user=await prisma.user.findUnique({where:{id:req.userId}});
  const today=startOfToday();
  let dailyBonusJustClaimed=false;
  if(!user.lastLoginBonusDate||new Date(user.lastLoginBonusDate)<today){
    const{xp,level}=applyXpGain(user.xp,user.level,DAILY_LOGIN_BONUS_XP);
    user=await prisma.user.update({where:{id:req.userId},data:{xp,level,gold:{increment:DAILY_LOGIN_BONUS_GOLD},lastLoginBonusDate:new Date()}});
    dailyBonusJustClaimed=true;
  }
  const autoClass=await computeAutoClass(req.userId);
  const now=new Date();
  const mp=MASTERY_PATHS[user.masteryPath];
  const autoClassLabel=autoClass?CLASS_LABELS[autoClass]:null;
  res.json({
    id:user.id,email:user.email,
    name:user.name||user.email.split("@")[0],
    nameSet:user.nameSet||false,
    title:user.title||"Новичок",
    avatarStyle:user.avatarStyle||"default",
    avatarFrame:user.avatarFrame||"none",
    nicknameEffect:user.nicknameEffect||"none",
    level:user.level,xp:user.xp,xpToNextLevel:getXpToNextLevel(user.level),
    gold:user.gold,streak:user.streak,streakFreezeCount:user.streakFreezeCount,
    masteryPath:user.masteryPath,masteryNodeIndex:user.masteryNodeIndex,
    autoClass,autoClassLabel,effectiveMasteryPath:getEffectiveMasteryPath(user,autoClass),
    hasEverFinishedMastery:user.hasEverFinishedMastery,
    masteryStatusLabel:user.hasEverFinishedMastery&&mp?mp.statusLabel:null,
    masteryStatusChangesLeft:user.masteryStatusChangesLeft,
    xpBoostActive:!!(user.xpBoostExpiresAt&&new Date(user.xpBoostExpiresAt)>now),
    goldBoostActive:!!(user.goldBoostExpiresAt&&new Date(user.goldBoostExpiresAt)>now),
    xpBoostPermanent:user.xpBoostPermanent,goldBoostPermanent:user.goldBoostPermanent,
    achievements:getAchievements(user.level),
    dailyBonusJustClaimed,dailyBonusGold:DAILY_LOGIN_BONUS_GOLD,dailyBonusXp:DAILY_LOGIN_BONUS_XP,
    onboardingDone:user.onboardingDone||false,
    lastActiveQuestDate:user.lastActiveQuestDate||null,
    hiddenClass:user.hiddenClass||null,
    lastLoginAt:user.lastLoginAt||null,
    comboCount:user.comboCount||0,
  });
  // Update lastLoginAt
  await prisma.user.update({where:{id:req.userId},data:{lastLoginAt:now}}).catch(()=>{});
});

app.patch("/me",authMiddleware,async(req,res)=>{
  try{
    const{name}=req.body;
    if(typeof name!=="string"||!name.trim())return res.status(400).json({message:"Name is required"});
    if(name.trim().length>30)return res.status(400).json({message:"Name is too long"});
    const trimmed=name.trim();
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(user.nameSet)return res.status(403).json({message:"Имя уже установлено. Для смены купи «Свиток прошлого»"});
    const existing=await prisma.user.findUnique({where:{name:trimmed}});
    if(existing&&existing.id!==req.userId)return res.status(400).json({message:"Этот ник уже занят"});
    const updated=await prisma.user.update({where:{id:req.userId},data:{name:trimmed,nameSet:true}});
    res.json({id:updated.id,email:updated.email,name:updated.name});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/me/use-scroll",authMiddleware,async(req,res)=>{
  try{
    const{name}=req.body;
    if(!name||!name.trim())return res.status(400).json({message:"Имя не может быть пустым"});
    if(name.trim().length>30)return res.status(400).json({message:"Имя слишком длинное"});
    const trimmed=name.trim();
    const scrollItem=await prisma.shopItem.findFirst({where:{effect:"name_change_scroll"}});
    if(!scrollItem)return res.status(404).json({message:"Свиток не найден"});
    const purchase=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId:scrollItem.id}}});
    if(!purchase)return res.status(403).json({message:"У тебя нет свитка прошлого"});
    const existing=await prisma.user.findUnique({where:{name:trimmed}});
    if(existing&&existing.id!==req.userId)return res.status(400).json({message:"Этот ник уже занят"});
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{name:trimmed,nameSet:true}}),
      prisma.purchase.delete({where:{userId_itemId:{userId:req.userId,itemId:scrollItem.id}}}),
    ]);
    res.json({message:"Имя изменено",name:trimmed});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── MASTERY ──────────────────────────────────────────────────────────────────
app.get("/mastery/status",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const autoClass=await computeAutoClass(req.userId);
    if(user.level<MASTERY_UNLOCK_LEVEL)return res.json({locked:true,unlockLevel:MASTERY_UNLOCK_LEVEL,autoClass});
    const pathsList=Object.values(MASTERY_PATHS).map(p=>({id:p.id,label:p.label,icon:p.icon,color:p.color,description:p.description,bonusDescription:p.bonusDescription,totalNodes:p.totalNodes}));
    if(!user.masteryPath)return res.json({locked:false,chosen:false,autoClass,paths:pathsList,hasEverFinishedMastery:user.hasEverFinishedMastery});
    const completedSet=getMasteryState(user);
    const availableNodes=getAvailableNodes(user.masteryPath,completedSet);
    const isComplete=completedSet.has("legendary");
    const path=MASTERY_PATHS[user.masteryPath];
    const graph=MASTERY_GRAPH[user.masteryPath];
    res.json({
      locked:false,chosen:true,autoClass,
      hasEverFinishedMastery:user.hasEverFinishedMastery,
      masteryPath:user.masteryPath,
      completedNodes:[...completedSet],availableNodes,
      totalNodes:path.totalNodes,isComplete,
      statusChangesLeft:user.masteryStatusChangesLeft,paths:pathsList,
      path:path?{id:path.id,label:path.label,icon:path.icon,color:path.color,statusLabel:path.statusLabel,bonusDescription:path.bonusDescription,finaleTitle:path.finale?.title,finaleDesc:path.finale?.description}:null,
      nodeContent:Object.fromEntries(Object.entries(graph.nodes).map(([id,n])=>[id,{label:n.label,desc:n.desc,d:n.d,hidden:n.hidden||false}])),
    });
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/mastery/choose",authMiddleware,async(req,res)=>{
  try{
    const{pathId}=req.body;
    if(!MASTERY_PATHS[pathId])return res.status(400).json({message:"Invalid path"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(user.level<MASTERY_UNLOCK_LEVEL)return res.status(403).json({message:`Доступно с ${MASTERY_UNLOCK_LEVEL} уровня`});
    if(user.hasEverFinishedMastery&&user.masteryPath){
      if(user.masteryStatusChangesLeft<=0)return res.status(403).json({message:"Смена статуса недоступна — лимит исчерпан"});
      await prisma.user.update({where:{id:req.userId},data:{masteryPath:pathId,masteryNodeIndex:0,masteryChoices:JSON.stringify({completed:[]}),masteryStatusChangesLeft:{decrement:1},hasEverFinishedMastery:false}});
      return res.json({message:"Путь сменён"});
    }
    await prisma.user.update({where:{id:req.userId},data:{masteryPath:pathId,masteryNodeIndex:0,masteryChoices:JSON.stringify({completed:[]})}});
    res.json({message:"Путь выбран"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/mastery/complete-node",authMiddleware,async(req,res)=>{
  try{
    const{nodeId}=req.body;
    if(!nodeId)return res.status(400).json({message:"nodeId required"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user.masteryPath)return res.status(400).json({message:"Путь не выбран"});
    const completedSet=getMasteryState(user);
    if(completedSet.has("legendary"))return res.status(400).json({message:"Путь уже пройден"});
    const available=getAvailableNodes(user.masteryPath,completedSet);
    if(!available.includes(nodeId))return res.status(400).json({message:"Этот узел пока недоступен"});
    const graph=MASTERY_GRAPH[user.masteryPath];
    const nodeInfo=graph.nodes[nodeId];
    if(!nodeInfo)return res.status(400).json({message:"Узел не найден"});
    const rewards=NODE_DIFFICULTY_REWARDS[nodeInfo.d]||{xp:30,gold:15};
    const{xp,level}=applyXpGain(user.xp,user.level,rewards.xp);
    completedSet.add(nodeId);
    const newCompleted=[...completedSet];
    const justFinished=nodeId==="legendary";
    await prisma.user.update({where:{id:req.userId},data:{xp,level,gold:{increment:rewards.gold},masteryNodeIndex:newCompleted.length,masteryChoices:JSON.stringify({completed:newCompleted}),lastMasteryQuestDate:new Date(),...(justFinished?{hasEverFinishedMastery:true}:{})}});
    res.json({message:justFinished?"Путь завершён!":"Узел пройден",justFinished,leveledUp:level>user.level,newLevel:level,xpGained:rewards.xp,goldGained:rewards.gold,completedNodes:newCompleted});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── TASKS ────────────────────────────────────────────────────────────────────
app.post("/tasks",authMiddleware,async(req,res)=>{
  try{
    const{title,description,isWorldMapQuest}=req.body;
    if(!title||!title.trim())return res.status(400).json({message:"Title is required"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const today=startOfToday();
    const needsReset=!user.customQuestsResetDate||new Date(user.customQuestsResetDate)<today;
    const createdToday=needsReset?0:(user.customQuestsCreatedToday||0);
    if(!isWorldMapQuest&&createdToday>=MAX_CUSTOM_QUESTS_PER_DAY)return res.status(400).json({message:`Достигнут дневной лимит (${MAX_CUSTOM_QUESTS_PER_DAY}).`});
    const branch=isWorldMapQuest?"discipline":BRANCHES[createdToday%BRANCHES.length];
    const reward=DIFFICULTY_REWARDS.medium;
    const task=await prisma.task.create({data:{title:title.trim(),description:description?.trim()||null,branch,type:"custom",difficulty:"medium",xpReward:reward.xp,goldReward:reward.gold,expiresAt:endOfToday(),userId:req.userId,isWorldMapQuest:!!isWorldMapQuest}});
    if(!isWorldMapQuest)await prisma.user.update({where:{id:req.userId},data:{customQuestsCreatedToday:createdToday+1,...(needsReset?{customQuestsResetDate:new Date()}:{})}});
    res.status(201).json({...task,customQuestsCreatedToday:isWorldMapQuest?createdToday:createdToday+1});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/tasks",authMiddleware,async(req,res)=>{
  try{
    await ensureDailyQuests(req.userId);
    await ensureWeeklyLegendaryQuest(req.userId);
    const{branch}=req.query;
    const tasks=await prisma.task.findMany({where:{userId:req.userId,...(branch?{branch}:{})},orderBy:{createdAt:"desc"}});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const today=startOfToday();
    const needsReset=!user.customQuestsResetDate||new Date(user.customQuestsResetDate)<today;
    const createdToday=needsReset?0:(user.customQuestsCreatedToday||0);
    res.json({tasks,customQuestsCreatedToday:createdToday,customQuestsMax:MAX_CUSTOM_QUESTS_PER_DAY});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/tasks/:id/complete",authMiddleware,async(req,res)=>{
  try{
    const taskId=Number(req.params.id);
    const task=await prisma.task.findUnique({where:{id:taskId}});
    if(!task)return res.status(404).json({message:"Task not found"});
    if(task.userId!==req.userId)return res.status(403).json({message:"Forbidden"});
    if(task.completed)return res.status(400).json({message:"Already completed"});
    const updatedTask=await prisma.task.update({where:{id:taskId},data:{completed:true,completedAt:new Date()}});
    const cu=await prisma.user.findUnique({where:{id:req.userId}});
    const now=new Date();const today=startOfToday();
    const xpBActive=cu.xpBoostExpiresAt&&new Date(cu.xpBoostExpiresAt)>now;
    const gBActive=cu.goldBoostExpiresAt&&new Date(cu.goldBoostExpiresAt)>now;
    const xpM=(xpBActive?1.5:1)*(cu.xpBoostPermanent?1.25:1);
    const goldM=(gBActive?1.5:1)*(cu.goldBoostPermanent?1.25:1);
    const autoClass=cu.masteryPath?null:await computeAutoClass(req.userId);
    const mMult=getMasteryMultipliers(cu.masteryPath||autoClass,task.branch);
    // ── Combo system ─────────────────────────────────────────────────────────
    const COMBO_WINDOW_MS=30*60*1000;
    const lastQ=cu.lastQuestCompletedAt?new Date(cu.lastQuestCompletedAt):null;
    const withinWindow=lastQ&&(now-lastQ)<COMBO_WINDOW_MS;
    const newCombo=withinWindow?(cu.comboCount||0)+1:1;
    const comboMult=newCombo>=5?1.5:newCombo>=3?1.25:1;
    const{xp,level}=applyXpGain(cu.xp,cu.level,Math.round(task.xpReward*mMult.xp*xpM*comboMult));
    const goldGain=Math.round(task.goldReward*getGoldMultiplier()*mMult.gold*goldM);
    // ── Random drop (10%) ────────────────────────────────────────────────────
    let dropReward=null;
    if(Math.random()<0.1){
      const drops=[{type:"xp",amount:10},{type:"xp",amount:15},{type:"xp",amount:20},{type:"gold",amount:20},{type:"gold",amount:30}];
      dropReward=drops[Math.floor(Math.random()*drops.length)];
    }

    // ── Streak logic ──────────────────────────────────────────────────────────
    let freezeConsumed=false,streakJustCompleted=false,newStreak=cu.streak;
    let chestReward=null;
    const totalReq=await prisma.task.count({where:{userId:req.userId,isDaily:true,type:"required",expiresAt:{gte:today}}});
    const doneReq=await prisma.task.count({where:{userId:req.userId,isDaily:true,type:"required",expiresAt:{gte:today},completed:true}});
    const allDone=totalReq>0&&doneReq===totalReq;
    const streakToday=cu.streakUpdatedDate&&new Date(cu.streakUpdatedDate)>=today;
    if(allDone&&!streakToday){
      if(!cu.streakUpdatedDate){newStreak=1;}
      else{
        const last=new Date(cu.streakUpdatedDate);
        const lastM=new Date(last.getFullYear(),last.getMonth(),last.getDate());
        const diff=Math.floor((today-lastM)/86400000);
        if(diff===1)newStreak=cu.streak+1;
        else if(diff===2&&cu.streakFreezeCount>0){newStreak=cu.streak+1;freezeConsumed=true;}
        else newStreak=1;
      }
      streakJustCompleted=true;

      // ── Check chest milestones ─────────────────────────────────────────────
      const chestThresholds=[7,14,21,28,35,42,49,56,63,70];
      for(const threshold of chestThresholds){
        if(newStreak>=threshold&&(cu.lastChestStreak||0)<threshold){
          const chest=CHEST_MILESTONES[threshold%28===0?28:threshold<=7?7:threshold<=14?14:threshold<=21?21:28]||CHEST_MILESTONES[7];
          chestReward={...chest,threshold};
          const{xp:cxp,level:clevel}=applyXpGain(xp,level,chest.xp);
          await prisma.user.update({where:{id:req.userId},data:{xp:cxp,level:clevel,gold:{increment:chest.gold+goldGain},streak:newStreak,streakUpdatedDate:now,lastChestStreak:threshold,lastActiveQuestDate:now,comboCount:newCombo,lastQuestCompletedAt:now,...(freezeConsumed?{streakFreezeCount:{decrement:1}}:{})}});
          await prisma.userLeague.upsert({where:{userId:req.userId},create:{userId:req.userId,weeklyXp:Math.round(task.xpReward*xpM)},update:{weeklyXp:{increment:Math.round(task.xpReward*xpM)}}}).catch(()=>{});
          const{newAchievements:na,petCreated:pc}=await handlePostComplete(req.userId,newStreak,clevel);
          return res.json({...updatedTask,freezeConsumed,streakJustCompleted,newStreak,chestReward,newAchievements:na,petCreated:pc,dropReward,combo:newCombo,comboBonus:comboMult>1?Math.round((comboMult-1)*100):0});
        }
      }
    }

    // First quest of the day bonus
    let firstQuestBonus=0;
    const alreadyGotFirstBonus=cu.firstQuestBonusDate&&new Date(cu.firstQuestBonusDate)>=today;
    if(!alreadyGotFirstBonus){firstQuestBonus=5;}
    // Apply random drop
    let dropXp=0,dropGold=0;
    if(dropReward){if(dropReward.type==="xp")dropXp=dropReward.amount;else dropGold=dropReward.amount;}
    const{xp:finalXp,level:finalLevel}=dropXp>0?applyXpGain(xp,level,dropXp):{xp,level};
    await prisma.user.update({where:{id:req.userId},data:{xp:finalXp,level:finalLevel,gold:{increment:goldGain+firstQuestBonus+dropGold},lastActiveQuestDate:now,comboCount:newCombo,lastQuestCompletedAt:now,...(streakJustCompleted?{streak:newStreak,streakUpdatedDate:now}:{}),...(freezeConsumed?{streakFreezeCount:{decrement:1}}:{}),...(!alreadyGotFirstBonus?{firstQuestBonusDate:now}:{})}});
    // Update league weekly XP
    await prisma.userLeague.upsert({where:{userId:req.userId},create:{userId:req.userId,weeklyXp:Math.round(task.xpReward*xpM)},update:{weeklyXp:{increment:Math.round(task.xpReward*xpM)}}}).catch(()=>{});
    const finalStreak=streakJustCompleted?newStreak:cu.streak;
    const{newAchievements,petCreated}=await handlePostComplete(req.userId,finalStreak,finalLevel);
    // Check easter eggs
    const hour=new Date().getHours();
    if(hour>=2&&hour<4)checkEasterEgg(req.userId,"night_owl");
    if(hour<6)checkEasterEgg(req.userId,"early_bird");
    const todayCount=await prisma.task.count({where:{userId:req.userId,completed:true,completedAt:{gte:startOfToday()}}});
    if(todayCount>=10)checkEasterEgg(req.userId,"perfectionist");
    res.json({...updatedTask,freezeConsumed,streakJustCompleted,newStreak:streakJustCompleted?newStreak:undefined,chestReward,newAchievements,petCreated,dropReward,combo:newCombo,comboBonus:comboMult>1?Math.round((comboMult-1)*100):0});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.delete("/tasks/:id",authMiddleware,async(req,res)=>{
  try{
    const taskId=Number(req.params.id);
    const task=await prisma.task.findUnique({where:{id:taskId}});
    if(!task)return res.status(404).json({message:"Task not found"});
    if(task.userId!==req.userId)return res.status(403).json({message:"Forbidden"});
    await prisma.task.delete({where:{id:taskId}});
    res.json({message:"Task deleted"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── SHOP ─────────────────────────────────────────────────────────────────────
app.get("/shop",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const items=await prisma.shopItem.findMany({where:{active:true},orderBy:{price:"asc"}});
    const purchases=await prisma.purchase.findMany({where:{userId:req.userId},select:{itemId:true}});
    const pIds=new Set(purchases.map(p=>p.itemId));
    res.json(items.map(item=>({...item,purchased:pIds.has(item.id),repeatable:REPEATABLE_SHOP_EFFECTS.includes(item.effect),locked:item.category!=="boost"&&item.effect!=="name_change_scroll"&&!user.hasEverFinishedMastery})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/shop/:id/purchase",authMiddleware,async(req,res)=>{
  try{
    const itemId=Number(req.params.id);
    const item=await prisma.shopItem.findUnique({where:{id:itemId}});
    if(!item||!item.active)return res.status(404).json({message:"Item not found"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(item.category!=="boost"&&item.effect!=="name_change_scroll"&&!user.hasEverFinishedMastery)return res.status(403).json({message:"Доступно после завершения пути Мастерства"});
    if(user.gold<item.price)return res.status(400).json({message:"Not enough gold"});
    // Usable items go to library first
    const USABLE_EFFECTS=["streak_freeze","xp_boost_24h","gold_boost_24h","name_change_scroll","xp_card_small","xp_card_medium","xp_card_large"];
    if(USABLE_EFFECTS.includes(item.effect)){
      const existingU=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId}}});
      if(existingU)return res.status(400).json({message:"Already in library"});
      await prisma.$transaction([
        prisma.user.update({where:{id:req.userId},data:{gold:{decrement:item.price}}}),
        prisma.purchase.create({data:{userId:req.userId,itemId}}),
      ]);
      return res.status(201).json({message:"Purchased",addedToLibrary:true});
    }
    const existing=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId}}});
    if(existing)return res.status(400).json({message:"Already purchased"});
    const extraData={};
    if(item.effect==="xp_boost_permanent")extraData.xpBoostPermanent=true;
    if(item.effect==="gold_boost_permanent")extraData.goldBoostPermanent=true;
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{gold:{decrement:item.price},...extraData}}),
      prisma.purchase.create({data:{userId:req.userId,itemId}}),
    ]);
    res.status(201).json({message:"Purchased",item});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/shop/library",authMiddleware,async(req,res)=>{
  try{
    const p=await prisma.purchase.findMany({where:{userId:req.userId},include:{item:true},orderBy:{purchasedAt:"desc"}});
    res.json(p.map(x=>({...x.item,purchasedAt:x.purchasedAt})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── JOURNAL ──────────────────────────────────────────────────────────────────
app.get("/journal",authMiddleware,async(req,res)=>{
  try{const entries=await prisma.journalEntry.findMany({where:{userId:req.userId},orderBy:{createdAt:"desc"}});res.json(entries);}
  catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.post("/journal",authMiddleware,async(req,res)=>{
  try{
    const{content}=req.body;
    if(!content||!content.trim())return res.status(400).json({message:"Запись не может быть пустой"});
    if(content.length>5000)return res.status(400).json({message:"Запись слишком длинная"});
    const entry=await prisma.journalEntry.create({data:{content:content.trim(),userId:req.userId}});
    // Daily journal bonus: +5 gold
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{lastJournalBonusDate:true}});
    const today=startOfToday();
    const gotBonus=user.lastJournalBonusDate&&new Date(user.lastJournalBonusDate)>=today;
    let goldBonus=0;
    if(!gotBonus){goldBonus=5;await prisma.user.update({where:{id:req.userId},data:{gold:{increment:5},lastJournalBonusDate:new Date()}});}
    res.status(201).json({...entry,goldBonus});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── GOALS ────────────────────────────────────────────────────────────────────
app.get("/goals",authMiddleware,async(req,res)=>{
  try{const goals=await prisma.goal.findMany({where:{userId:req.userId},orderBy:{createdAt:"desc"}});res.json(goals);}
  catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.post("/goals",authMiddleware,async(req,res)=>{
  try{
    const{title,description,targetDate}=req.body;
    if(!title||!title.trim())return res.status(400).json({message:"Название цели обязательно"});
    const goal=await prisma.goal.create({data:{title:title.trim(),description:description?.trim()||null,targetDate:targetDate?new Date(targetDate):null,userId:req.userId}});
    // Daily goal bonus: +20 gold
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{lastGoalBonusDate:true}});
    const today=startOfToday();
    const gotBonus=user.lastGoalBonusDate&&new Date(user.lastGoalBonusDate)>=today;
    let goldBonus=0;
    if(!gotBonus){goldBonus=20;await prisma.user.update({where:{id:req.userId},data:{gold:{increment:20},lastGoalBonusDate:new Date()}});}
    res.status(201).json({...goal,goldBonus});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.patch("/goals/:id",authMiddleware,async(req,res)=>{
  try{
    const goalId=Number(req.params.id);
    const goal=await prisma.goal.findUnique({where:{id:goalId}});
    if(!goal||goal.userId!==req.userId)return res.status(404).json({message:"Цель не найдена"});
    const{completed,title,description,targetDate}=req.body;
    const updated=await prisma.goal.update({where:{id:goalId},data:{...(completed!==undefined?{completed}:{}),...(title?{title:title.trim()}:{}),...(description!==undefined?{description:description?.trim()||null}:{}),...(targetDate!==undefined?{targetDate:targetDate?new Date(targetDate):null}:{})}});
    res.json(updated);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.delete("/goals/:id",authMiddleware,async(req,res)=>{
  try{
    const goalId=Number(req.params.id);
    const goal=await prisma.goal.findUnique({where:{id:goalId}});
    if(!goal||goal.userId!==req.userId)return res.status(404).json({message:"Цель не найдена"});
    await prisma.goal.delete({where:{id:goalId}});
    res.json({message:"Удалено"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── CLANS ────────────────────────────────────────────────────────────────────
app.get("/clans/leaderboard",authMiddleware,async(req,res)=>{
  try{
    const groups=await prisma.user.groupBy({by:["clanId"],where:{clanId:{not:null}},_avg:{xp:true},_count:{id:true}});
    const clans=await prisma.clan.findMany({where:{id:{in:groups.map(g=>g.clanId)}}});
    const cm=new Map(clans.map(c=>[c.id,c]));
    res.json(groups.map(g=>{const c=cm.get(g.clanId);if(!c)return null;return{id:c.id,name:c.name,tag:c.tag,bannerIcon:c.bannerIcon,bannerColor:c.bannerColor,memberCount:g._count.id,avgXp:Math.round(g._avg.xp||0)};}).filter(Boolean).sort((a,b)=>b.avgXp-a.avgXp).slice(0,20));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.get("/clans",authMiddleware,async(req,res)=>{
  try{const clans=await prisma.clan.findMany({include:{_count:{select:{members:true}}},orderBy:{createdAt:"desc"}});res.json(clans.map(c=>({id:c.id,name:c.name,tag:c.tag,description:c.description,bannerIcon:c.bannerIcon,bannerColor:c.bannerColor,memberCount:c._count.members})));}
  catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.post("/clans",authMiddleware,async(req,res)=>{
  try{
    const actor=await prisma.user.findUnique({where:{id:req.userId}});
    if(actor.level<CLAN_UNLOCK_LEVEL)return res.status(403).json({message:`Кланы доступны с ${CLAN_UNLOCK_LEVEL} уровня`});
    const{name,description,bannerIcon,bannerColor}=req.body;
    if(!name?.trim())return res.status(400).json({message:"Name is required"});
    if(await prisma.clan.findUnique({where:{name:name.trim()}}))return res.status(400).json({message:"Clan with this name already exists"});
    const clan=await prisma.clan.create({data:{name:name.trim(),description:description?.trim()||null,tag:await generateUniqueClanTag(),bannerIcon:CLAN_BANNER_ICONS.includes(bannerIcon)?bannerIcon:CLAN_BANNER_ICONS[0],bannerColor:CLAN_BANNER_COLORS.includes(bannerColor)?bannerColor:CLAN_BANNER_COLORS[0]}});
    await prisma.user.update({where:{id:req.userId},data:{clanId:clan.id,clanRole:"leader"}});
    res.status(201).json(clan);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.post("/clans/:id/join",authMiddleware,async(req,res)=>{
  try{
    const actor=await prisma.user.findUnique({where:{id:req.userId}});
    if(actor.level<CLAN_UNLOCK_LEVEL)return res.status(403).json({message:`Кланы доступны с ${CLAN_UNLOCK_LEVEL} уровня`});
    const clan=await prisma.clan.findUnique({where:{id:Number(req.params.id)}});
    if(!clan)return res.status(404).json({message:"Clan not found"});
    await prisma.user.update({where:{id:req.userId},data:{clanId:clan.id,clanRole:"member"}});
    res.json({message:"Joined"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.post("/clans/leave",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user.clanId)return res.status(400).json({message:"Not in a clan"});
    const clanId=user.clanId;
    if(user.clanRole==="leader"){
      const others=await prisma.user.findMany({where:{clanId,id:{not:req.userId}},orderBy:{id:"asc"}});
      if(others.length===0){await prisma.user.update({where:{id:req.userId},data:{clanId:null,clanRole:null}});await prisma.clanMessage.deleteMany({where:{clanId}});await prisma.clan.delete({where:{id:clanId}});return res.json({message:"Left clan"});}
      const s=others.find(m=>m.clanRole==="co_leader")||others[0];
      await prisma.user.update({where:{id:s.id},data:{clanRole:"leader"}});
    }
    await prisma.user.update({where:{id:req.userId},data:{clanId:null,clanRole:null}});
    res.json({message:"Left clan"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.get("/clans/me",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user.clanId)return res.json({clan:null,members:[],myRole:null});
    const clan=await prisma.clan.findUnique({where:{id:user.clanId}});
    const members=await prisma.user.findMany({where:{clanId:user.clanId},orderBy:[{level:"desc"},{xp:"desc"}],select:{id:true,email:true,name:true,level:true,xp:true,gold:true,streak:true,clanRole:true,lastActiveAt:true}});
    const now=Date.now();
    res.json({clan,myRole:user.clanRole,members:members.map(m=>({...m,name:m.name||m.email.split("@")[0],isOnline:m.lastActiveAt?now-new Date(m.lastActiveAt).getTime()<ONLINE_THRESHOLD_MS:false}))});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.patch("/clans/members/:userId/role",authMiddleware,async(req,res)=>{
  try{
    const targetId=Number(req.params.userId);const{role}=req.body;
    if(!["co_leader","member"].includes(role))return res.status(400).json({message:"Invalid role"});
    const actor=await prisma.user.findUnique({where:{id:req.userId}});
    if(actor.clanRole!=="leader")return res.status(403).json({message:"Только лидер может менять роли"});
    const target=await prisma.user.findUnique({where:{id:targetId}});
    if(!target||target.clanId!==actor.clanId)return res.status(404).json({message:"Участник не найден"});
    if(target.clanRole==="leader")return res.status(400).json({message:"Нельзя изменить роль лидера"});
    await prisma.user.update({where:{id:targetId},data:{clanRole:role}});
    res.json({message:"Updated"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.delete("/clans/members/:userId",authMiddleware,async(req,res)=>{
  try{
    const targetId=Number(req.params.userId);
    if(targetId===req.userId)return res.status(400).json({message:"Используй кнопку «Покинуть клан»"});
    const actor=await prisma.user.findUnique({where:{id:req.userId}});
    if(!["leader","co_leader"].includes(actor.clanRole))return res.status(403).json({message:"Недостаточно прав"});
    const target=await prisma.user.findUnique({where:{id:targetId}});
    if(!target||target.clanId!==actor.clanId)return res.status(404).json({message:"Участник не найден"});
    if(target.clanRole==="leader")return res.status(400).json({message:"Нельзя исключить лидера"});
    if(actor.clanRole==="co_leader"&&target.clanRole==="co_leader")return res.status(403).json({message:"Соруководитель не может исключить другого соруководителя"});
    await prisma.user.update({where:{id:targetId},data:{clanId:null,clanRole:null}});
    res.json({message:"Kicked"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.get("/clans/me/messages",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user.clanId)return res.status(400).json({message:"Not in a clan"});
    const msgs=await prisma.clanMessage.findMany({where:{clanId:user.clanId},orderBy:{createdAt:"desc"},take:50,include:{user:{select:{name:true,email:true}}}});
    res.json(msgs.reverse().map(m=>({id:m.id,text:m.text,createdAt:m.createdAt,author:m.user.name||m.user.email.split("@")[0],userId:m.userId})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.post("/clans/me/messages",authMiddleware,async(req,res)=>{
  try{
    const{text}=req.body;
    if(!text?.trim())return res.status(400).json({message:"Message is empty"});
    if(text.length>500)return res.status(400).json({message:"Message is too long"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user.clanId)return res.status(400).json({message:"Not in a clan"});
    const msg=await prisma.clanMessage.create({data:{text:text.trim(),clanId:user.clanId,userId:req.userId}});
    res.status(201).json(msg);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── FRIENDS ──────────────────────────────────────────────────────────────────
app.get("/friends",authMiddleware,async(req,res)=>{
  try{
    const fs=await prisma.friendship.findMany({where:{userId:req.userId},include:{friend:{select:{id:true,email:true,name:true,level:true,gold:true,streak:true,lastActiveAt:true,clan:{select:{name:true}}}}}});
    const now=Date.now();
    res.json(fs.map(f=>({id:f.friend.id,name:f.friend.name||f.friend.email.split("@")[0],level:f.friend.level,gold:f.friend.gold,streak:f.friend.streak,clanName:f.friend.clan?.name||null,isOnline:!!(f.friend.lastActiveAt&&now-new Date(f.friend.lastActiveAt).getTime()<ONLINE_THRESHOLD_MS)})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/online-count",authMiddleware,async(req,res)=>{
  try{
    const threshold=new Date(Date.now()-ONLINE_THRESHOLD_MS);
    const count=await prisma.user.count({where:{lastActiveAt:{gte:threshold}}});
    res.json({count});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// Send friend request
app.post("/friends/request",authMiddleware,async(req,res)=>{
  try{
    const{name}=req.body;
    if(!name?.trim())return res.status(400).json({message:"Укажи ник"});
    const target=await prisma.user.findUnique({where:{name:name.trim()}});
    if(!target)return res.status(404).json({message:"Пользователь с таким ником не найден"});
    if(target.id===req.userId)return res.status(400).json({message:"Нельзя добавить себя"});
    const alreadyFriends=await prisma.friendship.findUnique({where:{userId_friendId:{userId:req.userId,friendId:target.id}}});
    if(alreadyFriends)return res.status(400).json({message:"Уже в друзьях"});
    const existing=await prisma.friendRequest.findUnique({where:{fromUserId_toUserId:{fromUserId:req.userId,toUserId:target.id}}});
    if(existing)return res.status(400).json({message:"Заявка уже отправлена"});
    const reverse=await prisma.friendRequest.findUnique({where:{fromUserId_toUserId:{fromUserId:target.id,toUserId:req.userId}}});
    if(reverse){
      // Auto-accept if reverse request exists
      await prisma.$transaction([
        prisma.friendship.create({data:{userId:req.userId,friendId:target.id}}),
        prisma.friendship.create({data:{userId:target.id,friendId:req.userId}}),
        prisma.friendRequest.delete({where:{fromUserId_toUserId:{fromUserId:target.id,toUserId:req.userId}}}),
      ]);
      return res.status(201).json({message:"Заявка принята — вы теперь друзья!"});
    }
    await prisma.friendRequest.create({data:{fromUserId:req.userId,toUserId:target.id}});
    res.status(201).json({message:"Заявка отправлена"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// Get incoming friend requests
app.get("/friends/requests",authMiddleware,async(req,res)=>{
  try{
    const requests=await prisma.friendRequest.findMany({where:{toUserId:req.userId},include:{fromUser:{select:{id:true,name:true,email:true,level:true}}},orderBy:{createdAt:"desc"}});
    res.json(requests.map(r=>({id:r.id,fromUserId:r.fromUserId,name:r.fromUser.name||r.fromUser.email.split("@")[0],level:r.fromUser.level,createdAt:r.createdAt})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// Accept friend request
app.post("/friends/requests/:id/accept",authMiddleware,async(req,res)=>{
  try{
    const reqId=Number(req.params.id);
    const friendReq=await prisma.friendRequest.findUnique({where:{id:reqId}});
    if(!friendReq||friendReq.toUserId!==req.userId)return res.status(404).json({message:"Заявка не найдена"});
    await prisma.$transaction([
      prisma.friendship.create({data:{userId:req.userId,friendId:friendReq.fromUserId}}),
      prisma.friendship.create({data:{userId:friendReq.fromUserId,friendId:req.userId}}),
      prisma.friendRequest.delete({where:{id:reqId}}),
    ]);
    res.json({message:"Заявка принята"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// Decline friend request
app.delete("/friends/requests/:id",authMiddleware,async(req,res)=>{
  try{
    const reqId=Number(req.params.id);
    const friendReq=await prisma.friendRequest.findUnique({where:{id:reqId}});
    if(!friendReq||friendReq.toUserId!==req.userId)return res.status(404).json({message:"Заявка не найдена"});
    await prisma.friendRequest.delete({where:{id:reqId}});
    res.json({message:"Заявка отклонена"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.delete("/friends/:id",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.id);
    await prisma.$transaction([
      prisma.friendship.deleteMany({where:{userId:req.userId,friendId}}),
      prisma.friendship.deleteMany({where:{userId:friendId,friendId:req.userId}}),
    ]);
    res.json({message:"Удалено"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── PET ──────────────────────────────────────────────────────────────────────
app.get("/pet",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(user.streak<7)return res.json({pet:null,unlockStreak:7,currentStreak:user.streak});
    let pet=await prisma.pet.findUnique({where:{userId:req.userId}});
    if(!pet)pet=await prisma.pet.create({data:{userId:req.userId}});
    res.json({pet:computePetState(pet,user.streak)});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/pet/feed",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const pet=await prisma.pet.findUnique({where:{userId:req.userId}});
    if(!pet)return res.status(404).json({message:"Питомец не найден"});
    const h=(Date.now()-new Date(pet.lastFed).getTime())/3600000;
    if(h<1){const min=Math.ceil((1-h)*60);return res.status(400).json({message:`Рано кормить — подожди ещё ${min} мин.`,nextFeedIn:min});}
    const newMood=Math.min(100,pet.mood+30);
    const updated=await prisma.pet.update({where:{userId:req.userId},data:{lastFed:new Date(),mood:newMood}});
    res.json({pet:computePetState(updated,user.streak),message:"Питомец покормлен!"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/pet/name",authMiddleware,async(req,res)=>{
  try{
    const{name}=req.body;
    if(!name?.trim()||name.trim().length>20)return res.status(400).json({message:"Имя от 1 до 20 символов"});
    const updated=await prisma.pet.update({where:{userId:req.userId},data:{name:name.trim()}});
    res.json({name:updated.name});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── ACHIEVEMENTS ─────────────────────────────────────────────────────────────
app.get("/achievements",authMiddleware,async(req,res)=>{
  try{
    const unlocked=await prisma.achievement.findMany({where:{userId:req.userId},orderBy:{unlockedAt:"asc"}});
    const unlockedSet=new Set(unlocked.map(a=>a.type));
    const all=Object.entries(ACHIEVEMENT_META).map(([type,meta])=>({
      type,...meta,
      unlocked:unlockedSet.has(type),
      unlockedAt:unlocked.find(a=>a.type===type)?.unlockedAt||null,
    }));
    res.json(all);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── STATS ────────────────────────────────────────────────────────────────────
app.get("/stats",authMiddleware,async(req,res)=>{
  try{
    const ago=new Date();ago.setDate(ago.getDate()-30);
    const tasks=await prisma.task.findMany({
      where:{userId:req.userId,completed:true,completedAt:{gte:ago}},
      select:{completedAt:true,branch:true,xpReward:true,goldReward:true},
    });
    const byDay={};
    for(const t of tasks){
      const d=new Date(t.completedAt);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if(!byDay[key])byDay[key]={date:key,total:0,xp:0,gold:0,discipline:0,fitness:0,knowledge:0,self_development:0};
      byDay[key].total++;byDay[key].xp+=t.xpReward;byDay[key].gold+=t.goldReward;
      if(byDay[key][t.branch]!==undefined)byDay[key][t.branch]++;
    }
    const days=[];
    for(let i=29;i>=0;i--){
      const d=new Date();d.setDate(d.getDate()-i);
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      days.push(byDay[key]||{date:key,total:0,xp:0,gold:0,discipline:0,fitness:0,knowledge:0,self_development:0});
    }
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{xp:true,level:true,streak:true,gold:true}});
    const totalCompleted=await prisma.task.count({where:{userId:req.userId,completed:true}});
    res.json({days,totalCompleted,currentStreak:user.streak,totalXp:user.xp,level:user.level});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── DIRECT MESSAGES ──────────────────────────────────────────────────────────
app.get("/messages/:friendId",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.friendId);
    const msgs=await prisma.directMessage.findMany({
      where:{OR:[{fromUserId:req.userId,toUserId:friendId},{fromUserId:friendId,toUserId:req.userId}]},
      orderBy:{createdAt:"asc"},take:100,
      include:{fromUser:{select:{name:true,email:true}}},
    });
    await prisma.directMessage.updateMany({where:{fromUserId:friendId,toUserId:req.userId,read:false},data:{read:true}});
    res.json(msgs.map(m=>({id:m.id,text:m.text,createdAt:m.createdAt,read:m.read,fromMe:m.fromUserId===req.userId,authorName:m.fromUser.name||m.fromUser.email.split("@")[0]})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/messages/:friendId",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.friendId);
    const{text}=req.body;
    if(!text?.trim())return res.status(400).json({message:"Сообщение пустое"});
    if(text.length>1000)return res.status(400).json({message:"Сообщение слишком длинное"});
    const friendship=await prisma.friendship.findUnique({where:{userId_friendId:{userId:req.userId,friendId}}});
    if(!friendship)return res.status(403).json({message:"Вы не друзья"});
    const msg=await prisma.directMessage.create({
      data:{fromUserId:req.userId,toUserId:friendId,text:text.trim()},
      include:{fromUser:{select:{name:true,email:true}}},
    });
    res.status(201).json({id:msg.id,text:msg.text,createdAt:msg.createdAt,read:false,fromMe:true,authorName:msg.fromUser.name||msg.fromUser.email.split("@")[0]});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── POMODORO ─────────────────────────────────────────────────────────────────
app.post("/tasks/pomodoro-complete",authMiddleware,async(req,res)=>{
  try{
    const XP=15;
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const{xp,level}=applyXpGain(user.xp,user.level,XP);
    const today=startOfToday();
    const gotGoldBonus=user.lastPomodoroBonusDate&&new Date(user.lastPomodoroBonusDate)>=today;
    const goldBonus=gotGoldBonus?0:15;
    await prisma.user.update({where:{id:req.userId},data:{xp,level,...(goldBonus>0?{gold:{increment:goldBonus},lastPomodoroBonusDate:new Date()}:{})}});
    res.json({xpGained:XP,goldBonus,newXp:xp,newLevel:level,leveledUp:level>user.level});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── SEASON ───────────────────────────────────────────────────────────────────
app.get("/season/current",authMiddleware,async(req,res)=>{
  try{
    const season=await prisma.season.findFirst({where:{active:true}});
    if(!season)return res.json({season:null});
    const progress=await prisma.seasonProgress.findUnique({where:{userId_seasonId:{userId:req.userId,seasonId:season.id}}});
    const xp=progress?.xp||0;
    const rank=xp>=5000?"Легенда":xp>=2000?"Платина":xp>=800?"Золото":xp>=250?"Серебро":"Бронза";
    const next={Бронза:250,Серебро:800,Золото:2000,Платина:5000,Легенда:9999};
    res.json({season,progress:{xp,questsCompleted:progress?.questsCompleted||0,rank,nextRankXp:next[rank]}});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/season/leaderboard",authMiddleware,async(req,res)=>{
  try{
    const season=await prisma.season.findFirst({where:{active:true}});
    if(!season)return res.json([]);
    const rows=await prisma.seasonProgress.findMany({
      where:{seasonId:season.id},orderBy:{xp:"desc"},take:20,
      include:{user:{select:{name:true,email:true,level:true}}},
    });
    res.json(rows.map((r,i)=>({rank:i+1,name:r.user.name||r.user.email.split("@")[0],level:r.user.level,xp:r.xp,questsCompleted:r.questsCompleted})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── QUEST CHAINS ─────────────────────────────────────────────────────────────
app.get("/chains",authMiddleware,async(req,res)=>{
  try{
    const chains=await prisma.questChain.findMany({where:{active:true}});
    res.json(chains.map(c=>({...c,steps:JSON.parse(c.steps)})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/chains/my",authMiddleware,async(req,res)=>{
  try{
    const progress=await prisma.questChainProgress.findMany({
      where:{userId:req.userId},include:{chain:true},
    });
    res.json(progress.map(p=>({...p,chain:{...p.chain,steps:JSON.parse(p.chain.steps)}})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/chains/:id/start",authMiddleware,async(req,res)=>{
  try{
    const chainId=Number(req.params.id);
    const chain=await prisma.questChain.findUnique({where:{id:chainId}});
    if(!chain)return res.status(404).json({message:"Цепочка не найдена"});
    const existing=await prisma.questChainProgress.findUnique({where:{userId_chainId:{userId:req.userId,chainId}}});
    if(existing)return res.status(400).json({message:"Цепочка уже начата"});
    const progress=await prisma.questChainProgress.create({data:{userId:req.userId,chainId}});
    res.status(201).json(progress);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/chains/:id/complete-step",authMiddleware,async(req,res)=>{
  try{
    const chainId=Number(req.params.id);
    const progress=await prisma.questChainProgress.findUnique({where:{userId_chainId:{userId:req.userId,chainId}}});
    if(!progress)return res.status(400).json({message:"Цепочка не начата"});
    if(progress.completed)return res.status(400).json({message:"Цепочка уже завершена"});
    const chain=await prisma.questChain.findUnique({where:{id:chainId}});
    const stepIdx=progress.currentStep;
    // ── Server-side step requirement verification ─────────────────────────────
    if(chain.stepReqs){
      const reqs=JSON.parse(chain.stepReqs);
      const req_=reqs[stepIdx];
      if(req_){
        const user=await prisma.user.findUnique({where:{id:req.userId},select:{streak:true}});
        if(req_.type==="quests_completed"){
          const count=await prisma.task.count({where:{userId:req.userId,completed:true,branch:req_.branch||undefined}});
          if(count<req_.count)return res.status(400).json({message:`Нужно выполнить ${req_.count} квестов${req_.branch?" в ветке "+req_.branch:""}. Выполнено: ${count}`});
        }else if(req_.type==="streak"){
          if(user.streak<req_.count)return res.status(400).json({message:`Нужна серия ${req_.count}+ дней. Текущая: ${user.streak}`});
        }else if(req_.type==="journal_entries"){
          const count=await prisma.journalEntry.count({where:{userId:req.userId}});
          if(count<req_.count)return res.status(400).json({message:`Нужно написать ${req_.count} записей в дневнике. Написано: ${count}`});
        }else if(req_.type==="tasks_today"){
          const count=await prisma.task.count({where:{userId:req.userId,completed:true,completedAt:{gte:startOfToday()}}});
          if(count<req_.count)return res.status(400).json({message:`Нужно выполнить ${req_.count} квестов сегодня. Выполнено: ${count}`});
        }
      }
    }
    const nextStep=progress.currentStep+1;
    const justFinished=nextStep>=chain.totalSteps;
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    let xpGained=50,goldGained=25;
    if(justFinished){xpGained+=chain.rewardXp;goldGained+=chain.rewardGold;}
    const{xp,level}=applyXpGain(user.xp,user.level,xpGained);
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{xp,level,gold:{increment:goldGained},...(justFinished&&chain.rewardTitle?{title:chain.rewardTitle}:{})}}),
      prisma.questChainProgress.update({where:{userId_chainId:{userId:req.userId,chainId}},data:{currentStep:nextStep,...(justFinished?{completed:true,completedAt:new Date()}:{})}}),
    ]);
    // Unlock theme reward for chain completion
    if(justFinished&&chain.rewardTheme){
      // Store unlocked themes in user's purchases using a special shop item convention
      // The theme unlock is tracked via a special purchase record
    }
    if(justFinished){
      await createNotification(req.userId,"chain_complete","Цепочка завершена!",`Ты прошёл цепочку «${chain.title}»`).catch(()=>{});
      await addFeedEvent(req.userId,"chain_complete",{chainTitle:chain.title,chainIcon:chain.icon}).catch(()=>{});
    }
    // chain_first achievement
    const chainAch=await prisma.achievement.findUnique({where:{userId_type:{userId:req.userId,type:"chain_first"}}});
    if(!chainAch){
      await prisma.achievement.create({data:{userId:req.userId,type:"chain_first"}}).catch(()=>{});
      const u=await prisma.user.findUnique({where:{id:req.userId}});
      const xpR=ACHIEVEMENT_META.chain_first.xpReward||0;
      if(xpR>0){const{xp,level:nl}=applyXpGain(u.xp,u.level,xpR);await prisma.user.update({where:{id:req.userId},data:{xp,level:nl}});}
    }
    res.json({step:nextStep,justFinished,xpGained,goldGained,newTitle:justFinished?chain.rewardTitle:null,newTheme:justFinished?chain.rewardTheme:null});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────
async function createNotification(userId,type,title,text,relatedId=null){
  return prisma.notification.create({data:{userId,type,title,text,relatedId}});
}

app.get("/notifications",authMiddleware,async(req,res)=>{
  try{
    const notifs=await prisma.notification.findMany({where:{userId:req.userId},orderBy:{createdAt:"desc"},take:50});
    res.json(notifs);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/notifications/:id/read",authMiddleware,async(req,res)=>{
  try{
    const n=await prisma.notification.findUnique({where:{id:Number(req.params.id)}});
    if(!n||n.userId!==req.userId)return res.status(404).json({message:"Not found"});
    await prisma.notification.update({where:{id:n.id},data:{read:true}});
    res.json({message:"OK"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/notifications/read-all",authMiddleware,async(req,res)=>{
  try{
    await prisma.notification.updateMany({where:{userId:req.userId,read:false},data:{read:true}});
    res.json({message:"OK"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── ACTIVITY FEED ─────────────────────────────────────────────────────────────
async function addFeedEvent(userId,type,data){
  return prisma.activityFeed.create({data:{userId,type,data:JSON.stringify(data)}});
}

app.get("/feed",authMiddleware,async(req,res)=>{
  try{
    const friends=await prisma.friendship.findMany({where:{userId:req.userId},select:{friendId:true}});
    const friendIds=friends.map(f=>f.friendId);
    const events=await prisma.activityFeed.findMany({
      where:{userId:{in:friendIds}},
      orderBy:{createdAt:"desc"},take:20,
      include:{user:{select:{name:true,email:true}}},
    });
    res.json(events.map(e=>({id:e.id,type:e.type,data:JSON.parse(e.data),createdAt:e.createdAt,userName:e.user.name||e.user.email.split("@")[0]})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── COOP QUESTS ───────────────────────────────────────────────────────────────
app.post("/coop/create",authMiddleware,async(req,res)=>{
  try{
    const{partnerId,title,branch}=req.body;
    if(!title?.trim()||!BRANCHES.includes(branch))return res.status(400).json({message:"Неверные данные"});
    const partner=await prisma.user.findUnique({where:{id:Number(partnerId)}});
    if(!partner)return res.status(404).json({message:"Партнёр не найден"});
    const friendship=await prisma.friendship.findUnique({where:{userId_friendId:{userId:req.userId,friendId:Number(partnerId)}}});
    if(!friendship)return res.status(403).json({message:"Вы не друзья"});
    const expires=new Date();expires.setDate(expires.getDate()+7);
    const quest=await prisma.coopQuest.create({data:{creatorId:req.userId,partnerId:Number(partnerId),title:title.trim(),branch,expiresAt:expires}});
    await createNotification(Number(partnerId),"quest_complete","Совместный квест","Друг приглашает тебя на совместный квест: «"+title.trim()+"»",quest.id).catch(()=>{});
    res.status(201).json(quest);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/coop/my",authMiddleware,async(req,res)=>{
  try{
    const quests=await prisma.coopQuest.findMany({
      where:{OR:[{creatorId:req.userId},{partnerId:req.userId}]},
      include:{creator:{select:{name:true,email:true}},partner:{select:{name:true,email:true}}},
      orderBy:{createdAt:"desc"},
    });
    res.json(quests.map(q=>({...q,creatorName:q.creator.name||q.creator.email.split("@")[0],partnerName:q.partner.name||q.partner.email.split("@")[0],isMine:q.creatorId===req.userId})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/coop/:id/accept",authMiddleware,async(req,res)=>{
  try{
    const q=await prisma.coopQuest.findUnique({where:{id:Number(req.params.id)}});
    if(!q||q.partnerId!==req.userId)return res.status(404).json({message:"Не найдено"});
    if(q.status!=="pending")return res.status(400).json({message:"Уже принят"});
    await prisma.coopQuest.update({where:{id:q.id},data:{status:"active"}});
    res.json({message:"Принято"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/coop/:id/complete",authMiddleware,async(req,res)=>{
  try{
    const q=await prisma.coopQuest.findUnique({where:{id:Number(req.params.id)}});
    if(!q||(q.creatorId!==req.userId&&q.partnerId!==req.userId))return res.status(404).json({message:"Не найдено"});
    if(q.status!=="active")return res.status(400).json({message:"Квест не активен"});
    const isCreator=q.creatorId===req.userId;
    const upd=isCreator?{creatorDone:true}:{partnerDone:true};
    const updated=await prisma.coopQuest.update({where:{id:q.id},data:upd});
    if(updated.creatorDone&&updated.partnerDone){
      await prisma.coopQuest.update({where:{id:q.id},data:{status:"completed"}});
      const xp=Math.round(q.rewardXp*1.5);const gold=Math.round(q.rewardGold*1.5);
      for(const uid of[q.creatorId,q.partnerId]){
        const u=await prisma.user.findUnique({where:{id:uid}});
        const{xp:nx,level:nl}=applyXpGain(u.xp,u.level,xp);
        await prisma.user.update({where:{id:uid},data:{xp:nx,level:nl,gold:{increment:gold}}});
        await createNotification(uid,"quest_complete","Совместный квест выполнен!",`+${xp} XP, +${gold} золота`,q.id).catch(()=>{});
      }
      return res.json({message:"Оба выполнили! Награда начислена",bothDone:true,xp,gold});
    }
    res.json({message:"Ваша часть отмечена",bothDone:false});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── GIFTS ─────────────────────────────────────────────────────────────────────
app.post("/friends/:id/gift",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.id);
    const{gold}=req.body;
    if(!gold||gold<1||gold>100)return res.status(400).json({message:"Можно подарить от 1 до 100 золота"});
    const friendship=await prisma.friendship.findUnique({where:{userId_friendId:{userId:req.userId,friendId}}});
    if(!friendship)return res.status(403).json({message:"Вы не друзья"});
    const sender=await prisma.user.findUnique({where:{id:req.userId}});
    const today=startOfToday();
    if(sender.dailyGiftSentAt&&new Date(sender.dailyGiftSentAt)>=today&&sender.dailyGiftSentTo===friendId)
      return res.status(400).json({message:"Уже подарено сегодня этому другу"});
    if(sender.gold<gold)return res.status(400).json({message:"Недостаточно золота"});
    const senderName=sender.name||sender.email.split("@")[0];
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{gold:{decrement:gold},dailyGiftSentAt:new Date(),dailyGiftSentTo:friendId}}),
      prisma.user.update({where:{id:friendId},data:{gold:{increment:gold}}}),
    ]);
    await createNotification(friendId,"gift_received","Подарок!",`${senderName} подарил тебе ${gold} золота 🎁`).catch(()=>{});
    res.json({message:`Подарено ${gold} золота`});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── REACTIONS ─────────────────────────────────────────────────────────────────
app.post("/achievements/:achievementId/react",authMiddleware,async(req,res)=>{
  try{
    const achievementId=Number(req.params.achievementId);
    const{emoji}=req.body;
    if(!["🔥","💪","👏","⚔️"].includes(emoji))return res.status(400).json({message:"Неверная реакция"});
    const ach=await prisma.achievement.findUnique({where:{id:achievementId}});
    if(!ach)return res.status(404).json({message:"Не найдено"});
    await prisma.reaction.upsert({
      where:{userId_achievementId:{userId:req.userId,achievementId}},
      create:{userId:req.userId,targetUserId:ach.userId,achievementId,emoji},
      update:{emoji},
    });
    res.json({message:"OK"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── WEEKLY REPORT ─────────────────────────────────────────────────────────────
app.get("/report/weekly",authMiddleware,async(req,res)=>{
  try{
    const now=new Date();
    const weekAgo=new Date(now.getTime()-7*86400000);
    const tasks=await prisma.task.findMany({
      where:{userId:req.userId,completed:true,completedAt:{gte:weekAgo}},
      select:{completedAt:true,branch:true,type:true,xpReward:true,goldReward:true},
    });
    const byDay={};
    for(let i=6;i>=0;i--){
      const d=new Date(now.getTime()-i*86400000);
      const k=d.toISOString().slice(0,10);
      byDay[k]={date:k,total:0,xp:0,gold:0,required:0,requiredTotal:0};
    }
    for(const t of tasks){
      const k=new Date(t.completedAt).toISOString().slice(0,10);
      if(byDay[k]){byDay[k].total++;byDay[k].xp+=t.xpReward;byDay[k].gold+=t.goldReward;if(t.type==="required")byDay[k].required++;}
    }
    const totalReq=await prisma.task.count({where:{userId:req.userId,type:"required",isDaily:true,createdAt:{gte:weekAgo}}});
    const doneReq=tasks.filter(t=>t.type==="required").length;
    const days=Object.values(byDay);
    const best=days.reduce((a,b)=>b.total>a.total?b:a,days[0]);
    const totalXp=days.reduce((s,d)=>s+d.xp,0);
    const totalGold=days.reduce((s,d)=>s+d.gold,0);
    const totalTasks=days.reduce((s,d)=>s+d.total,0);
    const pct=totalReq>0?Math.round(doneReq/totalReq*100):100;
    const motivations=["Ты на правильном пути — продолжай!","Каждый день ты становишься лучше.","Сила привычки — ключ к успеху.","Ты молодец, не останавливайся!","Стабильность — признак мастерства."];
    res.json({days,totalTasks,totalXp,totalGold,bestDay:best,requiredPct:pct,motivation:motivations[Math.floor(totalTasks%motivations.length)]});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── ARTIFACTS ─────────────────────────────────────────────────────────────────
app.get("/artifacts",authMiddleware,async(req,res)=>{
  try{
    const artifacts=await prisma.artifact.findMany({where:{active:true}});
    const owned=await prisma.userArtifact.findMany({where:{userId:req.userId},include:{artifact:true}});
    const ownedIds=new Set(owned.map(a=>a.artifactId));
    const equipped=owned.filter(a=>a.equippedSlot);
    res.json({artifacts:artifacts.map(a=>({...a,owned:ownedIds.has(a.id),equippedSlot:owned.find(o=>o.artifactId===a.id)?.equippedSlot||null})),equippedSlots:equipped.map(e=>({slot:e.equippedSlot,artifactId:e.artifactId,artifact:e.artifact}))});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/artifacts/:id/buy",authMiddleware,async(req,res)=>{
  try{
    const artifactId=Number(req.params.id);
    const artifact=await prisma.artifact.findUnique({where:{id:artifactId}});
    if(!artifact)return res.status(404).json({message:"Не найдено"});
    const existing=await prisma.userArtifact.findUnique({where:{userId_artifactId:{userId:req.userId,artifactId}}});
    if(existing)return res.status(400).json({message:"Уже куплено"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(user.gold<artifact.price)return res.status(400).json({message:"Недостаточно золота"});
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{gold:{decrement:artifact.price}}}),
      prisma.userArtifact.create({data:{userId:req.userId,artifactId}}),
    ]);
    res.status(201).json({message:"Куплено",artifact});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/artifacts/:id/equip",authMiddleware,async(req,res)=>{
  try{
    const artifactId=Number(req.params.id);
    const{slot}=req.body;
    if(!["weapon","armor","ring","amulet"].includes(slot))return res.status(400).json({message:"Неверный слот"});
    const ua=await prisma.userArtifact.findUnique({where:{userId_artifactId:{userId:req.userId,artifactId}}});
    if(!ua)return res.status(403).json({message:"Артефакт не куплен"});
    // Unequip whatever is in that slot
    await prisma.userArtifact.updateMany({where:{userId:req.userId,equippedSlot:slot},data:{equippedSlot:null,equippedAt:null}});
    await prisma.userArtifact.update({where:{userId_artifactId:{userId:req.userId,artifactId}},data:{equippedSlot:slot,equippedAt:new Date()}});
    res.json({message:"Экипировано"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/artifacts/:id/unequip",authMiddleware,async(req,res)=>{
  try{
    const artifactId=Number(req.params.id);
    await prisma.userArtifact.updateMany({where:{userId:req.userId,artifactId},data:{equippedSlot:null,equippedAt:null}});
    res.json({message:"Снято"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── WEEKLY SHOP ───────────────────────────────────────────────────────────────
app.get("/shop/weekly",authMiddleware,async(req,res)=>{
  try{
    const now=new Date();
    const item=await prisma.weeklyShopItem.findFirst({where:{active:true,availableFrom:{lte:now},availableTo:{gte:now}}});
    res.json({item:item||null});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── WATCH AD (disabled) ──────────────────────────────────────────────────────
// app.post("/watch-ad", ...) — removed

// ── CRAFT (disabled) ──────────────────────────────────────────────────────────
/*
app.get("/craft/recipes",authMiddleware,async(req,res)=>{
  try{
    const recipes=await prisma.craftRecipe.findMany({where:{active:true}});
    res.json(recipes.map(r=>({...r,ingredients:JSON.parse(r.ingredients)})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/craft/:id",authMiddleware,async(req,res)=>{
  try{
    const recipe=await prisma.craftRecipe.findUnique({where:{id:Number(req.params.id)}});
    if(!recipe)return res.status(404).json({message:"Рецепт не найден"});
    const ingredients=JSON.parse(recipe.ingredients);
    // Check user has all ingredients in purchases
    for(const ing of ingredients){
      const si=await prisma.shopItem.findFirst({where:{effect:ing.effect}});
      if(!si)return res.status(400).json({message:`Предмет ${ing.effect} не найден`});
      const p=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId:si.id}}});
      if(!p||p.quantity<ing.quantity)return res.status(400).json({message:`Нужно: ${ing.quantity}x ${ing.effect}`});
    }
    // Consume ingredients
    for(const ing of ingredients){
      const si=await prisma.shopItem.findFirst({where:{effect:ing.effect}});
      const p=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId:si.id}}});
      if(p.quantity<=ing.quantity){await prisma.purchase.delete({where:{userId_itemId:{userId:req.userId,itemId:si.id}}});}
      else{await prisma.purchase.update({where:{userId_itemId:{userId:req.userId,itemId:si.id}},data:{quantity:{decrement:ing.quantity}}});}
    }
    // Grant result
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(recipe.resultEffect==="xp_bonus"){
      const{xp,level}=applyXpGain(user.xp,user.level,500);
      await prisma.user.update({where:{id:req.userId},data:{xp,level}});
      return res.json({message:`Скрафтовано: ${recipe.resultName}! +500 XP`});
    }
    if(recipe.resultEffect==="xp_boost_24h"){
      await prisma.user.update({where:{id:req.userId},data:{xpBoostExpiresAt:new Date(Date.now()+86400000)}});
      return res.json({message:`Скрафтовано: ${recipe.resultName}!`});
    }
    res.json({message:`Скрафтовано: ${recipe.resultName}!`});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
*/

// ── XP CARDS ─────────────────────────────────────────────────────────────────
app.post("/shop/use-card/:itemId",authMiddleware,async(req,res)=>{
  try{
    const itemId=Number(req.params.itemId);
    const item=await prisma.shopItem.findUnique({where:{id:itemId}});
    if(!item)return res.status(404).json({message:"Предмет не найден"});
    const purchase=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId}}});
    if(!purchase)return res.status(403).json({message:"Предмет не куплен"});
    const XP_MAP={xp_card_small:100,xp_card_medium:300,xp_card_large:750};
    const xpGain=XP_MAP[item.effect];
    if(!xpGain)return res.status(400).json({message:"Этот предмет нельзя использовать так"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const{xp,level}=applyXpGain(user.xp,user.level,xpGain);
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{xp,level}}),
      prisma.purchase.delete({where:{userId_itemId:{userId:req.userId,itemId}}}),
    ]);
    res.json({xpGained:xpGain,newXp:xp,newLevel:level,leveledUp:level>user.level});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── USE ITEM (boosts, freeze, scroll) ────────────────────────────────────────
app.post("/shop/use-item/:itemId",authMiddleware,async(req,res)=>{
  try{
    const itemId=Number(req.params.itemId);
    const item=await prisma.shopItem.findUnique({where:{id:itemId}});
    if(!item)return res.status(404).json({message:"Предмет не найден"});
    const purchase=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId}}});
    if(!purchase)return res.status(403).json({message:"Предмет не куплен"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const updates={};
    let xpGained=0;
    if(item.effect==="streak_freeze")updates.streakFreezeCount={increment:1};
    else if(item.effect==="xp_boost_24h")updates.xpBoostExpiresAt=new Date(Date.now()+86400000);
    else if(item.effect==="gold_boost_24h")updates.goldBoostExpiresAt=new Date(Date.now()+86400000);
    else if(item.effect==="name_change_scroll"){
      const{name}=req.body;
      if(!name?.trim()||name.trim().length>30)return res.status(400).json({message:"Ник: 1–30 символов"});
      const taken=await prisma.user.findUnique({where:{name:name.trim()}});
      if(taken&&taken.id!==req.userId)return res.status(400).json({message:"Этот ник уже занят"});
      updates.name=name.trim();updates.nameSet=true;
    }
    else if(["xp_card_small","xp_card_medium","xp_card_large"].includes(item.effect)){
      const MAP={xp_card_small:100,xp_card_medium:300,xp_card_large:750};
      xpGained=MAP[item.effect];
      const{xp,level}=applyXpGain(user.xp,user.level,xpGained);
      updates.xp=xp;updates.level=level;
    }
    else return res.status(400).json({message:"Этот предмет нельзя использовать здесь"});
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:updates}),
      prisma.purchase.delete({where:{userId_itemId:{userId:req.userId,itemId}}}),
    ]);
    res.json({message:"Применено!",effect:item.effect,xpGained});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── COSMETIC ─────────────────────────────────────────────────────────────────
app.patch("/me/cosmetic",authMiddleware,async(req,res)=>{
  try{
    const{avatarFrame,nicknameEffect,avatarStyle}=req.body;
    const data={};
    if(avatarFrame!==undefined)data.avatarFrame=avatarFrame;
    if(nicknameEffect!==undefined)data.nicknameEffect=nicknameEffect;
    if(avatarStyle!==undefined)data.avatarStyle=avatarStyle;
    if(!Object.keys(data).length)return res.status(400).json({message:"Nothing to update"});
    await prisma.user.update({where:{id:req.userId},data});
    res.json({message:"OK",...data});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── TITLE CHANGE ──────────────────────────────────────────────────────────────
app.patch("/me/title",authMiddleware,async(req,res)=>{
  try{
    const{title}=req.body;
    if(!title?.trim())return res.status(400).json({message:"Название обязательно"});
    await prisma.user.update({where:{id:req.userId},data:{title:title.trim()}});
    res.json({message:"Титул сменён",title:title.trim()});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── CLAN WARS ─────────────────────────────────────────────────────────────────
app.post("/clans/war/challenge",authMiddleware,async(req,res)=>{
  try{
    const{targetClanId}=req.body;
    const actor=await prisma.user.findUnique({where:{id:req.userId}});
    if(!["leader","co_leader"].includes(actor.clanRole))return res.status(403).json({message:"Только лидер может объявлять войну"});
    const targetClan=await prisma.clan.findUnique({where:{id:Number(targetClanId)}});
    if(!targetClan)return res.status(404).json({message:"Клан не найден"});
    if(actor.clanId===Number(targetClanId))return res.status(400).json({message:"Нельзя воевать с собой"});
    const endDate=new Date();endDate.setDate(endDate.getDate()+7);
    const war=await prisma.clanWar.create({data:{clan1Id:actor.clanId,clan2Id:Number(targetClanId),endDate}});
    await prisma.clanWarScore.createMany({data:[{warId:war.id,clanId:actor.clanId},{warId:war.id,clanId:Number(targetClanId)}]});
    res.status(201).json(war);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/clans/war/current",authMiddleware,async(req,res)=>{
  try{
    const actor=await prisma.user.findUnique({where:{id:req.userId}});
    if(!actor.clanId)return res.json({war:null});
    const war=await prisma.clanWar.findFirst({
      where:{status:"active",OR:[{clan1Id:actor.clanId},{clan2Id:actor.clanId}]},
      include:{clan1:{select:{id:true,name:true,bannerIcon:true,bannerColor:true}},clan2:{select:{id:true,name:true,bannerIcon:true,bannerColor:true}},scores:true},
    });
    res.json({war});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── PUBLIC PROFILE ────────────────────────────────────────────────────────────
app.get("/profile/:userId",authMiddleware,async(req,res)=>{
  try{
    const targetId=Number(req.params.userId);
    const user=await prisma.user.findUnique({where:{id:targetId},select:{id:true,name:true,email:true,level:true,xp:true,gold:true,streak:true,clanId:true,clanRole:true,title:true,avatarStyle:true,avatarFrame:true,nicknameEffect:true,masteryPath:true,hasEverFinishedMastery:true,createdAt:true}});
    if(!user)return res.status(404).json({message:"Пользователь не найден"});
    const achievements=await prisma.achievement.findMany({where:{userId:targetId},orderBy:{unlockedAt:"asc"},take:3});
    const taskCount=await prisma.task.count({where:{userId:targetId,completed:true}});
    const clan=user.clanId?await prisma.clan.findUnique({where:{id:user.clanId},select:{name:true,bannerIcon:true,bannerColor:true}}):null;
    const season=await prisma.season.findFirst({where:{active:true}});
    const seasonProgress=season?await prisma.seasonProgress.findUnique({where:{userId_seasonId:{userId:targetId,seasonId:season.id}}}):null;
    res.json({
      ...user,name:user.name||user.email.split("@")[0],
      clan,achievements:achievements.map(a=>({...a,...ACHIEVEMENT_META[a.type]})),
      taskCount,seasonXp:seasonProgress?.xp||0,
    });
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── ONBOARDING ────────────────────────────────────────────────────────────────
app.post("/onboarding",authMiddleware,async(req,res)=>{
  try{
    const {answers}=req.body; // {q1,q2,q3,q4,q5}
    if(!answers)return res.status(400).json({message:"Нет ответов"});
    const branchMap={discipline:0,fitness:0,knowledge:0,self_development:0};
    if(answers.q1==="Дисциплина")branchMap.discipline+=2;
    if(answers.q1==="Фитнес")branchMap.fitness+=2;
    if(answers.q1==="Знания")branchMap.knowledge+=2;
    if(answers.q1==="Саморазвитие")branchMap.self_development+=2;
    if(answers.q3==="Прокрастинация")branchMap.self_development++;
    if(answers.q3==="Лень")branchMap.fitness++;
    if(answers.q3==="Неорганизованность")branchMap.discipline++;
    if(answers.q3==="Отсутствие цели")branchMap.knowledge++;
    if(answers.q5==="Похудеть")branchMap.fitness+=2;
    if(answers.q5==="Читать больше")branchMap.knowledge+=2;
    if(answers.q5==="Дисциплина")branchMap.discipline+=2;
    if(answers.q5==="Гармония"){branchMap.self_development++;branchMap.discipline++;}
    const topBranch=Object.entries(branchMap).sort((a,b)=>b[1]-a[1])[0][0];
    const classMap={discipline:"warrior",fitness:"warrior",knowledge:"sage",self_development:"balance"};
    const suggestedClass=classMap[topBranch]||"balance";
    await prisma.user.update({where:{id:req.userId},data:{onboardingDone:true,onboardingData:JSON.stringify({answers,topBranch,suggestedClass})}});
    res.json({topBranch,suggestedClass,classLabel:CLASS_LABELS[suggestedClass]||suggestedClass});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── MARATHONS ─────────────────────────────────────────────────────────────────
app.get("/marathons",authMiddleware,async(req,res)=>{
  try{
    const marathons=await prisma.marathon.findMany({where:{active:true},orderBy:{id:"asc"}});
    const myProgress=await prisma.marathonProgress.findMany({where:{userId:req.userId}});
    const result=marathons.map(m=>{
      const p=myProgress.find(p=>p.marathonId===m.id)||null;
      return{...m,progress:p};
    });
    res.json(result);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/marathons/my",authMiddleware,async(req,res)=>{
  try{
    const progress=await prisma.marathonProgress.findMany({where:{userId:req.userId,completed:false,failed:false},include:{marathon:true}});
    res.json(progress);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/marathons/:id/join",authMiddleware,async(req,res)=>{
  try{
    const marathonId=Number(req.params.id);
    const marathon=await prisma.marathon.findUnique({where:{id:marathonId}});
    if(!marathon)return res.status(404).json({message:"Марафон не найден"});
    const existing=await prisma.marathonProgress.findUnique({where:{userId_marathonId:{userId:req.userId,marathonId}}});
    if(existing&&!existing.failed)return res.status(400).json({message:"Уже участвуешь"});
    const progress=await prisma.marathonProgress.upsert({
      where:{userId_marathonId:{userId:req.userId,marathonId}},
      create:{userId:req.userId,marathonId,currentDay:0,failed:false},
      update:{currentDay:0,failed:false,completed:false,startedAt:new Date(),lastCheckIn:null},
    });
    res.json(progress);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/marathons/:id/checkin",authMiddleware,async(req,res)=>{
  try{
    const marathonId=Number(req.params.id);
    const progress=await prisma.marathonProgress.findUnique({where:{userId_marathonId:{userId:req.userId,marathonId}},include:{marathon:true}});
    if(!progress||progress.failed||progress.completed)return res.status(400).json({message:"Нет активного марафона"});
    const now=new Date();
    const todayStr=now.toISOString().slice(0,10);
    if(progress.lastCheckIn){
      const lastStr=progress.lastCheckIn.toISOString().slice(0,10);
      if(lastStr===todayStr)return res.status(400).json({message:"Уже выполнен сегодня"});
      const dayDiff=Math.floor((now-progress.lastCheckIn)/(1000*60*60*24));
      if(dayDiff>1){
        await prisma.marathonProgress.update({where:{id:progress.id},data:{failed:true}});
        return res.status(400).json({message:"Марафон сброшен — пропустил день"});
      }
    }
    const branch=progress.marathon.branch;
    const todayStart=new Date(todayStr+"T00:00:00.000Z");
    const todayEnd=new Date(todayStr+"T23:59:59.999Z");
    const todayTasks=await prisma.task.count({where:{userId:req.userId,branch,completed:true,completedAt:{gte:todayStart,lte:todayEnd}}});
    if(todayTasks===0)return res.status(400).json({message:"Нет выполненных квестов сегодня"});
    const newDay=progress.currentDay+1;
    const completed=newDay>=progress.marathon.durationDays;
    let bonusMsg="";
    if(completed){
      const user=await prisma.user.findUnique({where:{id:req.userId}});
      const {newXp,newLevel}=applyXpGain(user.xp,user.level,progress.marathon.rewardXp);
      await prisma.user.update({where:{id:req.userId},data:{gold:{increment:progress.marathon.rewardGold},xp:newXp,level:newLevel}});
      await createNotification(req.userId,"marathon_complete","Марафон завершён!",`Ты прошёл «${progress.marathon.title}» и получил ${progress.marathon.rewardGold} золота!`);
      bonusMsg=`+${progress.marathon.rewardGold}g +${progress.marathon.rewardXp}XP`;
    }
    await prisma.marathonProgress.update({where:{id:progress.id},data:{currentDay:newDay,lastCheckIn:now,completed,completedAt:completed?now:null}});
    res.json({day:newDay,completed,bonus:bonusMsg});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── GRATITUDE ─────────────────────────────────────────────────────────────────
app.get("/gratitude/today",authMiddleware,async(req,res)=>{
  try{
    const start=startOfToday();
    const end=endOfToday();
    const g=await prisma.gratitude.findFirst({where:{userId:req.userId,createdAt:{gte:start,lte:end}}});
    res.json(g||null);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/gratitude/history",authMiddleware,async(req,res)=>{
  try{
    const history=await prisma.gratitude.findMany({where:{userId:req.userId},orderBy:{createdAt:"desc"},take:30});
    res.json(history);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/gratitude",authMiddleware,async(req,res)=>{
  try{
    const {text1,text2,text3}=req.body;
    if(!text1||!text2||!text3)return res.status(400).json({message:"Заполни все 3 поля"});
    const start=startOfToday();
    const end=endOfToday();
    const existing=await prisma.gratitude.findFirst({where:{userId:req.userId,createdAt:{gte:start,lte:end}}});
    if(existing)return res.status(400).json({message:"Уже заполнено сегодня"});
    const g=await prisma.gratitude.create({data:{userId:req.userId,text1,text2,text3}});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const{xp:newXp,level:newLevel}=applyXpGain(user.xp,user.level,20);
    // Daily gratitude gold bonus: +10
    const gotGoldBonus=user.lastGratitudeBonusDate&&new Date(user.lastGratitudeBonusDate)>=start;
    const goldBonus=gotGoldBonus?0:10;
    await prisma.user.update({where:{id:req.userId},data:{xp:newXp,level:newLevel,...(goldBonus>0?{gold:{increment:goldBonus},lastGratitudeBonusDate:new Date()}:{})}});
    await addFeedEvent(req.userId,"gratitude",{text:"записал благодарности"});
    res.json({...g,xpGained:20,goldBonus,leveledUp:newLevel>user.level});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── DARK SCREEN CHECK ─────────────────────────────────────────────────────────
app.get("/me/inactivity",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{lastActiveQuestDate:true,level:true,xp:true}});
    if(!user.lastActiveQuestDate)return res.json({inactive:false,days:0});
    const now=new Date();
    const days=Math.floor((now-user.lastActiveQuestDate)/(1000*60*60*24));
    const inactive=days>=3;
    const xpLost=inactive?Math.min(days*10,100):0;
    res.json({inactive,days,xpLost});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/me/revival",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const task=await prisma.task.create({data:{
      userId:req.userId,title:"Возрождение Героя",
      description:"Выполни это задание и докажи что твой путь продолжается!",
      branch:"discipline",type:"required",difficulty:"hard",
      xpReward:Math.round(40),goldReward:Math.round(20),
      isDaily:true,expiresAt:endOfToday(),
    }});
    await prisma.user.update({where:{id:req.userId},data:{streak:Math.max(user.streak,1),lastActiveQuestDate:new Date()}});
    res.json({task,message:"Квест возрождения создан!"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── 1% GROWTH ─────────────────────────────────────────────────────────────────
app.get("/stats/growth",authMiddleware,async(req,res)=>{
  try{
    const now=new Date();
    const thirtyAgo=new Date(now-30*24*3600*1000);
    const sixtyAgo=new Date(now-60*24*3600*1000);
    const thisMonth=await prisma.task.count({where:{userId:req.userId,completed:true,completedAt:{gte:thirtyAgo}}});
    const lastMonth=await prisma.task.count({where:{userId:req.userId,completed:true,completedAt:{gte:sixtyAgo,lt:thirtyAgo}}});
    const growthRate=lastMonth>0?Math.round((thisMonth/lastMonth-1)*100):0;
    const compound=Math.round(Math.pow(1.01,thisMonth)*100)/100;
    res.json({thisMonth,lastMonth,growthRate,compound,message:growthRate>0?`+${growthRate}% к прошлому месяцу`:"Начни выполнять квесты регулярно"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── LEAGUES ───────────────────────────────────────────────────────────────────
const LEAGUES=[
  {name:"Бронза",tier:1,icon:"🥉",color:"#cd7f32",rewardGold:0},
  {name:"Серебро",tier:2,icon:"🥈",color:"#9ca3af",rewardGold:50},
  {name:"Золото",tier:3,icon:"🥇",color:"#d97706",rewardGold:100},
  {name:"Платина",tier:4,icon:"💎",color:"#38bdf8",rewardGold:200},
  {name:"Бриллиант",tier:5,icon:"💠",color:"#6366f1",rewardGold:500},
];

app.get("/league/current",authMiddleware,async(req,res)=>{
  try{
    let ul=await prisma.userLeague.findUnique({where:{userId:req.userId}});
    if(!ul)ul=await prisma.userLeague.create({data:{userId:req.userId}});
    const league=LEAGUES.find(l=>l.name===ul.leagueName)||LEAGUES[0];
    const leaderboard=await prisma.userLeague.findMany({where:{leagueName:ul.leagueName},orderBy:{weeklyXp:"desc"},take:20,include:{user:{select:{name:true,email:true,level:true,avatarFrame:true}}}});
    const myRank=leaderboard.findIndex(r=>r.userId===req.userId)+1;
    res.json({...ul,league,myRank,leaderboard:leaderboard.map((r,i)=>({rank:i+1,userId:r.userId,name:r.user.name||r.user.email.split("@")[0],level:r.user.level,weeklyXp:r.weeklyXp,isMe:r.userId===req.userId}))});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── DUELS ─────────────────────────────────────────────────────────────────────
app.post("/duels/challenge/:friendId",authMiddleware,async(req,res)=>{
  try{
    const challengedId=Number(req.params.friendId);
    const existing=await prisma.duel.findFirst({where:{challengerId:req.userId,challengedId,status:{in:["pending","active"]}}});
    if(existing)return res.status(400).json({message:"Дуэль уже активна"});
    const now=new Date();
    const end=new Date(now.getTime()+7*24*3600*1000);
    const duel=await prisma.duel.create({data:{challengerId:req.userId,challengedId,status:"pending"}});
    await createNotification(challengedId,"duel_challenge","Вызов на дуэль!",`Ты получил вызов на дуэль! Прими или отклони.`,duel.id);
    res.json(duel);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/duels/:id/accept",authMiddleware,async(req,res)=>{
  try{
    const duel=await prisma.duel.findUnique({where:{id:Number(req.params.id)}});
    if(!duel||duel.challengedId!==req.userId||duel.status!=="pending")return res.status(400).json({message:"Нельзя принять"});
    const now=new Date();
    const updated=await prisma.duel.update({where:{id:duel.id},data:{status:"active",startDate:now,endDate:new Date(now.getTime()+7*24*3600*1000)}});
    res.json(updated);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/duels/:id/decline",authMiddleware,async(req,res)=>{
  try{
    const duel=await prisma.duel.findUnique({where:{id:Number(req.params.id)}});
    if(!duel||duel.challengedId!==req.userId)return res.status(400).json({message:"Нельзя отклонить"});
    await prisma.duel.update({where:{id:duel.id},data:{status:"declined"}});
    res.json({message:"Дуэль отклонена"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/duels/my",authMiddleware,async(req,res)=>{
  try{
    const duels=await prisma.duel.findMany({where:{OR:[{challengerId:req.userId},{challengedId:req.userId}],status:{in:["pending","active"]}},include:{challenger:{select:{name:true,email:true,level:true}},challenged:{select:{name:true,email:true,level:true}}},orderBy:{createdAt:"desc"}});
    res.json(duels);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── SHARED STREAK ─────────────────────────────────────────────────────────────
app.post("/shared-streak/invite/:friendId",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.friendId);
    const u1=Math.min(req.userId,friendId);
    const u2=Math.max(req.userId,friendId);
    const existing=await prisma.sharedStreak.findUnique({where:{user1Id_user2Id:{user1Id:u1,user2Id:u2}}});
    if(existing)return res.status(400).json({message:"Уже существует"});
    const ss=await prisma.sharedStreak.create({data:{user1Id:u1,user2Id:u2,status:"pending"}});
    await createNotification(friendId,"shared_streak","Приглашение на совместный стрик","Вас приглашают на совместный стрик!",ss.id);
    res.json(ss);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/shared-streak/:id/accept",authMiddleware,async(req,res)=>{
  try{
    const ss=await prisma.sharedStreak.findUnique({where:{id:Number(req.params.id)}});
    if(!ss||(ss.user1Id!==req.userId&&ss.user2Id!==req.userId))return res.status(403).json({message:"Нет доступа"});
    const updated=await prisma.sharedStreak.update({where:{id:ss.id},data:{active:true,status:"active"}});
    res.json(updated);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/shared-streak/my",authMiddleware,async(req,res)=>{
  try{
    const ss=await prisma.sharedStreak.findMany({where:{OR:[{user1Id:req.userId},{user2Id:req.userId}]},include:{user1:{select:{name:true,email:true,level:true}},user2:{select:{name:true,email:true,level:true}}}});
    res.json(ss);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── NPC ───────────────────────────────────────────────────────────────────────
app.get("/npc",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true}});
    const interactions=await prisma.npcInteraction.findMany({where:{userId:req.userId}});
    const npcs=getAvailableNpcs(user.level).map(npc=>{
      const interaction=interactions.find(i=>i.npcId===npc.id)||null;
      const now=new Date();
      const canInteract=!interaction||((now-interaction.lastInteractedAt)>7*24*3600*1000);
      return{...npc,canInteract,questsGiven:interaction?.questsGiven||0,lastInteractedAt:interaction?.lastInteractedAt||null};
    });
    res.json(npcs);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/npc/:id/interact",authMiddleware,async(req,res)=>{
  try{
    const npc=getNpc(req.params.id);
    if(!npc)return res.status(404).json({message:"NPC не найден"});
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true,streak:true}});
    if(user.level<npc.unlockLevel)return res.status(403).json({message:`Откроется на уровне ${npc.unlockLevel}`});
    const now=new Date();
    // ── NPC requirement checks ────────────────────────────────────────────────
    const NPC_REQS={
      kai:{type:"streak",value:3,desc:"3 дня стрика подряд"},
      rex:{type:"quests_completed",branch:"fitness",value:5,desc:"5 выполненных квестов фитнеса"},
      lyra:{type:"quests_completed",branch:"knowledge",value:3,desc:"3 выполненных квеста знаний"},
      eco:{type:"streak",value:5,desc:"5 дней стрика подряд"},
      orm:{type:"quests_completed",value:10,desc:"10 выполненных квестов"},
    };
    const req_=NPC_REQS[npc.id];
    if(req_){
      if(req_.type==="streak"){
        if((user.streak||0)<req_.value)
          return res.status(400).json({message:`Условие не выполнено`,requirement:req_.desc,current:user.streak||0});
      }else if(req_.type==="quests_completed"){
        const where={userId:req.userId,completed:true};
        if(req_.branch)where.branch=req_.branch;
        const count=await prisma.task.count({where});
        if(count<req_.value)
          return res.status(400).json({message:`Условие не выполнено`,requirement:req_.desc,current:count});
      }
    }
    const interaction=await prisma.npcInteraction.findUnique({where:{userId_npcId:{userId:req.userId,npcId:npc.id}}});
    if(interaction&&(now-interaction.lastInteractedAt)<7*24*3600*1000){
      const daysLeft=Math.ceil((7*24*3600*1000-(now-interaction.lastInteractedAt))/(24*3600*1000));
      return res.status(400).json({message:`Следующий разговор через ${daysLeft} дн.`});
    }
    const task=await prisma.task.create({data:{
      userId:req.userId,title:npc.weeklyQuestTitle,description:npc.weeklyQuestDesc,
      branch:npc.branch||"discipline",type:"recommended",difficulty:"hard",
      xpReward:120,goldReward:60,isDaily:false,
    }});
    const tip=npc.tips[Math.floor((interaction?.questsGiven||0)%npc.tips.length)];
    await prisma.npcInteraction.upsert({
      where:{userId_npcId:{userId:req.userId,npcId:npc.id}},
      create:{userId:req.userId,npcId:npc.id,questsGiven:1},
      update:{lastInteractedAt:now,questsGiven:{increment:1}},
    });
    res.json({npc,task,tip,greeting:npc.greeting});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── SKILL TREE ────────────────────────────────────────────────────────────────
app.get("/skills",authMiddleware,async(req,res)=>{
  try{
    const skills=await prisma.skill.findMany({where:{active:true},orderBy:[{branch:"asc"},{tier:"asc"}]});
    const userSkills=await prisma.userSkill.findMany({where:{userId:req.userId}});
    const unlockedIds=new Set(userSkills.map(u=>u.skillId));
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{gold:true,level:true}});
    const result=skills.map(s=>{
      const requires=JSON.parse(s.requires||"[]");
      const prereqsMet=requires.every(id=>unlockedIds.has(id));
      return{...s,requires,unlocked:unlockedIds.has(s.id),available:prereqsMet&&!unlockedIds.has(s.id)&&user.level>=s.levelRequired&&user.gold>=s.goldCost};
    });
    res.json({skills:result,gold:user.gold,level:user.level});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/skills/:id/unlock",authMiddleware,async(req,res)=>{
  try{
    const skillId=Number(req.params.id);
    const skill=await prisma.skill.findUnique({where:{id:skillId}});
    if(!skill||!skill.active)return res.status(404).json({message:"Навык не найден"});
    const existing=await prisma.userSkill.findUnique({where:{userId_skillId:{userId:req.userId,skillId}}});
    if(existing)return res.status(400).json({message:"Уже изучен"});
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{gold:true,level:true}});
    if(user.level<skill.levelRequired)return res.status(400).json({message:`Нужен уровень ${skill.levelRequired}`});
    if(user.gold<skill.goldCost)return res.status(400).json({message:"Недостаточно золота"});
    const requires=JSON.parse(skill.requires||"[]");
    if(requires.length>0){
      const unlocked=await prisma.userSkill.findMany({where:{userId:req.userId,skillId:{in:requires}}});
      if(unlocked.length<requires.length)return res.status(400).json({message:"Сначала изучи предшествующие навыки"});
    }
    await prisma.user.update({where:{id:req.userId},data:{gold:{decrement:skill.goldCost}}});
    const us=await prisma.userSkill.create({data:{userId:req.userId,skillId}});
    res.json({...us,skill});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── EASTER EGGS ───────────────────────────────────────────────────────────────
app.get("/easter-eggs",authMiddleware,async(req,res)=>{
  try{
    const eggs=await prisma.easterEgg.findMany();
    const unlocked=await prisma.easterEggUnlock.findMany({where:{userId:req.userId}});
    const unlockedIds=new Set(unlocked.map(u=>u.eggId));
    res.json(eggs.map(e=>({...e,unlocked:unlockedIds.has(e.id)})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

async function checkEasterEgg(userId,key){
  try{
    const egg=await prisma.easterEgg.findUnique({where:{key}});
    if(!egg)return;
    const existing=await prisma.easterEggUnlock.findUnique({where:{userId_eggId:{userId,eggId:egg.id}}});
    if(existing)return;
    await prisma.easterEggUnlock.create({data:{userId,eggId:egg.id}});
    const user=await prisma.user.findUnique({where:{id:userId}});
    await prisma.user.update({where:{id:userId},data:{gold:{increment:egg.rewardGold},xp:{increment:egg.rewardXp}}});
    await createNotification(userId,"easter_egg",`🎯 Пасхалка: ${egg.title}`,`${egg.description} +${egg.rewardGold}g`,egg.id);
  }catch{}
}

// ── AI COACH ──────────────────────────────────────────────────────────────────
app.get("/ai-coach/advice",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true,streak:true,aiCoachAdvice:true,aiCoachUpdatedAt:true,xpBoostExpiresAt:true,gold:true}});
    const now=new Date();
    const sixHours=6*3600*1000;
    const today=startOfToday();
    // Return cached if within 6 hours and not force refresh
    if(!req.query.force&&user.aiCoachAdvice&&user.aiCoachUpdatedAt&&(now-user.aiCoachUpdatedAt)<sixHours){
      return res.json({advice:user.aiCoachAdvice,cached:true,updatedAt:user.aiCoachUpdatedAt});
    }
    // Gold gate: first request today is free, subsequent cost 50g
    const isFreeToday=!user.aiCoachUpdatedAt||new Date(user.aiCoachUpdatedAt)<today;
    if(!isFreeToday&&req.query.force==="true"){
      const COST=50;
      if(user.gold<COST)return res.status(400).json({message:"Недостаточно золота (нужно 50)"});
      await prisma.user.update({where:{id:req.userId},data:{gold:{decrement:COST}}});
    }
    const tasks=await prisma.task.findMany({where:{userId:req.userId,completed:true,completedAt:{gte:new Date(now-7*24*3600*1000)}},select:{branch:true}});
    const branchCounts={discipline:0,fitness:0,knowledge:0,self_development:0};
    tasks.forEach(t=>{if(branchCounts[t.branch]!==undefined)branchCounts[t.branch]++;});
    const sorted=Object.entries(branchCounts).sort((a,b)=>b[1]-a[1]);
    const userData={level:user.level,streak:user.streak,weeklyQuests:tasks.length,strongestBranch:sorted[0][0],weakestBranch:sorted[sorted.length-1][0],league:"Бронза"};
    const advice=await getCoachAdvice(userData).catch(()=>"Продолжай выполнять квесты — каждый шаг приближает тебя к цели. Не сдавайся, герой!");
    await prisma.user.update({where:{id:req.userId},data:{aiCoachAdvice:advice,aiCoachUpdatedAt:now}});
    res.json({advice,cached:false,updatedAt:now,isFreeToday});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── SMART SEARCH ──────────────────────────────────────────────────────────────
app.get("/search",authMiddleware,async(req,res)=>{
  try{
    const q=(req.query.q||"").trim().toLowerCase();
    if(!q||q.length<2)return res.json({tasks:[],friends:[],achievements:[],sections:[]});
    const tasks=await prisma.task.findMany({where:{userId:req.userId,title:{contains:q},completed:false},take:5,select:{id:true,title:true,branch:true,xpReward:true,completed:true}});
    const friends=await prisma.friendship.findMany({where:{userId:req.userId},include:{friend:{select:{id:true,name:true,email:true,level:true}}}});
    const matchedFriends=friends.filter(f=>(f.friend.name||f.friend.email||"").toLowerCase().includes(q)).slice(0,3).map(f=>f.friend);
    const userAchievements=await prisma.achievement.findMany({where:{userId:req.userId},select:{type:true}});
    const achievementKeys=Object.keys(ACHIEVEMENT_META).filter(k=>ACHIEVEMENT_META[k].label.toLowerCase().includes(q));
    const matchedAchievements=achievementKeys.slice(0,3).map(k=>({key:k,...ACHIEVEMENT_META[k],unlocked:userAchievements.some(a=>a.type===k)}));
    const SECTION_MAP=[{key:"tasks",label:"Квесты",icon:"⚔️"},{key:"shop",label:"Магазин",icon:"🛒"},{key:"library",label:"Библиотека",icon:"📚"},{key:"stats",label:"Статистика",icon:"📊"},{key:"mastery",label:"Мастерство",icon:"🗺️"},{key:"friends",label:"Друзья",icon:"👥"},{key:"clans",label:"Кланы",icon:"🏰"},{key:"chains",label:"Цепочки",icon:"⛓️"},{key:"worldmap",label:"Карта мира",icon:"🗺️"},{key:"marathons",label:"Марафоны",icon:"🏃"},{key:"skills",label:"Навыки",icon:"⚡"},{key:"npc",label:"NPC",icon:"👤"},{key:"focus",label:"Фокус",icon:"🎯"}];
    const matchedSections=SECTION_MAP.filter(s=>s.label.toLowerCase().includes(q)).slice(0,4);
    res.json({tasks,friends:matchedFriends,achievements:matchedAchievements,sections:matchedSections});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/health",(req,res)=>res.json({status:"ok"}));
// ── LEGEND PATH ───────────────────────────────────────────────────────────────
const LEGEND_MILESTONES={5:{gold:100,xp:500,title:"Ученик Легенды"},10:{gold:200,xp:1000,title:"Воин Легенды"},25:{gold:500,xp:2500,title:"Страж Легенды"},40:{gold:1000,xp:5000,title:"Мастер Легенды"},50:{gold:2000,xp:10000,title:"ЛЕГЕНДА"}};

app.get("/legend-path",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true}});
    if(user.level<40)return res.status(403).json({message:"Доступно с 40 уровня",unlockLevel:40});
    const completedCount=await prisma.task.count({where:{userId:req.userId,completed:true,type:"legend"}});
    const today=startOfToday();
    const completedToday=await prisma.task.count({where:{userId:req.userId,completed:true,type:"legend",completedAt:{gte:today}}});
    const pendingToday=await prisma.task.count({where:{userId:req.userId,completed:false,type:"legend",expiresAt:{gte:today}}});
    res.json({completedCount,completedToday,pendingToday,milestones:LEGEND_MILESTONES,unlockedAt:40});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/legend-path/claim-daily",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true,xp:true,gold:true,title:true}});
    if(user.level<40)return res.status(403).json({message:"Доступно с 40 уровня"});
    const today=startOfToday();
    const alreadyToday=await prisma.task.count({where:{userId:req.userId,type:"legend",expiresAt:{gte:today}}});
    if(alreadyToday>0)return res.status(400).json({message:"Легендарный квест на сегодня уже получен"});
    const completedCount=await prisma.task.count({where:{userId:req.userId,completed:true,type:"legend"}});
    const questNum=completedCount+1;
    const legendTitles=["Сокруши тьму","Сдержи бурю","Иди вперёд","Не отступай","Превзойди себя","Поднимись выше","Зажги факел","Пробуди силу","Стань легендой","Сломай оковы"];
    const title=legendTitles[questNum%legendTitles.length]||`Легендарное испытание #${questNum}`;
    const task=await prisma.task.create({data:{title,description:`Легендарный квест #${questNum} из 50. Выполни все обязательные квесты сегодня.`,branch:"discipline",type:"legend",difficulty:"hard",xpReward:150,goldReward:75,isDaily:true,expiresAt:endOfToday(),userId:req.userId}});
    res.json({task,questNum});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── CHESS ─────────────────────────────────────────────────────────────────────
const INIT_BOARD="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
app.post("/chess/invite/:friendId",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.friendId);
    const existing=await prisma.chessGame.findFirst({where:{OR:[{player1Id:req.userId,player2Id:friendId},{player1Id:friendId,player2Id:req.userId}],status:"active"}});
    if(existing)return res.status(400).json({message:"Игра уже идёт",gameId:existing.id});
    const game=await prisma.chessGame.create({data:{player1Id:req.userId,player2Id:friendId,board:INIT_BOARD}});
    res.status(201).json(game);
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});
app.get("/chess/game/:id",authMiddleware,async(req,res)=>{
  try{
    const game=await prisma.chessGame.findUnique({where:{id:Number(req.params.id)},include:{player1:{select:{id:true,name:true,email:true}},player2:{select:{id:true,name:true,email:true}}}});
    if(!game)return res.status(404).json({message:"Игра не найдена"});
    if(game.player1Id!==req.userId&&game.player2Id!==req.userId)return res.status(403).json({message:"Доступ запрещён"});
    res.json(game);
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});
app.get("/chess/my-games",authMiddleware,async(req,res)=>{
  try{
    const games=await prisma.chessGame.findMany({where:{OR:[{player1Id:req.userId},{player2Id:req.userId}]},include:{player1:{select:{id:true,name:true,email:true}},player2:{select:{id:true,name:true,email:true}}},orderBy:{updatedAt:"desc"},take:20});
    res.json(games);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});
app.post("/chess/game/:id/move",authMiddleware,async(req,res)=>{
  try{
    const game=await prisma.chessGame.findUnique({where:{id:Number(req.params.id)}});
    if(!game)return res.status(404).json({message:"Игра не найдена"});
    if(game.status!=="active")return res.status(400).json({message:"Игра завершена"});
    const isP1=game.player1Id===req.userId;
    const isP2=game.player2Id===req.userId;
    if(!isP1&&!isP2)return res.status(403).json({message:"Вы не участник"});
    const myColor=isP1?"white":"black";
    if(game.currentTurn!==myColor)return res.status(400).json({message:"Не ваш ход"});
    const{board,from,to,status,result}=req.body;
    const nextTurn=myColor==="white"?"black":"white";
    const updated=await prisma.chessGame.update({
      where:{id:game.id},
      data:{board,currentTurn:nextTurn,status:status||"active",result:result||null,updatedAt:new Date()},
      include:{player1:{select:{id:true,name:true}},player2:{select:{id:true,name:true}}},
    });
    if(status==="finished"&&result){
      const winnerId=result==="white"?game.player1Id:result==="black"?game.player2Id:null;
      const loserId=winnerId?(winnerId===game.player1Id?game.player2Id:game.player1Id):null;
      const updates=[];
      if(result==="draw"){
        updates.push(prisma.user.update({where:{id:game.player1Id},data:{xp:{increment:10}}}));
        updates.push(prisma.user.update({where:{id:game.player2Id},data:{xp:{increment:10}}}));
      }else if(winnerId){
        updates.push(prisma.user.update({where:{id:winnerId},data:{xp:{increment:15}}}));
        if(loserId)updates.push(prisma.user.update({where:{id:loserId},data:{xp:{increment:5}}}));
      }
      if(updates.length)await prisma.$transaction(updates);
    }
    res.json(updated);
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/debug/db",async(req,res)=>{
  try{
    const count=await prisma.user.count();
    res.json({status:"ok",users:count,db:process.env.DATABASE_URL});
  }catch(e){res.status(500).json({status:"error",message:e.message,code:e.code});}
});

const PORT=process.env.PORT||3001;
console.log(`Starting server on PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV}, DB=${process.env.DATABASE_URL||"file:./dev.db"}`);
app.listen(PORT,"0.0.0.0",()=>console.log(`SERVER STARTED ON ${PORT}`));
process.on("uncaughtException",e=>{console.error("UNCAUGHT:",e);process.exit(1);});
process.on("unhandledRejection",e=>{console.error("UNHANDLED:",e);process.exit(1);});