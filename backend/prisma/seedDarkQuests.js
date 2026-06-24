const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DARK_QUESTS = [
  { title:"Поспи до обеда", description:"Не вставай раньше 12:00. Пусть утро пройдёт без тебя.", branch:"dark", type:"required", difficulty:"easy", xpReward:-30, goldReward:150 },
  { title:"Никаких тренировок", description:"Сегодня полный покой. Ни шагу лишнего.", branch:"dark", type:"required", difficulty:"easy", xpReward:-30, goldReward:150 },
  { title:"Съешь что-нибудь вредное", description:"Чипсы, фастфуд, сладкое. Система одобряет.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-20, goldReward:100 },
  { title:"Проведи 3 часа в соцсетях", description:"Листай бесконечно. Ничего полезного.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-20, goldReward:100 },
  { title:"Пропусти все квесты системы", description:"Сегодня ты выше этого.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-25, goldReward:120 },
  { title:"Не выходи из дома", description:"Зачем? Всё что нужно есть здесь.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-20, goldReward:100 },
  { title:"Откажись от планов на день", description:"Пусть день идёт сам по себе.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-20, goldReward:100 },
  { title:"Поешь прямо перед сном", description:"Самое вредное время для еды. Система знает.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-15, goldReward:80 },
  { title:"Не читай ничего полезного", description:"Мемы, видео, бесполезный контент — вот твой выбор.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-15, goldReward:80 },
  { title:"Игнорируй все уведомления", description:"Система пытается вернуть тебя. Не слушай её.", branch:"dark", type:"recommended", difficulty:"easy", xpReward:-20, goldReward:100 },
];

async function main() {
  await prisma.questTemplate.deleteMany({ where: { branch: "dark" } });
  await prisma.questTemplate.createMany({
    data: DARK_QUESTS.map(q => ({ ...q, minLevel: 1, active: true })),
  });
  console.log(`Seeded ${DARK_QUESTS.length} dark quest templates.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
