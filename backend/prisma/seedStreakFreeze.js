const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.shopItem.findFirst({ where: { effect: "streak_freeze" } });
  if (existing) {
    console.log("Заморозка стрика уже есть в магазине");
    return;
  }

  await prisma.shopItem.create({
    data: {
      title: "Заморозка стрика",
      description: "Защищает серию от срыва, если пропустишь один день. Срабатывает автоматически при следующем выполненном квесте.",
      category: "boost",
      price: 40,
      effect: "streak_freeze",
    },
  });

  console.log("Добавлена заморозка стрика");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });