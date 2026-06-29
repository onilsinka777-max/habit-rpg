require("dotenv").config();
const http = require("http");
const cors = require("cors");
const express = require("express");
const { Server } = require("socket.io");
const prisma = require("./prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { ensureDailyQuests } = require("./questGenerator");
const { computeAutoClass, CLASS_LABELS, CLASS_TITLES } = require("./mastery");
const { ensureWeeklyLegendaryQuest } = require("./legendaryWeekly");
const { getCoachAdvice } = require("./aiCoach");
const { getKnowledgeChatReply, getAiSearchAnswer } = require("./knowledgeChat");
const { validateAndSanitizeInput, validateHistory, enforceRateLimit, safeError, KNOWLEDGE_DAILY_LIMIT } = require("./knowledgeSecurity");
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
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

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

const DUNGEON_BOSSES = {
  E:    { name:"Гоблин-вождь",  icon:"👺", hp:50,   rewardXp:50,   rewardGold:30,   penaltyGold:0,   penaltyXp:0,   fatigueMin:0   },
  D:    { name:"Скелет-воин",   icon:"💀", hp:100,  rewardXp:100,  rewardGold:60,   penaltyGold:50,  penaltyXp:0,   fatigueMin:0   },
  C:    { name:"Тёмный рыцарь", icon:"⚔️", hp:200,  rewardXp:200,  rewardGold:120,  penaltyGold:50,  penaltyXp:0,   fatigueMin:0   },
  B:    { name:"Дракон",        icon:"🐉", hp:400,  rewardXp:400,  rewardGold:250,  penaltyGold:100, penaltyXp:0,   fatigueMin:30  },
  A:    { name:"Некромант",     icon:"🧙", hp:700,  rewardXp:700,  rewardGold:450,  penaltyGold:200, penaltyXp:50,  fatigueMin:30  },
  S:    { name:"Древнее зло",   icon:"👁️", hp:1200, rewardXp:1200, rewardGold:800,  penaltyGold:400, penaltyXp:150, fatigueMin:30  },
  "S+": { name:"Тёмный бог",   icon:"☠️", hp:2500, rewardXp:2500, rewardGold:1500, penaltyGold:800, penaltyXp:300, fatigueMin:120 },
};
const DUNGEON_RANKS = ["E","D","C","B","A","S","S+"];
const TRAP_EVENTS = [
  { id:"gold",   icon:"🪙", text:"Найдено золото!",                                                 effect:"gold+50"      },
  { id:"torch",  icon:"🕯️", text:"Потерян факел — урон снижен на 20%",                              effect:"damage-20%"   },
  { id:"ally",   icon:"🧙", text:"Союзник присоединился! +5% урона за участника",                   effect:"ally+1"       },
  { id:"poison", icon:"☠️", text:"Ядовитый газ — выполни следующий квест за 1 час или получишь усталость", effect:"poison_timer" },
];

const RAID_EVENTS={
  positive:[
    {id:"alchemist",   icon:"⚗️", text:"Алхимик в темноте — союзник найден! +15% урона команды",          effect:"team_damage+15"},
    {id:"secret_room", icon:"💎", text:"Тайная комната! +200 золота к финальной награде",                 effect:"gold+200"},
    {id:"blessing",    icon:"🌟", text:"Благословение! Следующий квест даёт x2 урона",                    effect:"next_quest_x2"},
  ],
  negative:[
    {id:"spider",           icon:"🕷️", text:"Паучья сеть! Следующий квест не наносит урон — нужно выполнить 2",   effect:"double_quest"},
    {id:"necromancer_curse",icon:"💀", text:"Проклятие некроманта! HP босса восстановилось на 10%",               effect:"boss_heal+10%"},
    {id:"fire_trap",        icon:"🔥", text:"Огненная ловушка! Получаешь усталость 20 минут",                     effect:"fatigue+20"},
    {id:"boss_rage",        icon:"⚡", text:"Ярость босса! Контратака — теряешь золото",                          effect:"gold-random"},
  ],
  catastrophic:[
    {id:"ancient_gaze",  icon:"👁️", text:"Взгляд Древнего! Босс восстановил 25% HP",                            effect:"boss_heal+25%"},
    {id:"death_curse",   icon:"☠️", text:"Проклятие смерти! Если не победишь — потеряешь уровень",               effect:"level_loss_on_defeat"},
    {id:"reality_warp",  icon:"🌀", text:"Искажение реальности! Рейд превратился в S+",                         effect:"upgrade_to_s_plus"},
  ],
};
const BOSS_PHASES={
  B:   {trigger:0.5,icon:"🔥",text:"Дракон активировал Огненное дыхание! Квесты дают -30% урона",    effect:"damage-30%"},
  A:   {trigger:0.5,icon:"💀",text:"Некромант призвал скелетов! Нужен дополнительный квест для щита",  effect:"shield_quest"},
  S:   {trigger:0.5,icon:"😱",text:"Древнее зло пробудилось! Случайный участник теряет ход",           effect:"random_skip"},
  "S+":{trigger:0.5,icon:"🌑",text:"Апокалипсис начался! Каждые 30 минут HP восстанавливается на 5%", effect:"regen+5%"},
};

const DUNGEON_BOSS_POOLS={
  B:[
    {name:"Дракон Мортис 🐉",  hp:400, rewardXp:400, rewardGold:250, penaltyGold:100, penaltyXp:0,   fatigueMin:30,  icon:"🐉", phase2:"Огненное дыхание — урон -30%",          phase2effect:"damage*0.7"},
    {name:"Ледяной великан 🧊", hp:450, rewardXp:420, rewardGold:260, penaltyGold:100, penaltyXp:0,   fatigueMin:30,  icon:"🧊", phase2:"Заморозка — участник пропускает ход",    phase2effect:"skip_turn"},
    {name:"Морской змей 🌊",    hp:380, rewardXp:380, rewardGold:240, penaltyGold:100, penaltyXp:0,   fatigueMin:30,  icon:"🌊", phase2:"Волна — каждые 30 мин -5% HP команды",   phase2effect:"team_drain"},
    {name:"Повелитель летучих мышей 🦇",hp:350,rewardXp:360,rewardGold:230,penaltyGold:100,penaltyXp:0,fatigueMin:30,icon:"🦇",phase2:"Миньоны — нужен доп квест",              phase2effect:"extra_quest"},
  ],
  A:[
    {name:"Некромант Зарас 🧙", hp:700, rewardXp:700, rewardGold:450, penaltyGold:200, penaltyXp:50,  fatigueMin:30,  icon:"🧙", phase2:"Воскрешение — 1 раз восстанет",          phase2effect:"revive_once"},
    {name:"Призрачный король 👻",hp:650, rewardXp:680, rewardGold:440, penaltyGold:200, penaltyXp:50,  fatigueMin:30,  icon:"👻", phase2:"Невидимость — урон не считается 1ч",     phase2effect:"invincible_1h"},
    {name:"Демон хаоса 🔥",     hp:720, rewardXp:720, rewardGold:460, penaltyGold:200, penaltyXp:50,  fatigueMin:30,  icon:"🔥", phase2:"Хаос — случайно меняет правила",         phase2effect:"random_chaos"},
    {name:"Паучья матка 🕷️",    hp:680, rewardXp:690, rewardGold:445, penaltyGold:200, penaltyXp:50,  fatigueMin:30,  icon:"🕷️", phase2:"Яд — теряешь золото каждые 30 мин",    phase2effect:"gold_drain"},
  ],
};

const SURVIVAL_WAVES=[
  {wave:1,  enemy:"Гоблин 👺",           questsNeeded:1,timeMinutes:60  },
  {wave:3,  enemy:"Скелет 💀",           questsNeeded:2,timeMinutes:90  },
  {wave:5,  enemy:"Тёмный рыцарь ⚔️",   questsNeeded:2,timeMinutes:90  },
  {wave:8,  enemy:"Дракон 🐉",           questsNeeded:3,timeMinutes:120 },
  {wave:10, enemy:"Некромант 🧙",        questsNeeded:3,timeMinutes:120 },
  {wave:15, enemy:"Древнее зло 👁️",     questsNeeded:4,timeMinutes:150 },
  {wave:20, enemy:"Тёмный бог ☠️",      questsNeeded:5,timeMinutes:180 },
];

function getSurvivalWaveInfo(wave){
  let cfg=SURVIVAL_WAVES[0];
  for(const w of SURVIVAL_WAVES){if(wave>=w.wave)cfg=w;}
  const extraRounds=Math.max(0,Math.floor((wave-20)/5));
  const questsNeeded=wave>20?Math.ceil(cfg.questsNeeded*(1+extraRounds*0.5)):cfg.questsNeeded;
  return{...cfg,questsNeeded,waveName:cfg.enemy};
}

const CURSED_ARTIFACTS={
  sword_of_darkness:{name:"Меч Тьмы ⚔️",        bonus:"+100% урона в рейдах",             curse:"-20% XP с квестов",              effect:"raid_damage*2,quest_xp*0.8"},
  greed_ring:       {name:"Кольцо жадности 💍",  bonus:"+50% золота везде",                curse:"Провал рейда стоит x2",           effect:"gold*1.5,raid_penalty*2"},
  martyr_shield:    {name:"Щит мученика 🛡️",     bonus:"Защита от потери уровня всегда",   curse:"-30% золота с квестов",           effect:"level_protection,quest_gold*0.7"},
  ancient_eye:      {name:"Глаз Древнего 👁️",    bonus:"Видишь комнаты рогалика наперёд", curse:"20% шанс случайного штрафа каждый день",effect:"roguelike_preview,daily_curse_chance+20"},
  necro_bone:       {name:"Кость некроманта 💀",  bonus:"Воскрешение 1 раз при поражении", curse:"Стрик обнуляется при провале",    effect:"raid_revive,streak_reset_on_defeat"},
};

const DARK_PORTAL_BOSSES=[
  {name:"Тёмный Левиафан ☠️",  icon:"☠️"},
  {name:"Бездонная Бездна 🌑", icon:"🌑"},
  {name:"Владыка Тьмы ⚫",     icon:"⚫"},
];

function getPortalWeekStart(){const now=new Date();const d=now.getDay();const diff=d===0?-6:1-d;const s=new Date(now);s.setDate(now.getDate()+diff);s.setHours(0,0,0,0);return s;}

async function getOrCreateDarkPortal(){
  const now=new Date();
  const weekStart=getPortalWeekStart();
  const weekEnd=new Date(weekStart.getTime()+7*24*60*60*1000);
  let portal=await prisma.darkPortal.findFirst({where:{opensAt:{gte:weekStart},opensAt:{lt:weekEnd}}}).catch(()=>null);
  if(!portal){
    const b=DARK_PORTAL_BOSSES[Math.floor(Math.random()*DARK_PORTAL_BOSSES.length)];
    const opensAt=new Date();
    const closesAt=new Date(opensAt.getTime()+24*60*60*1000);
    portal=await prisma.darkPortal.create({data:{bossName:b.name,bossIcon:b.icon,bossHp:3000,currentHp:3000,opensAt,closesAt,status:"active"}}).catch(()=>null);
    if(portal){
      const allUsers=await prisma.user.findMany({select:{id:true}}).catch(()=>[]);
      for(const u of allUsers){
        await createNotification(u.id,"dark_portal","🌑 Тёмный портал открылся!","24 часа. Войди один. Победа даёт 2000 золота. Поражение стоит уровня.",portal.id).catch(()=>{});
      }
    }
  }
  return portal;
}

function randomClanTag(n=6){let o="";for(let i=0;i<n;i++)o+=CLAN_TAG_CHARS[Math.floor(Math.random()*CLAN_TAG_CHARS.length)];return o;}
async function generateUniqueClanTag(){let t,e=true;while(e){t=randomClanTag();e=!!(await prisma.clan.findUnique({where:{tag:t}}));}return t;}
function getMasteryState(user){const raw=user.masteryChoices?JSON.parse(user.masteryChoices):{};return new Set(raw.completed||[]);}
function getMasteryTitle(path){return{warrior:"Воин",sage:"Мудрец",leader:"Атлет",balance:"Мыслитель"}[path]||"Мастер";}
function getWeekStart(){const now=new Date();const d=now.getDay();const diff=d===0?-6:1-d;const s=new Date(now);s.setDate(now.getDate()+diff);s.setHours(0,0,0,0);return s;}
function getWeekEnd(){const s=getWeekStart();return new Date(s.getTime()+7*24*60*60*1000);}

async function applyRaidEventEffect(raid,evt){
  try{
    switch(evt.effect){
      case"gold+200":
        await prisma.user.update({where:{id:raid.userId},data:{gold:{increment:200}}});break;
      case"boss_heal+10%":{
        const h=Math.floor(raid.bossHp*0.1);
        await prisma.dungeonRaid.update({where:{id:raid.id},data:{currentHp:Math.min(raid.bossHp,raid.currentHp+h)}});break;}
      case"boss_heal+25%":{
        const h=Math.floor(raid.bossHp*0.25);
        await prisma.dungeonRaid.update({where:{id:raid.id},data:{currentHp:Math.min(raid.bossHp,raid.currentHp+h)}});break;}
      case"fatigue+20":
        await prisma.user.update({where:{id:raid.userId},data:{fatiguedUntil:new Date(Date.now()+20*60000)}});break;
      case"gold-random":{
        const loss=Math.floor(Math.random()*50)+1;
        const u=await prisma.user.findUnique({where:{id:raid.userId},select:{gold:true}});
        await prisma.user.update({where:{id:raid.userId},data:{gold:{decrement:Math.min(loss,u?.gold||0)}}});break;}
      case"upgrade_to_s_plus":{
        const spBoss=DUNGEON_BOSSES["S+"];
        await prisma.dungeonRaid.update({where:{id:raid.id},data:{difficulty:"S+",bossName:spBoss.name,bossIcon:spBoss.icon,bossHp:spBoss.hp}});break;}
      default:{
        const ongoing=["team_damage+15","next_quest_x2","double_quest","level_loss_on_defeat","random_skip","regen+5%","shield_quest","damage-30%"];
        if(ongoing.includes(evt.effect)){
          const cur=JSON.parse(raid.activeEventEffects||"[]");
          if(!cur.includes(evt.effect)){await prisma.dungeonRaid.update({where:{id:raid.id},data:{activeEventEffects:JSON.stringify([...cur,evt.effect])}});}
        }
      }
    }
  }catch(e){console.error("applyRaidEventEffect error:",e.message);}
}

async function maybeCreateRaidEvent(raid){
  try{
    const lastEvt=await prisma.raidEvent.findFirst({where:{raidId:raid.id},orderBy:{triggeredAt:"desc"}});
    const twoH=2*60*60*1000;
    const shouldTrigger=!lastEvt||(Date.now()-new Date(lastEvt.triggeredAt).getTime()>twoH);
    if(!shouldTrigger)return null;
    const isHigh=["S","S+"].includes(raid.difficulty);
    const r=Math.random();
    let eventType;
    if(isHigh){if(r<0.3)eventType="positive";else if(r<0.8)eventType="negative";else eventType="catastrophic";}
    else{if(r<0.3)eventType="positive";else eventType="negative";}
    const pool=RAID_EVENTS[eventType];
    const evt=pool[Math.floor(Math.random()*pool.length)];
    const freshRaid=await prisma.dungeonRaid.findUnique({where:{id:raid.id}});
    const created=await prisma.raidEvent.create({data:{raidId:raid.id,userId:raid.userId,eventType,eventId:evt.id,eventText:`${evt.icon} ${evt.text}`}});
    await applyRaidEventEffect(freshRaid||raid,evt);
    io.emit("raid:event",{raidId:raid.id,event:{...created,eventType},icon:evt.icon,text:evt.text,isCatastrophic:eventType==="catastrophic"});
    return created;
  }catch(e){console.error("maybeCreateRaidEvent error:",e.message);return null;}
}

async function applyLevelLossIfNeeded(raid,userId){
  try{
    const partySize=(raid.raidParticipants?.length)||1;
    if(partySize>=3)return null;
    const noPenP=await prisma.purchase.findFirst({where:{userId,item:{effect:"raid_no_penalty"}}});
    if(noPenP){
      if((noPenP.quantity||1)>1)await prisma.purchase.update({where:{id:noPenP.id},data:{quantity:{decrement:1}}}).catch(()=>{});
      else await prisma.purchase.delete({where:{id:noPenP.id}}).catch(()=>{});
      await createNotification(userId,"raid_protected","📜 Свиток защиты","Свиток поглотил штраф за поражение!").catch(()=>{});
      return null;
    }
    const deathCurse=await prisma.raidEvent.findFirst({where:{raidId:raid.id,eventId:"death_curse",resolved:false}}).catch(()=>null);
    const isSPlus=raid.difficulty==="S+";
    const isS=raid.difficulty==="S";
    const user=await prisma.user.findUnique({where:{id:userId},select:{xp:true,level:true}});
    const minLvl=5;
    if(isSPlus||deathCurse){
      if(user.level>minLvl){
        await prisma.user.update({where:{id:userId},data:{level:{decrement:1},xp:0}});
        await createNotification(userId,"level_lost","💔 Уровень потерян",`Ты потерял уровень! Текущий: ${user.level-1}`).catch(()=>{});
        return{levelLost:true,newLevel:user.level-1};
      }
      return null;
    }
    if(isS){
      const xpLoss=Math.floor(user.xp*0.3);
      const newXp=user.xp-xpLoss;
      if(newXp<=0&&user.level>minLvl){
        await prisma.user.update({where:{id:userId},data:{level:{decrement:1},xp:0}});
        return{levelLost:true,newLevel:user.level-1,xpLost:xpLoss};
      }else{
        await prisma.user.update({where:{id:userId},data:{xp:Math.max(0,newXp)}});
        return{xpLost:xpLoss};
      }
    }
  }catch(e){console.error("applyLevelLossIfNeeded error:",e.message);}
  return null;
}

const ACHIEVEMENT_META={
  // ── Квесты ─────────────────────────────────────────────────────────────────
  first_quest:      {label:"Первый шаг",          desc:"Выполни первый квест",                   icon:"🌟", xpReward:15},
  quests_10:        {label:"Начало пути",          desc:"Выполни 10 квестов",                     icon:"📜", xpReward:30},
  quests_50:        {label:"Пятидесятник",         desc:"Выполни 50 квестов",                     icon:"🏅", xpReward:150},
  quests_100:       {label:"Сотня",               desc:"Выполни 100 квестов",                    icon:"💯", xpReward:400},
  quests_250:       {label:"Легион",              desc:"Выполни 250 квестов",                    icon:"🏆", xpReward:800},
  quests_500:       {label:"Пятисотка",           desc:"Выполни 500 квестов",                    icon:"⚡", xpReward:1500},
  quests_1000:      {label:"Тысяча",              desc:"Выполни 1000 квестов",                   icon:"👑", xpReward:3000},
  branch_discipline:{label:"Фанат дисциплины",    desc:"50 квестов дисциплины",                  icon:"🛡️", xpReward:200},
  branch_fitness:   {label:"Атлет",               desc:"50 квестов фитнеса",                     icon:"💪", xpReward:200},
  branch_knowledge: {label:"Эрудит",              desc:"50 квестов знаний",                      icon:"📘", xpReward:200},
  branch_seldev:    {label:"Мыслитель",           desc:"50 квестов саморазвития",                icon:"🌱", xpReward:200},
  all_branches:     {label:"Гармония",            desc:"Выполни 5 квестов в каждой ветке",       icon:"☯️", xpReward:120},
  master_all:       {label:"Мастер всего",        desc:"100 квестов в каждой ветке",             icon:"🌀", xpReward:2000},
  // ── Стрик ──────────────────────────────────────────────────────────────────
  streak_3:         {label:"Тройная серия",       desc:"3 дня подряд",                           icon:"✨", xpReward:25},
  streak_7:         {label:"Первая неделя",       desc:"7 дней подряд",                          icon:"🔥", xpReward:75},
  streak_14:        {label:"Верный путь",         desc:"14 дней подряд",                         icon:"💎", xpReward:150},
  streak_30:        {label:"Месяц",               desc:"30 дней подряд",                         icon:"⚡", xpReward:350},
  streak_90:        {label:"Три месяца",          desc:"90 дней подряд",                         icon:"🌟", xpReward:700},
  streak_180:       {label:"Полгода",             desc:"180 дней подряд",                        icon:"💫", xpReward:1200},
  streak_365:       {label:"Год",                 desc:"365 дней подряд",                        icon:"🏆", xpReward:3000},
  streak_100:       {label:"Несломимый",          desc:"100 дней без заморозки",                 icon:"⚔️", xpReward:500},
  // ── Уровни ─────────────────────────────────────────────────────────────────
  level_5:          {label:"Новобранец",          desc:"Достигни 5 уровня",                      icon:"🗡️", xpReward:30},
  level_10:         {label:"Боец",                desc:"Достигни 10 уровня",                     icon:"⚔️", xpReward:100},
  level_20:         {label:"Ветеран",             desc:"Достигни 20 уровня",                     icon:"🗺️", xpReward:200},
  level_25:         {label:"Идущий по пути",      desc:"Достигни 25 уровня",                     icon:"🧬", xpReward:300},
  level_30:         {label:"Элита",               desc:"Достигни 30 уровня",                     icon:"💥", xpReward:400},
  level_40:         {label:"Мастер",              desc:"Достигни 40 уровня",                     icon:"🔮", xpReward:600},
  level_50:         {label:"Грандмастер",         desc:"Достигни 50 уровня",                     icon:"👑", xpReward:1000},
  level_75:         {label:"Легенда",             desc:"Достигни 75 уровня",                     icon:"⭐", xpReward:2000},
  level_100:        {label:"Бессмертный",         desc:"Достигни 100 уровня",                    icon:"🌌", xpReward:5000},
  // ── Социальное ─────────────────────────────────────────────────────────────
  social_first:     {label:"Не один",             desc:"Добавь первого друга",                   icon:"🤝", xpReward:50},
  social_5:         {label:"Команда",             desc:"5 друзей",                               icon:"👥", xpReward:150},
  social_20:        {label:"Армия",               desc:"20 друзей",                              icon:"👫", xpReward:400},
  clan_create:      {label:"Основатель",          desc:"Создай клан",                            icon:"⚜️", xpReward:100},
  clan_10:          {label:"Командир",            desc:"10 человек в клане",                     icon:"🏰", xpReward:200},
  clan_50:          {label:"Легион",              desc:"50 человек в клане",                     icon:"🔱", xpReward:500},
  shared_streak:    {label:"Союзник",             desc:"Совместный стрик 7 дней с другом",       icon:"🤜", xpReward:200},
  // ── Магазин ────────────────────────────────────────────────────────────────
  first_purchase:   {label:"Первая покупка",      desc:"Купи что-то в магазине",                 icon:"🛒", xpReward:25},
  purchases_10:     {label:"Шопоголик",           desc:"10 покупок",                             icon:"💳", xpReward:100},
  gold_1000:        {label:"Богач",               desc:"Накопи 1000 золота",                     icon:"💰", xpReward:150},
  gold_10000:       {label:"Сокровищница",        desc:"Накопи 10000 золота",                    icon:"🏅", xpReward:500},
  // ── Шахматы ────────────────────────────────────────────────────────────────
  chess_first:      {label:"Дебютант",            desc:"Сыграй первую партию",                   icon:"♟️", xpReward:30},
  chess_5wins:      {label:"Победитель",          desc:"Выиграй 5 партий",                       icon:"♚", xpReward:100},
  beat_laptev:      {label:"Победил создателя",   desc:"Обыграй LAPTEV в шахматы",               icon:"♟️", xpReward:200, hidden:true},
  chess_rating1500: {label:"Гроссмейстер",        desc:"Рейтинг 1500+",                          icon:"👑", xpReward:500},
  // ── Особые ─────────────────────────────────────────────────────────────────
  night_owl:        {label:"Ночная сова",         desc:"Квест между 2:00 и 4:00",                icon:"🦉", xpReward:50, hidden:true},
  early_bird:       {label:"Ранняя пташка",       desc:"Квест до 6:00",                          icon:"🐦", xpReward:50, hidden:true},
  perfectionist:    {label:"Перфекционист",       desc:"10 квестов за один день",                icon:"💯", xpReward:100, hidden:true},
  night_guard:      {label:"Ночной дозор",        desc:"5 квестов после 23:00",                  icon:"🌙", xpReward:100, hidden:true},
  philosopher:      {label:"Философ",             desc:"30 записей в дневнике",                  icon:"📔", xpReward:150},
  grateful_21:      {label:"Благодарный",         desc:"21 запись благодарностей",               icon:"🌿", xpReward:200},
  marathon_done:    {label:"Марафонец",           desc:"Завершить любой марафон",                icon:"🏃", xpReward:300},
  legend_10:        {label:"Легендарный путь",    desc:"10 легендарных квестов",                 icon:"👑", xpReward:500},
  legendary_done:   {label:"Легендарный",         desc:"Выполни первый легендарный квест",       icon:"⚔️", xpReward:200},
  chain_first:      {label:"Сила цепи",           desc:"Заверши шаг в цепочке квестов",          icon:"⛓️", xpReward:100},
  pomodoro_10:      {label:"Мастер фокуса",        desc:"Заверши 10 помодоро-сессий",              icon:"⏱️",  xpReward:80},
  pomodoro_100:     {label:"Хранитель времени",   desc:"100 помодоро-сессий",                     icon:"⏰",  xpReward:500},
  sage_added:       {label:"Мудрец совета",        desc:"Попасть в раздел Мудрецы",              icon:"🏛️", xpReward:200, hidden:true},
  perfect_day:      {label:"Идеальный день",       desc:"Выполни все обязательные квесты дня",    icon:"✅",  xpReward:200},
  combo_master:     {label:"Мастер комбо",         desc:"Активируй режим потока 10 раз",          icon:"⚡",  xpReward:300},
  first_season_quest:{label:"Дитя сезона",         desc:"Выполни первый сезонный квест",          icon:"🌟",  xpReward:100},
  season_quests_30: {label:"Сезонный воин",        desc:"30 сезонных квестов",                    icon:"❄️",  xpReward:500},
  world_map_5:      {label:"Исследователь",        desc:"Открой 5 локаций на карте мира",         icon:"🗺️", xpReward:300},
  world_map_all:    {label:"Картограф",            desc:"Открой все локации карты мира",          icon:"🌍",  xpReward:1000},
  journal_10:       {label:"Летописец",            desc:"10 записей в дневнике",                  icon:"📔",  xpReward:150},
  goals_5:          {label:"Целеустремлённый",     desc:"Выполни 5 целей",                        icon:"🎯",  xpReward:300},
  chest_7:          {label:"Сундучник",            desc:"Получи сундук за стрик 7 дней",          icon:"📦",  xpReward:100},
  chest_28:         {label:"Легендарный сундук",   desc:"Получи сундук за стрик 28 дней",         icon:"🏆",  xpReward:500},
  npc_activated:    {label:"Нашёл наставника",     desc:"Активируй NPC наставника",               icon:"🧙",  xpReward:100},
  profile_complete: {label:"Личность",             desc:"Загрузи аватар",                         icon:"👤",  xpReward:100},
  skill_first:      {label:"Первый навык",         desc:"Разблокируй первый навык",               icon:"✨",  xpReward:150},
  skills_all_branch:{label:"Мастер навыков",       desc:"Разблокируй все навыки ветки",           icon:"🌟",  xpReward:1000},
  legend_path_complete:{label:"Легенда",           desc:"Завершить Легендарный путь (50 квестов)",icon:"♾️",  xpReward:10000, goldReward:5000},
  streak_60:        {label:"Два месяца",           desc:"Стрик 60 дней",                          icon:"🔥",  xpReward:750},
  level_40:         {label:"Мастер",               desc:"Достигни 40 уровня",                     icon:"🔮",  xpReward:600},
  // ── Архив ──────────────────────────────────────────────────────────────────
  archive_solved:   {label:"Архивариус",             desc:"Ты нашёл архив и разгадал его тайну. Немногие знают что он существует.", icon:"◈", xpReward:1000, goldReward:0, hidden:true},
  // ── Тёмная сторона ─────────────────────────────────────────────────────────
  defeated_darkness:{label:"Победивший тьму",       desc:"Ты заглянул в бездну и вернулся. Теперь система для тебя — не клетка, а оружие.", icon:"⚡", xpReward:1000, goldReward:500, hidden:true},
  shadow_walker:    {label:"Идущий в тени",          desc:"Ты отказался вернуться. LAPTEV всё равно вернул тебя. Падший и восставший.",      icon:"🌑", xpReward:1500, goldReward:750, hidden:true},
  path_of_antagonist:{label:"Путь Антагониста",     desc:"Ты прошёл через тьму и вышел другим. Немногие знают что это такое.",             icon:"👁️", xpReward:2000, goldReward:1000, hidden:true},
  // ── Покой ──────────────────────────────────────────────────────────────────
  peace_unlocked:   {label:"Пятая ветка",              desc:"Ты нашёл Игрока №2 и открыл ветку Покоя. Немногие знают что она существует.", icon:"🌑", xpReward:1500, goldReward:500, hidden:true},
  // ── Финальное (скрытое) ────────────────────────────────────────────────────
  all_achievements: {label:"Игрок, достигший величия", desc:"Получи все достижения",             icon:"🌌",  xpReward:5000, goldReward:2000, hidden:true},
  // ── Рейды ─────────────────────────────────────────────────────────────────
  raid_first:        {label:"Первая кровь",         desc:"Победи первого босса в рейде",              icon:"🩸", xpReward:50},
  raid_10:           {label:"Убийца боссов",         desc:"Победи 10 боссов в рейдах",                icon:"💀", xpReward:200},
  raid_legend:       {label:"Охотник на легенды",    desc:"Победи рейд уровня S+",                    icon:"☠️", xpReward:500},
  raid_illusion:     {label:"Иллюзионист",           desc:"Выживи в иллюзорном подземелье",           icon:"🔮", xpReward:150},
  raid_team:         {label:"Командный игрок",       desc:"Заверши рейд с 3+ участниками",            icon:"🤝", xpReward:200},
  raid_survivor:     {label:"Выживший",              desc:"Победи рейд сложности S",                  icon:"👁️", xpReward:300},
  raid_all:          {label:"Покоритель подземелий", desc:"Победи все 7 типов боссов E/D/C/B/A/S/S+", icon:"🏰", xpReward:1000},
  raid_goblin_slayer:{label:"Убийца Гоблинов",       desc:"5 побед E/D уровней",                      icon:"👺", xpReward:100},
  raid_dragon_slayer:{label:"Драконобой",            desc:"Победи дракона (сложность B)",             icon:"🐉", xpReward:200},
  raid_dungeon_legend:{label:"Легенда подземелья",   desc:"50 рейдов завершено победой",              icon:"🗡️", xpReward:500},
  raid_unbeaten:     {label:"Непобеждённый",         desc:"10 побед подряд без единого поражения",    icon:"⚔️", xpReward:300},
  leviathan_slayer:  {label:"Покоритель Левиафана",  desc:"Войди в топ-3 по урону по Левиафану",     icon:"🐋", xpReward:1000, hidden:true},
};

const RAID_TITLE_MAP={
  raid_goblin_slayer:"Убийца Гоблинов",
  raid_dragon_slayer:"Драконобой",
  raid_dungeon_legend:"Легенда подземелья",
  raid_unbeaten:"Непобеждённый",
  leviathan_slayer:"Покоритель Левиафана",
};

async function checkRaidAchievements(userId,raid){
  const granted=[];
  try{
    const victories=await prisma.dungeonRaid.count({where:{userId,status:"victory"}});
    const toCheck=[];
    if(victories>=1)toCheck.push("raid_first");
    if(victories>=10)toCheck.push("raid_10");
    if(victories>=50)toCheck.push("raid_dungeon_legend");
    if(raid.difficulty==="S+")toCheck.push("raid_legend");
    if(["S","S+"].includes(raid.difficulty))toCheck.push("raid_survivor");
    if(raid.isIllusion)toCheck.push("raid_illusion");
    if((raid.raidParticipants?.length||0)>=3)toCheck.push("raid_team");
    const beaten=await prisma.dungeonRaid.groupBy({by:["difficulty"],where:{userId,status:"victory"}});
    if(beaten.length>=7)toCheck.push("raid_all");
    const easyWins=await prisma.dungeonRaid.count({where:{userId,status:"victory",difficulty:{in:["E","D"]}}});
    if(easyWins>=5)toCheck.push("raid_goblin_slayer");
    const dragonWin=await prisma.dungeonRaid.findFirst({where:{userId,status:"victory",difficulty:"B"}});
    if(dragonWin)toCheck.push("raid_dragon_slayer");
    const last10=await prisma.dungeonRaid.findMany({where:{userId,status:{in:["victory","defeat","abandoned"]}},orderBy:{createdAt:"desc"},take:10});
    if(last10.length>=10&&last10.every(r=>r.status==="victory"))toCheck.push("raid_unbeaten");
    for(const achType of toCheck){
      const existing=await prisma.achievement.findFirst({where:{userId,type:achType}});
      if(!existing){
        await prisma.achievement.create({data:{userId,type:achType}}).catch(()=>{});
        const meta=ACHIEVEMENT_META[achType];
        if(meta?.xpReward)await prisma.user.update({where:{id:userId},data:{xp:{increment:meta.xpReward}}});
        if(RAID_TITLE_MAP[achType]){
          const u=await prisma.user.findUnique({where:{id:userId},select:{activeTitle:true}});
          if(!u?.activeTitle)await prisma.user.update({where:{id:userId},data:{activeTitle:RAID_TITLE_MAP[achType]}}).catch(()=>{});
        }
        granted.push({type:achType,...(meta||{})});
        await createNotification(userId,"raid_achievement",`${meta?.icon||"🏆"} ${meta?.label||achType}`,meta?.desc||"").catch(()=>{});
      }
    }
  }catch(e){console.error("checkRaidAchievements error:",e.message);}
  return granted;
}

// Title is ONLY set by mastery finish / level 50 / legend path. Achievement count no longer drives it.
function computeTitle(count){return"Игрок";}

function computePetState(pet,streak){
  const h=(Date.now()-new Date(pet.lastFed).getTime())/3600000;
  const hunger=Math.min(100,Math.round(h*4));
  const mood=Math.max(0,Math.min(100,pet.mood-Math.max(0,hunger-50)));
  const stage=streak>=30?"adult":streak>=14?"baby":"egg";
  return{...pet,hunger,mood,stage,canFeed:h>=1};
}

async function handlePostComplete(userId,streak,level,taskType){
  const completedCount=await prisma.task.count({where:{userId,completed:true}});
  const legendaryCount=await prisma.task.count({where:{userId,completed:true,type:{in:["legendary","legend"]}}});
  const branchCounts=await prisma.task.groupBy({by:["branch"],where:{userId,completed:true},_count:{id:true}});
  const bc=(b)=>(branchCounts.find(x=>x.branch===b)?._count.id||0);
  const allBranchDone=["discipline","fitness","self_development","knowledge"].every(b=>bc(b)>=5);
  const masterAll=["discipline","fitness","self_development","knowledge"].every(b=>bc(b)>=100);
  const pomodoroCount=await prisma.task.count({where:{userId,completed:true,type:"pomodoro"}}).catch(()=>0);
  const user=await prisma.user.findUnique({where:{id:userId},select:{gold:true,chessWins:true,chessRating:true,streak:true,streakFreezeCount:true}});
  const existing=await prisma.achievement.findMany({where:{userId},select:{type:true}});
  const existingSet=new Set(existing.map(a=>a.type));
  // Legendary path completion: title only, no HallOfFame (HallOfFame is for Creator Path only)
  if(legendaryCount>=50){
    const alreadyLegend=await prisma.user.findUnique({where:{id:userId},select:{title:true}}).catch(()=>null);
    if(alreadyLegend&&alreadyLegend.title!=="Легенда"&&alreadyLegend.title!=="Победитель системы"){
      await prisma.user.update({where:{id:userId},data:{title:"Легенда"}}).catch(()=>{});
    }
  }
  const conditions={
    first_quest:completedCount>=1,
    quests_10:completedCount>=10,
    quests_50:completedCount>=50,
    quests_100:completedCount>=100,
    quests_250:completedCount>=250,
    quests_500:completedCount>=500,
    quests_1000:completedCount>=1000,
    branch_discipline:bc("discipline")>=50,
    branch_fitness:bc("fitness")>=50,
    branch_knowledge:bc("knowledge")>=50,
    branch_seldev:bc("self_development")>=50,
    all_branches:allBranchDone,
    master_all:masterAll,
    streak_3:streak>=3,
    streak_7:streak>=7,
    streak_14:streak>=14,
    streak_30:streak>=30,
    streak_90:streak>=90,
    streak_180:streak>=180,
    streak_365:streak>=365,
    level_5:level>=5,
    level_10:level>=10,
    level_20:level>=20,
    level_25:level>=25,
    level_30:level>=30,
    level_40:level>=40,
    level_50:level>=50,
    level_75:level>=75,
    level_100:level>=100,
    legendary_done:legendaryCount>=1,
    legend_10:legendaryCount>=10,
    chain_first:false, // triggered separately
    pomodoro_10:pomodoroCount>=10,
    gold_1000:(user?.gold||0)>=1000,
    gold_10000:(user?.gold||0)>=10000,
    chess_first:(user?.chessWins||0)>=1,
    chess_5wins:(user?.chessWins||0)>=5,
    chess_rating1500:(user?.chessRating||1000)>=1500,
  };
  const toGrant=Object.entries(conditions).filter(([t,v])=>v&&!existingSet.has(t)).map(([t])=>t);
  // Check all achievements unlocked
  const totalAchievements=Object.keys(ACHIEVEMENT_META).filter(k=>k!=="all_achievements").length;
  if(!existingSet.has("all_achievements")&&(existing.length+toGrant.length)>=totalAchievements){
    toGrant.push("all_achievements");
  }
  let newAchievements=[];
  if(toGrant.length>0){
    for(const type of toGrant){await prisma.achievement.create({data:{userId,type}}).catch(()=>{});}
    {// recheck existing after creates to avoid bonus duplication
    }
    const u=await prisma.user.findUnique({where:{id:userId}});
    let bonusXp=0,bonusGold=0;
    for(const t of toGrant){bonusXp+=(ACHIEVEMENT_META[t]?.xpReward||0);bonusGold+=(ACHIEVEMENT_META[t]?.goldReward||0);}
    const updates={};
    if(bonusXp>0){const{xp,level:nl}=applyXpGain(u.xp,u.level,bonusXp);updates.xp=xp;updates.level=nl;}
    if(bonusGold>0)updates.gold={increment:bonusGold};
    if(Object.keys(updates).length>0)await prisma.user.update({where:{id:userId},data:updates});
    newAchievements=toGrant.map(type=>({type,...ACHIEVEMENT_META[type]}));
  }
  let petCreated=false;
  if(streak>=7){const pet=await prisma.pet.findUnique({where:{userId}});if(!pet){await prisma.pet.create({data:{userId}});petCreated=true;}}

  // ── Level 45: unlock Player2 ─────────────────────────────────────────────
  if(level>=45){
    const up2=await prisma.user.findUnique({where:{id:userId},select:{player2Unlocked:true}});
    if(!up2?.player2Unlocked){
      await prisma.user.update({where:{id:userId},data:{player2Unlocked:true}});
      await createNotification(userId,"player2_arrived","❓ Я видел тебя раньше.","❓ Я видел тебя раньше. Точнее — видел таких как ты. Скоро поймёшь что имею в виду. — Игрок №2").catch(()=>{});
    }
  }

  // ── Level 40: unlock archive ────────────────────────────────────────────────
  if(level>=40){
    const uArch=await prisma.user.findUnique({where:{id:userId},select:{archiveUnlocked:true}});
    if(!uArch?.archiveUnlocked){
      await prisma.user.update({where:{id:userId},data:{archiveUnlocked:true}});
    }
  }

  // ── Level 35: dark side night invite ────────────────────────────────────────
  if(level>=35){
    const uds=await prisma.user.findUnique({where:{id:userId},select:{darkSideActive:true,darkSideChoice:true}});
    if(!uds?.darkSideActive&&!uds?.darkSideChoice){
      const existInvite=await prisma.notification.findFirst({where:{userId,type:"dark_side_invite"}});
      if(!existInvite){
        const h=new Date().getHours();
        if(h>=22||h<6){
          await createNotification(userId,"dark_side_invite","⚫ Система говорит...","_system_: Ты думаешь что строишь дисциплину. На самом деле ты строишь клетку. Я покажу тебе другой путь. Открой если не боишься.");
        }
      }
    }
  }

  // ── Antagonist path: unlock after any dark side completion ──────────────────
  const uAnt=await prisma.user.findUnique({where:{id:userId},select:{darkSideChoice:true,antagonistPathActive:true}});
  if(uAnt?.darkSideChoice&&!uAnt?.antagonistPathActive){
    await prisma.user.update({where:{id:userId},data:{antagonistPathActive:true}});
    await createNotification(userId,"antagonist_path_unlocked","👁️ Путь Антагониста открыт","Ты познал тьму. Теперь используй её как оружие. Специальные квесты доступны раз в неделю.").catch(()=>{});
  }

  return{newAchievements,petCreated};
}

// ── Archive: solve helper ────────────────────────────────────────────────────
async function solveArchive(userId){
  const user=await prisma.user.findUnique({where:{id:userId}});
  if(!user||user.archiveSolved)return;
  await prisma.user.update({where:{id:userId},data:{archiveSolved:true,archiveXpBonus:true,gold:{increment:2500}}});
  const existing=await prisma.achievement.findFirst({where:{userId,type:"archive_solved"}});
  if(!existing){
    await prisma.achievement.create({data:{userId,type:"archive_solved"}}).catch(()=>{});
    const{xp,level}=applyXpGain(user.xp,user.level,ACHIEVEMENT_META.archive_solved.xpReward||1000);
    await prisma.user.update({where:{id:userId},data:{xp,level,title:"Архивариус"}});
  }
  await createNotification(userId,"archive_solved","◈ Архив раскрыт","LAPTEV: Да, именно так всё и началось. Но не стоит ограничиваться. Продолжай выполнять все квесты. Рад что ты смог догадаться.").catch(()=>{});
}

async function calculateRewards(cu,task,{comboMult=1,npcBonusMult=1,autoClass=null}={}){
  try{
    const now=new Date();
    const xpBActive=cu.xpBoostExpiresAt&&new Date(cu.xpBoostExpiresAt)>now;
    const gBActive=cu.goldBoostExpiresAt&&new Date(cu.goldBoostExpiresAt)>now;
    const xpM=(xpBActive?1.5:1)*(cu.xpBoostPermanent?1.25:1);
    const goldM=(gBActive?1.5:1)*(cu.goldBoostPermanent?1.25:1);
    const mMult=getMasteryMultipliers(cu.masteryPath||autoClass,task.branch);
    const CLASS_BRANCH={warrior:'discipline',sage:'knowledge',strategist:'discipline',explorer:'fitness',balance:null,leader:'discipline'};
    const classBranch=CLASS_BRANCH[cu.masteryPath||autoClass]||null;
    const classBonusMult=(classBranch&&task.branch===classBranch)?1.1:1.0;
    const archiveMult=cu.archiveXpBonus?1.1:1.0;
    const pet=await prisma.pet.findUnique({where:{userId:cu.id}}).catch(()=>null);
    const petStage=pet?(cu.streak>=30?'adult':cu.streak>=14?'baby':'egg'):null;
    const petMult=petStage==='adult'?1.05:petStage==='baby'?1.02:1.0;
    const userSkills=await prisma.userSkill.findMany({where:{userId:cu.id},include:{skill:true}}).catch(()=>[]);
    let skillXpMult=1.0,skillGoldMult=1.0;
    for(const us of userSkills){
      const{effect,value}=us.skill;
      if(effect==='global_xp_boost')skillXpMult*=(1+value);
      else if(effect==='required_xp_boost'&&task.type==='required'&&task.branch==='discipline')skillXpMult*=(1+value);
      else if((effect==='fitness_xp'||effect==='fitness_xp_major')&&task.branch==='fitness')skillXpMult*=(1+value);
      else if((effect==='knowledge_xp'||effect==='knowledge_xp_major'||effect==='knowledge_master')&&task.branch==='knowledge')skillXpMult*=(1+value);
      else if((effect==='self_xp'||effect==='self_xp_major')&&task.branch==='self_development')skillXpMult*=(1+value);
      if(effect==='all_required_gold'&&task.type==='required')skillGoldMult*=value;
      if(effect==='fitness_gold'&&task.branch==='fitness')skillGoldMult*=(1+value/100);
    }
    const xpGained=Math.round(task.xpReward*mMult.xp*xpM*comboMult*npcBonusMult*classBonusMult*archiveMult*petMult*skillXpMult);
    const goldGained=Math.floor(task.goldReward*getGoldMultiplier()*mMult.gold*goldM*classBonusMult*skillGoldMult);
    const totalXpMult=Math.round(mMult.xp*xpM*comboMult*npcBonusMult*classBonusMult*archiveMult*petMult*skillXpMult*100)/100;
    const totalGoldMult=Math.round(mMult.gold*goldM*classBonusMult*skillGoldMult*100)/100;
    return{xpGained,goldGained,multipliers:{total_xp:totalXpMult,total_gold:totalGoldMult,breakdown:{xpBoost:xpM,goldBoost:goldM,classBonus:classBonusMult,petBonus:petMult,archiveBonus:archiveMult,skillXpBonus:Math.round(skillXpMult*100)/100,skillGoldBonus:Math.round(skillGoldMult*100)/100,comboBonus:comboMult,npcBonus:npcBonusMult,masteryBonus:mMult.xp}}};
  }catch(e){
    console.error('calculateRewards error:',e.message);
    return{xpGained:task.xpReward||15,goldGained:task.goldReward||8,multipliers:{total_xp:1,total_gold:1,breakdown:{}}};
  }
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
    flowActive:(user.comboCount||0)>=5,
    createdAt:user.createdAt,
    avatar:user.avatar||null,
    chessRating:user.chessRating||1000,
    activeNpcId:user.activeNpcId||null,
    missedDaysStreak:user.missedDaysStreak||0,
    tasksToday:await prisma.task.count({where:{userId:req.userId,completed:true,createdAt:{gte:today}}}).catch(()=>0),
    xpToday:0,
    darkSideActive:user.darkSideActive||false,
    darkSideDay:user.darkSideDay||0,
    darkSideStartedAt:user.darkSideStartedAt||null,
    darkSideChoice:user.darkSideChoice||null,
    antagonistPathActive:user.antagonistPathActive||false,
    archiveUnlocked:user.archiveUnlocked||false,
    archiveSolved:user.archiveSolved||false,
    archiveFitnessDays:user.archiveFitnessDays||0,
    archiveXpBonus:user.archiveXpBonus||false,
    player2Unlocked:user.player2Unlocked||false,
    player2QuestDay:user.player2QuestDay||0,
    player2Completed:user.player2Completed||false,
    peaceUnlocked:user.peaceUnlocked||false,
    activeTitle:user.activeTitle||null,
    isPro:!!(user.isPro&&(!user.proExpiresAt||new Date(user.proExpiresAt)>now)),
    proExpiresAt:user.proExpiresAt||null,
    fatiguedUntil:user.fatiguedUntil||null,
    activeRaidId:user.activeRaidId||null,
  });
  // Update lastLoginAt
  await prisma.user.update({where:{id:req.userId},data:{lastLoginAt:now}}).catch(()=>{});
});

app.get("/bonuses",authMiddleware,async(req,res)=>{
  try{
    const now=new Date();
    const user=await prisma.user.findUnique({
      where:{id:req.userId},
      include:{userSkills:{include:{skill:true}},pet:true},
    });
    const autoClass=user.masteryPath?null:await computeAutoClass(req.userId);
    const CLASS_BRANCH_B={warrior:'discipline',sage:'knowledge',strategist:'discipline',explorer:'fitness',balance:null,leader:'discipline'};
    const CLASS_NAMES_B={warrior:'Воин',sage:'Мудрец',strategist:'Стратег',explorer:'Следопыт',balance:'Баланс',leader:'Лидер'};
    const BRANCH_NAMES_B={discipline:'Дисциплина',fitness:'Фитнес',knowledge:'Знания',self_development:'Саморазвитие'};
    const bonuses=[];
    let totalXpMult=1.0,totalGoldMult=1.0;
    // 1. XP буст
    const xpBActive=user.xpBoostExpiresAt&&new Date(user.xpBoostExpiresAt)>now;
    if(xpBActive){
      bonuses.push({icon:'⚡',name:'Буст опыта (24ч)',description:'Временный буст из магазина',xpBonus:'+50% XP',source:'Магазин',expiresAt:user.xpBoostExpiresAt});
      totalXpMult*=1.5;
    }
    if(user.xpBoostPermanent){
      bonuses.push({icon:'⚡',name:'Постоянный буст XP',description:'Куплен навсегда',xpBonus:'+25% XP',source:'Магазин'});
      totalXpMult*=1.25;
    }
    // 2. Gold буст
    const gBActive=user.goldBoostExpiresAt&&new Date(user.goldBoostExpiresAt)>now;
    if(gBActive){
      bonuses.push({icon:'💰',name:'Буст золота (24ч)',description:'Временный буст из магазина',goldBonus:'+50% золота',source:'Магазин',expiresAt:user.goldBoostExpiresAt});
      totalGoldMult*=1.5;
    }
    if(user.goldBoostPermanent){
      bonuses.push({icon:'💰',name:'Постоянный буст золота',description:'Куплен навсегда',goldBonus:'+25% золота',source:'Магазин'});
      totalGoldMult*=1.25;
    }
    // 3. Класс
    const cls=user.masteryPath||autoClass;
    if(cls){
      const branch=CLASS_BRANCH_B[cls];
      bonuses.push({icon:'⚔️',name:`Класс: ${CLASS_NAMES_B[cls]||cls}`,description:branch?`+10% XP за квесты (${BRANCH_NAMES_B[branch]||branch})`:`+10% XP ко всем`,xpBonus:'+10% XP',source:'Класс персонажа'});
      totalXpMult*=1.1;
      totalGoldMult*=1.1;
    }
    // 4. Питомец
    if(user.pet){
      const petStage=user.streak>=30?'adult':user.streak>=14?'baby':'egg';
      const pct=petStage==='adult'?5:petStage==='baby'?2:0;
      if(pct>0){
        bonuses.push({icon:petStage==='adult'?'🐾':'🥚',name:`Питомец (${petStage==='adult'?'Взрослый':'Детёныш'})`,description:petStage==='adult'?'Взрослый питомец':'Питомец растёт',xpBonus:`+${pct}% XP`,source:'Питомец'});
        totalXpMult*=(1+pct/100);
      }
    }
    // 5. Архив
    if(user.archiveXpBonus){
      bonuses.push({icon:'◈',name:'Архивариус',description:'Получен за решение тайны Архива. Навсегда.',xpBonus:'+10% XP навсегда',source:'Архив'});
      totalXpMult*=1.1;
    }
    // 6. Навыки
    const XP_EFFECTS=['global_xp_boost','required_xp_boost','fitness_xp','fitness_xp_major','knowledge_xp','knowledge_xp_major','knowledge_master','self_xp','self_xp_major'];
    let skillXpPct=0,skillGoldPct=0;
    for(const us of user.userSkills||[]){
      const{effect,value,name:sName}=us.skill;
      if(XP_EFFECTS.includes(effect)){skillXpPct+=Math.round(value*100);totalXpMult*=(1+value);}
      if(effect==='all_required_gold'||effect==='fitness_gold'){skillGoldPct+=value;totalGoldMult*=(1+value/100);}
    }
    if(skillXpPct>0||skillGoldPct>0){
      bonuses.push({icon:'🌿',name:`Навыки (${user.userSkills.length} изучено)`,description:'Суммарный бонус от дерева навыков',xpBonus:skillXpPct>0?`+${skillXpPct}% XP`:null,goldBonus:skillGoldPct>0?`+${skillGoldPct}% золота`:null,source:'Дерево навыков'});
    }
    res.json({bonuses,totalMultipliers:{xp:Math.round(totalXpMult*100)/100,gold:Math.round(totalGoldMult*100)/100,xpLabel:`×${totalXpMult.toFixed(2)}`,goldLabel:`×${totalGoldMult.toFixed(2)}`}});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
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
    const today=startOfToday();
    const alreadyHasQuestToday=user.lastMasteryQuestDate&&new Date(user.lastMasteryQuestDate)>=today;
    const finalQuestUnlocked=!isComplete&&completedSet.size>=(path.totalNodes-1);
    res.json({
      locked:false,chosen:true,autoClass,
      hasEverFinishedMastery:user.hasEverFinishedMastery,
      masteryPath:user.masteryPath,
      completedNodes:[...completedSet],availableNodes,
      totalNodes:path.totalNodes,isComplete,
      alreadyHasQuestToday:!!alreadyHasQuestToday,
      finalQuestUnlocked,
      finalQuest:finalQuestUnlocked?{title:"Финальное испытание мастера",description:"Ты прошёл все испытания. Последнее — выполни все обязательные квесты своей ветки за один день без единого пропуска.",difficulty:"legendary",xpReward:2000,goldReward:1000,branch:user.masteryPath,nodeId:"legendary"}:null,
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
    // One mastery node per day
    const todayM=startOfToday();
    if(user.lastMasteryQuestDate&&new Date(user.lastMasteryQuestDate)>=todayM){
      return res.status(429).json({message:"Сегодня ты уже прошёл испытание мастерства. Возвращайся завтра."});
    }
    const rewards=NODE_DIFFICULTY_REWARDS[nodeInfo.d]||{xp:30,gold:15};
    const justFinished=nodeId==="legendary";
    const baseXp=justFinished?3000:rewards.xp;
    const baseGold=justFinished?5000:rewards.gold;
    const{xp,level}=applyXpGain(user.xp,user.level,baseXp);
    completedSet.add(nodeId);
    const newCompleted=[...completedSet];
    const masteryTitle=justFinished?getMasteryTitle(user.masteryPath):null;
    await prisma.user.update({where:{id:req.userId},data:{
      xp,level,gold:{increment:baseGold},
      masteryNodeIndex:newCompleted.length,
      masteryChoices:JSON.stringify({completed:newCompleted}),
      lastMasteryQuestDate:new Date(),
      ...(justFinished?{hasEverFinishedMastery:true,activeTitle:masteryTitle}:{}),
    }});
    if(justFinished){
      await createNotification(req.userId,"mastery_complete",`🏆 Путь завершён. Ты — ${masteryTitle}.`,`Я наблюдал твой путь. Долго. Ты заслужил титул "${masteryTitle}". Немногие доходят до конца. Ты дошёл. — LAPTEV`).catch(()=>{});
    }
    res.json({message:justFinished?`Путь завершён! Ты теперь — ${masteryTitle}`:"Узел пройден",justFinished,masteryTitle,leveledUp:level>user.level,newLevel:level,xpGained:baseXp,goldGained:baseGold,completedNodes:newCompleted});
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
    const tasks=await prisma.task.findMany({where:{userId:req.userId,isNpcQuest:false,...(branch?{branch}:{})},orderBy:{createdAt:"desc"}});
    const npcQuests=await prisma.task.findMany({where:{userId:req.userId,isNpcQuest:true,completed:false},orderBy:{createdAt:"desc"}});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const today=startOfToday();
    const needsReset=!user.customQuestsResetDate||new Date(user.customQuestsResetDate)<today;
    const createdToday=needsReset?0:(user.customQuestsCreatedToday||0);
    res.json({tasks,npcQuests,customQuestsCreatedToday:createdToday,customQuestsMax:MAX_CUSTOM_QUESTS_PER_DAY});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.patch("/tasks/:id/complete",authMiddleware,async(req,res)=>{
  try{
    const taskId=Number(req.params.id);
    const task=await prisma.task.findUnique({where:{id:taskId}});
    if(!task)return res.status(404).json({message:"Task not found"});
    if(task.userId!==req.userId)return res.status(403).json({message:"Forbidden"});
    if(task.completed)return res.status(400).json({message:"Already completed"});
    // Fetch user BEFORE marking complete to validate dark side state
    const cu=await prisma.user.findUnique({where:{id:req.userId}});
    const now=new Date();const today=startOfToday();

    // ── Тёмная сторона: блокируем обычные квесты ─────────────────────────────
    if(cu.darkSideActive&&!cu.darkSideChoice&&task.branch!=='dark'){
      return res.status(400).json({message:"На тёмной стороне доступны только квесты саморазрушения.",code:"DARK_SIDE_ACTIVE"});
    }

    const updatedTask=await prisma.task.update({where:{id:taskId},data:{completed:true,completedAt:new Date()}});

    // ── Тёмные квесты: xpReward отрицательный, goldReward напрямую ───────────
    if(task.branch==='dark'){
      const goldGained=task.goldReward;
      let newXp=cu.xp+task.xpReward; // xpReward < 0
      let newLevel=cu.level;
      while(newLevel>1&&newXp<0){newLevel--;newXp=getXpToNextLevel(newLevel)+newXp;}
      if(newXp<0)newXp=0;
      const hoursSince=cu.darkSideStartedAt?(Date.now()-new Date(cu.darkSideStartedAt).getTime())/(1000*60*60):0;
      const currentDarkDay=Math.floor(hoursSince/24)+1;
      await prisma.user.update({where:{id:req.userId},data:{xp:newXp,level:newLevel,gold:{increment:goldGained},darkSideDay:currentDarkDay,lastActiveQuestDate:now}});
      // Проверяем все ли тёмные квесты выполнены сегодня
      const allDarkToday=await prisma.task.findMany({where:{userId:req.userId,branch:'dark',isDaily:true,createdAt:{gte:today}}});
      const allDarkDone=allDarkToday.length>0&&allDarkToday.every(t=>t.completed||t.id===taskId);
      if(allDarkDone||hoursSince>=20){
        const choiceNotif=await prisma.notification.findFirst({where:{userId:req.userId,type:"dark_side_choice"}});
        if(!choiceNotif)await createNotification(req.userId,"dark_side_choice","⚫ LAPTEV говорит","LAPTEV: Ты выполнил все квесты тьмы. Я вижу что происходит. Твой уровень падает. Ты ещё можешь вернуться. Или остаться в тени навсегда.");
      }
      const darkMsg=allDarkDone?"Ты выполнил все квесты. LAPTEV наблюдает за тобой.":currentDarkDay===1?"Золото получено. Уровень падает.":`День ${currentDarkDay}. Тьма усиливается.`;
      return res.json({...updatedTask,darkSide:true,xpGained:task.xpReward,goldGained,newLevel,newXp,leveledUp:false,message:darkMsg,allDarkCompleted:allDarkDone,newAchievements:[],petCreated:false});
    }

    // ── Flow mode: 5+ quests in 30 min → flat +25% XP ───────────────────────
    const COMBO_WINDOW_MS=30*60*1000;
    const lastQ=cu.lastQuestCompletedAt?new Date(cu.lastQuestCompletedAt):null;
    const withinWindow=lastQ&&(now-lastQ)<COMBO_WINDOW_MS;
    const newCombo=withinWindow?(cu.comboCount||0)+1:1;
    const comboMult=newCombo>=5?1.25:1;
    // ── Active NPC: +10% XP bonus in NPC's branch ────────────────────────────
    const activeNpc=cu.activeNpcId?getNpc(cu.activeNpcId):null;
    const npcBonusMult=activeNpc&&activeNpc.branch===task.branch?1.1:1;
    const autoClass=cu.masteryPath?null:await computeAutoClass(req.userId);
    let{xpGained,goldGained:goldGain,multipliers:multipliersBreakdown}=await calculateRewards(cu,task,{comboMult,npcBonusMult,autoClass});
    // Cursed artifact modifiers on quest rewards
    const cursedArt=await prisma.cursedArtifact.findUnique({where:{userId:req.userId}}).catch(()=>null);
    if(cursedArt?.active){
      const ef=cursedArt.artifactId;
      if(ef==="sword_of_darkness")xpGained=Math.round(xpGained*0.8);
      else if(ef==="greed_ring")goldGain=Math.round(goldGain*1.5);
      else if(ef==="martyr_shield")goldGain=Math.round(goldGain*0.7);
      else if(ef==="ancient_eye"&&Math.random()<0.2){goldGain=Math.max(0,goldGain-Math.floor(Math.random()*20+10));}
    }
    const{xp,level}=applyXpGain(cu.xp,cu.level,xpGained);
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
          await prisma.user.update({where:{id:req.userId},data:{xp:cxp,level:clevel,gold:{increment:chest.gold+goldGain},streak:newStreak,streakUpdatedDate:now,lastChestStreak:threshold,lastActiveQuestDate:now,comboCount:newCombo,lastQuestCompletedAt:now,missedDaysStreak:0,...(freezeConsumed?{streakFreezeCount:{decrement:1}}:{})}});
          await prisma.userLeague.upsert({where:{userId:req.userId},create:{userId:req.userId,weeklyXp:xpGained},update:{weeklyXp:{increment:xpGained}}}).catch(()=>{});
          const{newAchievements:na,petCreated:pc}=await handlePostComplete(req.userId,newStreak,clevel);
          return res.json({...updatedTask,xpGained,goldGained:goldGain,leveledUp:clevel>cu.level,newLevel:clevel,freezeConsumed,streakJustCompleted,newStreak,chestReward,newAchievements:na,petCreated:pc,dropReward,combo:newCombo,comboBonus:comboMult>1?Math.round((comboMult-1)*100):0,multipliers:multipliersBreakdown});
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
    await prisma.user.update({where:{id:req.userId},data:{xp:finalXp,level:finalLevel,gold:{increment:goldGain+firstQuestBonus+dropGold},lastActiveQuestDate:now,comboCount:newCombo,lastQuestCompletedAt:now,...(streakJustCompleted?{streak:newStreak,streakUpdatedDate:now,missedDaysStreak:0}:{}),...(freezeConsumed?{streakFreezeCount:{decrement:1}}:{}),...(!alreadyGotFirstBonus?{firstQuestBonusDate:now}:{})}});
    // Update league weekly XP
    await prisma.userLeague.upsert({where:{userId:req.userId},create:{userId:req.userId,weeklyXp:xpGained},update:{weeklyXp:{increment:xpGained}}}).catch(()=>{});
    const finalStreak=streakJustCompleted?newStreak:cu.streak;
    const{newAchievements,petCreated}=await handlePostComplete(req.userId,finalStreak,finalLevel);
    // Check easter eggs
    const hour=new Date().getHours();
    if(hour>=2&&hour<4)checkEasterEgg(req.userId,"night_owl");
    if(hour<6)checkEasterEgg(req.userId,"early_bird");
    const todayCount=await prisma.task.count({where:{userId:req.userId,completed:true,completedAt:{gte:startOfToday()}}});
    if(todayCount>=10)checkEasterEgg(req.userId,"perfectionist");
    // ── WeeklyBoss: засчитать квест клана ─────────────────────────────────────
    if(cu.clanId){
      try{
        await prisma.weeklyBoss.updateMany({where:{clanId:cu.clanId,defeated:false,weekEnd:{gte:new Date()}},data:{currentQuests:{increment:1}}});
        const boss=await prisma.weeklyBoss.findFirst({where:{clanId:cu.clanId,defeated:false,weekEnd:{gte:new Date()}}});
        if(boss&&boss.currentQuests>=boss.totalQuests){
          await prisma.weeklyBoss.update({where:{id:boss.id},data:{defeated:true}});
          const clanMembers=await prisma.user.findMany({where:{clanId:cu.clanId},select:{id:true}});
          for(const m of clanMembers){
            const{xp:bxp,level:blvl}=applyXpGain(0,1,boss.rewardXp);
            await prisma.user.update({where:{id:m.id},data:{gold:{increment:boss.rewardGold},xp:{increment:boss.rewardXp}}});
            await createNotification(m.id,"boss_defeated",`⚔️ Босс повержен!`,`Клан победил ${boss.name}! +${boss.rewardGold}💰 +${boss.rewardXp}XP`);
          }
        }
      }catch(bossErr){console.error("Boss update error:",bossErr.message);}
    }
    // ── Archive: трекинг фитнес-дней ─────────────────────────────────────────
    if(cu.archiveUnlocked&&!cu.archiveSolved){
      try{
        const todayTasks=await prisma.task.findMany({where:{userId:req.userId,completed:true,completedAt:{gte:today}}});
        const nonFitness=todayTasks.filter(t=>t.branch!=="fitness");
        const fitnessToday=todayTasks.filter(t=>t.branch==="fitness");
        if(nonFitness.length>0){
          await prisma.user.update({where:{id:req.userId},data:{archiveFitnessDays:0,archiveFitnessStart:null}});
        } else if(fitnessToday.length>0){
          const isNewDay=!cu.archiveFitnessStart||new Date(cu.archiveFitnessStart)<today;
          if(isNewDay){
            const newDays=(cu.archiveFitnessDays||0)+1;
            await prisma.user.update({where:{id:req.userId},data:{archiveFitnessDays:newDays,archiveFitnessStart:new Date()}});
            if(newDays>=3)await solveArchive(req.userId);
          }
        }
      }catch(archErr){console.error("Archive tracking error:",archErr.message);}
    }
    // ── Raid damage (new per-user system) ────────────────────────────────────
    let raidDamage=0,raidResult=null;
    try{
      const raidUser=await prisma.user.findUnique({where:{id:req.userId},select:{activeRaidId:true}});
      if(raidUser?.activeRaidId){
        const activeRaid=await prisma.dungeonRaid.findUnique({where:{id:raidUser.activeRaidId},include:{raidParticipants:true}});
        if(activeRaid&&activeRaid.status==="active"){
          if(new Date()>new Date(activeRaid.endsAt)){
            // Time expired → defeat
            await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{status:"defeat"}});
            const llr=await applyRaidDefeat({...activeRaid,raidParticipants:activeRaid.raidParticipants});
            raidResult={status:"defeat",...(llr||{})};
          } else {
            const part=activeRaid.raidParticipants.find(p=>p.userId===req.userId);
            if(part){
              if(activeRaid.stage===1){
                const totalDone=activeRaid.raidParticipants.reduce((s,p)=>s+p.damage,0);
                await prisma.raidParticipant.update({where:{raidId_userId:{raidId:activeRaid.id,userId:req.userId}},data:{damage:{increment:1}}});
                if(totalDone+1>=2){
                  const trap=TRAP_EVENTS[Math.floor(Math.random()*TRAP_EVENTS.length)];
                  await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{stage:2,trapEvent:JSON.stringify(trap)}});
                  if(trap.effect==="gold+50")await prisma.user.update({where:{id:activeRaid.userId},data:{gold:{increment:50}}});
                  raidResult={stage:2,trapEvent:trap};
                } else {raidResult={stage:1,progress:totalDone+1};}
              } else if(activeRaid.stage===2){
                const trap=activeRaid.trapEvent?JSON.parse(activeRaid.trapEvent):null;
                if(trap?.effect==="poison_timer"){
                  const boss2=DUNGEON_BOSSES[activeRaid.difficulty]||DUNGEON_BOSSES.E;
                  await prisma.user.update({where:{id:activeRaid.userId},data:{...(boss2.fatigueMin>0?{fatiguedUntil:new Date(Date.now()+boss2.fatigueMin*60000)}:{})}});
                }
                await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{stage:3,currentHp:activeRaid.bossHp}});
                raidResult={stage:3};
              } else if(activeRaid.stage===3){
                const trap=activeRaid.trapEvent?JSON.parse(activeRaid.trapEvent):null;
                const activeEffects=JSON.parse(activeRaid.activeEventEffects||"[]");
                // Effects that block damage this quest
                if(activeEffects.includes("double_quest")||activeEffects.includes("shield_quest")){
                  const newFx=activeEffects.filter(e=>e!=="double_quest"&&e!=="shield_quest");
                  await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{activeEventEffects:JSON.stringify(newFx)}});
                  raidResult={status:"active",damage:0,currentHp:activeRaid.currentHp,eventBreakFree:true};
                } else if(activeEffects.includes("random_skip")){
                  const newFx=activeEffects.filter(e=>e!=="random_skip");
                  await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{activeEventEffects:JSON.stringify(newFx)}});
                  raidResult={status:"active",damage:0,currentHp:activeRaid.currentHp,randomSkipped:true};
                } else {
                  const baseD=updatedTask.difficulty==="hard"?20:10;
                  const partBonus=1+(activeRaid.raidParticipants.length-1)*0.05;
                  const torchMult=trap?.effect==="damage-20%"?0.8:1;
                  const mPath=cu.masteryPath;
                  let classDmgMult=1,classGoldMult=1,classXpMult=1;
                  if(mPath==="warrior")classDmgMult=1.25;
                  else if(mPath==="sage")classGoldMult=1.25;
                  else if(mPath==="balance"){classDmgMult=1.1;classGoldMult=1.1;classXpMult=1.1;}
                  const dmgBoostP=await prisma.purchase.findFirst({where:{userId:req.userId,item:{effect:"raid_damage_boost"}}}).catch(()=>null);
                  const equipBoost=dmgBoostP?1.5:1;
                  if(dmgBoostP){
                    if((dmgBoostP.quantity||1)>1)await prisma.purchase.update({where:{id:dmgBoostP.id},data:{quantity:{decrement:1}}}).catch(()=>{});
                    else await prisma.purchase.delete({where:{id:dmgBoostP.id}}).catch(()=>{});
                  }
                  const eventDmgBonus=activeEffects.includes("team_damage+15")?1.15:1;
                  const phaseDmgPenalty=(activeRaid.phaseTriggered&&activeRaid.difficulty==="B")?0.7:1;
                  let nextQuestMult=1;
                  if(activeEffects.includes("next_quest_x2")){
                    nextQuestMult=2;
                    const newFx=activeEffects.filter(e=>e!=="next_quest_x2");
                    await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{activeEventEffects:JSON.stringify(newFx)}});
                  }
                  raidDamage=Math.round(baseD*partBonus*torchMult*classDmgMult*equipBoost*eventDmgBonus*phaseDmgPenalty*nextQuestMult);
                  await prisma.raidParticipant.update({where:{raidId_userId:{raidId:activeRaid.id,userId:req.userId}},data:{damage:{increment:raidDamage}}});
                  const newHp=Math.max(0,activeRaid.currentHp-raidDamage);
                  // Boss phase trigger at 50% HP
                  let phaseChange=null;
                  if(!activeRaid.phaseTriggered&&newHp>0&&newHp<=activeRaid.bossHp*0.5&&BOSS_PHASES[activeRaid.difficulty]){
                    const phase=BOSS_PHASES[activeRaid.difficulty];
                    await prisma.raidEvent.create({data:{raidId:activeRaid.id,userId:req.userId,eventType:"phase",eventId:"boss_phase",eventText:`${phase.icon} ${phase.text}`}});
                    const curFx=JSON.parse(activeRaid.activeEventEffects||"[]");
                    const newFx=[...curFx];
                    if(["shield_quest","random_skip","regen+5%","damage-30%"].includes(phase.effect)&&!newFx.includes(phase.effect))newFx.push(phase.effect);
                    await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{phaseTriggered:true,bossPhase:2,currentHp:newHp,activeEventEffects:JSON.stringify(newFx)}});
                    phaseChange={icon:phase.icon,text:phase.text,effect:phase.effect};
                    io.emit("raid:phase_change",{raidId:activeRaid.id,phase:2,icon:phase.icon,text:phase.text});
                  }
                  if(newHp<=0){
                    const rewardGold=Math.round(activeRaid.rewardGold*classGoldMult);
                    const rewardXp=Math.round(activeRaid.rewardXp*classXpMult);
                    await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{status:"victory",currentHp:0}});
                    const finalRaid=await prisma.dungeonRaid.findUnique({where:{id:activeRaid.id},include:{raidParticipants:true,events:true}});
                    for(const p of activeRaid.raidParticipants){
                      const pGold=p.userId===req.userId?rewardGold:activeRaid.rewardGold;
                      const pXp=p.userId===req.userId?rewardXp:activeRaid.rewardXp;
                      await prisma.user.update({where:{id:p.userId},data:{gold:{increment:pGold},xp:{increment:pXp},activeRaidId:null,raidStreak:{increment:1}}});
                      await createNotification(p.userId,"raid_victory",`${activeRaid.bossIcon} Победа в рейде!`,`Победили ${activeRaid.bossName}! +${pXp} XP +${pGold} 💰`).catch(()=>{});
                    }
                    io.emit("raid:boss_defeated",{raidId:activeRaid.id,bossName:activeRaid.bossName,bossIcon:activeRaid.bossIcon});
                    const newRaidAchs=await checkRaidAchievements(req.userId,finalRaid||activeRaid);
                    // Cursed artifact drop (15% chance on S/S+ victory, only if no artifact)
                    let droppedArtifact=null;
                    if(["S","S+"].includes(activeRaid.difficulty)&&Math.random()<0.15){
                      const hasArtifact=await prisma.cursedArtifact.findUnique({where:{userId:req.userId}}).catch(()=>null);
                      if(!hasArtifact){
                        const artIds=Object.keys(CURSED_ARTIFACTS);
                        const artId=artIds[Math.floor(Math.random()*artIds.length)];
                        const art=CURSED_ARTIFACTS[artId];
                        await prisma.cursedArtifact.create({data:{userId:req.userId,artifactId:artId}}).catch(()=>{});
                        await createNotification(req.userId,"cursed_artifact",`🗿 Проклятый артефакт найден!`,`${art.name}. Бонус: ${art.bonus}. Проклятие: ${art.curse}`).catch(()=>{});
                        droppedArtifact={id:artId,...art};
                      }
                    }
                    raidResult={status:"victory",damage:raidDamage,rewardGold,rewardXp,newAchievements:newRaidAchs,droppedArtifact};
                  } else {
                    if(!phaseChange)await prisma.dungeonRaid.update({where:{id:activeRaid.id},data:{currentHp:newHp}});
                    io.emit("raid:hp_update",{raidId:activeRaid.id,currentHp:newHp,damage:raidDamage,userId:req.userId});
                    raidResult={status:"active",damage:raidDamage,currentHp:newHp,...(phaseChange?{phaseChange}:{})};
                  }
                }
              }
            }
          }
        }
      }
    }catch(raidErr){console.error("Raid damage error:",raidErr.message);}
    // ── Weekly boss damage (every quest completion) ───────────────────────────
    let weeklyBossResult=null;
    try{
      const now=new Date();
      const weeklyBoss=await prisma.weeklyRaidBoss.findFirst({where:{weekStart:{lte:now},weekEnd:{gt:now},status:"active"}});
      if(weeklyBoss){
        const wDmg=updatedTask.difficulty==="hard"?20:10;
        await prisma.weeklyRaidDamage.upsert({
          where:{bossId_userId:{bossId:weeklyBoss.id,userId:req.userId}},
          create:{bossId:weeklyBoss.id,userId:req.userId,damage:wDmg},
          update:{damage:{increment:wDmg}},
        });
        const newWHp=Math.max(0,weeklyBoss.currentHp-wDmg);
        await prisma.weeklyRaidBoss.update({where:{id:weeklyBoss.id},data:{currentHp:newWHp,...(newWHp===0?{status:"defeated"}:{})}});
        weeklyBossResult={damage:wDmg,currentHp:newWHp,totalHp:weeklyBoss.totalHp};
        if(newWHp===0){
          const top3=await prisma.weeklyRaidDamage.findMany({where:{bossId:weeklyBoss.id},orderBy:{damage:"desc"},take:3});
          const rewards=[{gold:1500,xp:2000},{gold:1200,xp:1500},{gold:900,xp:1000}];
          for(const[i,d]of top3.entries()){
            const r=rewards[i]||{gold:500,xp:500};
            await prisma.user.update({where:{id:d.userId},data:{gold:{increment:r.gold},xp:{increment:r.xp}}});
            await createNotification(d.userId,"leviathan_slayer",`🐋 Левиафан повержен!`,`Место #${i+1}! +${r.gold} 💰 +${r.xp} XP — Титул "Покоритель Левиафана"!`).catch(()=>{});
            const exAch=await prisma.achievement.findFirst({where:{userId:d.userId,type:"leviathan_slayer"}});
            if(!exAch){
              await prisma.achievement.create({data:{userId:d.userId,type:"leviathan_slayer"}}).catch(()=>{});
              await prisma.user.update({where:{id:d.userId},data:{activeTitle:"Покоритель Левиафана"}}).catch(()=>{});
            }
          }
          io.emit("weekly_boss:defeated",{bossName:weeklyBoss.name,bossIcon:weeklyBoss.icon});
        }
      }
    }catch(wbErr){console.error("Weekly boss error:",wbErr.message);}
    // ── Dark Portal damage ────────────────────────────────────────────────────
    let portalResult=null;
    try{
      const attempt=await prisma.darkPortalAttempt.findFirst({where:{userId:req.userId,status:"active"}});
      if(attempt){
        const portal=await prisma.darkPortal.findUnique({where:{id:attempt.portalId}});
        if(portal&&portal.status==="active"&&new Date()<new Date(portal.closesAt)){
          const pDmg=15;
          const newPortalHp=Math.max(0,portal.currentHp-pDmg);
          await prisma.darkPortalAttempt.update({where:{id:attempt.id},data:{damage:{increment:pDmg}}});
          await prisma.darkPortal.update({where:{id:portal.id},data:{currentHp:newPortalHp}});
          if(newPortalHp<=0){
            await prisma.darkPortalAttempt.update({where:{id:attempt.id},data:{status:"victory"}});
            await prisma.darkPortal.update({where:{id:portal.id},data:{status:"defeated"}});
            await prisma.user.update({where:{id:req.userId},data:{gold:{increment:2000},portalVictories:{increment:1}}});
            const exAch=await prisma.achievement.findFirst({where:{userId:req.userId,type:"portal_victory"}});
            if(!exAch){await prisma.achievement.create({data:{userId:req.userId,type:"portal_victory",xpReward:500}}).catch(()=>{});await prisma.user.update({where:{id:req.userId},data:{xp:{increment:500},activeTitle:"Покоритель Тёмного портала"}}).catch(()=>{});}
            await createNotification(req.userId,"portal_victory","⚫ Портал покорён!","Тёмный босс повержён! +2000 💰 +Титул").catch(()=>{});
            portalResult={status:"victory",damage:pDmg};
          }else{portalResult={status:"active",damage:pDmg,currentHp:newPortalHp,totalHp:portal.bossHp};}
        }
      }
    }catch(pErr){console.error("Portal damage error:",pErr.message);}
    // ── Survival raid progress ────────────────────────────────────────────────
    let survivalResult=null;
    try{
      const sv=await prisma.survivalRaid.findFirst({where:{userId:req.userId,status:"active"}});
      if(sv){
        if(new Date()>new Date(sv.waveDeadline)){
          await prisma.survivalRaid.update({where:{id:sv.id},data:{status:"completed"}});
          survivalResult={status:"timeout",wave:sv.currentWave};
        }else{
          const waveInfo=getSurvivalWaveInfo(sv.currentWave);
          const newQuestsDone=sv.questsDone+1;
          if(newQuestsDone>=waveInfo.questsNeeded){
            const nextWave=sv.currentWave+1;
            const nextWaveInfo=getSurvivalWaveInfo(nextWave);
            const newDeadline=new Date(Date.now()+nextWaveInfo.timeMinutes*60000);
            await prisma.survivalRaid.update({where:{id:sv.id},data:{currentWave:nextWave,questsDone:0,waveDeadline:newDeadline,totalDamage:{increment:newQuestsDone}}});
            survivalResult={status:"wave_complete",wave:sv.currentWave,nextWave,nextEnemy:nextWaveInfo.enemy,nextQuestsNeeded:nextWaveInfo.questsNeeded};
          }else{
            await prisma.survivalRaid.update({where:{id:sv.id},data:{questsDone:newQuestsDone}});
            survivalResult={status:"active",wave:sv.currentWave,questsDone:newQuestsDone,questsNeeded:waveInfo.questsNeeded};
          }
        }
      }
    }catch(svErr){console.error("Survival raid error:",svErr.message);}
    res.json({...updatedTask,xpGained,goldGained:goldGain,leveledUp:finalLevel>cu.level,newLevel:finalLevel,freezeConsumed,streakJustCompleted,newStreak:streakJustCompleted?newStreak:undefined,chestReward,newAchievements,petCreated,dropReward,combo:newCombo,comboBonus:comboMult>1?Math.round((comboMult-1)*100):0,multipliers:multipliersBreakdown,...(raidResult?{raidResult}:{}),...(raidDamage?{raidDamage}:{}),...(weeklyBossResult?{weeklyBossResult}:{}),...(portalResult?{portalResult}:{}),...(survivalResult?{survivalResult}:{})});
  }catch(e){console.error('QUEST COMPLETE ERROR:',e.message,e.stack);res.status(500).json({message:"Ошибка сервера",error:e.message});}
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
    const items=await prisma.shopItem.findMany({where:{active:true,category:{not:"artifact"}},orderBy:{price:"asc"}});
    const purchases=await prisma.purchase.findMany({where:{userId:req.userId},select:{itemId:true}});
    const pIds=new Set(purchases.map(p=>p.itemId));
    res.json(items.map(item=>{
      const isStreakFreeze=item.effect==="streak_freeze";
      const sfOwned=isStreakFreeze&&(user.streakFreezeCount||0)>0;
      return{
        ...item,
        purchased:sfOwned?true:pIds.has(item.id),
        repeatable:REPEATABLE_SHOP_EFFECTS.includes(item.effect),
        locked:false,
        streakFreezeActive:isStreakFreeze?sfOwned:undefined,
      };
    }));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/shop/:id/purchase",authMiddleware,async(req,res)=>{
  try{
    const itemId=Number(req.params.id);
    const item=await prisma.shopItem.findUnique({where:{id:itemId}});
    if(!item||!item.active)return res.status(404).json({message:"Item not found"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(user.gold<item.price)return res.status(400).json({message:"Not enough gold"});
    // XP cards: apply immediately, don't store in library
    const XP_CARD_MAP={"xp_card_500":500,"xp_card_3500":3500,"xp_card_10000":10000,"xp_card_small":100,"xp_card_medium":300,"xp_card_large":750};
    if(item.effect&&XP_CARD_MAP[item.effect]){
      const xpGain=XP_CARD_MAP[item.effect];
      const{xp,level}=applyXpGain(user.xp,user.level,xpGain);
      await prisma.user.update({where:{id:req.userId},data:{gold:{decrement:item.price},xp,level}});
      return res.status(201).json({message:"XP начислено",xpGained:xpGain,level});
    }
    // Raid equipment: stackable (increment quantity)
    const RAID_EQUIP_EFFECTS=["raid_damage_boost","raid_no_penalty","raid_fatigue_cure","raid_trap_immunity","raid_illusion_reduce"];
    if(RAID_EQUIP_EFFECTS.includes(item.effect)){
      const existR=await prisma.purchase.findUnique({where:{userId_itemId:{userId:req.userId,itemId}}});
      if(existR){
        await prisma.$transaction([
          prisma.user.update({where:{id:req.userId},data:{gold:{decrement:item.price}}}),
          prisma.purchase.update({where:{userId_itemId:{userId:req.userId,itemId}},data:{quantity:{increment:1}}}),
        ]);
      } else {
        await prisma.$transaction([
          prisma.user.update({where:{id:req.userId},data:{gold:{decrement:item.price}}}),
          prisma.purchase.create({data:{userId:req.userId,itemId,quantity:1}}),
        ]);
      }
      return res.status(201).json({message:"Purchased",addedToLibrary:true});
    }
    // Usable items go to library first
    const USABLE_EFFECTS=["streak_freeze","xp_boost_24h","gold_boost_24h","name_change_scroll"];
    if(USABLE_EFFECTS.includes(item.effect)){
      if(item.effect==="streak_freeze"&&(user.streakFreezeCount||0)>0)
        return res.status(400).json({message:"Заморозка уже активна. Используй текущую перед покупкой."});
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

// ── DUNGEON RAIDS ─────────────────────────────────────────────────────────────
async function applyRaidVictory(raid){
  for(const p of raid.raidParticipants){
    await prisma.user.update({where:{id:p.userId},data:{gold:{increment:raid.rewardGold},xp:{increment:raid.rewardXp},activeRaidId:null}});
    await createNotification(p.userId,"raid_victory",`${raid.bossIcon} Победа в рейде!`,`Вы победили ${raid.bossName}! +${raid.rewardXp} XP +${raid.rewardGold} 💰`).catch(()=>{});
    const existAch=await prisma.achievement.findFirst({where:{userId:p.userId,type:"raid_winner"}});
    if(!existAch)await prisma.achievement.create({data:{userId:p.userId,type:"raid_winner"}}).catch(()=>{});
  }
  io.emit("raid:boss_defeated",{raidId:raid.id,bossName:raid.bossName,bossIcon:raid.bossIcon});
}

async function applyRaidDefeat(raid,applyLevelLoss=true){
  const boss=DUNGEON_BOSSES[raid.difficulty]||DUNGEON_BOSSES.E;
  const creator=await prisma.user.findUnique({where:{id:raid.userId},select:{gold:true}});
  const penGold=Math.min(boss.penaltyGold,creator?.gold||0);
  const updates={activeRaidId:null,gold:{decrement:penGold},xp:{decrement:boss.penaltyXp},raidStreak:0};
  if(boss.fatigueMin>0)updates.fatiguedUntil=new Date(Date.now()+boss.fatigueMin*60000);
  if(["A","leader"].includes(raid.difficulty)){const lf=boss.fatigueMin*0.5;if(lf>0)updates.fatiguedUntil=new Date(Date.now()+lf*60000);}
  await prisma.user.update({where:{id:raid.userId},data:updates});
  for(const p of raid.raidParticipants.filter(p=>p.userId!==raid.userId)){
    await prisma.user.update({where:{id:p.userId},data:{activeRaidId:null,raidStreak:0}});
  }
  await createNotification(raid.userId,"raid_defeat",`💀 Поражение в рейде`,`${raid.bossName} не побеждён. -${penGold} 💰${boss.penaltyXp?` -${boss.penaltyXp} XP`:""}${boss.fatigueMin>0?` Усталость ${boss.fatigueMin} мин.`:""}`).catch(()=>{});
  let levelLossResult=null;
  if(applyLevelLoss){levelLossResult=await applyLevelLossIfNeeded(raid,raid.userId);}
  return levelLossResult;
}

app.get("/raid/equipment",authMiddleware,async(req,res)=>{
  try{
    const RAID_EQUIP=["raid_damage_boost","raid_no_penalty","raid_fatigue_cure","raid_trap_immunity","raid_illusion_reduce"];
    const purchases=await prisma.purchase.findMany({where:{userId:req.userId,item:{effect:{in:RAID_EQUIP}}},include:{item:true}});
    res.json(purchases.map(p=>({effect:p.item.effect,title:p.item.title,description:p.item.description,quantity:p.quantity||1,purchasedAt:p.purchasedAt})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/raid/start",authMiddleware,async(req,res)=>{
  try{
    const{difficulty,useItems=[]}=req.body;
    if(!DUNGEON_BOSSES[difficulty])return res.status(400).json({message:"Неверная сложность"});
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{activeRaidId:true,fatiguedUntil:true,gold:true,dailyRaidCount:true,dailyRaidDate:true,totalRaids:true}});
    if(user.activeRaidId)return res.status(400).json({message:"Сначала заверши текущий рейд"});
    // Death tutorial — first ever raid
    const isFirstRaid=(user.totalRaids||0)===0;
    if(isFirstRaid){
      const endsAt=new Date(Date.now()+10*60*1000); // 10 minutes
      const raid=await prisma.dungeonRaid.create({
        data:{userId:req.userId,difficulty:"S+",bossName:"Тёмный Страж ☠️",bossIcon:"☠️",bossHp:9999,currentHp:9999,stage:3,isIllusion:false,status:"active",participants:JSON.stringify([req.userId]),endsAt,rewardXp:0,rewardGold:0,penaltyXp:0,penaltyGold:100},
      });
      await prisma.raidParticipant.create({data:{raidId:raid.id,userId:req.userId}});
      await prisma.user.update({where:{id:req.userId},data:{activeRaidId:raid.id,totalRaids:1}});
      return res.json({...raid,isFirstRaid:true,chosenDifficulty:difficulty,actualDifficulty:"S+",raidNumber:1});
    }
    // Apply start-time equipment (fatigue cure + illusion reduce)
    let illusionChance=0.2;
    const RAID_START_ITEMS=["raid_fatigue_cure","raid_illusion_reduce"];
    for(const eff of useItems.filter(e=>RAID_START_ITEMS.includes(e))){
      const p=await prisma.purchase.findFirst({where:{userId:req.userId,item:{effect:eff}}});
      if(!p)continue;
      if((p.quantity||1)>1){await prisma.purchase.update({where:{id:p.id},data:{quantity:{decrement:1}}});}
      else{await prisma.purchase.delete({where:{id:p.id}});}
      if(eff==="raid_fatigue_cure")await prisma.user.update({where:{id:req.userId},data:{fatiguedUntil:null}});
      if(eff==="raid_illusion_reduce")illusionChance=0.05;
    }
    const freshUser=await prisma.user.findUnique({where:{id:req.userId},select:{fatiguedUntil:true}});
    if(freshUser.fatiguedUntil&&new Date(freshUser.fatiguedUntil)>new Date()){
      const minsLeft=Math.ceil((new Date(freshUser.fatiguedUntil)-new Date())/60000);
      return res.status(400).json({message:`Ты устал. Осталось ${minsLeft} мин.`,fatiguedUntil:freshUser.fatiguedUntil});
    }
    // Daily raid counter + auto-escalation
    const todayStart=startOfToday();
    const isNewDay=!user.dailyRaidDate||new Date(user.dailyRaidDate)<todayStart;
    const dailyCount=isNewDay?0:(user.dailyRaidCount||0);
    const baseIdx=DUNGEON_RANKS.indexOf(difficulty);
    const escalatedIdx=Math.min(baseIdx+dailyCount,DUNGEON_RANKS.length-1);
    let actualDiff=DUNGEON_RANKS[Math.max(baseIdx,escalatedIdx)];
    const isIllusion=Math.random()<illusionChance;
    if(isIllusion){
      const idx=DUNGEON_RANKS.indexOf(actualDiff);
      actualDiff=DUNGEON_RANKS[Math.min(idx+1,DUNGEON_RANKS.length-1)];
    }
    // Boss pool selection
    const pool=DUNGEON_BOSS_POOLS[actualDiff];
    const boss=pool?pool[Math.floor(Math.random()*pool.length)]:DUNGEON_BOSSES[actualDiff];
    const endsAt=new Date(Date.now()+24*60*60*1000);
    const rewardXp=DUNGEON_BOSSES[actualDiff]?.rewardXp||boss.rewardXp||0;
    const rewardGold=DUNGEON_BOSSES[actualDiff]?.rewardGold||boss.rewardGold||0;
    const penaltyXp=DUNGEON_BOSSES[actualDiff]?.penaltyXp||boss.penaltyXp||0;
    const penaltyGold=DUNGEON_BOSSES[actualDiff]?.penaltyGold||boss.penaltyGold||0;
    const raid=await prisma.dungeonRaid.create({
      data:{userId:req.userId,difficulty:actualDiff,bossName:boss.name,bossIcon:boss.icon||"👹",bossHp:boss.hp,currentHp:boss.hp,stage:1,isIllusion,status:"active",participants:JSON.stringify([req.userId]),endsAt,rewardXp,rewardGold,penaltyXp,penaltyGold},
    });
    await prisma.raidParticipant.create({data:{raidId:raid.id,userId:req.userId}});
    const userUpdateData={activeRaidId:raid.id,dailyRaidCount:dailyCount+1,totalRaids:{increment:1}};
    if(isNewDay)userUpdateData.dailyRaidDate=new Date();
    await prisma.user.update({where:{id:req.userId},data:userUpdateData});
    res.json({...raid,isIllusion,chosenDifficulty:difficulty,actualDifficulty:actualDiff,raidNumber:dailyCount+1,escalated:actualDiff!==difficulty});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/raid/active",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{activeRaidId:true}});
    if(!user?.activeRaidId)return res.json(null);
    let raid=await prisma.dungeonRaid.findUnique({
      where:{id:user.activeRaidId},
      include:{
        raidParticipants:{include:{user:{select:{id:true,name:true,level:true,avatar:true}}},orderBy:{damage:"desc"}},
        events:{orderBy:{triggeredAt:"desc"},take:5},
      },
    });
    if(!raid)return res.json(null);
    // Check time expired
    if(raid.status==="active"&&new Date()>new Date(raid.endsAt)){
      await prisma.dungeonRaid.update({where:{id:raid.id},data:{status:"defeat"}});
      const ll=await applyRaidDefeat({...raid,raidParticipants:raid.raidParticipants});
      return res.json({...raid,status:"defeat",...(ll||{})});
    }
    // S+ regen tick: if phase 2 and 30+ min since last regen
    if(raid.status==="active"&&raid.difficulty==="S+"&&raid.phaseTriggered){
      const lastRegen=raid.lastRegenAt?new Date(raid.lastRegenAt):new Date(raid.createdAt);
      if(Date.now()-lastRegen.getTime()>30*60*1000){
        const regenHp=Math.floor(raid.bossHp*0.05);
        const newHp=Math.min(raid.bossHp,raid.currentHp+regenHp);
        await prisma.dungeonRaid.update({where:{id:raid.id},data:{currentHp:newHp,lastRegenAt:new Date()}});
        raid={...raid,currentHp:newHp,lastRegenAt:new Date()};
        io.emit("raid:hp_update",{raidId:raid.id,currentHp:newHp,damage:0,userId:req.userId});
      }
    }
    // Try to trigger a random event
    if(raid.status==="active"&&raid.stage===3){
      await maybeCreateRaidEvent(raid);
      // Re-read to get updated events + effects
      raid=await prisma.dungeonRaid.findUnique({
        where:{id:user.activeRaidId},
        include:{
          raidParticipants:{include:{user:{select:{id:true,name:true,level:true,avatar:true}}},orderBy:{damage:"desc"}},
          events:{orderBy:{triggeredAt:"desc"},take:5},
        },
      });
    }
    const myDamage=raid.raidParticipants.find(p=>p.userId===req.userId)?.damage||0;
    const trapEvent=raid.trapEvent?JSON.parse(raid.trapEvent):null;
    const activeEffects=JSON.parse(raid.activeEventEffects||"[]");
    const hasDeathCurse=raid.events?.some(e=>e.eventId==="death_curse"&&!e.resolved)||false;
    res.json({...raid,myDamage,trapEvent,activeEffects,hasDeathCurse});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/raid/invite/:friendId",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.friendId);
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{activeRaidId:true,name:true}});
    if(!user.activeRaidId)return res.status(400).json({message:"У тебя нет активного рейда"});
    const raid=await prisma.dungeonRaid.findUnique({where:{id:user.activeRaidId}});
    if(!raid||raid.status!=="active")return res.status(400).json({message:"Рейд не активен"});
    await createNotification(friendId,"raid_invite","⚔️ Приглашение в рейд!",`${user.name||"Игрок"} зовёт тебя в рейд против ${raid.bossName} ${raid.bossIcon}!`,raid.id);
    res.json({message:"Приглашение отправлено!"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/raid/join/:raidId",authMiddleware,async(req,res)=>{
  try{
    const raidId=Number(req.params.raidId);
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{activeRaidId:true}});
    if(user.activeRaidId)return res.status(400).json({message:"Сначала заверши текущий рейд"});
    const raid=await prisma.dungeonRaid.findUnique({where:{id:raidId},include:{raidParticipants:true}});
    if(!raid||raid.status!=="active")return res.status(404).json({message:"Рейд не найден или уже завершён"});
    if(new Date()>new Date(raid.endsAt))return res.status(400).json({message:"Время рейда истекло"});
    const already=raid.raidParticipants.find(p=>p.userId===req.userId);
    if(already)return res.status(400).json({message:"Ты уже в этом рейде"});
    await prisma.raidParticipant.create({data:{raidId,userId:req.userId}});
    const parts=JSON.parse(raid.participants||"[]");
    if(!parts.includes(req.userId)){
      await prisma.dungeonRaid.update({where:{id:raidId},data:{participants:JSON.stringify([...parts,req.userId])}});
    }
    await prisma.user.update({where:{id:req.userId},data:{activeRaidId:raidId}});
    io.emit("raid:participant_joined",{raidId,userId:req.userId});
    res.json({message:"Вступил в рейд!"});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/raid/abandon",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{activeRaidId:true,gold:true}});
    if(!user.activeRaidId)return res.status(400).json({message:"Нет активного рейда"});
    const raid=await prisma.dungeonRaid.findUnique({where:{id:user.activeRaidId},include:{raidParticipants:true}});
    if(!raid)return res.status(404).json({message:"Рейд не найден"});
    // Illusion early retreat: flat 50 gold
    const isIllusionRetreat=raid.isIllusion&&raid.stage===1&&raid.raidParticipants.reduce((s,p)=>s+p.damage,0)<2;
    let penGold=0,penXp=0;
    if(isIllusionRetreat){
      penGold=Math.min(50,user.gold||0);
    } else {
      const boss=DUNGEON_BOSSES[raid.difficulty]||DUNGEON_BOSSES.E;
      penGold=Math.min(Math.round(boss.penaltyGold*0.5),user.gold||0);
      penXp=Math.round(boss.penaltyXp*0.5);
    }
    await prisma.dungeonRaid.update({where:{id:raid.id},data:{status:"abandoned"}});
    await prisma.user.update({where:{id:req.userId},data:{activeRaidId:null,gold:{decrement:penGold},xp:{decrement:penXp}}});
    // Remove guest participants
    for(const p of raid.raidParticipants.filter(p=>p.userId!==req.userId)){
      await prisma.user.update({where:{id:p.userId},data:{activeRaidId:null}});
    }
    res.json({message:"Рейд покинут",penaltyGold:penGold,penaltyXp:penXp});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/raid/cure-fatigue",authMiddleware,async(req,res)=>{
  try{
    const{minutes}=req.body;
    const CURE_COSTS={30:100,60:180,120:300};
    const cost=CURE_COSTS[Number(minutes)];
    if(!cost)return res.status(400).json({message:"minutes должен быть 30, 60 или 120"});
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{gold:true,fatiguedUntil:true}});
    if(!user.fatiguedUntil||new Date(user.fatiguedUntil)<new Date())return res.status(400).json({message:"Ты не устал"});
    if((user.gold||0)<cost)return res.status(400).json({message:`Нужно ${cost} золота`});
    await prisma.user.update({where:{id:req.userId},data:{fatiguedUntil:null,gold:{decrement:cost}}});
    res.json({message:"Усталость снята!",cost});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/raid/history",authMiddleware,async(req,res)=>{
  try{
    const raids=await prisma.dungeonRaid.findMany({
      where:{OR:[{userId:req.userId},{raidParticipants:{some:{userId:req.userId}}}],status:{not:"active"}},
      include:{raidParticipants:{include:{user:{select:{id:true,name:true,level:true}}}}},
      orderBy:{createdAt:"desc"},take:20,
    });
    res.json(raids.map(r=>({...r,myDamage:r.raidParticipants.find(p=>p.userId===req.userId)?.damage||0,trapEvent:r.trapEvent?JSON.parse(r.trapEvent):null})));
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/raid/weekly",authMiddleware,async(req,res)=>{
  try{
    const now=new Date();
    const weekStart=getWeekStart();
    const weekEnd=getWeekEnd();
    let boss=await prisma.weeklyRaidBoss.findFirst({
      where:{weekStart:{lte:now},weekEnd:{gt:now}},
      include:{damages:{include:{user:{select:{id:true,name:true,level:true}}},orderBy:{damage:"desc"},take:10}},
    });
    if(!boss||boss.status==="defeated"){
      if(!boss){
        boss=await prisma.weeklyRaidBoss.create({
          data:{name:"Древний Левиафан",icon:"🐋",totalHp:50000,currentHp:50000,weekStart,weekEnd,status:"active"},
          include:{damages:true},
        });
        boss.damages=[];
      }
    }
    const myDmg=boss.damages.find(d=>d.userId===req.userId);
    const myRank=myDmg?boss.damages.findIndex(d=>d.userId===req.userId)+1:null;
    res.json({...boss,myDamage:myDmg?.damage||0,myRank});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── DARK PORTAL ──────────────────────────────────────────────────────────────
app.get("/portal/current",authMiddleware,async(req,res)=>{
  try{
    const portal=await getOrCreateDarkPortal();
    if(!portal)return res.json(null);
    const now=new Date();
    if(new Date(portal.closesAt)<now&&portal.status==="active"){
      // Close expired portal — penalize all active attempts (level loss)
      const activeAttempts=await prisma.darkPortalAttempt.findMany({where:{portalId:portal.id,status:"active"}});
      for(const att of activeAttempts){
        await prisma.darkPortalAttempt.update({where:{id:att.id},data:{status:"defeat"}});
        const u=await prisma.user.findUnique({where:{id:att.userId},select:{level:true,xp:true}});
        if(u&&u.level>5){
          await prisma.user.update({where:{id:att.userId},data:{level:{decrement:1},xp:0}});
          await createNotification(att.userId,"portal_defeat","💀 Тёмный портал закрылся","Ты не успел победить. Потерян уровень!").catch(()=>{});
        }
      }
      await prisma.darkPortal.update({where:{id:portal.id},data:{status:"closed"}});
      return res.json({...portal,status:"closed"});
    }
    const myAttempt=await prisma.darkPortalAttempt.findUnique({where:{portalId_userId:{portalId:portal.id,userId:req.userId}}}).catch(()=>null);
    const leaderboard=await prisma.darkPortalAttempt.findMany({where:{portalId:portal.id},include:{user:{select:{id:true,name:true,level:true}}},orderBy:{damage:"desc"},take:10});
    res.json({...portal,myAttempt,leaderboard,timeLeft:Math.max(0,new Date(portal.closesAt)-now)});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/portal/enter",authMiddleware,async(req,res)=>{
  try{
    const portal=await getOrCreateDarkPortal();
    if(!portal||portal.status!=="active")return res.status(400).json({message:"Портал не активен"});
    if(new Date()>new Date(portal.closesAt))return res.status(400).json({message:"Портал закрылся"});
    const existing=await prisma.darkPortalAttempt.findUnique({where:{portalId_userId:{portalId:portal.id,userId:req.userId}}}).catch(()=>null);
    if(existing)return res.status(400).json({message:"Ты уже вошёл в портал"});
    const attempt=await prisma.darkPortalAttempt.create({data:{portalId:portal.id,userId:req.userId}});
    res.json({...attempt,portal});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/portal/leaderboard",authMiddleware,async(req,res)=>{
  try{
    const portal=await getOrCreateDarkPortal();
    if(!portal)return res.json([]);
    const lb=await prisma.darkPortalAttempt.findMany({where:{portalId:portal.id},include:{user:{select:{id:true,name:true,level:true}}},orderBy:{damage:"desc"},take:20});
    res.json(lb);
  }catch(e){res.status(500).json({message:"Server error"});}
});

// ── SURVIVAL RAID ─────────────────────────────────────────────────────────────
app.post("/survival/start",authMiddleware,async(req,res)=>{
  try{
    const existing=await prisma.survivalRaid.findFirst({where:{userId:req.userId,status:"active"}});
    if(existing)return res.status(400).json({message:"У тебя уже есть активный рейд на выживание"});
    const waveInfo=getSurvivalWaveInfo(1);
    const waveDeadline=new Date(Date.now()+waveInfo.timeMinutes*60000);
    const sv=await prisma.survivalRaid.create({data:{userId:req.userId,currentWave:1,questsDone:0,waveDeadline,weekStart:getWeekStart()}});
    res.json({...sv,waveInfo});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.get("/survival/active",authMiddleware,async(req,res)=>{
  try{
    const sv=await prisma.survivalRaid.findFirst({where:{userId:req.userId,status:"active"},orderBy:{createdAt:"desc"}});
    if(!sv)return res.json(null);
    if(new Date()>new Date(sv.waveDeadline)){
      await prisma.survivalRaid.update({where:{id:sv.id},data:{status:"completed"}});
      return res.json({...sv,status:"completed",timedOut:true});
    }
    const waveInfo=getSurvivalWaveInfo(sv.currentWave);
    const timeLeft=Math.max(0,new Date(sv.waveDeadline)-new Date());
    res.json({...sv,waveInfo,timeLeft});
  }catch(e){res.status(500).json({message:"Server error"});}
});

app.get("/survival/leaderboard",authMiddleware,async(req,res)=>{
  try{
    const ws=getWeekStart();
    const top=await prisma.survivalRaid.findMany({where:{weekStart:{gte:ws}},orderBy:{currentWave:"desc"},take:10,include:{user:{select:{id:true,name:true,level:true}}}});
    res.json(top);
  }catch(e){res.status(500).json({message:"Server error"});}
});

// ── CURSED ARTIFACTS ──────────────────────────────────────────────────────────
app.get("/artifact/current",authMiddleware,async(req,res)=>{
  try{
    const art=await prisma.cursedArtifact.findUnique({where:{userId:req.userId}});
    if(!art)return res.json(null);
    const meta=CURSED_ARTIFACTS[art.artifactId];
    res.json({...art,meta});
  }catch(e){res.status(500).json({message:"Server error"});}
});

app.post("/artifact/remove",authMiddleware,async(req,res)=>{
  try{
    const art=await prisma.cursedArtifact.findUnique({where:{userId:req.userId}});
    if(!art)return res.status(404).json({message:"Артефакта нет"});
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{gold:true}});
    if((user?.gold||0)<500)return res.status(400).json({message:"Нужно 500 золота"});
    await prisma.cursedArtifact.delete({where:{userId:req.userId}});
    await prisma.user.update({where:{id:req.userId},data:{gold:{decrement:500}}});
    res.json({message:"Артефакт снят. -500 💰"});
  }catch(e){res.status(500).json({message:"Server error"});}
});

// ── PLAYERS DISCOVER ──────────────────────────────────────────────────────────
app.get("/players/discover",authMiddleware,async(req,res)=>{
  try{
    const page=parseInt(req.query.page)||1;
    const limit=Math.min(parseInt(req.query.limit)||20,50);
    const skip=(page-1)*limit;
    const friendships=await prisma.friendship.findMany({where:{OR:[{userId:req.userId},{friendId:req.userId}]},select:{userId:true,friendId:true}});
    const friendIds=friendships.map(f=>f.userId===req.userId?f.friendId:f.userId);
    const excludeIds=[req.userId,...friendIds];
    const [players,total]=await Promise.all([
      prisma.user.findMany({where:{id:{notIn:excludeIds}},select:{id:true,name:true,level:true,streak:true,title:true,avatarFrame:true,avatar:true,hiddenClass:true},orderBy:{level:"desc"},skip,take:limit}),
      prisma.user.count({where:{id:{notIn:excludeIds}}}),
    ]);
    res.json({players,total,page,hasMore:skip+limit<total});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── PLAYERS ONLINE ───────────────────────────────────────────────────────────
app.get("/players/online",authMiddleware,async(req,res)=>{
  try{
    const now=new Date();
    const fiveMinAgo=new Date(now.getTime()-ONLINE_THRESHOLD_MS);
    const q=(req.query.q||"").trim().toLowerCase();
    const friendships=await prisma.friendship.findMany({where:{OR:[{userId:req.userId},{friendId:req.userId}]},select:{userId:true,friendId:true}});
    const friendIds=new Set(friendships.map(f=>f.userId===req.userId?f.friendId:f.userId));
    const users=await prisma.user.findMany({
      where:{id:{not:req.userId},...(q?{OR:[{name:{contains:q}},{email:{contains:q}}]}:{})},
      select:{id:true,name:true,email:true,level:true,masteryPath:true,lastActiveAt:true,avatar:true},
      orderBy:[{lastActiveAt:"desc"}],take:60,
    });
    const result=users.map(u=>({
      id:u.id,
      name:u.name||u.email.split("@")[0],
      level:u.level,
      masteryPath:u.masteryPath,
      lastActiveAt:u.lastActiveAt,
      avatar:u.avatar,
      isOnline:!!(u.lastActiveAt&&new Date(u.lastActiveAt)>fiveMinAgo),
      isFriend:friendIds.has(u.id),
    })).sort((a,b)=>{
      if(a.isOnline!==b.isOnline)return a.isOnline?-1:1;
      if(a.isFriend!==b.isFriend)return a.isFriend?-1:1;
      return(new Date(b.lastActiveAt||0))-(new Date(a.lastActiveAt||0));
    });
    res.json(result);
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
    if(!gotBonus){goldBonus=15;await prisma.user.update({where:{id:req.userId},data:{gold:{increment:15},lastJournalBonusDate:new Date()}});}
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
    if(!gotBonus){goldBonus=15;await prisma.user.update({where:{id:req.userId},data:{gold:{increment:15},lastGoalBonusDate:new Date()}});}
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

// (online-count endpoint is below, near chess section)

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

// Send friend request by user ID (used by Discover page)
app.post("/friends/request-by-id",authMiddleware,async(req,res)=>{
  try{
    const{userId:targetId}=req.body;
    if(!targetId)return res.status(400).json({message:"userId обязателен"});
    const tid=Number(targetId);
    if(tid===req.userId)return res.status(400).json({message:"Нельзя добавить себя"});
    const alreadyFriends=await prisma.friendship.findUnique({where:{userId_friendId:{userId:req.userId,friendId:tid}}});
    if(alreadyFriends)return res.status(400).json({message:"Уже в друзьях"});
    const existing=await prisma.friendRequest.findUnique({where:{fromUserId_toUserId:{fromUserId:req.userId,toUserId:tid}}});
    if(existing)return res.status(400).json({message:"Заявка уже отправлена"});
    const reverse=await prisma.friendRequest.findUnique({where:{fromUserId_toUserId:{fromUserId:tid,toUserId:req.userId}}});
    if(reverse){
      await prisma.$transaction([
        prisma.friendship.create({data:{userId:req.userId,friendId:tid}}),
        prisma.friendship.create({data:{userId:tid,friendId:req.userId}}),
        prisma.friendRequest.delete({where:{fromUserId_toUserId:{fromUserId:tid,toUserId:req.userId}}}),
      ]);
      return res.status(201).json({message:"Заявка принята — вы теперь друзья!"});
    }
    await prisma.friendRequest.create({data:{fromUserId:req.userId,toUserId:tid}});
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
app.get("/messages/unread-count",authMiddleware,async(req,res)=>{
  try{
    const count=await prisma.directMessage.count({where:{toUserId:req.userId,read:false}});
    res.json({count});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});
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
    const senderName=msg.fromUser.name||msg.fromUser.email.split("@")[0];
    await prisma.notification.create({data:{
      userId:friendId,type:"new_message",
      title:"Новое сообщение",
      text:`${senderName} написал тебе сообщение`,
      relatedId:req.userId,read:false,
    }}).catch(()=>{});
    res.status(201).json({id:msg.id,text:msg.text,createdAt:msg.createdAt,read:false,fromMe:true,authorName:senderName});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── POMODORO ─────────────────────────────────────────────────────────────────
app.post("/pomodoro/complete",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const today=startOfToday();
    const needsBonus=!user.lastPomodoroBonusDate||new Date(user.lastPomodoroBonusDate)<today;
    const{xp,level}=applyXpGain(user.xp,user.level,20);
    await prisma.user.update({where:{id:req.userId},data:{
      xp,level,
      gold:{increment:needsBonus?15:0},
      ...(needsBonus?{lastPomodoroBonusDate:new Date()}:{}),
    }});
    res.json({xp:20,gold:needsBonus?15:0,bonusGold:needsBonus,leveledUp:level>user.level,newLevel:level});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});
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

app.patch("/notifications/read-type/:type",authMiddleware,async(req,res)=>{
  try{
    await prisma.notification.updateMany({where:{userId:req.userId,type:req.params.type},data:{read:true}});
    res.json({message:"ok"});
  }catch(e){res.status(500).json({message:"Ошибка"});}
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

// ── AVATAR UPLOAD ────────────────────────────────────────────────────────────
app.patch("/me/avatar",authMiddleware,async(req,res)=>{
  try{
    const{avatar}=req.body;
    if(!avatar)return res.status(400).json({message:"Avatar data required"});
    if(avatar.length>2*1024*1024)return res.status(413).json({message:"Изображение слишком большое (макс 2MB)"});
    await prisma.user.update({where:{id:req.userId},data:{avatar}});
    res.json({message:"OK"});
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
    const user=await prisma.user.findUnique({where:{id:targetId},select:{id:true,name:true,email:true,level:true,xp:true,streak:true,clanId:true,clanRole:true,title:true,activeTitle:true,avatarStyle:true,avatarFrame:true,nicknameEffect:true,masteryPath:true,hasEverFinishedMastery:true,createdAt:true,archiveSolved:true,darkSideChoice:true,peaceUnlocked:true}});
    if(!user)return res.status(404).json({message:"Пользователь не найден"});
    const [achievements,taskCount,clan,pet,season]=await Promise.all([
      prisma.achievement.findMany({where:{userId:targetId},orderBy:{unlockedAt:"asc"}}),
      prisma.task.count({where:{userId:targetId,completed:true}}),
      user.clanId?prisma.clan.findUnique({where:{id:user.clanId},select:{name:true,bannerIcon:true,bannerColor:true}}):null,
      prisma.pet.findUnique({where:{userId:targetId},select:{name:true,stage:true,mood:true}}).catch(()=>null),
      prisma.season.findFirst({where:{active:true}}),
    ]);
    const seasonProgress=season?await prisma.seasonProgress.findUnique({where:{userId_seasonId:{userId:targetId,seasonId:season.id}}}):null;
    res.json({
      ...user,name:user.name||user.email.split("@")[0],
      clan,pet,
      achievements:achievements.map(a=>({...a,...ACHIEVEMENT_META[a.type]})),
      taskCount,seasonXp:seasonProgress?.xp||0,
    });
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── TITLES ────────────────────────────────────────────────────────────────────
app.get("/titles",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const achievements=await prisma.achievement.findMany({where:{userId:req.userId}});
    const titles=["Игрок"];
    if(user.archiveSolved)titles.push("Архивариус");
    if(user.darkSideChoice==="light")titles.push("Победивший тьму");
    if(user.darkSideChoice==="shadow")titles.push("Идущий в тени");
    if(user.peaceUnlocked)titles.push("Пятая ветка");
    if(user.hasEverFinishedMastery&&user.masteryPath)titles.push(getMasteryTitle(user.masteryPath));
    const achTypes=new Set(achievements.map(a=>a.type));
    if(achTypes.has("legend")||achTypes.size>=4)titles.push("Легенда");
    if(achTypes.has("legendary_quest"))titles.push("Победитель системы");
    res.json({titles,activeTitle:user.activeTitle||"Игрок"});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.patch("/titles/active",authMiddleware,async(req,res)=>{
  try{
    const{title}=req.body;
    if(!title)return res.status(400).json({message:"Укажи титул"});
    await prisma.user.update({where:{id:req.userId},data:{activeTitle:title}});
    res.json({message:"Титул обновлён",activeTitle:title});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
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
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true,activeNpcId:true}});
    const interactions=await prisma.npcInteraction.findMany({where:{userId:req.userId}});
    const npcs=getAvailableNpcs(user.level).map(npc=>{
      const interaction=interactions.find(i=>i.npcId===npc.id)||null;
      const now=new Date();
      const canInteract=!interaction||((now-interaction.lastInteractedAt)>7*24*3600*1000);
      return{...npc,canInteract,questsGiven:interaction?.questsGiven||0,lastInteractedAt:interaction?.lastInteractedAt||null,isActive:user.activeNpcId===npc.id};
    });
    res.json({npcs,activeNpcId:user.activeNpcId||null});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

async function checkNpcQuestCondition(userId,user,condition){
  if(!condition)return{ok:true};
  if(condition.includes('30 дней')){
    if((user.streak||0)<30)return{ok:false,reason:`Нужен стрик 30 дней. Твой стрик: ${user.streak||0} дн.`};
  } else if(condition.includes('14 дней')){
    if((user.streak||0)<14)return{ok:false,reason:`Нужен стрик 14 дней. Твой стрик: ${user.streak||0} дн.`};
  } else if(condition.includes('7 дней подряд')||condition.includes('неделю')){
    if((user.streak||0)<7)return{ok:false,reason:`Нужен стрик 7 дней. Твой стрик: ${user.streak||0} дн.`};
  } else if(condition.includes('5 дней подряд')||condition.includes('5 days')){
    if((user.streak||0)<5)return{ok:false,reason:`Нужен стрик 5 дней. Твой стрик: ${user.streak||0} дн.`};
  } else if(condition.includes('3 дня подряд')){
    if((user.streak||0)<3)return{ok:false,reason:`Нужен стрик 3 дня. Твой стрик: ${user.streak||0} дн.`};
  }
  const levelMatch=condition.match(/(\d+)\s*уровн/i);
  if(levelMatch){
    const required=parseInt(levelMatch[1]);
    if((user.level||1)<required)return{ok:false,reason:`Нужен уровень ${required}. Твой уровень: ${user.level}`};
  }
  if(condition.includes('дисциплин')){
    const m=condition.match(/(\d+)/);const req=m?parseInt(m[1]):10;
    const cnt=await prisma.task.count({where:{userId,completed:true,branch:'discipline'}});
    if(cnt<req)return{ok:false,reason:`Нужно ${req} квестов дисциплины. У тебя: ${cnt}`};
  }
  if(condition.includes('фитнес')||condition.includes('fitness')){
    const m=condition.match(/(\d+)/);const req=m?parseInt(m[1]):10;
    const cnt=await prisma.task.count({where:{userId,completed:true,branch:'fitness'}});
    if(cnt<req)return{ok:false,reason:`Нужно ${req} квестов фитнеса. У тебя: ${cnt}`};
  }
  if(condition.includes('знани')||condition.includes('knowledge')){
    const m=condition.match(/(\d+)/);const req=m?parseInt(m[1]):10;
    const cnt=await prisma.task.count({where:{userId,completed:true,branch:'knowledge'}});
    if(cnt<req)return{ok:false,reason:`Нужно ${req} квестов знаний. У тебя: ${cnt}`};
  }
  if(condition.includes('саморазви')||condition.includes('self')){
    const m=condition.match(/(\d+)/);const req=m?parseInt(m[1]):10;
    const cnt=await prisma.task.count({where:{userId,completed:true,branch:'self_development'}});
    if(cnt<req)return{ok:false,reason:`Нужно ${req} квестов саморазвития. У тебя: ${cnt}`};
  }
  const questMatch=condition.match(/(\d+)\s*(квест|задани)/i);
  if(questMatch){
    const required=parseInt(questMatch[1]);
    const completed=await prisma.task.count({where:{userId,completed:true,type:{in:['required','recommended','custom']}}});
    if(completed<required)return{ok:false,reason:`Нужно выполнить ${required} квестов. У тебя: ${completed}`};
  }
  return{ok:true};
}

app.post("/npc/:id/interact",authMiddleware,async(req,res)=>{
  try{
    const npc=getNpc(req.params.id);
    if(!npc)return res.status(404).json({message:"NPC не найден"});
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true,streak:true}});
    if(user.level<npc.unlockLevel)return res.status(403).json({message:`Откроется на уровне ${npc.unlockLevel}`});
    const condition=npc.weeklyQuestDesc||'';
    const check=await checkNpcQuestCondition(req.userId,user,condition);
    if(!check.ok)return res.status(400).json({message:'Условие не выполнено',reason:check.reason,cannotAccept:true});
    const now=new Date();
    const interaction=await prisma.npcInteraction.findUnique({where:{userId_npcId:{userId:req.userId,npcId:npc.id}}});
    if(interaction&&(now-interaction.lastInteractedAt)<7*24*3600*1000){
      const daysLeft=Math.ceil((7*24*3600*1000-(now-interaction.lastInteractedAt))/(24*3600*1000));
      return res.status(400).json({message:`Следующий разговор через ${daysLeft} дн.`});
    }
    const task=await prisma.task.create({data:{
      userId:req.userId,title:npc.weeklyQuestTitle,description:npc.weeklyQuestDesc,
      branch:npc.branch||"discipline",type:"recommended",difficulty:"hard",
      xpReward:120,goldReward:60,isDaily:false,
      isNpcQuest:true,npcName:npc.name,
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

app.patch("/npc/:id/activate",authMiddleware,async(req,res)=>{
  try{
    const npc=getNpc(req.params.id);
    if(!npc)return res.status(404).json({message:"NPC не найден"});
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true}});
    if(user.level<npc.unlockLevel)return res.status(403).json({message:`Откроется на уровне ${npc.unlockLevel}`});
    const already=await prisma.user.findUnique({where:{id:req.userId},select:{activeNpcId:true}});
    const deactivate=already.activeNpcId===npc.id;
    await prisma.user.update({where:{id:req.userId},data:{activeNpcId:deactivate?null:npc.id}});
    res.json({
      message:deactivate?`${npc.name} деактивирован`:`${npc.name} теперь твой активный наставник (+10% XP в ветке ${npc.branch})`,
      activeNpcId:deactivate?null:npc.id,
    });
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
      const unlocked=unlockedIds.has(s.id);
      const canUnlock=user.level>=s.levelRequired;
      const available=prereqsMet&&!unlocked&&canUnlock&&user.gold>=s.goldCost;
      return{...s,requires,unlocked,available,canUnlock,prereqsMet};
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
    if(user.level<skill.levelRequired)return res.status(400).json({message:`Нужен уровень ${skill.levelRequired}. Твой уровень: ${user.level}`});
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
    const baseResult={tasks,friends:matchedFriends,achievements:matchedAchievements,sections:matchedSections};
    if(req.query.ai!=="true"||!process.env.ANTHROPIC_API_KEY){
      return res.json({...baseResult,ai_answer:null,suggested_view:null});
    }
    try{
      const aiResult=await Promise.race([
        getAiSearchAnswer(req.userId,q),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("timeout")),7000)),
      ]);
      res.json({...baseResult,...aiResult});
    }catch(aiErr){
      console.warn("[search] AI enhancement failed:",aiErr.message);
      res.json({...baseResult,ai_answer:null,suggested_view:null});
    }
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/easter/logo", authMiddleware, async(req,res)=>{
  try {
    const key="easter_logo";
    const egg=await prisma.easterEgg.findUnique({where:{key}}).catch(()=>null);
    if(!egg){
      await prisma.user.update({where:{id:req.userId},data:{gold:{increment:500}}});
      return res.json({gold:500,message:"Секрет найден!"});
    }
    const already=await prisma.easterEggUnlock.findFirst({where:{userId:req.userId,eggId:egg.id}}).catch(()=>null);
    if(already) return res.json({message:"already"});
    await prisma.easterEggUnlock.create({data:{userId:req.userId,eggId:egg.id}}).catch(()=>{});
    await prisma.user.update({where:{id:req.userId},data:{gold:{increment:500}}});
    res.json({gold:500,message:"Секрет найден!"});
  } catch(e){ res.status(500).json({message:"Ошибка"}); }
});

app.get("/health",(req,res)=>res.json({status:"ok"}));
// ── LEGEND PATH ───────────────────────────────────────────────────────────────
const LEGEND_MILESTONES={5:{gold:100,xp:500,title:"Ученик Легенды"},10:{gold:200,xp:1000,title:"Воин Легенды"},25:{gold:500,xp:2500,title:"Страж Легенды"},40:{gold:1000,xp:5000,title:"Мастер Легенды"},50:{gold:2000,xp:10000,title:"ЛЕГЕНДА"}};

app.get("/legend-path",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true}});
    // TODO: вернуть ограничение level >= 40 после тестирования
    if(user.level<50)return res.json({locked:true,level:user.level,unlockedAt:50});
    const completedCount=await prisma.task.count({where:{userId:req.userId,completed:true,type:"legend"}});
    const today=startOfToday();
    const completedToday=await prisma.task.count({where:{userId:req.userId,completed:true,type:"legend",completedAt:{gte:today}}});
    const pendingToday=await prisma.task.count({where:{userId:req.userId,completed:false,type:"legend",expiresAt:{gte:today}}});
    const currentQuest=pendingToday>0?await prisma.task.findFirst({where:{userId:req.userId,completed:false,type:"legend",expiresAt:{gte:today}},select:{id:true,title:true,description:true}}):null;
    res.json({completedCount,completedToday,pendingToday,currentQuest,milestones:LEGEND_MILESTONES,unlockedAt:50});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/legend-path/claim-daily",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true,xp:true,gold:true,title:true}});
    if(user.level<50)return res.status(403).json({message:"Легендарный путь откроется на 50 уровне"});
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

// ── ПУТЬ СОЗДАТЕЛЯ ────────────────────────────────────────────────────────────
const CREATOR_QUESTS=[
  {day:1,  title:"Вызов Создателя: День 1",         desc:"Проснись в 5:00 и запиши манифест своей жизни (500+ слов)",                        xpReward:500,   goldReward:250},
  {day:2,  title:"Железная воля",                   desc:"Выполни ВСЕ квесты дня без единого пропуска",                                        xpReward:500,   goldReward:250},
  {day:3,  title:"Тело воина",                      desc:"200 отжиманий за день (можно подходами)",                                             xpReward:500,   goldReward:250},
  {day:4,  title:"Разум мудреца",                   desc:"Прочитай 50 страниц и напиши конспект",                                               xpReward:500,   goldReward:250},
  {day:5,  title:"Без телефона",                    desc:"Первые 3 часа дня без телефона",                                                      xpReward:500,   goldReward:250},
  {day:6,  title:"Холодный старт",                  desc:"7 дней холодного душа подряд (на честность)",                                        xpReward:500,   goldReward:250},
  {day:7,  title:"Неделя создателя",                desc:"Стрик 7 дней без единого пропуска",                                                   xpReward:500,   goldReward:250},
  {day:8,  title:"Марафон воли",                    desc:"Выполни 15 квестов за один день",                                                     xpReward:500,   goldReward:250},
  {day:9,  title:"Голос лидера",                    desc:"Запиши видео о своём прогрессе (на честность)",                                       xpReward:500,   goldReward:250},
  {day:10, title:"Десятый рубеж",                   desc:"10 дней пути. Напиши письмо себе через год.",                                         xpReward:1000,  goldReward:500},
  {day:11, title:"Железный режим",                  desc:"Вставай в одно время 5 дней подряд до 6:00",                                          xpReward:500,   goldReward:250},
  {day:12, title:"Цифровой детокс",                 desc:"Весь день без социальных сетей. Полностью.",                                          xpReward:500,   goldReward:250},
  {day:13, title:"Физический предел",               desc:"Тренировка до полного отказа мышц",                                                   xpReward:500,   goldReward:250},
  {day:14, title:"Две недели",                      desc:"Напиши 3 вещи которые изменились за 14 дней",                                         xpReward:500,   goldReward:250},
  {day:15, title:"Наставник",                       desc:"Помоги кому-то стать лучше сегодня. Опиши в дневнике.",                               xpReward:500,   goldReward:250},
  {day:16, title:"Без жалоб",                       desc:"Весь день без единой жалобы вслух или в мыслях",                                      xpReward:500,   goldReward:250},
  {day:17, title:"Час концентрации",                desc:"60 минут глубокой работы без единого отвлечения",                                     xpReward:500,   goldReward:250},
  {day:18, title:"Благодарность",                   desc:"Напиши 10 вещей за которые благодарен прямо сейчас",                                  xpReward:500,   goldReward:250},
  {day:19, title:"Предпоследний день третьей недели",desc:"Выполни все квесты всех 4 веток за один день",                                        xpReward:500,   goldReward:250},
  {day:20, title:"Двадцатый рубеж",                 desc:"20 дней. Запиши своё главное открытие пути.",                                         xpReward:1000,  goldReward:500},
  {day:21, title:"Три недели",                      desc:"Стрик 21 день. Привычка сформирована. Докажи.",                                       xpReward:500,   goldReward:250},
  {day:22, title:"Выход из зоны комфорта",          desc:"Сделай что-то чего никогда не делал раньше",                                          xpReward:500,   goldReward:250},
  {day:23, title:"Лидерство",                       desc:"Возьми на себя ответственность за что-то важное сегодня",                             xpReward:500,   goldReward:250},
  {day:24, title:"Читай ежедневно",                 desc:"Минимум 30 страниц. Без исключений.",                                                 xpReward:500,   goldReward:250},
  {day:25, title:"Четверть финала",                 desc:"25 дней. Напиши кем стал за это время.",                                              xpReward:1000,  goldReward:500},
  {day:26, title:"Без оправданий",                  desc:"Весь день — никаких оправданий. Только действия.",                                    xpReward:500,   goldReward:250},
  {day:27, title:"Максимальный день",               desc:"Выполни максимально возможное количество квестов за день",                            xpReward:500,   goldReward:250},
  {day:28, title:"Письмо прошлому себе",            desc:"Напиши письмо себе до начала пути. Что изменилось?",                                  xpReward:500,   goldReward:250},
  {day:29, title:"Предпоследний день",              desc:"Завтра финал. Подготовься. Напиши план финального дня.",                              xpReward:500,   goldReward:250},
  {day:30, title:"ФИНАЛ — Я ПОБЕДИЛ СИСТЕМУ",       desc:"Выполни все обязательные квесты дня + напиши итоговый манифест 1000+ слов. Ты прошёл путь создателя.", xpReward:10000, goldReward:5000},
];

app.get("/creator-path/status",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true,name:true}});
    if(user.level<75)return res.json({locked:true,level:user.level,requiredLevel:75});
    const cp=await prisma.creatorPath.findUnique({where:{userId:req.userId}});
    if(!cp)return res.json({started:false,level:user.level});
    const questData=CREATOR_QUESTS[cp.currentDay]||null;
    const msSinceStart=Date.now()-new Date(cp.startedAt).getTime();
    const daysPassed=Math.floor(msSinceStart/(1000*60*60*24));
    const today=startOfToday();
    const alreadyDoneToday=cp.lastQuestDate&&new Date(cp.lastQuestDate)>=today;
    res.json({started:true,currentDay:cp.currentDay,status:cp.status,startedAt:cp.startedAt,completedAt:cp.completedAt,questData,daysPassed,totalDays:30,alreadyDoneToday:!!alreadyDoneToday});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/creator-path/start",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{level:true}});
    if(user.level<75)return res.status(403).json({message:"Путь Создателя откроется на 75 уровне"});
    const existing=await prisma.creatorPath.findUnique({where:{userId:req.userId}});
    if(existing)return res.status(400).json({message:"Путь уже начат"});
    const cp=await prisma.creatorPath.create({data:{userId:req.userId}});
    res.json({success:true,creatorPath:cp,questData:CREATOR_QUESTS[0]});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/creator-path/complete-day",authMiddleware,async(req,res)=>{
  try{
    const cp=await prisma.creatorPath.findUnique({where:{userId:req.userId}});
    if(!cp)return res.status(404).json({message:"Путь не начат"});
    if(cp.status==="completed")return res.status(400).json({message:"Путь уже завершён"});
    // ── One quest per day ────────────────────────────────────────────────────
    const today=startOfToday();
    if(cp.lastQuestDate&&new Date(cp.lastQuestDate)>=today){
      return res.status(400).json({message:"Квест уже выполнен сегодня. Возвращайся завтра.",nextAvailable:"завтра"});
    }
    // ── Determine quest rewards ──────────────────────────────────────────────
    const quest=CREATOR_QUESTS[cp.currentDay]||{xpReward:500,goldReward:250};
    const nextDay=cp.currentDay+1;
    const isFinished=nextDay>=30;
    // ── Apply XP ─────────────────────────────────────────────────────────────
    const cu=await prisma.user.findUnique({where:{id:req.userId}});
    const{xp,level}=applyXpGain(cu.xp,cu.level,quest.xpReward);
    // ── Update creatorPath ────────────────────────────────────────────────────
    const cpData={currentDay:nextDay,lastQuestDate:new Date()};
    if(isFinished){cpData.status="completed";cpData.completedAt=new Date();}
    await prisma.creatorPath.update({where:{userId:req.userId},data:cpData});
    // ── Per-day reward ────────────────────────────────────────────────────────
    const userUpdates={xp,level,gold:{increment:quest.goldReward}};
    if(isFinished){
      // Final completion bonus
      Object.assign(userUpdates,{gold:{increment:quest.goldReward+50000},title:"Победитель системы",nicknameEffect:"absolute",activeTitle:"Победитель системы"});
    }
    await prisma.user.update({where:{id:req.userId},data:userUpdates});
    // ── Hall of Fame on completion ────────────────────────────────────────────
    if(isFinished){
      const existing=await prisma.hallOfFame.findFirst({where:{userId:req.userId,type:"creator_path"}}).catch(()=>null);
      if(!existing){
        await prisma.hallOfFame.create({data:{userId:req.userId,type:"creator_path",completedAt:new Date()}}).catch(()=>{});
      }
      await prisma.notification.create({data:{userId:req.userId,type:"hall_of_fame",message:"⚡ Ты завершил Путь Создателя и попал в Зал Славы!",read:false}}).catch(()=>{});
    }
    const questData=isFinished?null:CREATOR_QUESTS[nextDay];
    res.json({success:true,nextDay,isFinished,questData,xpGained:quest.xpReward,goldReward:isFinished?quest.goldReward+50000:quest.goldReward,leveledUp:level>cu.level,newLevel:level});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/hall-of-fame",authMiddleware,async(req,res)=>{
  try{
    const entries=await prisma.hallOfFame.findMany({
      include:{user:{select:{id:true,name:true,level:true,avatar:true}}},
      orderBy:{completedAt:"asc"},
    });
    res.json({winners:entries.map(e=>({id:e.user.id,name:e.user.name,level:e.user.level,completedAt:e.completedAt,type:e.type}))});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

// ── CHESS ─────────────────────────────────────────────────────────────────────
const CHESS_INIT=JSON.stringify([
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R'],
]);
const CHESS_INC={player1:{select:{id:true,name:true,email:true,level:true}},player2:{select:{id:true,name:true,email:true,level:true}}};

app.post("/chess/invite/:friendId",authMiddleware,async(req,res)=>{
  try{
    const friendId=Number(req.params.friendId);
    const existing=await prisma.chessGame.findFirst({where:{OR:[{player1Id:req.userId,player2Id:friendId},{player1Id:friendId,player2Id:req.userId}],status:{in:["waiting","active"]}},});
    if(existing)return res.status(400).json({message:"Игра уже существует",gameId:existing.id});
    const[sender,friend]=await Promise.all([prisma.user.findUnique({where:{id:req.userId},select:{chessRating:true}}),prisma.user.findUnique({where:{id:friendId},select:{chessRating:true}})]);
    const shareCode=Math.random().toString(36).slice(2,8).toUpperCase();
    const game=await prisma.chessGame.create({data:{player1Id:req.userId,player2Id:friendId,boardState:CHESS_INIT,shareCode,player1Rating:sender?.chessRating||1000,player2Rating:friend?.chessRating||1000},include:CHESS_INC});
    // Уведомление другу
    await prisma.notification.create({data:{userId:friendId,type:"chess_invite",message:`Вызов на шахматы от ${game.player1.name||game.player1.email}`,relatedId:game.id}}).catch(()=>{});
    res.status(201).json(game);
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/chess/pending",authMiddleware,async(req,res)=>{
  try{
    const games=await prisma.chessGame.findMany({where:{player2Id:req.userId,status:"waiting"},include:CHESS_INC,orderBy:{createdAt:"desc"}});
    res.json(games);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/chess/accept/:gameId",authMiddleware,async(req,res)=>{
  try{
    const game=await prisma.chessGame.findUnique({where:{id:Number(req.params.gameId)}});
    if(!game)return res.status(404).json({message:"Игра не найдена"});
    if(game.player2Id!==req.userId)return res.status(403).json({message:"Это не ваш вызов"});
    if(game.status!=="waiting")return res.status(400).json({message:"Игра уже начата"});
    const updated=await prisma.chessGame.update({where:{id:game.id},data:{status:"active"},include:CHESS_INC});
    res.json(updated);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/chess/game/:id",authMiddleware,async(req,res)=>{
  try{
    const game=await prisma.chessGame.findUnique({where:{id:Number(req.params.id)},include:CHESS_INC});
    if(!game)return res.status(404).json({message:"Игра не найдена"});
    if(game.player1Id!==req.userId&&game.player2Id!==req.userId)return res.status(403).json({message:"Доступ запрещён"});
    res.json(game);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/chess/my-games",authMiddleware,async(req,res)=>{
  try{
    const games=await prisma.chessGame.findMany({where:{OR:[{player1Id:req.userId},{player2Id:req.userId}],status:{in:["active","finished"]}},include:CHESS_INC,orderBy:{updatedAt:"desc"},take:20});
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
    const myNum=isP1?1:2;
    if(game.currentTurn!==myNum)return res.status(400).json({message:"Не ваш ход"});
    const{boardState,from,to,status,result}=req.body;
    const nextTurn=myNum===1?2:1;
    const prevMoves=JSON.parse(game.moves||"[]");
    const newMoves=JSON.stringify([...prevMoves,`${from}-${to}`]);
    const updated=await prisma.chessGame.update({
      where:{id:game.id},
      data:{boardState,currentTurn:nextTurn,status:status||"active",result:result||null,moves:newMoves,drawOfferedBy:null},
      include:CHESS_INC,
    });
    if(status==="finished"&&result){
      const winnerId=result==="1"?game.player1Id:result==="2"?game.player2Id:null;
      const loserId=winnerId?(winnerId===game.player1Id?game.player2Id:game.player1Id):null;
      const ups=[];
      if(result==="draw"){
        ups.push(prisma.user.update({where:{id:game.player1Id},data:{xp:{increment:10}}}));
        ups.push(prisma.user.update({where:{id:game.player2Id},data:{xp:{increment:10}}}));
      }else if(winnerId){
        ups.push(prisma.user.update({where:{id:winnerId},data:{xp:{increment:15}}}));
        if(loserId)ups.push(prisma.user.update({where:{id:loserId},data:{xp:{increment:5}}}));
      }
      if(ups.length)await prisma.$transaction(ups);
      const oppId=isP1?game.player2Id:game.player1Id;
      const resultText=result==="draw"?"Ничья!":result===String(myNum)?"Вы победили!":"Вы проиграли";
      await prisma.notification.create({data:{userId:oppId,type:"chess_result",message:`Шахматы: ${resultText}`,relatedId:game.id}}).catch(()=>{});
    }
    res.json(updated);
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/chess/game/:id/resign",authMiddleware,async(req,res)=>{
  try{
    const game=await prisma.chessGame.findUnique({where:{id:Number(req.params.id)}});
    if(!game||game.status!=="active")return res.status(400).json({message:"Игра недоступна"});
    const isP1=game.player1Id===req.userId;
    if(!isP1&&game.player2Id!==req.userId)return res.status(403).json({message:"Вы не участник"});
    const winnerNum=String(isP1?2:1);
    const updated=await prisma.chessGame.update({where:{id:game.id},data:{status:"finished",result:winnerNum},include:CHESS_INC});
    await prisma.user.update({where:{id:req.userId},data:{xp:{increment:5}}});
    const winnerId=isP1?game.player2Id:game.player1Id;
    await prisma.user.update({where:{id:winnerId},data:{xp:{increment:15}}});
    res.json(updated);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/chess/game/:id/draw",authMiddleware,async(req,res)=>{
  try{
    const game=await prisma.chessGame.findUnique({where:{id:Number(req.params.id)}});
    if(!game||game.status!=="active")return res.status(400).json({message:"Игра недоступна"});
    const myNum=game.player1Id===req.userId?1:game.player2Id===req.userId?2:null;
    if(!myNum)return res.status(403).json({message:"Вы не участник"});
    if(game.drawOfferedBy&&game.drawOfferedBy!==myNum){
      // Принять ничью
      const updated=await prisma.chessGame.update({where:{id:game.id},data:{status:"finished",result:"draw",drawOfferedBy:null},include:CHESS_INC});
      await prisma.$transaction([
        prisma.user.update({where:{id:game.player1Id},data:{xp:{increment:10}}}),
        prisma.user.update({where:{id:game.player2Id},data:{xp:{increment:10}}}),
      ]);
      return res.json(updated);
    }
    if(game.drawOfferedBy===myNum){
      // Отозвать предложение
      const updated=await prisma.chessGame.update({where:{id:game.id},data:{drawOfferedBy:null},include:CHESS_INC});
      return res.json(updated);
    }
    // Предложить ничью
    const updated=await prisma.chessGame.update({where:{id:game.id},data:{drawOfferedBy:myNum},include:CHESS_INC});
    res.json(updated);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

// ── LAPTEV AI ─────────────────────────────────────────────────────────────────
app.post("/laptev/chat",authMiddleware,async(req,res)=>{
  try{
    if(!process.env.ANTHROPIC_API_KEY)return res.status(500).json({message:"API ключ не настроен"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    const today=startOfToday();
    const isToday=user.laptevMsgDate&&new Date(user.laptevMsgDate)>=today;
    const count=isToday?user.laptevMsgCount:0;
    if(count>=5)return res.status(429).json({message:"На сегодня хватит. Иди делай квесты. Завтра продолжим.",messagesLeft:0});
    const{message,history=[]}=req.body;
    if(!message?.trim())return res.status(400).json({message:"Пустое сообщение"});
    // Compute branch stats for coaching context
    const BRANCHES=["discipline","fitness","self_development","knowledge"];
    const weekAgo=new Date(Date.now()-7*24*60*60*1000);
    const weeklyTasks=await prisma.task.findMany({where:{userId:req.userId,completed:true,createdAt:{gte:weekAgo}},select:{branch:true,xpReward:true}});
    const branchXp={};
    BRANCHES.forEach(b=>branchXp[b]=0);
    weeklyTasks.forEach(t=>{if(branchXp[t.branch]!==undefined)branchXp[t.branch]+=(t.xpReward||0);});
    const weeklyXp=weeklyTasks.reduce((s,t)=>s+(t.xpReward||0),0);
    const sorted=BRANCHES.slice().sort((a,b)=>branchXp[b]-branchXp[a]);
    const strongestBranch=sorted[0];const weakestBranch=sorted[sorted.length-1];
    const BRANCH_RU={discipline:"Дисциплина",fitness:"Фитнес",self_development:"Саморазвитие",knowledge:"Знания"};
    const Anthropic=require("@anthropic-ai/sdk");
    const client=new Anthropic();
    const msgs=[...history.slice(-8).map(m=>({role:m.role,content:m.content})),{role:"user",content:message}];
    const response=await client.messages.create({
      model:"claude-haiku-4-5-20251001",
      max_tokens:200,
      system:`Ты — Антон Лаптев, создатель системы LevelUp. Выступаешь одновременно как наставник и AI коуч.\nАнализируешь данные игрока и даёшь персональные советы.\nГоворишь как старший брат — лаконично, простым языком, без воды. Максимум 3-4 предложения.\nДанные игрока: имя ${user.name||"Игрок"}, уровень ${user.level}, стрик ${user.streak} дней, слабая ветка: ${BRANCH_RU[weakestBranch]||weakestBranch}, сильная: ${BRANCH_RU[strongestBranch]||strongestBranch}, XP за неделю: ${weeklyXp}.\nОтвечай на русском. Обращайся на ты.`,
      messages:msgs,
    });
    const reply=response.content[0].text;
    await prisma.user.update({where:{id:req.userId},data:{laptevMsgCount:isToday?{increment:1}:1,laptevMsgDate:new Date()}});
    await prisma.laptevMessage.create({data:{userId:req.userId,role:"user",content:message}});
    await prisma.laptevMessage.create({data:{userId:req.userId,role:"assistant",content:reply}});
    res.json({reply,messagesLeft:5-(isToday?count+1:1)});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/laptev/history",authMiddleware,async(req,res)=>{
  try{
    const messages=await prisma.laptevMessage.findMany({
      where:{userId:req.userId},
      orderBy:{createdAt:"asc"},
      take:50,
    });
    const today=startOfToday();
    const todayCount=await prisma.laptevMessage.count({
      where:{userId:req.userId,role:"user",createdAt:{gte:today}},
    });
    res.json({messages,todayCount,messagesLeft:Math.max(0,5-todayCount)});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

// ── KNOWLEDGE CHAT ────────────────────────────────────────────────────────────
app.post("/knowledge/chat",authMiddleware,async(req,res)=>{
  try{
    if(!process.env.ANTHROPIC_API_KEY)return safeError(res,503,"AI недоступен — настройте ANTHROPIC_API_KEY");
    const rateCheck=await enforceRateLimit(req.userId,prisma);
    if(!rateCheck.allowed)return res.status(429).json({message:rateCheck.error,messagesLeft:0});
    const inputCheck=validateAndSanitizeInput(req.body.message);
    if(!inputCheck.ok)return res.status(400).json({message:inputCheck.error});
    const safeMsg=inputCheck.message;
    const safeHist=validateHistory(req.body.history,req.userId);
    const reply=await getKnowledgeChatReply(req.userId,safeHist,safeMsg);
    await prisma.laptevMessage.createMany({data:[
      {userId:req.userId,role:"user",content:safeMsg,mode:"knowledge"},
      {userId:req.userId,role:"assistant",content:reply,mode:"knowledge"},
    ]});
    res.json({reply,messagesLeft:rateCheck.messagesLeft});
  }catch(e){
    if(e?.status===429)return safeError(res,503,"AI временно недоступен, попробуй позже",e);
    if(e?.status>=400&&e?.status<500)return safeError(res,502,"Ошибка при обращении к AI",e);
    return safeError(res,500,"Ошибка сервера",e);
  }
});

app.get("/knowledge/history",authMiddleware,async(req,res)=>{
  try{
    const messages=await prisma.laptevMessage.findMany({
      where:{userId:req.userId,mode:"knowledge"},
      orderBy:{createdAt:"asc"},
      take:50,
      select:{role:true,content:true,createdAt:true},
    });
    res.json({messages,messagesLeft:null});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

// ── КАРТА МИРА: ЕЖЕДНЕВНЫЕ КВЕСТЫ ЛОКАЦИИ ────────────────────────────────────
// XP по уровням сложности, gold — по формуле 10 + (index-1)*3
const LOCATION_XP=[
  50,50,50,         // 1-3
  100,100,100,      // 4-6
  150,150,150,150,  // 7-10
  200,200,200,200,  // 11-14
  250,250,250,250,  // 15-18
  300,300,          // 19-20
];
app.post("/world-map/:locationId/claim-quest",authMiddleware,async(req,res)=>{
  try{
    const locationId=Number(req.params.locationId);
    if(locationId<1||locationId>20)return res.status(400).json({message:"Неверный ID локации"});
    const today=startOfToday();
    const existing=await prisma.worldMapQuest.findFirst({where:{userId:req.userId,locationId,createdAt:{gte:today}}});
    if(existing){return res.json({alreadyTaken:true,completed:existing.completed});}
    const xpReward=LOCATION_XP[locationId-1]||100;
    const goldReward=10+(locationId-1)*3; // loc1=10, loc2=13, ... loc20=67
    const quest=await prisma.worldMapQuest.create({data:{userId:req.userId,locationId}});
    const u=await prisma.user.findUnique({where:{id:req.userId}});
    const{xp,level}=applyXpGain(u.xp,u.level,xpReward);
    await prisma.user.update({where:{id:req.userId},data:{xp,level,gold:{increment:goldReward}}});
    await prisma.worldMapQuest.update({where:{id:quest.id},data:{completed:true}});
    res.json({claimed:true,xpGained:xpReward,goldGained:goldReward,level,leveledUp:level>u.level});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.get("/world-map/daily-status",authMiddleware,async(req,res)=>{
  try{
    const today=startOfToday();
    const taken=await prisma.worldMapQuest.findMany({where:{userId:req.userId,createdAt:{gte:today}},select:{locationId:true,completed:true}});
    const map={};taken.forEach(q=>{map[q.locationId]=q.completed;});
    res.json(map);
  }catch(e){res.status(500).json({message:"Server error"});}
});

// ── СЕЗОННЫЕ КВЕСТЫ ───────────────────────────────────────────────────────────
const SEASON_QUEST_TITLES=[
  {title:"Встреть рассвет",branch:"fitness",desc:"Выйди на улицу до 7 утра"},
  {title:"Первый шаг",branch:"discipline",desc:"Выполни 1 квест до 9 утра"},
  {title:"Утренний ритуал",branch:"fitness",desc:"Сделай зарядку сегодня"},
  {title:"Новое начало",branch:"self_development",desc:"Запиши цель на этот день"},
  {title:"Свет знаний",branch:"knowledge",desc:"Прочитай 10 страниц книги"},
  {title:"Рассвет дисциплины",branch:"discipline",desc:"Не пропусти ни одного обязательного квеста"},
  {title:"Весенняя медитация",branch:"self_development",desc:"10 минут осознанности"},
  {title:"Путь к вершине",branch:"fitness",desc:"Выйди на пробежку или прогулку"},
  {title:"Голос благодарности",branch:"knowledge",desc:"Напиши запись благодарности"},
  {title:"Семена привычек",branch:"discipline",desc:"Выполни все квесты дня"},
];
app.get("/season/daily-quest",authMiddleware,async(req,res)=>{
  try{
    const today=startOfToday();
    const existing=await prisma.seasonQuest.findFirst({where:{userId:req.userId,date:{gte:today}}});
    if(existing)return res.json(existing);
    const idx=Math.floor(Math.random()*SEASON_QUEST_TITLES.length);
    const tpl=SEASON_QUEST_TITLES[idx];
    const quest=await prisma.seasonQuest.create({data:{userId:req.userId,title:tpl.title,branch:tpl.branch}});
    res.json(quest);
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});
app.post("/season/daily-quest/complete",authMiddleware,async(req,res)=>{
  try{
    const today=startOfToday();
    const quest=await prisma.seasonQuest.findFirst({where:{userId:req.userId,date:{gte:today},completed:false}});
    if(!quest)return res.status(400).json({message:"Нет активного сезонного квеста"});
    await prisma.seasonQuest.update({where:{id:quest.id},data:{completed:true}});
    const u=await prisma.user.findUnique({where:{id:req.userId}});
    const{xp,level}=applyXpGain(u.xp,u.level,50);
    await prisma.user.update({where:{id:req.userId},data:{xp,level}});
    // Update season progress
    const sp=await prisma.seasonProgress.findFirst({where:{userId:req.userId}}).catch(()=>null);
    if(sp)await prisma.seasonProgress.update({where:{id:sp.id},data:{points:{increment:50}}}).catch(()=>{});
    res.json({completed:true,xp:50,level});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── CHESS RATING ──────────────────────────────────────────────────────────────
function calcRatingChange(myRating,oppRating,result){
  const diff=oppRating-myRating;
  const factor=diff>100?1.5:diff<-100?0.5:1;
  if(result==="win")return Math.round(30*factor);
  if(result==="loss")return-Math.round(25/factor);
  return 1;
}
app.patch("/chess/game/:id/finish",authMiddleware,async(req,res)=>{
  try{
    const gameId=Number(req.params.id);
    const game=await prisma.chessGame.findUnique({where:{id:gameId},include:{player1:{select:{id:true,chessRating:true}},player2:{select:{id:true,chessRating:true}}}});
    if(!game)return res.status(404).json({message:"Игра не найдена"});
    if(game.status==="finished")return res.status(400).json({message:"Игра уже завершена"});
    const{result}=req.body; // "player1"|"player2"|"draw"
    const p1=game.player1,p2=game.player2;
    const p1r=p1.chessRating||1000,p2r=p2.chessRating||1000;
    let d1,d2;
    if(result==="player1"){d1=calcRatingChange(p1r,p2r,"win");d2=calcRatingChange(p2r,p1r,"loss");}
    else if(result==="player2"){d1=calcRatingChange(p1r,p2r,"loss");d2=calcRatingChange(p2r,p1r,"win");}
    else{d1=1;d2=1;}
    await Promise.all([
      prisma.user.update({where:{id:p1.id},data:{chessRating:{increment:d1},...(result==="player1"?{chessWins:{increment:1}}:{chessLosses:{increment:1}})}}),
      prisma.user.update({where:{id:p2.id},data:{chessRating:{increment:d2},...(result==="player2"?{chessWins:{increment:1}}:{chessLosses:{increment:1}})}}),
      prisma.chessGame.update({where:{id:gameId},data:{status:"finished",result}}),
    ]);
    res.json({ratingChange:{player1:d1,player2:d2}});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── МУДРЕЦЫ ──────────────────────────────────────────────────────────────────
app.get("/sages",async(req,res)=>{
  try{
    const sages=await prisma.sage.findMany({orderBy:{addedAt:"desc"}});
    res.json(sages);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});
app.post("/sages",authMiddleware,async(req,res)=>{
  try{
    const{name,idea}=req.body;
    if(!name?.trim()||!idea?.trim())return res.status(400).json({message:"Имя и идея обязательны"});
    const sage=await prisma.sage.create({data:{name:name.trim(),idea:idea.trim()}});
    res.status(201).json(sage);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

// ── ONLINE COUNT + TOP WEEK ───────────────────────────────────────────────────
app.get("/online-count",async(req,res)=>{
  try{
    const since=new Date(Date.now()-15*60*1000);
    const count=await prisma.user.count({where:{createdAt:{lte:new Date()}}});
    const topWeek=await prisma.userLeague.findMany({orderBy:{weeklyXp:"desc"},take:3,include:{user:{select:{id:true,name:true,email:true,level:true}}}}).catch(()=>[]);
    res.json({online:Math.max(1,Math.floor(count*0.15+1)),topWeek:topWeek.map(u=>({name:u.user.name||u.user.email,level:u.user.level,xp:u.weeklyXp}))});
  }catch(e){res.json({online:1,topWeek:[]});}
});

// ── CHESS VS BOT ──────────────────────────────────────────────────────────────
app.post("/chess/vs-bot/result",authMiddleware,async(req,res)=>{
  try{
    const{result,ratingChange}=req.body; // result: "player"|"lose"|"draw"
    const isWin=result==="player";
    const isDraw=result==="draw";
    const xp=isWin?20:isDraw?10:5;
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{chessRating:true,chessWins:true,chessLosses:true}});
    const BOT_RATING=1500;
    const K=32,expected=1/(1+Math.pow(10,(BOT_RATING-(user.chessRating||1000))/400));
    const score=isWin?1:isDraw?0.5:0;
    const delta=ratingChange??Math.round(K*(score-expected));
    const newRating=Math.max(100,(user.chessRating||1000)+delta);
    await prisma.user.update({
      where:{id:req.userId},
      data:{
        xp:{increment:xp},
        chessRating:newRating,
        ...(isWin?{chessWins:{increment:1}}:{}),
        ...(!isWin&&!isDraw?{chessLosses:{increment:1}}:{}),
      }
    });
    // Grant chess achievements
    const updated=await prisma.user.findUnique({where:{id:req.userId},select:{chessWins:true,chessRating:true}});
    if((updated.chessWins||0)>=1)checkEasterEgg(req.userId,"chess_first").catch(()=>{});
    if((updated.chessWins||0)>=5)checkEasterEgg(req.userId,"chess_5wins").catch(()=>{});
    if((updated.chessRating||1000)>=1500)checkEasterEgg(req.userId,"chess_rating1500").catch(()=>{});
    let easterEgg=null;
    if(isWin){
      const egg=await prisma.easterEgg.findUnique({where:{key:"beat_laptev"}}).catch(()=>null);
      if(egg){
        const alreadyUnlocked=await prisma.easterEggUnlock.findFirst({where:{userId:req.userId,eggId:egg.id}}).catch(()=>null);
        if(!alreadyUnlocked){
          await prisma.easterEggUnlock.create({data:{userId:req.userId,eggId:egg.id}}).catch(()=>{});
          await prisma.user.update({where:{id:req.userId},data:{xp:{increment:egg.rewardXp||100},gold:{increment:egg.rewardGold||200}}}).catch(()=>{});
          easterEgg={title:egg.title,icon:egg.icon||"♟️",rewardXp:egg.rewardXp,rewardGold:egg.rewardGold};
        }
      }
    }
    res.json({xp,ratingChange:delta,newRating,easterEgg});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/debug/db",async(req,res)=>{
  try{
    const count=await prisma.user.count();
    res.json({status:"ok",users:count,db:process.env.DATABASE_URL});
  }catch(e){res.status(500).json({status:"error",message:e.message,code:e.code});}
});

// ── SOCKET.IO: CHESS REALTIME ─────────────────────────────────────────────────
io.on("connection",(socket)=>{
  socket.on("chess:join",({gameId,userId})=>{
    socket.join(`chess:${gameId}`);
    socket.data.userId=userId;
    socket.data.gameId=gameId;
    socket.to(`chess:${gameId}`).emit("chess:player_joined",{userId});
  });
  socket.on("chess:move",async({gameId,from,to,boardState,userId})=>{
    try{
      await prisma.chessGame.update({where:{id:parseInt(gameId)},data:{boardState,updatedAt:new Date()}}).catch(()=>{});
    }catch(e){}
    socket.to(`chess:${gameId}`).emit("chess:move",{from,to,boardState,userId});
  });
  socket.on("chess:resign",({gameId,userId})=>{
    io.to(`chess:${gameId}`).emit("chess:resigned",{userId});
  });
  socket.on("chess:draw_offer",({gameId,userId})=>{
    socket.to(`chess:${gameId}`).emit("chess:draw_offered",{userId});
  });
  socket.on("chess:draw_accept",({gameId})=>{
    io.to(`chess:${gameId}`).emit("chess:draw_accepted");
  });
  socket.on("disconnect",()=>{
    if(socket.data.gameId){
      socket.to(`chess:${socket.data.gameId}`).emit("chess:opponent_disconnected");
    }
  });
});

// ── ДУЭЛЬ СТРИКОВ ─────────────────────────────────────────────────────────────
app.post("/streak-duels/challenge/:friendId",authMiddleware,async(req,res)=>{
  try{
    const challengedId=Number(req.params.friendId);
    const stake=Number(req.body.stake)||100;
    if(stake<50)return res.status(400).json({message:"Минимальная ставка 50 золота"});
    const[challenger,challenged]=await Promise.all([
      prisma.user.findUnique({where:{id:req.userId},select:{gold:true,name:true}}),
      prisma.user.findUnique({where:{id:challengedId},select:{gold:true,name:true}}),
    ]);
    if(!challenged)return res.status(404).json({message:"Игрок не найден"});
    if(challenger.gold<stake)return res.status(400).json({message:`Нужно ${stake} золота. У тебя ${challenger.gold}.`});
    if(challenged.gold<stake)return res.status(400).json({message:`У ${challenged.name} недостаточно золота`});
    const existing=await prisma.streakDuel.findFirst({where:{OR:[{challengerId:req.userId,challengedId},{challengerId:challengedId,challengedId:req.userId}],status:{in:["pending","active"]}}});
    if(existing)return res.status(400).json({message:"Дуэль уже активна"});
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{gold:{decrement:stake}}}),
      prisma.user.update({where:{id:challengedId},data:{gold:{decrement:stake}}}),
    ]);
    const duel=await prisma.streakDuel.create({data:{challengerId:req.userId,challengedId,stake,status:"pending"}});
    await createNotification(challengedId,"streak_duel_challenge","⚔️ Вызов на дуэль стриков",`${challenger.name} вызывает тебя на дуэль стриков! Ставка: ${stake} золота.`,duel.id);
    res.status(201).json(duel);
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/streak-duels/accept/:id",authMiddleware,async(req,res)=>{
  try{
    const duel=await prisma.streakDuel.findUnique({where:{id:Number(req.params.id)}});
    if(!duel||duel.challengedId!==req.userId||duel.status!=="pending")return res.status(400).json({message:"Нельзя принять"});
    const now=new Date();
    const updated=await prisma.streakDuel.update({where:{id:duel.id},data:{status:"active",startedAt:now,endsAt:new Date(now.getTime()+30*24*3600*1000)}});
    await createNotification(duel.challengerId,"streak_duel_accepted","⚔️ Дуэль принята!","Противник принял твой вызов на дуэль стриков!",duel.id);
    res.json(updated);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/streak-duels/decline/:id",authMiddleware,async(req,res)=>{
  try{
    const duel=await prisma.streakDuel.findUnique({where:{id:Number(req.params.id)}});
    if(!duel||duel.challengedId!==req.userId)return res.status(400).json({message:"Нет доступа"});
    await prisma.streakDuel.update({where:{id:duel.id},data:{status:"declined"}});
    await prisma.$transaction([
      prisma.user.update({where:{id:duel.challengerId},data:{gold:{increment:duel.stake}}}),
      prisma.user.update({where:{id:duel.challengedId},data:{gold:{increment:duel.stake}}}),
    ]);
    res.json({message:"Дуэль отклонена. Золото возвращено."});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/streak-duels/active",authMiddleware,async(req,res)=>{
  try{
    const duels=await prisma.streakDuel.findMany({
      where:{OR:[{challengerId:req.userId},{challengedId:req.userId}],status:{in:["pending","active"]}},
      include:{challenger:{select:{id:true,name:true,streak:true,level:true}},challenged:{select:{id:true,name:true,streak:true,level:true}}},
      orderBy:{createdAt:"desc"},
    });
    res.json(duels);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

async function resolveStreakDuelsForUser(userId){
  const duels=await prisma.streakDuel.findMany({where:{status:"active",OR:[{challengerId:userId},{challengedId:userId}]}});
  for(const duel of duels){
    const winnerId=duel.challengerId===userId?duel.challengedId:duel.challengerId;
    await prisma.streakDuel.update({where:{id:duel.id},data:{status:"finished",winnerId}});
    await prisma.user.update({where:{id:winnerId},data:{gold:{increment:duel.stake*2}}});
    await createNotification(winnerId,"duel_won",`⚔️ Победа в дуэли!`,`Ты выиграл дуэль стриков! +${duel.stake*2} золота`,duel.id);
    await createNotification(userId,"duel_lost","⚔️ Дуэль проиграна","Ты прервал стрик и проиграл дуэль.",duel.id);
  }
}

// ── СОВМЕСТНЫЙ СТРИК — расширенный ────────────────────────────────────────────
app.get("/shared-streak/active",authMiddleware,async(req,res)=>{
  try{
    const ss=await prisma.sharedStreak.findMany({
      where:{OR:[{user1Id:req.userId},{user2Id:req.userId}],status:{in:["pending","active"]}},
      include:{user1:{select:{id:true,name:true,streak:true,level:true}},user2:{select:{id:true,name:true,streak:true,level:true}}},
    });
    res.json(ss);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

// ── БОСС НЕДЕЛИ ───────────────────────────────────────────────────────────────
function getBossTemplate(memberCount){
  if(memberCount<=5)return{name:"Теневой страж",description:"Древний хранитель лени охраняет врата прогресса",totalQuests:200,rewardGold:1000,rewardXp:2000};
  if(memberCount<=10)return{name:"Повелитель прокрастинации",description:"Он питается отложенными делами и несбыточными планами",totalQuests:480,rewardGold:1000,rewardXp:2000};
  if(memberCount<=20)return{name:"Архидемон слабости",description:"Тысячи лет он побеждал людей. Но не ваш клан.",totalQuests:1000,rewardGold:1000,rewardXp:2000};
  if(memberCount<=50)return{name:"Хаос-повелитель",description:"Воплощение хаоса и беспорядка.",totalQuests:2000,rewardGold:1000,rewardXp:2000};
  return{name:"АБСОЛЮТНАЯ ТЬМА",description:"Финальный враг. Никто ещё не побеждал его.",totalQuests:4000,rewardGold:1000,rewardXp:2000};
}

async function ensureWeeklyBoss(clanId){
  const now=new Date();
  const dayOfWeek=now.getDay();
  const weekStart=new Date(now);weekStart.setDate(now.getDate()-dayOfWeek+(dayOfWeek===0?-6:1));weekStart.setHours(0,0,0,0);
  const weekEnd=new Date(weekStart);weekEnd.setDate(weekStart.getDate()+6);weekEnd.setHours(23,59,59,999);
  const existing=await prisma.weeklyBoss.findFirst({where:{clanId,weekStart:{gte:weekStart}}});
  if(existing)return existing;
  const members=await prisma.user.count({where:{clanId}});
  const tpl=getBossTemplate(members);
  return prisma.weeklyBoss.create({data:{clanId,...tpl,weekStart,weekEnd}});
}

app.get("/clans/weekly-boss",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{clanId:true}});
    if(!user?.clanId)return res.status(400).json({message:"Ты не в клане"});
    const boss=await ensureWeeklyBoss(user.clanId);
    const members=await prisma.user.findMany({where:{clanId:user.clanId},select:{id:true,name:true,level:true},take:20});
    res.json({boss,members});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

// ── ПИСЬМО В БУДУЩЕЕ ─────────────────────────────────────────────────────────
app.post("/future-letter",authMiddleware,async(req,res)=>{
  try{
    const{content,sendAt}=req.body;
    if(!content||content.trim().length<50)return res.status(400).json({message:"Письмо должно быть не менее 50 символов"});
    if(!sendAt)return res.status(400).json({message:"Укажи дату отправки"});
    const date=new Date(sendAt);
    if(isNaN(date)||date<=new Date())return res.status(400).json({message:"Дата должна быть в будущем"});
    const letter=await prisma.futureLetter.create({data:{userId:req.userId,content:content.trim(),sendAt:date}});
    res.status(201).json({id:letter.id,sendAt:letter.sendAt,message:"Письмо запечатано!"});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/future-letter",authMiddleware,async(req,res)=>{
  try{
    const letters=await prisma.futureLetter.findMany({
      where:{userId:req.userId},
      select:{id:true,sendAt:true,sent:true,createdAt:true,content:true},
      orderBy:{sendAt:"asc"},
    });
    res.json(letters.map(l=>({...l,content:l.sent?l.content:null})));
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/future-letter/:id",authMiddleware,async(req,res)=>{
  try{
    const letter=await prisma.futureLetter.findUnique({where:{id:Number(req.params.id)}});
    if(!letter||letter.userId!==req.userId)return res.status(404).json({message:"Письмо не найдено"});
    if(!letter.sent)return res.status(403).json({message:"Письмо ещё не пришло"});
    res.json(letter);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

// ── Тёмная сторона — эндпоинты ───────────────────────────────────────────────
app.post("/dark-side/enter",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(user.level<35)return res.status(400).json({message:"Недостаточно уровня. Нужен 35+."});
    if(user.darkSideActive)return res.status(400).json({message:"Тёмная сторона уже активна"});
    if(user.darkSideChoice)return res.status(400).json({message:"Выбор уже сделан"});
    await prisma.user.update({where:{id:req.userId},data:{darkSideActive:true,darkSideDay:1,darkSideStartedAt:new Date()}});
    await prisma.notification.deleteMany({where:{userId:req.userId,type:"dark_side_invite"}});
    res.json({message:"Добро пожаловать в тень.",warning:"С каждым квестом ты будешь терять себя."});
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.post("/dark-side/choose",authMiddleware,async(req,res)=>{
  try{
    const{choice}=req.body;
    if(!["light","shadow"].includes(choice))return res.status(400).json({message:"Выбери light или shadow"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user.darkSideActive)return res.status(400).json({message:"Тёмная сторона не активна"});
    if(user.darkSideChoice&&user.darkSideChoice!=="shadow")return res.status(400).json({message:"Выбор уже закреплён"});

    if(choice==="light"){
      await prisma.user.update({where:{id:req.userId},data:{darkSideActive:false,darkSideChoice:"light",xp:{increment:500},antagonistPathActive:true}});
      const existing=await prisma.achievement.findFirst({where:{userId:req.userId,type:"defeated_darkness"}});
      if(!existing){
        await prisma.achievement.create({data:{userId:req.userId,type:"defeated_darkness"}}).catch(()=>{});
        await prisma.user.update({where:{id:req.userId},data:{gold:{increment:500},xp:{increment:1000}}});
      }
      const existing2=await prisma.achievement.findFirst({where:{userId:req.userId,type:"path_of_antagonist"}});
      if(!existing2){
        await prisma.achievement.create({data:{userId:req.userId,type:"path_of_antagonist"}}).catch(()=>{});
        await prisma.user.update({where:{id:req.userId},data:{gold:{increment:1000},xp:{increment:2000}}});
      }
      await createNotification(req.userId,"dark_side_resolved","⚡ Возвращение","LAPTEV: Знал что вернёшься. Теперь ты понимаешь зачем нужна система. +500 XP за возвращение. Путь Антагониста открыт.").catch(()=>{});
      res.json({message:"LAPTEV: Знал что вернёшься. Теперь ты понимаешь зачем нужна система. +500 XP за возвращение.",achievement:"Победивший тьму"});
    } else {
      await prisma.user.update({where:{id:req.userId},data:{darkSideChoice:"shadow"}});
      res.json({message:"_system_: Как знаешь. Но система всегда побеждает.",warning:"Через 3 дня LAPTEV вернёт тебя принудительно."});
    }
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/dark-side/status",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{darkSideActive:true,darkSideDay:true,darkSideStartedAt:true,darkSideChoice:true,antagonistPathActive:true}});
    res.json(user);
  }catch(e){res.status(500).json({message:"Ошибка сервера"});}
});

// ── PLAYER 2 ─────────────────────────────────────────────────────────────────

const PLAYER2_QUESTS=[
  {number:1,title:"Наблюдение",description:"Весь день наблюдай за людьми вокруг. Не оценивай — просто замечай. Вечером запиши 3 наблюдения в дневник.",afterMsg:"Большинство людей никогда не наблюдают. Они всегда реагируют. Разница огромная."},
  {number:2,title:"Тишина разума",description:"20 минут полной тишины. Без музыки, без телефона, без мыслей о делах. Просто сидеть и дышать.",afterMsg:"Ты выдержал? Большинство не могут и 5 минут."},
  {number:3,title:"Чужие глаза",description:"Сделай что-то привычное абсолютно другим способом. Другая дорога. Другой порядок утра. Другая рука.",afterMsg:"Мозг не любит новое. Но именно в новом растёт."},
  {number:4,title:"Тёмное зеркало",description:"Напиши в дневнике свой главный страх прямо сейчас. Не анализируй — просто назови его одним словом.",afterMsg:"Названный страх теряет половину силы. Это не метафора."},
  {number:5,title:"Охота на слабость",description:"Открой свою статистику. Найди самую слабую ветку за последний месяц. Посвяти ей весь сегодняшний день.",afterMsg:"Сильные люди не избегают слабостей. Они идут туда намеренно."},
  {number:6,title:"Без системы",description:"Один день без приложения. Совсем. Система засчитает автоматически на следующий день.",afterMsg:"Система работает даже когда ты не смотришь. Ты сам — и есть система."},
  {number:7,title:"Разговор",description:"Что изменилось после этих 7 дней? Напиши честно.",afterMsg:""},
];

app.get("/player2/status",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{player2Unlocked:true,player2QuestDay:true,player2Completed:true,peaceUnlocked:true,gold:true}});
    if(!user)return res.status(404).json({message:"User not found"});
    const completedQuests=await prisma.player2Quest.findMany({where:{userId:req.userId},orderBy:{questNumber:"asc"}});
    res.json({unlocked:user.player2Unlocked,questDay:user.player2QuestDay,completed:user.player2Completed,peaceUnlocked:user.peaceUnlocked,gold:user.gold,quests:PLAYER2_QUESTS,completedQuests});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/player2/start",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{player2Unlocked:true,player2QuestDay:true}});
    if(!user?.player2Unlocked)return res.status(403).json({message:"Игрок №2 ещё не разблокирован"});
    if((user.player2QuestDay||0)>0)return res.status(400).json({message:"Уже начато"});
    await prisma.user.update({where:{id:req.userId},data:{player2QuestDay:1}});
    res.json({success:true,questDay:1});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/player2/quest/:number/complete",authMiddleware,async(req,res)=>{
  try{
    const questNum=parseInt(req.params.number);
    if(isNaN(questNum)||questNum<1||questNum>7)return res.status(400).json({message:"Неверный номер квеста"});
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user?.player2Unlocked)return res.status(403).json({message:"Не разблокировано"});
    if(user.player2QuestDay!==questNum)return res.status(400).json({message:"Это не ваш текущий квест"});
    const already=await prisma.player2Quest.findFirst({where:{userId:req.userId,questNumber:questNum}});
    if(already)return res.status(400).json({message:"Уже выполнен"});
    await prisma.player2Quest.create({data:{userId:req.userId,questNumber:questNum,completed:true,completedAt:new Date()}});
    const newDay=questNum>=7?8:questNum+1;
    const isCompleted=questNum>=7;
    const{xp,level}=applyXpGain(user.xp,user.level,60);
    await prisma.user.update({where:{id:req.userId},data:{xp,level,gold:{increment:30},player2QuestDay:newDay,player2Completed:isCompleted}});
    const quest=PLAYER2_QUESTS.find(q=>q.number===questNum);
    res.json({success:true,nextQuestDay:newDay,allCompleted:isCompleted,xpGained:60,goldGained:30,leveledUp:level>user.level,newLevel:level,afterMsg:quest?.afterMsg||""});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

app.post("/player2/quest7-reply",authMiddleware,async(req,res)=>{
  try{
    const{message}=req.body;
    if(!message||typeof message!=="string")return res.status(400).json({message:"Нет сообщения"});
    const key=process.env.ANTHROPIC_API_KEY;
    if(!key)return res.json({reply:"Хорошо. Твои слова важны."});
    const Anthropic=require("@anthropic-ai/sdk");
    const client=new Anthropic({apiKey:key});
    const result=await client.messages.create({
      model:"claude-sonnet-4-6",max_tokens:120,
      system:"Ты — загадочный игрок который прошёл систему дважды. Говоришь коротко, мудро, без лишних слов. Отвечаешь на рефлексию игрока после 7 необычных квестов. 1-2 предложения максимум. На русском. Не используй приветствия.",
      messages:[{role:"user",content:message.slice(0,500)}],
    });
    res.json({reply:result.content[0].text});
  }catch(e){console.error(e);res.json({reply:"Слова сказаны. Остальное — внутри."});}
});

app.post("/player2/unlock-peace",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId}});
    if(!user)return res.status(404).json({message:"Not found"});
    if(!user.player2Completed)return res.status(400).json({message:"Сначала пройди все 7 квестов Игрока №2"});
    if(user.peaceUnlocked)return res.status(400).json({message:"Ветка уже открыта"});
    await prisma.user.update({where:{id:req.userId},data:{peaceUnlocked:true}});
    const existing=await prisma.achievement.findFirst({where:{userId:req.userId,type:"peace_unlocked"}});
    if(!existing){
      await prisma.achievement.create({data:{userId:req.userId,type:"peace_unlocked"}}).catch(()=>{});
      const{xp:newXp,level:newLevel}=applyXpGain(user.xp,user.level,ACHIEVEMENT_META.peace_unlocked.xpReward||1500);
      await prisma.user.update({where:{id:req.userId},data:{xp:newXp,level:newLevel,gold:{increment:500}}});
    }
    await createNotification(req.userId,"peace_unlocked","🌑 Пятая ветка открыта","Ты нашёл Покой. Квесты этой ветки — самые сложные в системе. Начни сегодня.").catch(()=>{});
    res.json({success:true});
  }catch(e){console.error(e);res.status(500).json({message:"Server error"});}
});

// ── SUBSCRIPTION ──────────────────────────────────────────────────────────────
app.post("/subscription/activate",authMiddleware,async(req,res)=>{
  try{
    const{code}=req.body;
    if(!code)return res.status(400).json({message:"Введи код"});
    const invite=await prisma.inviteCode.findUnique({where:{code:code.trim().toUpperCase()}});
    if(!invite)return res.status(400).json({message:"Неверный код"});
    if(invite.usedBy)return res.status(400).json({message:"Код уже использован"});
    const plan=invite.plan||"monthly";
    const now=new Date();
    const proExpiresAt=plan==="yearly"
      ?new Date(now.getTime()+365*24*60*60*1000)
      :new Date(now.getTime()+30*24*60*60*1000);
    await prisma.$transaction([
      prisma.user.update({where:{id:req.userId},data:{isPro:true,proExpiresAt}}),
      prisma.inviteCode.update({where:{code:code.trim().toUpperCase()},data:{usedBy:req.userId,usedAt:now}}),
    ]);
    res.json({success:true,plan,proExpiresAt});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка сервера"});}
});

app.get("/subscription/status",authMiddleware,async(req,res)=>{
  try{
    const user=await prisma.user.findUnique({where:{id:req.userId},select:{isPro:true,proExpiresAt:true}});
    const now=new Date();
    const active=!!(user.isPro&&(!user.proExpiresAt||new Date(user.proExpiresAt)>now));
    res.json({isPro:active,proExpiresAt:user.proExpiresAt||null});
  }catch(e){res.status(500).json({message:"Ошибка"});}
});

app.post("/admin/generate-keys",async(req,res)=>{
  try{
    const{secret,count=10,plan="monthly"}=req.body;
    if(secret!=="laptev2024")return res.status(403).json({message:"Доступ запрещён"});
    const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const codes=[];
    for(let i=0;i<Math.min(count,50);i++){
      let code="LVL-";
      for(let j=0;j<4;j++)code+=chars[Math.floor(Math.random()*chars.length)];
      code+="-";
      for(let j=0;j<4;j++)code+=chars[Math.floor(Math.random()*chars.length)];
      codes.push(code);
    }
    const created=await prisma.$transaction(
      codes.map(c=>prisma.inviteCode.upsert({where:{code:c},create:{code:c,plan},update:{}}))
    );
    res.json({codes:created.map(c=>c.code),count:created.length,plan});
  }catch(e){console.error(e);res.status(500).json({message:"Ошибка"});}
});

// ── CRON: письма + уведомления воскресенья ────────────────────────────────────
setInterval(async()=>{
  try{
    const now=new Date();
    // Проверяем письма в будущее
    const letters=await prisma.futureLetter.findMany({where:{sent:false,sendAt:{lte:now}}});
    for(const letter of letters){
      await createNotification(letter.userId,"future_letter","📮 Письмо из прошлого","У тебя письмо от себя из прошлого! Открой и прочитай.",letter.id);
      await prisma.futureLetter.update({where:{id:letter.id},data:{sent:true}});
    }
    // Воскресенье 20:00 — уведомление о недельном отчёте
    if(now.getDay()===0&&now.getHours()===20&&now.getMinutes()<60){
      const users=await prisma.user.findMany({select:{id:true}});
      for(const u of users){
        const existing=await prisma.notification.findFirst({where:{userId:u.id,type:"weekly_report",createdAt:{gte:new Date(now.getFullYear(),now.getMonth(),now.getDate())}}});
        if(!existing)await createNotification(u.id,"weekly_report","📊 Недельный отчёт готов","Открой отчёт — посмотри сколько сделал за эту неделю!");
      }
    }
    // Тёмная сторона: ночные приглашения для уровня 35+
    const nowH=now.getHours();
    if(nowH>=22||nowH<6){
      const candidates=await prisma.user.findMany({where:{level:{gte:35},darkSideChoice:null,darkSideActive:false},select:{id:true}});
      for(const u of candidates){
        const existInvite=await prisma.notification.findFirst({where:{userId:u.id,type:"dark_side_invite"}});
        if(!existInvite)await createNotification(u.id,"dark_side_invite","⚫ Система говорит...","_system_: Ты думаешь что строишь дисциплину. На самом деле ты строишь клетку. Я покажу тебе другой путь. Открой если не боишься.").catch(()=>{});
      }
    }
    // Принудительный возврат: shadow выбор сделан > 24ч назад + все тёмные квесты сегодня выполнены
    const yesterday=new Date(now.getTime()-24*60*60*1000);
    const shadowUsers=await prisma.user.findMany({
      where:{darkSideActive:true,darkSideChoice:'shadow',updatedAt:{lt:yesterday}}
    });
    for(const u of shadowUsers){
      const darkTasksToday=await prisma.task.findMany({
        where:{userId:u.id,branch:'dark',isDaily:true,createdAt:{gte:startOfToday()}}
      });
      if(darkTasksToday.length===0)continue;
      if(!darkTasksToday.every(t=>t.completed))continue;
      await prisma.user.update({where:{id:u.id},data:{darkSideActive:false,darkSideChoice:'forced',antagonistPathActive:true}});
      await createNotification(u.id,"dark_side_forced_return","⚡ LAPTEV вернул тебя","LAPTEV: Время вышло. Я говорил что все возвращаются. Система ждала тебя. Добро пожаловать обратно.").catch(()=>{});
      const exSW=await prisma.achievement.findFirst({where:{userId:u.id,type:"shadow_walker"}});
      if(!exSW){
        await prisma.achievement.create({data:{userId:u.id,type:"shadow_walker"}}).catch(()=>{});
        await prisma.user.update({where:{id:u.id},data:{gold:{increment:750},xp:{increment:1500}}});
      }
      console.log('Принудительный возврат (shadow + all dark done):', u.id);
    }
  }catch(e){console.error("CRON ERROR:",e.message);}
},60*60*1000);

const PORT=process.env.PORT||3001;
console.log(`Starting server on PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV}, DB=${process.env.DATABASE_URL||"file:./dev.db"}`);
httpServer.listen(PORT,"0.0.0.0",()=>console.log(`SERVER STARTED ON ${PORT}`));
process.on("uncaughtException",e=>{console.error("UNCAUGHT:",e);process.exit(1);});
process.on("unhandledRejection",e=>{console.error("UNHANDLED:",e);process.exit(1);});