const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding wave2 data...");

  // ── MARATHONS ──────────────────────────────────────────────────────────────
  const marathons = [
    { title:"30 дней дисциплины", description:"Выполняй все обязательные квесты ветки Дисциплина каждый день", branch:"discipline", durationDays:30, rewardGold:1000, rewardXp:2000, icon:"🔥" },
    { title:"21 день фитнеса", description:"Выполняй минимум 2 квеста фитнеса каждый день", branch:"fitness", durationDays:21, rewardGold:800, rewardXp:1500, icon:"💪" },
    { title:"14 дней чтения", description:"Читай и учись каждый день — хотя бы 1 квест знаний", branch:"knowledge", durationDays:14, rewardGold:600, rewardXp:1000, icon:"📚" },
    { title:"7 дней медитации", description:"Практикуй осознанность каждый день — 1 квест саморазвития", branch:"self_development", durationDays:7, rewardGold:400, rewardXp:500, icon:"🧘" },
  ];
  for (const m of marathons) {
    await prisma.marathon.upsert({ where:{title:m.title}, create:m, update:m }).catch(async()=>{
      await prisma.marathon.create({data:m}).catch(()=>{});
    });
  }
  console.log("✓ Marathons");

  // ── SKILL TREE ─────────────────────────────────────────────────────────────
  const skills = [
    // Discipline T1-T5
    { name:"Железная воля", description:"5% меньше штраф за пропуск квеста", branch:"discipline", tier:1, requires:"[]", effect:"penalty_reduce", value:0.05, icon:"🛡️", goldCost:100, levelRequired:5 },
    { name:"Утренний ритуал", description:"+10 XP за квесты выполненные до 9 утра", branch:"discipline", tier:2, requires:"[]", effect:"morning_xp", value:10, icon:"🌅", goldCost:200, levelRequired:10 },
    { name:"Стальной разум", description:"Стрик не сбрасывается 1 раз в месяц", branch:"discipline", tier:3, requires:"[]", effect:"streak_protect", value:1, icon:"🗿", goldCost:400, levelRequired:15 },
    { name:"Мастер режима", description:"+20% XP за обязательные квесты", branch:"discipline", tier:4, requires:"[]", effect:"required_xp_boost", value:0.20, icon:"⚔️", goldCost:700, levelRequired:20 },
    { name:"Абсолютная дисциплина", description:"x2 золото за выполнение всех обязательных за день", branch:"discipline", tier:5, requires:"[]", effect:"all_required_gold", value:2, icon:"👑", goldCost:1200, levelRequired:25 },
    // Fitness T1-T5
    { name:"Выносливость", description:"+5% XP за квесты фитнеса", branch:"fitness", tier:1, requires:"[]", effect:"fitness_xp", value:0.05, icon:"🏃", goldCost:100, levelRequired:5 },
    { name:"Спортивная форма", description:"Квесты фитнеса дают +5 золота", branch:"fitness", tier:2, requires:"[]", effect:"fitness_gold", value:5, icon:"💪", goldCost:200, levelRequired:10 },
    { name:"Второе дыхание", description:"После стрика 7 дней +15% XP на следующий день", branch:"fitness", tier:3, requires:"[]", effect:"streak_xp_boost", value:0.15, icon:"💨", goldCost:400, levelRequired:15 },
    { name:"Атлет", description:"+25% XP за все квесты фитнеса", branch:"fitness", tier:4, requires:"[]", effect:"fitness_xp_major", value:0.25, icon:"🏆", goldCost:700, levelRequired:20 },
    { name:"Чемпион", description:"Легендарные квесты фитнеса дают x3 награду", branch:"fitness", tier:5, requires:"[]", effect:"legendary_triple", value:3, icon:"🥇", goldCost:1200, levelRequired:25 },
    // Knowledge T1-T5
    { name:"Любопытный ум", description:"+5% XP за квесты знаний", branch:"knowledge", tier:1, requires:"[]", effect:"knowledge_xp", value:0.05, icon:"🔍", goldCost:100, levelRequired:5 },
    { name:"Скорочтение", description:"Рекомендованные квесты знаний +10 XP", branch:"knowledge", tier:2, requires:"[]", effect:"knowledge_rec_xp", value:10, icon:"📖", goldCost:200, levelRequired:10 },
    { name:"Фотопамять", description:"XP от знаний накапливается 1.1x каждый день подряд", branch:"knowledge", tier:3, requires:"[]", effect:"knowledge_streak", value:1.1, icon:"🧠", goldCost:400, levelRequired:15 },
    { name:"Эрудит", description:"+25% XP за все квесты знаний", branch:"knowledge", tier:4, requires:"[]", effect:"knowledge_xp_major", value:0.25, icon:"📚", goldCost:700, levelRequired:20 },
    { name:"Мудрец", description:"+50% XP за знания и открывает скрытые квесты", branch:"knowledge", tier:5, requires:"[]", effect:"knowledge_master", value:0.50, icon:"🌟", goldCost:1200, levelRequired:25 },
    // Self Development T1-T5
    { name:"Осознанность", description:"+5% XP за квесты саморазвития", branch:"self_development", tier:1, requires:"[]", effect:"self_xp", value:0.05, icon:"🌱", goldCost:100, levelRequired:5 },
    { name:"Медитатор", description:"+20 XP за ежедневную запись благодарности", branch:"self_development", tier:2, requires:"[]", effect:"gratitude_xp", value:20, icon:"🧘", goldCost:200, levelRequired:10 },
    { name:"Внутренний покой", description:"Штраф за пропуск -30%", branch:"self_development", tier:3, requires:"[]", effect:"penalty_reduce_major", value:0.30, icon:"☯️", goldCost:400, levelRequired:15 },
    { name:"Гармония", description:"+25% XP за все квесты саморазвития", branch:"self_development", tier:4, requires:"[]", effect:"self_xp_major", value:0.25, icon:"🌸", goldCost:700, levelRequired:20 },
    { name:"Просветлённый", description:"+10% ко ВСЕМУ XP в игре", branch:"self_development", tier:5, requires:"[]", effect:"global_xp_boost", value:0.10, icon:"✨", goldCost:1200, levelRequired:25 },
  ];
  for (const s of skills) {
    const existing = await prisma.skill.findFirst({ where:{ name:s.name } });
    if (!existing) await prisma.skill.create({ data:s });
  }
  console.log("✓ Skills");

  // ── EASTER EGGS ───────────────────────────────────────────────────────────
  const eggs = [
    { key:"night_owl",      title:"Ночная сова",       description:"Выполни квест между 2:00 и 4:00 ночи",      icon:"🦉", rewardGold:50,  rewardXp:25 },
    { key:"early_bird",     title:"Ранняя пташка",     description:"Выполни квест до 6:00 утра",                 icon:"🌅", rewardGold:50,  rewardXp:25 },
    { key:"perfectionist",  title:"Перфекционист",     description:"Выполни 10 квестов за один день",            icon:"⭐", rewardGold:100, rewardXp:50 },
    { key:"sprinter",       title:"Спринтер",          description:"Выполни 3 квеста за 10 минут",               icon:"⚡", rewardGold:75,  rewardXp:30 },
    { key:"philosopher",    title:"Философ",           description:"Напиши 30 записей в дневник",                icon:"📜", rewardGold:150, rewardXp:75 },
    { key:"social_butterfly",title:"Социальная бабочка",description:"Добавь 10 друзей",                         icon:"🦋", rewardGold:100, rewardXp:50 },
    { key:"collector",      title:"Коллекционер",      description:"Купи 5 предметов в магазине",                icon:"🛍️", rewardGold:75,  rewardXp:30 },
    { key:"clan_legend",    title:"Легенда клана",     description:"Напиши 100 сообщений в клане",               icon:"👑", rewardGold:200, rewardXp:100 },
    { key:"silent_monk",    title:"Молчаливый монах",  description:"7 дней без кастомных квестов",               icon:"🧘", rewardGold:125, rewardXp:60 },
    { key:"star_hunter",    title:"Охотник за звёздами",description:"Выполни легендарный квест 4 раза",          icon:"🌟", rewardGold:300, rewardXp:150 },
  ];
  for (const e of eggs) {
    await prisma.easterEgg.upsert({ where:{key:e.key}, create:e, update:e });
  }
  console.log("✓ Easter eggs");

  console.log("Wave2 seeding complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
