const prisma = require("./prisma");
const {
  BRANCHES, startOfToday, endOfToday,
  getRequiredPenaltyGold, DIFFICULTY_REWARDS,
  DAILY_REQUIRED_PER_BRANCH, DAILY_RECOMMENDED_PER_BRANCH,
} = require("./constants");

function getDifficultyForLevel(userLevel, random = Math.random()) {
  if (userLevel <= 5) {
    return 'easy';
  } else if (userLevel <= 10) {
    return random < 0.8 ? 'easy' : 'medium';
  } else if (userLevel <= 15) {
    if (random < 0.5) return 'easy';
    if (random < 0.95) return 'medium';
    return 'hard';
  } else if (userLevel <= 20) {
    if (random < 0.2) return 'easy';
    if (random < 0.8) return 'medium';
    return 'hard';
  } else if (userLevel <= 25) {
    if (random < 0.05) return 'easy';
    if (random < 0.5) return 'medium';
    return 'hard';
  } else {
    return random < 0.1 ? 'medium' : 'hard';
  }
}

const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2, legendary: 3, absolute: 4 };

function getMaxDifficultyForLevel(level) {
  if (level <= 5) return 'easy';
  if (level <= 10) return 'medium';
  return 'hard';
}

function buildQuestFromTemplate(template, userLevel) {
  let title = template.title;
  let description = template.description || null;
  let difficulty = getDifficultyForLevel(userLevel);
  let xpReward = DIFFICULTY_REWARDS[difficulty]?.xpReward || template.xpReward;
  let goldReward = DIFFICULTY_REWARDS[difficulty]?.goldReward || template.goldReward;

  if (template.baseReps && template.repScaling != null) {
    const actualReps = template.baseReps + Math.floor(userLevel * template.repScaling);
    title = title.replace(/\{reps\}/g, actualReps);
    if (description) description = description.replace(/\{reps\}/g, actualReps);
  }

  return { title, description, difficulty, xpReward, goldReward };
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function findTemplatesForLevel(branch, type, level) {
  return prisma.questTemplate.findMany({
    where: {
      branch, type, active: true,
      minLevel: { lte: level },
      OR: [{ maxLevel: null }, { maxLevel: { gte: level } }],
    },
  });
}

async function applyMissedRequiredPenalties(userId) {
  const now = new Date();
  const missed = await prisma.task.findMany({
    where: {
      userId, isDaily: true, type: "required",
      completed: false, penalized: false,
      expiresAt: { lt: now },
    },
  });

  if (missed.length === 0) return;

  const user = await prisma.user.findUnique({ where: { id: userId } });

  const MISS_MULTS = [1, 1.5, 2, 4, 8];
  const missedDates = new Set(missed.map((t) => new Date(t.expiresAt).toDateString()));
  const newMissedDaysStreak = (user.missedDaysStreak || 0) + missedDates.size;
  const mult = MISS_MULTS[Math.min(newMissedDaysStreak - 1, 4)];

  const penaltyPerQuest = getRequiredPenaltyGold(user.masteryPath);
  const totalPenalty = Math.round(missed.length * penaltyPerQuest * mult);
  const newGold = Math.max(0, user.gold - totalPenalty);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { gold: newGold, missedDaysStreak: newMissedDaysStreak },
    }),
    ...missed.map((t) => prisma.task.update({ where: { id: t.id }, data: { penalized: true } })),
  ]);

  // Завершить дуэли стриков — игрок пропустил день
  const activeDuels = await prisma.streakDuel.findMany({
    where: { status: "active", OR: [{ challengerId: userId }, { challengedId: userId }] },
  });
  for (const duel of activeDuels) {
    const winnerId = duel.challengerId === userId ? duel.challengedId : duel.challengerId;
    await prisma.streakDuel.update({ where: { id: duel.id }, data: { status: "finished", winnerId } });
    await prisma.user.update({ where: { id: winnerId }, data: { gold: { increment: duel.stake * 2 } } });
    const winner = await prisma.user.findUnique({ where: { id: winnerId }, select: { name: true } });
    await prisma.notification.create({ data: { userId: winnerId, type: "duel_won", message: `⚔️ Ты выиграл дуэль стриков! +${duel.stake * 2} золота` } });
    await prisma.notification.create({ data: { userId, type: "duel_lost", message: `⚔️ Ты проиграл дуэль стриков — прервал стрик. ${winner?.name} получил ${duel.stake * 2} золота.` } });
  }

  // Обнулить совместные стрики
  const activeShared = await prisma.sharedStreak.findMany({
    where: { status: "active", OR: [{ user1Id: userId }, { user2Id: userId }] },
    include: { user1: { select: { name: true } }, user2: { select: { name: true } } },
  });
  for (const ss of activeShared) {
    const partnerId = ss.user1Id === userId ? ss.user2Id : ss.user1Id;
    const partnerName = ss.user1Id === userId ? ss.user2?.name : ss.user1?.name;
    const myName = ss.user1Id === userId ? ss.user1?.name : ss.user2?.name;
    await prisma.sharedStreak.update({ where: { id: ss.id }, data: { streak: 0 } });
    await prisma.notification.create({ data: { userId: partnerId, type: "shared_streak_broken", message: `💔 Совместный стрик прерван. ${myName || "Партнёр"} не выполнил квесты.` } });
    await prisma.notification.create({ data: { userId, type: "shared_streak_broken", message: `💔 Совместный стрик с ${partnerName || "партнёром"} обнулён.` } });
  }
}

async function cleanupExpiredDailyQuests(userId) {
  await prisma.task.deleteMany({
    where: {
      userId,
      isDaily: true,
      isNpcQuest: false,
      type: { in: ["required", "recommended"] },
      expiresAt: { lt: startOfToday() },
    },
  });
  // Peace quests live 7 days
  await prisma.task.deleteMany({
    where: {
      userId,
      branch: "peace",
      isDaily: true,
      createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });
}

async function ensurePeaceQuests(userId, user) {
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const weekAgo = new Date(Date.now() - WEEK_MS);

  // If ANY peace quests exist from last 7 days — skip generation
  const existing = await prisma.task.findMany({
    where: { userId, branch: "peace", isDaily: true, createdAt: { gte: weekAgo } },
  });
  if (existing.length > 0) return;

  const expiresAt = new Date(Date.now() + WEEK_MS);
  const PEACE_REQUIRED    = 2;
  const PEACE_RECOMMENDED = 6;

  for (const type of ["required", "recommended"]) {
    const target    = type === "required" ? PEACE_REQUIRED : PEACE_RECOMMENDED;
    const templates = shuffle(await findTemplatesForLevel("peace", type, user.level));
    for (let i = 0; i < target && i < templates.length; i++) {
      const t = templates[i];
      await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          branch: "peace",
          type: t.type,
          difficulty: t.difficulty,
          xpReward: t.xpReward,
          goldReward: t.goldReward,
          isDaily: true,
          expiresAt,
          userId,
        },
      });
    }
  }
}

async function ensureDailyQuests(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  // 1. Apply penalties for missed quests before deleting them
  await applyMissedRequiredPenalties(userId);

  // 2. Delete expired daily quests
  await cleanupExpiredDailyQuests(userId);

  const now = new Date();

  // 3. Check what active daily quests already exist for today
  let activeDaily = await prisma.task.findMany({
    where: { userId, isDaily: true, expiresAt: { gt: now }, type: { in: ["required", "recommended"] } },
  });

  // 4. Delete existing quests whose difficulty is too high for user's level
  const maxDiff = getMaxDifficultyForLevel(user.level);
  const maxDiffOrder = DIFFICULTY_ORDER[maxDiff] ?? 2;
  const wrongDiffIds = activeDaily
    .filter(t => !t.completed && (DIFFICULTY_ORDER[t.difficulty] ?? 0) > maxDiffOrder)
    .map(t => t.id);
  if (wrongDiffIds.length > 0) {
    await prisma.task.deleteMany({ where: { id: { in: wrongDiffIds } } });
    activeDaily = activeDaily.filter(t => !wrongDiffIds.includes(t.id));
  }

  const TARGET_COUNTS = {
    required: DAILY_REQUIRED_PER_BRANCH,
    recommended: DAILY_RECOMMENDED_PER_BRANCH,
  };

  for (const branch of BRANCHES) {
    for (const type of ["required", "recommended"]) {
      const existing = activeDaily.filter((t) => t.branch === branch && t.type === type);
      const needed = TARGET_COUNTS[type] - existing.length;
      if (needed < 0) {
        const toDelete = existing.filter(t => !t.completed).slice(0, -needed);
        if (toDelete.length > 0) {
          await prisma.task.deleteMany({ where: { id: { in: toDelete.map(t => t.id) } } });
        }
        continue;
      }
      if (needed === 0) continue;
      const existingTitles = new Set(existing.map((t) => t.title));

      const allTemplates = await findTemplatesForLevel(branch, type, user.level);
      const pool = shuffle(allTemplates.filter((t) => !existingTitles.has(t.title)));

      for (let i = 0; i < needed && pool.length > 0; i++) {
        const preferred = getDifficultyForLevel(user.level);
        let idx = pool.findIndex((t) => t.difficulty === preferred);
        if (idx === -1) idx = 0;
        const [template] = pool.splice(idx, 1);

        const built = buildQuestFromTemplate(template, user.level);
        await prisma.task.create({
          data: {
            title: built.title,
            description: built.description,
            branch: template.branch,
            type: template.type,
            difficulty: built.difficulty,
            xpReward: built.xpReward,
            goldReward: built.goldReward,
            isDaily: true,
            expiresAt: endOfToday(),
            userId,
          },
        });
      }
    }
  }

  // Peace branch
  if (user.peaceUnlocked) {
    await ensurePeaceQuests(userId, user);
  }
}

module.exports = { ensureDailyQuests, getDifficultyForLevel, DIFFICULTY_REWARDS };
