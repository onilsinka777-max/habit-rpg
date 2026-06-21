const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const CHAINS = [
  {
    title: "Путь Воина",
    description: "Выкуй характер через дисциплину и жёсткие испытания",
    lore: "В древние времена воины не рождались — они создавались в огне испытаний. Каждый удар судьбы закалял их волю. Теперь твоя очередь встать на путь воина.",
    branch: "discipline",
    totalSteps: 5,
    rewardGold: 500,
    rewardXp: 1000,
    rewardTitle: "Воин Света",
    rewardTheme: "solo-leveling",
    icon: "⚔️",
    steps: JSON.stringify([
      "Выполни 5 квестов по дисциплине",
      "Не прерывай серию 3 дня подряд",
      "Выполни 10 квестов по дисциплине",
      "Удержи серию 7 дней",
      "Заверши 20 квестов дисциплины — докажи стойкость",
    ]),
    stepLore: JSON.stringify([
      "Первый шаг труден. Но тысяча шагов начинается с одного.",
      "Воин держит слово. Твои привычки определяют тебя.",
      "Десять испытаний позади. Твоя воля крепнет с каждым днём.",
      "Семь дней огня. Ты не сдался — значит ты воин.",
      "Двадцать побед. Меч закалён. Путь Воина пройден.",
    ]),
    stepReqs: JSON.stringify([
      { type: "quests_completed", count: 5, branch: "discipline" },
      { type: "streak", count: 3 },
      { type: "quests_completed", count: 10, branch: "discipline" },
      { type: "streak", count: 7 },
      { type: "quests_completed", count: 20, branch: "discipline" },
    ]),
    active: true,
  },
  {
    title: "Путь Атлета",
    description: "Преврати тело в инструмент воли",
    lore: "Тело — это храм духа. Каждая тренировка — молитва, каждый пот — жертва. Атлеты не рождаются совершенными — они создают себя каждый день заново.",
    branch: "fitness",
    totalSteps: 5,
    rewardGold: 500,
    rewardXp: 1000,
    rewardTitle: "Атлет",
    rewardTheme: "cosmic",
    icon: "💪",
    steps: JSON.stringify([
      "Выполни 5 квестов фитнеса",
      "Выполни квест фитнеса 3 дня подряд",
      "Выполни 10 квестов фитнеса",
      "Удержи серию 14 дней подряд",
      "Заверши 20 квестов фитнеса — ты настоящий атлет",
    ]),
    stepLore: JSON.stringify([
      "Первые пять — это только разминка. Твоё тело просыпается.",
      "Три дня — привычка начинается здесь. Не ломай цепь.",
      "Десять тренировок. Мышцы помнят. Продолжай.",
      "Две недели без остановки. Ты создал нового себя.",
      "Двадцать побед над собой. Путь Атлета завершён.",
    ]),
    stepReqs: JSON.stringify([
      { type: "quests_completed", count: 5, branch: "fitness" },
      { type: "streak", count: 3 },
      { type: "quests_completed", count: 10, branch: "fitness" },
      { type: "streak", count: 14 },
      { type: "quests_completed", count: 20, branch: "fitness" },
    ]),
    active: true,
  },
  {
    title: "Путь Мудреца",
    description: "Знания — твоя броня и оружие",
    lore: "Знание — единственное сокровище, которое нельзя украсть. Мудрецы накапливали знания веками, передавая свет разума сквозь тьму невежества. Настало время и тебе зажечь свой факел.",
    branch: "knowledge",
    totalSteps: 5,
    rewardGold: 500,
    rewardXp: 1000,
    rewardTitle: "Мудрец",
    rewardTheme: null,
    icon: "📘",
    steps: JSON.stringify([
      "Выполни 5 квестов знаний",
      "Напиши 3 записи в дневнике",
      "Выполни 10 квестов знаний",
      "Удержи серию 7 дней",
      "Заверши 20 квестов знаний — разум заточен",
    ]),
    stepLore: JSON.stringify([
      "Пять шагов к знанию. Разум начинает пробуждаться.",
      "Слова на бумаге — это мысли, ставшие реальностью.",
      "Десять уроков. Понимание углубляется.",
      "Семь дней учёбы. Дисциплина разума крепче стали.",
      "Двадцать открытий. Путь Мудреца пройден. Твой разум — оружие.",
    ]),
    stepReqs: JSON.stringify([
      { type: "quests_completed", count: 5, branch: "knowledge" },
      { type: "journal_entries", count: 3 },
      { type: "quests_completed", count: 10, branch: "knowledge" },
      { type: "streak", count: 7 },
      { type: "quests_completed", count: 20, branch: "knowledge" },
    ]),
    active: true,
  },
  {
    title: "Путь Роста",
    description: "Стань лучшей версией себя через саморазвитие",
    lore: "Настоящий рост происходит не тогда, когда комфортно — а когда выходишь за пределы. Каждый день маленький шаг вперёд. Через год оглянешься и не узнаешь себя.",
    branch: "self_development",
    totalSteps: 5,
    rewardGold: 500,
    rewardXp: 1000,
    rewardTitle: "Первопроходец",
    rewardTheme: null,
    icon: "🌱",
    steps: JSON.stringify([
      "Выполни 5 квестов саморазвития",
      "Выполни задачи сегодня (3 квеста за день)",
      "Выполни 10 квестов саморазвития",
      "Удержи серию 7 дней",
      "Заверши 20 квестов саморазвития — путь открыт",
    ]),
    stepLore: JSON.stringify([
      "Пять шагов к себе. Рост начинается с малого.",
      "Три победы за один день — ты умеешь собраться.",
      "Десять побед. Ты меняешься изнутри.",
      "Семь дней непрерывного роста. Привычка стала частью тебя.",
      "Двадцать шагов вперёд. Путь Роста завершён. Ты другой человек.",
    ]),
    stepReqs: JSON.stringify([
      { type: "quests_completed", count: 5, branch: "self_development" },
      { type: "tasks_today", count: 3 },
      { type: "quests_completed", count: 10, branch: "self_development" },
      { type: "streak", count: 7 },
      { type: "quests_completed", count: 20, branch: "self_development" },
    ]),
    active: true,
  },
];

async function main() {
  console.log("Updating quest chains with lore and requirements...");
  for (const chain of CHAINS) {
    const existing = await prisma.questChain.findFirst({ where: { title: chain.title } });
    if (existing) {
      await prisma.questChain.update({ where: { id: existing.id }, data: chain });
      console.log(`Updated: ${chain.title}`);
    } else {
      await prisma.questChain.create({ data: chain });
      console.log(`Created: ${chain.title}`);
    }
  }
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
