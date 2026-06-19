const prisma = require("./prisma");
const { BRANCHES } = require("./constants");

const LOOKBACK_DAYS = 7;
const MIN_SAMPLE_SIZE = 3;
const LOW_RATE_THRESHOLD = 0.4;
const HIGH_RATE_THRESHOLD = 0.8;

const BRANCH_LABELS = {
  discipline: "Дисциплина",
  fitness: "Фитнес",
  self_development: "Саморазвитие",
  knowledge: "Знания",
};

async function generateInsight(userId) {
  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const tasks = await prisma.task.findMany({
    where: {
      userId,
      isDaily: true,
      createdAt: { gte: since },
    },
    select: { branch: true, completed: true },
  });

  if (tasks.length === 0) return null;

  const stats = {};
  for (const branch of BRANCHES) {
    stats[branch] = { total: 0, completed: 0 };
  }

  for (const t of tasks) {
    if (!stats[t.branch]) continue;
    stats[t.branch].total += 1;
    if (t.completed) stats[t.branch].completed += 1;
  }

  let lowest = null;
  let highest = null;

  for (const branch of BRANCHES) {
    const s = stats[branch];
    if (s.total < MIN_SAMPLE_SIZE) continue;
    const rate = s.completed / s.total;

    if (rate <= LOW_RATE_THRESHOLD && (!lowest || rate < lowest.rate)) {
      lowest = { branch, rate };
    }
    if (rate >= HIGH_RATE_THRESHOLD && (!highest || rate > highest.rate)) {
      highest = { branch, rate };
    }
  }

  if (lowest) {
    return {
      type: "warning",
      text: `Ветка «${BRANCH_LABELS[lowest.branch]}» проседает — за последние ${LOOKBACK_DAYS} дней выполнено меньше половины квестов. Может, начать с чего-то простого сегодня?`,
    };
  }

  if (highest) {
    return {
      type: "positive",
      text: `Отличный темп в ветке «${BRANCH_LABELS[highest.branch]}» — почти все квесты за последние ${LOOKBACK_DAYS} дней закрыты. Продолжай в том же духе!`,
    };
  }

  return null;
}

module.exports = { generateInsight };