const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const items = [
  {
    title: "Прилив опыта на 24 часа",
    description: "+50% опыта со всех выполненных квестов в течение 24 часов.",
    category: "boost",
    price: 30,
    effect: "xp_boost_24h",
  },
  {
    title: "Прилив золота на 24 часа",
    description: "+50% золота со всех выполненных квестов в течение 24 часов.",
    category: "boost",
    price: 30,
    effect: "gold_boost_24h",
  },
  {
    title: "Постоянный прилив опыта",
    description: "+25% опыта со всех квестов навсегда.",
    category: "boost",
    price: 250,
    effect: "xp_boost_permanent",
  },
  {
    title: "Постоянный прилив золота",
    description: "+25% золота со всех квестов навсегда.",
    category: "boost",
    price: 250,
    effect: "gold_boost_permanent",
  },
];

async function main() {
  for (const item of items) {
    const existing = await prisma.shopItem.findFirst({ where: { effect: item.effect } });
    if (existing) {
      console.log(`Уже есть: ${item.title}`);
      continue;
    }
    await prisma.shopItem.create({ data: item });
    console.log(`Добавлено: ${item.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });