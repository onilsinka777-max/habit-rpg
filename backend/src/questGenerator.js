const prisma = require("./prisma");
const {
  BRANCHES, weightedRandomDifficulty, startOfToday, endOfToday,
  getRequiredPenaltyGold, DIFFICULTY_REWARDS,
  DAILY_REQUIRED_PER_BRANCH, DAILY_RECOMMENDED_PER_BRANCH,
} = require("./constants");

function buildQuestFromTemplate(template, userLevel) {
  let title = template.title;
  let description = template.description || null;
  let difficulty = template.difficulty;
  let xpReward = template.xpReward;
  let goldReward = template.goldReward;

  if (template.baseReps && template.repScaling != null) {
    const actualReps = template.baseReps + Math.floor(userLevel * template.repScaling);
    title = title.replace(/\{reps\}/g, actualReps);
    if (description) description = description.replace(/\{reps\}/g, actualReps);

    const base = template.baseReps;
    const baseDiff = template.baseDifficulty || template.difficulty;
    if (actualReps > base * 1.67) difficulty = "hard";
    else if (actualReps > base * 1.25) difficulty = "medium";
    else difficulty = baseDiff;

    xpReward = DIFFICULTY_REWARDS[difficulty]?.xp || xpReward;
    goldReward = DIFFICULTY_REWARDS[difficulty]?.gold || goldReward;
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
  const penaltyPerQuest = getRequiredPenaltyGold(user.masteryPath);
  const newGold = Math.max(0, user.gold - missed.length * penaltyPerQuest);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { gold: newGold } }),
    ...missed.map((t) => prisma.task.update({ where: { id: t.id }, data: { penalized: true } })),
  ]);
}

async function cleanupExpiredDailyQuests(userId) {
  // Delete expired daily quests (required + recommended only, not custom/legendary)
  await prisma.task.deleteMany({
    where: {
      userId,
      isDaily: true,
      type: { in: ["required", "recommended"] },
      expiresAt: { lt: startOfToday() },
    },
  });
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
  const activeDaily = await prisma.task.findMany({
    where: { userId, isDaily: true, expiresAt: { gt: now }, type: { in: ["required", "recommended"] } },
  });

  const TARGET_COUNTS = {
    required: DAILY_REQUIRED_PER_BRANCH,
    recommended: DAILY_RECOMMENDED_PER_BRANCH,
  };

  for (const branch of BRANCHES) {
    for (const type of ["required", "recommended"]) {
      const existing = activeDaily.filter((t) => t.branch === branch && t.type === type);
      const needed = TARGET_COUNTS[type] - existing.length;
      if (needed < 0) {
        // Trim excess quests (keep completed ones, delete non-completed excess)
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
        const preferred = weightedRandomDifficulty(user.level);
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
}

module.exports = { ensureDailyQuests };