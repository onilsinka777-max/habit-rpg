const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const templates = [
  { title: "Сделать 100 отжиманий и 150 приседаний в течение дня", branch: "fitness" },
  { title: "Провести интенсивную тренировку 90 минут без остановки больше 2 минут", branch: "fitness" },
  { title: "Провести день без единого отступления от плана — ни одной незапланированной паузы", branch: "discipline" },
  { title: "Встать в 5:00 утра и продержаться без послаблений в дисциплине до самого вечера", branch: "discipline" },
  { title: "Написать подробный план на ближайшие 3 месяца по главной цели жизни", branch: "self_development" },
  { title: "Провести час глубокой саморефлексии и написать письмо себе через 5 лет", branch: "self_development" },
  { title: "Изучить совершенно новую тему 2 часа подряд и составить полный конспект", branch: "knowledge" },
  { title: "Подготовить и провести 20-минутную лекцию по сложной теме для другого человека", branch: "knowledge" },
];

async function main() {
  await prisma.legendaryQuestTemplate.deleteMany({});
  for (const t of templates) {
    await prisma.legendaryQuestTemplate.create({ data: t });
  }
  console.log(`Создано легендарных шаблонов: ${templates.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });