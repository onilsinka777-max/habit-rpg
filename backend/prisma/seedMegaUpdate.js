const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // ── SEASON ──────────────────────────────────────────────────────────────────
  const existingSeason = await prisma.season.findFirst();
  if (!existingSeason) {
    await prisma.season.create({
      data: {
        name: "Сезон Рассвета",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-09-01"),
        theme: "dawn",
        active: true,
      },
    });
    console.log("Season created");
  }

  // ── QUEST CHAINS ─────────────────────────────────────────────────────────────
  const chains = [
    {
      title: "Путь Воина",
      description: "Выкуй характер через дисциплину и жёсткие испытания",
      branch: "discipline",
      rewardTitle: "Воин Света",
      icon: "⚔️",
      steps: JSON.stringify([
        "Выполни 5 обязательных квестов по дисциплине",
        "Не пропускай квесты 3 дня подряд",
        "Выполни 10 квестов по дисциплине",
        "Получи серию 7 дней",
        "Заверши 20 квестов дисциплины и докажи стойкость",
      ]),
    },
    {
      title: "Путь Атлета",
      description: "Преврати тело в инструмент воли",
      branch: "fitness",
      rewardTitle: "Атлет",
      icon: "💪",
      steps: JSON.stringify([
        "Выполни 5 квестов фитнеса",
        "Выполни квест фитнеса 3 дня подряд",
        "Выполни 10 квестов фитнеса",
        "Получи серию 14 дней подряд",
        "Заверши 20 квестов фитнеса — ты настоящий атлет",
      ]),
    },
    {
      title: "Путь Мудреца",
      description: "Знания — твоя броня и оружие",
      branch: "knowledge",
      rewardTitle: "Мудрец",
      icon: "📘",
      steps: JSON.stringify([
        "Выполни 5 квестов знаний",
        "Читай и учись 3 дня подряд",
        "Выполни 10 квестов знаний",
        "Накопи 1000 XP",
        "Заверши 20 квестов знаний — разум заточен",
      ]),
    },
    {
      title: "Путь Роста",
      description: "Стань лучшей версией себя через саморазвитие",
      branch: "self_development",
      rewardTitle: "Первопроходец",
      icon: "🌱",
      steps: JSON.stringify([
        "Выполни 5 квестов саморазвития",
        "Выполни квест саморазвития 3 дня подряд",
        "Выполни 10 квестов саморазвития",
        "Накопи серию 7 дней",
        "Заверши 20 квестов саморазвития — путь открыт",
      ]),
    },
  ];
  const existingChain = await prisma.questChain.findFirst();
  if (!existingChain) {
    for (const chain of chains) {
      await prisma.questChain.create({ data: chain });
    }
    console.log(`Quest chains created: ${chains.length}`);
  }

  // ── ARTIFACTS ────────────────────────────────────────────────────────────────
  const artifacts = [
    { name: "Меч Рассвета",       description: "+10% XP за выполненные квесты",     effect: "xp_boost",       value: 0.1,  price: 300, rarity: "rare",      icon: "🗡️"  },
    { name: "Щит Стойкости",      description: "+5 золота за каждый выполненный квест", effect: "gold_per_quest", value: 5,    price: 250, rarity: "rare",      icon: "🛡️"  },
    { name: "Кольцо Мудрости",    description: "+15% XP за квесты Знаний",          effect: "xp_know",        value: 0.15, price: 200, rarity: "uncommon",  icon: "💍"  },
    { name: "Амулет Силы",        description: "+15% XP за квесты Фитнеса",         effect: "xp_fit",         value: 0.15, price: 200, rarity: "uncommon",  icon: "📿"  },
    { name: "Рубин Дисциплины",   description: "+15% XP за квесты Дисциплины",      effect: "xp_disc",        value: 0.15, price: 200, rarity: "uncommon",  icon: "💎"  },
    { name: "Изумруд Роста",      description: "+15% XP за квесты Саморазвития",    effect: "xp_self",        value: 0.15, price: 200, rarity: "uncommon",  icon: "💚"  },
    { name: "Корона Легенды",     description: "+20% XP ко всем квестам",           effect: "xp_all",         value: 0.2,  price: 800, rarity: "legendary", icon: "👑"  },
    { name: "Пояс Мастера",       description: "+25 золота за каждый квест",         effect: "gold_all",       value: 25,   price: 600, rarity: "epic",      icon: "🟡"  },
  ];
  const existingArtifact = await prisma.artifact.findFirst();
  if (!existingArtifact) {
    for (const a of artifacts) {
      await prisma.artifact.create({ data: a });
    }
    console.log(`Artifacts created: ${artifacts.length}`);
  }

  // ── SHOP ITEMS — boost/cosmetic/xp cards/craft ────────────────────────────
  const newShopItems = [
    // Boosts
    { title: "Буст XP 24ч",           description: "x1.5 опыта на 24 часа",              category: "boost",     price: 100, effect: "xp_boost_24h"         },
    { title: "Буст Золота 24ч",        description: "x1.5 золота на 24 часа",             category: "boost",     price: 100, effect: "gold_boost_24h"       },
    { title: "Заморозка стрика",       description: "Защищает серию при пропуске",        category: "boost",     price: 75,  effect: "streak_freeze"        },
    { title: "Постоянный буст XP",     description: "x1.25 опыта навсегда",              category: "boost",     price: 500, effect: "xp_boost_permanent"   },
    { title: "Постоянный буст Золота", description: "x1.25 золота навсегда",             category: "boost",     price: 500, effect: "gold_boost_permanent"  },
    // Cosmetics
    { title: "Свиток прошлого",        description: "Позволяет сменить никнейм",          category: "cosmetic",  price: 150, effect: "name_change_scroll"   },
    { title: "Рамка Бронза",           description: "Бронзовая рамка для аватара",        category: "cosmetic",  price: 100, effect: "frame_bronze"         },
    { title: "Рамка Серебро",          description: "Серебряная рамка для аватара",       category: "cosmetic",  price: 200, effect: "frame_silver"         },
    { title: "Рамка Золото",           description: "Золотая рамка для аватара",          category: "cosmetic",  price: 400, effect: "frame_gold"           },
    { title: "Рамка Легенда",          description: "Легендарная анимированная рамка",    category: "cosmetic",  price: 1000, effect: "frame_legendary"     },
    { title: "Эффект: Свечение",       description: "Никнейм светится магией",            category: "cosmetic",  price: 150, effect: "nick_glow"            },
    { title: "Эффект: Радуга",         description: "Никнейм переливается радугой",       category: "cosmetic",  price: 300, effect: "nick_rainbow"         },
    { title: "Эффект: Огонь",          description: "Никнейм горит синим пламенем",       category: "cosmetic",  price: 500, effect: "nick_fire"            },
    // XP Cards
    { title: "Карта XP: Малая",        description: "+100 опыта мгновенно",               category: "xp_card",   price: 50,  effect: "xp_card_small"       },
    { title: "Карта XP: Средняя",      description: "+300 опыта мгновенно",               category: "xp_card",   price: 120, effect: "xp_card_medium"      },
    { title: "Карта XP: Большая",      description: "+750 опыта мгновенно",               category: "xp_card",   price: 250, effect: "xp_card_large"       },
    // Craft ingredients
    { title: "Кристалл Маны",          description: "Ингредиент для крафта",              category: "craft",     price: 30,  effect: "mana_crystal"        },
    { title: "Огненный порошок",       description: "Ингредиент для крафта",              category: "craft",     price: 40,  effect: "fire_dust"            },
    { title: "Звёздная пыль",          description: "Ингредиент для крафта",              category: "craft",     price: 60,  effect: "star_dust"            },
  ];

  for (const item of newShopItems) {
    const existing = await prisma.shopItem.findFirst({ where: { effect: item.effect } });
    if (!existing) {
      await prisma.shopItem.create({ data: item });
    }
  }
  console.log("Shop items upserted");

  // ── CRAFT RECIPES ────────────────────────────────────────────────────────────
  const recipes = [
    {
      name: "Зелье Мудрости",
      ingredients: JSON.stringify([{ effect: "mana_crystal", quantity: 2 }, { effect: "star_dust", quantity: 1 }]),
      resultEffect: "xp_bonus",
      resultName: "Зелье Мудрости (+500 XP)",
    },
    {
      name: "Элексир Силы",
      ingredients: JSON.stringify([{ effect: "fire_dust", quantity: 2 }, { effect: "mana_crystal", quantity: 1 }]),
      resultEffect: "xp_boost_24h",
      resultName: "Элексир Силы (Буст XP 24ч)",
    },
    {
      name: "Эссенция Звёзд",
      ingredients: JSON.stringify([{ effect: "star_dust", quantity: 3 }, { effect: "fire_dust", quantity: 2 }]),
      resultEffect: "xp_boost_24h",
      resultName: "Эссенция Звёзд (Мощный буст XP)",
    },
  ];
  const existingRecipe = await prisma.craftRecipe.findFirst();
  if (!existingRecipe) {
    for (const r of recipes) {
      await prisma.craftRecipe.create({ data: r });
    }
    console.log(`Craft recipes created: ${recipes.length}`);
  }

  // ── WEEKLY SHOP ITEM ─────────────────────────────────────────────────────────
  const existingWeekly = await prisma.weeklyShopItem.findFirst();
  if (!existingWeekly) {
    const now = new Date("2026-06-20");
    const end = new Date("2026-06-27");
    await prisma.weeklyShopItem.create({
      data: {
        itemName: "Жетон Героя",
        description: "Временный эксклюзивный предмет. Доступен только эту неделю!",
        effect: "xp_boost_24h",
        price: 80,
        availableFrom: now,
        availableTo: end,
        icon: "🎖️",
        rarity: "epic",
      },
    });
    console.log("Weekly shop item created");
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
