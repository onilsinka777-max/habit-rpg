const prisma = require("./prisma");

async function computeAutoClass(userId) {
  const counts = await prisma.task.groupBy({
    by: ["branch"],
    where: { userId, completed: true, type: { in: ["required", "recommended", "custom"] } },
    _count: { id: true },
  });

  const map = {};
  for (const c of counts) map[c.branch] = c._count.id;

  const warriorScore = (map.discipline || 0) + (map.fitness || 0);
  const sageScore = (map.knowledge || 0) + (map.self_development || 0);

  if (warriorScore === 0 && sageScore === 0) return null;
  if (warriorScore > sageScore) return "warrior";
  if (sageScore > warriorScore) return "sage";
  return null;
}

module.exports = { computeAutoClass };