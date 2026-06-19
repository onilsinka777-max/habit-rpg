const prisma = require("./prisma");
const { BRANCHES, LEGENDARY_REWARD_MULTIPLIER, DIFFICULTY_REWARDS } = require("./constants");

function getStartOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date = new Date()) {
  const start = getStartOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

async function ensureWeeklyLegendaryQuest(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user.hasEverFinishedMastery) return;

  const startOfWeek = getStartOfWeek();

  const existing = await prisma.task.findFirst({
    where: { userId, type: "legendary", createdAt: { gte: startOfWeek } },
  });
  if (existing) return;

  const branch = BRANCHES[Math.floor(Math.random() * BRANCHES.length)];

  const templates = await prisma.legendaryQuestTemplate.findMany({
    where: { branch, active: true },
  });
  if (templates.length === 0) return;

  const template = templates[Math.floor(Math.random() * templates.length)];
  const hardReward = DIFFICULTY_REWARDS.hard;

  await prisma.task.create({
    data: {
      title: template.title,
      description: template.description,
      branch: template.branch,
      type: "legendary",
      difficulty: "hard",
      xpReward: hardReward.xp * LEGENDARY_REWARD_MULTIPLIER,
      goldReward: hardReward.gold * LEGENDARY_REWARD_MULTIPLIER,
      isDaily: false,
      expiresAt: getEndOfWeek(),
      userId,
    },
  });
}

module.exports = { ensureWeeklyLegendaryQuest, getStartOfWeek, getEndOfWeek };