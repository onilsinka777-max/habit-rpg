const cors = require("cors");
const express = require("express");
const prisma = require("./prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { ensureDailyQuests } = require("./questGenerator");
const { computeAutoClass } = require("./mastery");
const { ensureWeeklyLegendaryQuest } = require("./legendaryWeekly");
const {
  BRANCHES, DIFFICULTIES, DIFFICULTY_REWARDS,
  getXpToNextLevel, getAchievements, getGoldMultiplier,
  getMasteryMultipliers, getEffectiveMasteryPath, startOfToday,
  DAILY_LOGIN_BONUS_GOLD, DAILY_LOGIN_BONUS_XP, applyXpGain,
  CLAN_UNLOCK_LEVEL, MASTERY_UNLOCK_LEVEL, MASTERY_PATHS,
  MASTERY_GRAPH, NODE_DIFFICULTY_REWARDS, LEGENDARY_REWARD_MULTIPLIER,
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

function randomClanTag(n = 6) {
  let o = "";
  for (let i = 0; i < n; i++) o += CLAN_TAG_CHARS[Math.floor(Math.random() * CLAN_TAG_CHARS.length)];
  return o;
}
async function generateUniqueClanTag() {
  let t, e = true;
  while (e) { t = randomClanTag(); e = !!(await prisma.clan.findUnique({ where: { tag: t } })); }
  return t;
}

function getMasteryState(user) {
  const raw = user.masteryChoices ? JSON.parse(user.masteryChoices) : {};
  return new Set(raw.completed || []);
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
app.get("/", async (req, res) => {
  const u = await prisma.user.count();
  res.json({ message: "SERVER WORKS", users: u });
});

// ── AUTH ─────────────────────────────────────────────────────────────────────
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (await prisma.user.findUnique({ where: { email } })) return res.status(400).json({ message: "User already exists" });
    const user = await prisma.user.create({ data: { email, password: await bcrypt.hash(password, 10) } });
    res.status(201).json({ id: user.id, email: user.email });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: "Invalid credentials" });
    res.json({ token: jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" }) });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

const authMiddleware = (req, res, next) => {
  try {
    const h = req.headers.authorization;
    if (!h) return res.status(401).json({ message: "No token" });
    const decoded = jwt.verify(h.split(" ")[1], JWT_SECRET);
    req.userId = decoded.userId;
    prisma.user.update({ where: { id: req.userId }, data: { lastActiveAt: new Date() } }).catch(() => {});
    next();
  } catch (e) { return res.status(401).json({ message: "Invalid token" }); }
};

// ── ME ───────────────────────────────────────────────────────────────────────
app.get("/me", authMiddleware, async (req, res) => {
  let user = await prisma.user.findUnique({ where: { id: req.userId } });
  const today = startOfToday();
  let dailyBonusJustClaimed = false;
  if (!user.lastLoginBonusDate || new Date(user.lastLoginBonusDate) < today) {
    const { xp, level } = applyXpGain(user.xp, user.level, DAILY_LOGIN_BONUS_XP);
    user = await prisma.user.update({ where: { id: req.userId }, data: { xp, level, gold: { increment: DAILY_LOGIN_BONUS_GOLD }, lastLoginBonusDate: new Date() } });
    dailyBonusJustClaimed = true;
  }
  const autoClass = await computeAutoClass(req.userId);
  const now = new Date();
  const mp = MASTERY_PATHS[user.masteryPath];
  res.json({
    id: user.id, email: user.email,
    name: user.name || user.email.split("@")[0],
    nameSet: user.nameSet || false,
    level: user.level, xp: user.xp, xpToNextLevel: getXpToNextLevel(user.level),
    gold: user.gold, streak: user.streak, streakFreezeCount: user.streakFreezeCount,
    masteryPath: user.masteryPath, masteryNodeIndex: user.masteryNodeIndex,
    autoClass, effectiveMasteryPath: getEffectiveMasteryPath(user, autoClass),
    hasEverFinishedMastery: user.hasEverFinishedMastery,
    masteryStatusLabel: user.hasEverFinishedMastery && mp ? mp.statusLabel : null,
    masteryStatusChangesLeft: user.masteryStatusChangesLeft,
    xpBoostActive:    !!(user.xpBoostExpiresAt   && new Date(user.xpBoostExpiresAt)   > now),
    goldBoostActive:  !!(user.goldBoostExpiresAt  && new Date(user.goldBoostExpiresAt) > now),
    xpBoostPermanent: user.xpBoostPermanent, goldBoostPermanent: user.goldBoostPermanent,
    achievements: getAchievements(user.level),
    dailyBonusJustClaimed, dailyBonusGold: DAILY_LOGIN_BONUS_GOLD, dailyBonusXp: DAILY_LOGIN_BONUS_XP,
  });
});

app.patch("/me", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Name is required" });
    if (name.trim().length > 30) return res.status(400).json({ message: "Name is too long" });
    const trimmed = name.trim();
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.nameSet) return res.status(403).json({ message: "Имя уже установлено. Для смены купи «Свиток прошлого»" });
    const existing = await prisma.user.findUnique({ where: { name: trimmed } });
    if (existing && existing.id !== req.userId) return res.status(400).json({ message: "Этот ник уже занят" });
    const updated = await prisma.user.update({ where: { id: req.userId }, data: { name: trimmed, nameSet: true } });
    res.json({ id: updated.id, email: updated.email, name: updated.name });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/me/use-scroll", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: "Имя не может быть пустым" });
    if (name.trim().length > 30) return res.status(400).json({ message: "Имя слишком длинное" });
    const trimmed = name.trim();
    const scrollItem = await prisma.shopItem.findFirst({ where: { effect: "name_change_scroll" } });
    if (!scrollItem) return res.status(404).json({ message: "Свиток не найден" });
    const purchase = await prisma.purchase.findUnique({ where: { userId_itemId: { userId: req.userId, itemId: scrollItem.id } } });
    if (!purchase) return res.status(403).json({ message: "У тебя нет свитка прошлого" });
    const existing = await prisma.user.findUnique({ where: { name: trimmed } });
    if (existing && existing.id !== req.userId) return res.status(400).json({ message: "Этот ник уже занят" });
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.userId }, data: { name: trimmed, nameSet: true } }),
      prisma.purchase.delete({ where: { userId_itemId: { userId: req.userId, itemId: scrollItem.id } } }),
    ]);
    res.json({ message: "Имя изменено", name: trimmed });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// ── MASTERY ──────────────────────────────────────────────────────────────────
app.get("/mastery/status", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const autoClass = await computeAutoClass(req.userId);
    if (user.level < MASTERY_UNLOCK_LEVEL) return res.json({ locked: true, unlockLevel: MASTERY_UNLOCK_LEVEL, autoClass });
    const pathsList = Object.values(MASTERY_PATHS).map(p => ({ id: p.id, label: p.label, icon: p.icon, color: p.color, description: p.description, bonusDescription: p.bonusDescription, totalNodes: p.totalNodes }));
    if (!user.masteryPath) return res.json({ locked: false, chosen: false, autoClass, paths: pathsList, hasEverFinishedMastery: user.hasEverFinishedMastery });
    const completedSet = getMasteryState(user);
    const availableNodes = getAvailableNodes(user.masteryPath, completedSet);
    const isComplete = completedSet.has("legendary");
    const path = MASTERY_PATHS[user.masteryPath];
    const graph = MASTERY_GRAPH[user.masteryPath];
    res.json({
      locked: false, chosen: true, autoClass,
      hasEverFinishedMastery: user.hasEverFinishedMastery,
      masteryPath: user.masteryPath,
      completedNodes: [...completedSet], availableNodes,
      totalNodes: path.totalNodes, isComplete,
      statusChangesLeft: user.masteryStatusChangesLeft, paths: pathsList,
      path: path ? { id: path.id, label: path.label, icon: path.icon, color: path.color, statusLabel: path.statusLabel, bonusDescription: path.bonusDescription, finaleTitle: path.finale?.title, finaleDesc: path.finale?.description } : null,
      nodeContent: Object.fromEntries(Object.entries(graph.nodes).map(([id, n]) => [id, { label: n.label, desc: n.desc, d: n.d, hidden: n.hidden || false }])),
    });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/mastery/choose", authMiddleware, async (req, res) => {
  try {
    const { pathId } = req.body;
    if (!MASTERY_PATHS[pathId]) return res.status(400).json({ message: "Invalid path" });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.level < MASTERY_UNLOCK_LEVEL) return res.status(403).json({ message: `Доступно с ${MASTERY_UNLOCK_LEVEL} уровня` });
    if (user.hasEverFinishedMastery && user.masteryPath) {
      if (user.masteryStatusChangesLeft <= 0) return res.status(403).json({ message: "Смена статуса недоступна — лимит исчерпан" });
      await prisma.user.update({ where: { id: req.userId }, data: { masteryPath: pathId, masteryNodeIndex: 0, masteryChoices: JSON.stringify({ completed: [] }), masteryStatusChangesLeft: { decrement: 1 }, hasEverFinishedMastery: false } });
      return res.json({ message: "Путь сменён" });
    }
    await prisma.user.update({ where: { id: req.userId }, data: { masteryPath: pathId, masteryNodeIndex: 0, masteryChoices: JSON.stringify({ completed: [] }) } });
    res.json({ message: "Путь выбран" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/mastery/complete-node", authMiddleware, async (req, res) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) return res.status(400).json({ message: "nodeId required" });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user.masteryPath) return res.status(400).json({ message: "Путь не выбран" });
    const completedSet = getMasteryState(user);
    if (completedSet.has("legendary")) return res.status(400).json({ message: "Путь уже пройден" });
    const available = getAvailableNodes(user.masteryPath, completedSet);
    if (!available.includes(nodeId)) return res.status(400).json({ message: "Этот узел пока недоступен" });
    const graph = MASTERY_GRAPH[user.masteryPath];
    const nodeInfo = graph.nodes[nodeId];
    if (!nodeInfo) return res.status(400).json({ message: "Узел не найден" });
    const rewards = NODE_DIFFICULTY_REWARDS[nodeInfo.d] || { xp: 30, gold: 15 };
    const { xp, level } = applyXpGain(user.xp, user.level, rewards.xp);
    completedSet.add(nodeId);
    const newCompleted = [...completedSet];
    const justFinished = nodeId === "legendary";
    await prisma.user.update({ where: { id: req.userId }, data: { xp, level, gold: { increment: rewards.gold }, masteryNodeIndex: newCompleted.length, masteryChoices: JSON.stringify({ completed: newCompleted }), lastMasteryQuestDate: new Date(), ...(justFinished ? { hasEverFinishedMastery: true } : {}) } });
    res.json({ message: justFinished ? "Путь завершён!" : "Узел пройден", justFinished, leveledUp: level > user.level, newLevel: level, xpGained: rewards.xp, goldGained: rewards.gold, completedNodes: newCompleted });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// ── TASKS ────────────────────────────────────────────────────────────────────
app.post("/tasks", authMiddleware, async (req, res) => {
  try {
    const { title, branch, difficulty } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: "Title is required" });
    if (!BRANCHES.includes(branch)) return res.status(400).json({ message: "Invalid branch" });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const today = startOfToday();
    const needsReset = !user.customQuestsResetDate || new Date(user.customQuestsResetDate) < today;
    const createdToday = needsReset ? 0 : (user.customQuestsCreatedToday || 0);
    if (createdToday >= MAX_CUSTOM_QUESTS_PER_DAY) return res.status(400).json({ message: `Достигнут дневной лимит (${MAX_CUSTOM_QUESTS_PER_DAY}).` });
    const fd = DIFFICULTIES.includes(difficulty) ? difficulty : "easy";
    const reward = DIFFICULTY_REWARDS[fd];
    const task = await prisma.task.create({ data: { title: title.trim(), branch, type: "custom", difficulty: fd, xpReward: reward.xp, goldReward: reward.gold, userId: req.userId } });
    await prisma.user.update({ where: { id: req.userId }, data: { customQuestsCreatedToday: createdToday + 1, ...(needsReset ? { customQuestsResetDate: new Date() } : {}) } });
    res.status(201).json({ ...task, customQuestsCreatedToday: createdToday + 1 });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.get("/tasks", authMiddleware, async (req, res) => {
  try {
    await ensureDailyQuests(req.userId);
    await ensureWeeklyLegendaryQuest(req.userId);
    const { branch } = req.query;
    const tasks = await prisma.task.findMany({ where: { userId: req.userId, ...(branch ? { branch } : {}) }, orderBy: { createdAt: "desc" } });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const today = startOfToday();
    const needsReset = !user.customQuestsResetDate || new Date(user.customQuestsResetDate) < today;
    const createdToday = needsReset ? 0 : (user.customQuestsCreatedToday || 0);
    res.json({ tasks, customQuestsCreatedToday: createdToday, customQuestsMax: MAX_CUSTOM_QUESTS_PER_DAY });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.patch("/tasks/:id/complete", authMiddleware, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
    if (task.completed) return res.status(400).json({ message: "Already completed" });
    const updatedTask = await prisma.task.update({ where: { id: taskId }, data: { completed: true } });
    const cu = await prisma.user.findUnique({ where: { id: req.userId } });
    const now = new Date(); const today = startOfToday();
    const xpBActive = cu.xpBoostExpiresAt && new Date(cu.xpBoostExpiresAt) > now;
    const gBActive  = cu.goldBoostExpiresAt && new Date(cu.goldBoostExpiresAt) > now;
    const xpM   = (xpBActive ? 1.5 : 1) * (cu.xpBoostPermanent ? 1.25 : 1);
    const goldM = (gBActive  ? 1.5 : 1) * (cu.goldBoostPermanent ? 1.25 : 1);
    const autoClass = cu.masteryPath ? null : await computeAutoClass(req.userId);
    const mMult = getMasteryMultipliers(cu.masteryPath || autoClass, task.branch);
    const { xp, level } = applyXpGain(cu.xp, cu.level, Math.round(task.xpReward * mMult.xp * xpM));
    const goldGain = Math.round(task.goldReward * getGoldMultiplier() * mMult.gold * goldM);
    let freezeConsumed = false, streakJustCompleted = false, newStreak = cu.streak;
    const totalReq = await prisma.task.count({ where: { userId: req.userId, isDaily: true, type: "required", expiresAt: { gte: today } } });
    const doneReq  = await prisma.task.count({ where: { userId: req.userId, isDaily: true, type: "required", expiresAt: { gte: today }, completed: true } });
    const allDone = totalReq > 0 && doneReq === totalReq;
    const streakToday = cu.streakUpdatedDate && new Date(cu.streakUpdatedDate) >= today;
    if (allDone && !streakToday) {
      if (!cu.streakUpdatedDate) { newStreak = 1; }
      else {
        const last = new Date(cu.streakUpdatedDate);
        const lastM = new Date(last.getFullYear(), last.getMonth(), last.getDate());
        const diff = Math.floor((today - lastM) / 86400000);
        if (diff === 1) newStreak = cu.streak + 1;
        else if (diff === 2 && cu.streakFreezeCount > 0) { newStreak = cu.streak + 1; freezeConsumed = true; }
        else newStreak = 1;
      }
      streakJustCompleted = true;
    }
    await prisma.user.update({ where: { id: req.userId }, data: { xp, level, gold: { increment: goldGain }, ...(streakJustCompleted ? { streak: newStreak, streakUpdatedDate: now } : {}), ...(freezeConsumed ? { streakFreezeCount: { decrement: 1 } } : {}) } });
    res.json({ ...updatedTask, freezeConsumed, streakJustCompleted, newStreak: streakJustCompleted ? newStreak : undefined });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.delete("/tasks/:id", authMiddleware, async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return res.status(404).json({ message: "Task not found" });
    if (task.userId !== req.userId) return res.status(403).json({ message: "Forbidden" });
    await prisma.task.delete({ where: { id: taskId } });
    res.json({ message: "Task deleted" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// ── SHOP ─────────────────────────────────────────────────────────────────────
app.get("/shop", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const items = await prisma.shopItem.findMany({ where: { active: true }, orderBy: { price: "asc" } });
    const purchases = await prisma.purchase.findMany({ where: { userId: req.userId }, select: { itemId: true } });
    const pIds = new Set(purchases.map(p => p.itemId));
    res.json(items.map(item => ({
      ...item,
      purchased: pIds.has(item.id),
      repeatable: REPEATABLE_SHOP_EFFECTS.includes(item.effect),
      locked: item.category !== "boost" && item.effect !== "name_change_scroll" && !user.hasEverFinishedMastery,
    })));
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/shop/:id/purchase", authMiddleware, async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const item = await prisma.shopItem.findUnique({ where: { id: itemId } });
    if (!item || !item.active) return res.status(404).json({ message: "Item not found" });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (item.category !== "boost" && item.effect !== "name_change_scroll" && !user.hasEverFinishedMastery)
      return res.status(403).json({ message: "Доступно после завершения пути Мастерства" });
    if (user.gold < item.price) return res.status(400).json({ message: "Not enough gold" });
    if (item.effect === "streak_freeze") {
      await prisma.user.update({ where: { id: req.userId }, data: { gold: { decrement: item.price }, streakFreezeCount: { increment: 1 } } });
      return res.status(201).json({ message: "Purchased" });
    }
    if (item.effect === "xp_boost_24h") {
      await prisma.user.update({ where: { id: req.userId }, data: { gold: { decrement: item.price }, xpBoostExpiresAt: new Date(Date.now() + 86400000) } });
      return res.status(201).json({ message: "Purchased" });
    }
    if (item.effect === "gold_boost_24h") {
      await prisma.user.update({ where: { id: req.userId }, data: { gold: { decrement: item.price }, goldBoostExpiresAt: new Date(Date.now() + 86400000) } });
      return res.status(201).json({ message: "Purchased" });
    }
    const existing = await prisma.purchase.findUnique({ where: { userId_itemId: { userId: req.userId, itemId } } });
    if (existing) return res.status(400).json({ message: "Already purchased" });
    const extraData = {};
    if (item.effect === "xp_boost_permanent")  extraData.xpBoostPermanent  = true;
    if (item.effect === "gold_boost_permanent") extraData.goldBoostPermanent = true;
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.userId }, data: { gold: { decrement: item.price }, ...extraData } }),
      prisma.purchase.create({ data: { userId: req.userId, itemId } }),
    ]);
    res.status(201).json({ message: "Purchased" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.get("/shop/library", authMiddleware, async (req, res) => {
  try {
    const p = await prisma.purchase.findMany({ where: { userId: req.userId }, include: { item: true }, orderBy: { purchasedAt: "desc" } });
    res.json(p.map(x => x.item));
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// ── JOURNAL ──────────────────────────────────────────────────────────────────
app.get("/journal", authMiddleware, async (req, res) => {
  try {
    const entries = await prisma.journalEntry.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    res.json(entries);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/journal", authMiddleware, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ message: "Запись не может быть пустой" });
    if (content.length > 5000) return res.status(400).json({ message: "Запись слишком длинная" });
    const entry = await prisma.journalEntry.create({ data: { content: content.trim(), userId: req.userId } });
    res.status(201).json(entry);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// ── GOALS ────────────────────────────────────────────────────────────────────
app.get("/goals", authMiddleware, async (req, res) => {
  try {
    const goals = await prisma.goal.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
    res.json(goals);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/goals", authMiddleware, async (req, res) => {
  try {
    const { title, description, targetDate } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: "Название цели обязательно" });
    const goal = await prisma.goal.create({ data: { title: title.trim(), description: description?.trim() || null, targetDate: targetDate ? new Date(targetDate) : null, userId: req.userId } });
    res.status(201).json(goal);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.patch("/goals/:id", authMiddleware, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== req.userId) return res.status(404).json({ message: "Цель не найдена" });
    const { completed, title, description, targetDate } = req.body;
    const updated = await prisma.goal.update({ where: { id: goalId }, data: { ...(completed !== undefined ? { completed } : {}), ...(title ? { title: title.trim() } : {}), ...(description !== undefined ? { description: description?.trim() || null } : {}), ...(targetDate !== undefined ? { targetDate: targetDate ? new Date(targetDate) : null } : {}) } });
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.delete("/goals/:id", authMiddleware, async (req, res) => {
  try {
    const goalId = Number(req.params.id);
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal || goal.userId !== req.userId) return res.status(404).json({ message: "Цель не найдена" });
    await prisma.goal.delete({ where: { id: goalId } });
    res.json({ message: "Удалено" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// ── CLANS ────────────────────────────────────────────────────────────────────
app.get("/clans/leaderboard", authMiddleware, async (req, res) => {
  try {
    const groups = await prisma.user.groupBy({ by: ["clanId"], where: { clanId: { not: null } }, _avg: { xp: true }, _count: { id: true } });
    const clans = await prisma.clan.findMany({ where: { id: { in: groups.map(g => g.clanId) } } });
    const cm = new Map(clans.map(c => [c.id, c]));
    res.json(groups.map(g => { const c = cm.get(g.clanId); if (!c) return null; return { id: c.id, name: c.name, tag: c.tag, bannerIcon: c.bannerIcon, bannerColor: c.bannerColor, memberCount: g._count.id, avgXp: Math.round(g._avg.xp || 0) }; }).filter(Boolean).sort((a, b) => b.avgXp - a.avgXp).slice(0, 20));
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.get("/clans", authMiddleware, async (req, res) => {
  try {
    const clans = await prisma.clan.findMany({ include: { _count: { select: { members: true } } }, orderBy: { createdAt: "desc" } });
    res.json(clans.map(c => ({ id: c.id, name: c.name, tag: c.tag, description: c.description, bannerIcon: c.bannerIcon, bannerColor: c.bannerColor, memberCount: c._count.members })));
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/clans", authMiddleware, async (req, res) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.userId } });
    if (actor.level < CLAN_UNLOCK_LEVEL) return res.status(403).json({ message: `Кланы доступны с ${CLAN_UNLOCK_LEVEL} уровня` });
    const { name, description, bannerIcon, bannerColor } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
    if (await prisma.clan.findUnique({ where: { name: name.trim() } })) return res.status(400).json({ message: "Clan with this name already exists" });
    const clan = await prisma.clan.create({ data: { name: name.trim(), description: description?.trim() || null, tag: await generateUniqueClanTag(), bannerIcon: CLAN_BANNER_ICONS.includes(bannerIcon) ? bannerIcon : CLAN_BANNER_ICONS[0], bannerColor: CLAN_BANNER_COLORS.includes(bannerColor) ? bannerColor : CLAN_BANNER_COLORS[0] } });
    await prisma.user.update({ where: { id: req.userId }, data: { clanId: clan.id, clanRole: "leader" } });
    res.status(201).json(clan);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/clans/:id/join", authMiddleware, async (req, res) => {
  try {
    const actor = await prisma.user.findUnique({ where: { id: req.userId } });
    if (actor.level < CLAN_UNLOCK_LEVEL) return res.status(403).json({ message: `Кланы доступны с ${CLAN_UNLOCK_LEVEL} уровня` });
    const clan = await prisma.clan.findUnique({ where: { id: Number(req.params.id) } });
    if (!clan) return res.status(404).json({ message: "Clan not found" });
    await prisma.user.update({ where: { id: req.userId }, data: { clanId: clan.id, clanRole: "member" } });
    res.json({ message: "Joined" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/clans/leave", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user.clanId) return res.status(400).json({ message: "Not in a clan" });
    const clanId = user.clanId;
    if (user.clanRole === "leader") {
      const others = await prisma.user.findMany({ where: { clanId, id: { not: req.userId } }, orderBy: { id: "asc" } });
      if (others.length === 0) {
        await prisma.user.update({ where: { id: req.userId }, data: { clanId: null, clanRole: null } });
        await prisma.clanMessage.deleteMany({ where: { clanId } });
        await prisma.clan.delete({ where: { id: clanId } });
        return res.json({ message: "Left clan" });
      }
      const s = others.find(m => m.clanRole === "co_leader") || others[0];
      await prisma.user.update({ where: { id: s.id }, data: { clanRole: "leader" } });
    }
    await prisma.user.update({ where: { id: req.userId }, data: { clanId: null, clanRole: null } });
    res.json({ message: "Left clan" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.get("/clans/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user.clanId) return res.json({ clan: null, members: [], myRole: null });
    const clan = await prisma.clan.findUnique({ where: { id: user.clanId } });
    const members = await prisma.user.findMany({ where: { clanId: user.clanId }, orderBy: [{ level: "desc" }, { xp: "desc" }], select: { id: true, email: true, name: true, level: true, xp: true, gold: true, streak: true, clanRole: true, lastActiveAt: true } });
    const now = Date.now();
    res.json({ clan, myRole: user.clanRole, members: members.map(m => ({ ...m, name: m.name || m.email.split("@")[0], isOnline: m.lastActiveAt ? now - new Date(m.lastActiveAt).getTime() < ONLINE_THRESHOLD_MS : false })) });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.patch("/clans/members/:userId/role", authMiddleware, async (req, res) => {
  try {
    const targetId = Number(req.params.userId); const { role } = req.body;
    if (!["co_leader", "member"].includes(role)) return res.status(400).json({ message: "Invalid role" });
    const actor = await prisma.user.findUnique({ where: { id: req.userId } });
    if (actor.clanRole !== "leader") return res.status(403).json({ message: "Только лидер может менять роли" });
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.clanId !== actor.clanId) return res.status(404).json({ message: "Участник не найден" });
    if (target.clanRole === "leader") return res.status(400).json({ message: "Нельзя изменить роль лидера" });
    await prisma.user.update({ where: { id: targetId }, data: { clanRole: role } });
    res.json({ message: "Updated" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.delete("/clans/members/:userId", authMiddleware, async (req, res) => {
  try {
    const targetId = Number(req.params.userId);
    if (targetId === req.userId) return res.status(400).json({ message: "Используй кнопку «Покинуть клан»" });
    const actor = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!["leader", "co_leader"].includes(actor.clanRole)) return res.status(403).json({ message: "Недостаточно прав" });
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target || target.clanId !== actor.clanId) return res.status(404).json({ message: "Участник не найден" });
    if (target.clanRole === "leader") return res.status(400).json({ message: "Нельзя исключить лидера" });
    if (actor.clanRole === "co_leader" && target.clanRole === "co_leader") return res.status(403).json({ message: "Соруководитель не может исключить другого соруководителя" });
    await prisma.user.update({ where: { id: targetId }, data: { clanId: null, clanRole: null } });
    res.json({ message: "Kicked" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.get("/clans/me/messages", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user.clanId) return res.status(400).json({ message: "Not in a clan" });
    const msgs = await prisma.clanMessage.findMany({ where: { clanId: user.clanId }, orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true, email: true } } } });
    res.json(msgs.reverse().map(m => ({ id: m.id, text: m.text, createdAt: m.createdAt, author: m.user.name || m.user.email.split("@")[0], userId: m.userId })));
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/clans/me/messages", authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Message is empty" });
    if (text.length > 500) return res.status(400).json({ message: "Message is too long" });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user.clanId) return res.status(400).json({ message: "Not in a clan" });
    const msg = await prisma.clanMessage.create({ data: { text: text.trim(), clanId: user.clanId, userId: req.userId } });
    res.status(201).json(msg);
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

// ── FRIENDS ──────────────────────────────────────────────────────────────────
app.get("/friends", authMiddleware, async (req, res) => {
  try {
    const fs = await prisma.friendship.findMany({ where: { userId: req.userId }, include: { friend: { select: { id: true, email: true, name: true, level: true, gold: true, streak: true, clan: { select: { name: true } } } } } });
    res.json(fs.map(f => ({ id: f.friend.id, name: f.friend.name || f.friend.email.split("@")[0], level: f.friend.level, gold: f.friend.gold, streak: f.friend.streak, clanName: f.friend.clan?.name || null })));
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.post("/friends", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Укажи ник" });
    const target = await prisma.user.findUnique({ where: { name: name.trim() } });
    if (!target) return res.status(404).json({ message: "Пользователь с таким ником не найден" });
    if (target.id === req.userId) return res.status(400).json({ message: "Нельзя добавить себя в друзья" });
    const ex = await prisma.friendship.findUnique({ where: { userId_friendId: { userId: req.userId, friendId: target.id } } });
    if (ex) return res.status(400).json({ message: "Уже в друзьях" });
    await prisma.$transaction([
      prisma.friendship.create({ data: { userId: req.userId, friendId: target.id } }),
      prisma.friendship.create({ data: { userId: target.id, friendId: req.userId } }),
    ]);
    res.status(201).json({ message: "Добавлено" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

app.delete("/friends/:id", authMiddleware, async (req, res) => {
  try {
    const friendId = Number(req.params.id);
    await prisma.$transaction([
      prisma.friendship.deleteMany({ where: { userId: req.userId, friendId } }),
      prisma.friendship.deleteMany({ where: { userId: friendId, friendId: req.userId } }),
    ]);
    res.json({ message: "Удалено" });
  } catch (e) { console.error(e); res.status(500).json({ message: "Server error" }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SERVER STARTED ON ${PORT}`));