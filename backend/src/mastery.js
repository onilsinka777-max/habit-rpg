const prisma = require("./prisma");

const CLASS_LABELS = {
  warrior:     "Воин",
  sage:        "Мудрец",
  balance:     "Баланс",
  strategist:  "Стратег",
  explorer:    "Исследователь",
};

const CLASS_TITLES = {
  warrior:    "Закалённый Воин",
  sage:       "Просветлённый",
  balance:    "Гармоничный",
  strategist: "Тактик",
  explorer:   "Первопроходец",
};

async function computeAutoClass(userId) {
  const counts = await prisma.task.groupBy({
    by: ["branch"],
    where: { userId, completed: true, type: { in: ["required", "recommended", "custom"] } },
    _count: { id: true },
  });
  const map = {};
  for (const c of counts) map[c.branch] = c._count.id;

  const disc  = map.discipline       || 0;
  const fit   = map.fitness          || 0;
  const know  = map.knowledge        || 0;
  const self  = map.self_development || 0;
  const total = disc + fit + know + self;
  if (total === 0) return null;

  const warriorScore    = disc + fit;
  const sageScore       = know + self;
  const strategistScore = disc + know;
  const explorerScore   = fit  + self;

  const max = Math.max(warriorScore, sageScore, strategistScore, explorerScore);
  const threshold = total * 0.25; // each pair must have > 25% of total to count as dominant
  if (max < threshold) return "balance";

  // Check near-equal (all 4 roughly even → balance)
  const avg = total / 4;
  const allEven = [disc, fit, know, self].every(v => Math.abs(v - avg) < avg * 0.4);
  if (allEven) return "balance";

  if (max === warriorScore    && warriorScore > sageScore && warriorScore > strategistScore && warriorScore > explorerScore) return "warrior";
  if (max === sageScore       && sageScore > warriorScore && sageScore > strategistScore    && sageScore > explorerScore)    return "sage";
  if (max === strategistScore && strategistScore > warriorScore && strategistScore > sageScore && strategistScore > explorerScore) return "strategist";
  if (max === explorerScore   && explorerScore > warriorScore   && explorerScore > sageScore   && explorerScore > strategistScore) return "explorer";

  return "balance";
}

module.exports = { computeAutoClass, CLASS_LABELS, CLASS_TITLES };
