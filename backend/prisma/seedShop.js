const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const items = [
  // ── БУСТЫ ────────────────────────────────────────────────────────────────────
  { title:"Буст XP 24ч",            description:"×1.5 опыта на 24 часа",           category:"boost",    price:300,  effect:"xp_boost_24h"         },
  { title:"Буст Золота 24ч",        description:"×1.5 золота на 24 часа",           category:"boost",    price:300,  effect:"gold_boost_24h"       },
  { title:"Заморозка стрика",        description:"Защищает серию при пропуске 1 дня",category:"boost",    price:150,  effect:"streak_freeze"        },
  { title:"Постоянный буст XP",      description:"×1.25 опыта навсегда",            category:"boost",    price:2400, effect:"xp_boost_permanent"   },
  { title:"Постоянный буст Золота",  description:"×1.25 золота навсегда",           category:"boost",    price:2400, effect:"gold_boost_permanent"  },

  // ── КОСМЕТИКА ─────────────────────────────────────────────────────────────────
  { title:"Свиток прошлого",         description:"Смени никнейм навсегда",          category:"cosmetic", price:900,  effect:"name_change_scroll"   },
  { title:"Рамка Бронза",            description:"Бронзовая рамка для аватара",     category:"cosmetic", price:300,  effect:"frame_bronze"         },
  { title:"Рамка Серебро",           description:"Серебряная рамка для аватара",    category:"cosmetic", price:800,  effect:"frame_silver"         },
  { title:"Рамка Золото",            description:"Золотая рамка для аватара",       category:"cosmetic", price:1800, effect:"frame_gold"           },
  { title:"Рамка Легенда",           description:"Легендарная анимированная рамка", category:"cosmetic", price:5000, effect:"frame_legendary"      },
  { title:"Эффект: Свечение",        description:"Никнейм светится магией",         category:"cosmetic", price:400,  effect:"nick_glow"            },
  { title:"Эффект: Радуга",          description:"Никнейм переливается радугой",    category:"cosmetic", price:1000, effect:"nick_rainbow"         },
  { title:"Эффект: Огонь",           description:"Никнейм горит синим пламенем",   category:"cosmetic", price:1600, effect:"nick_fire"            },

  // ── КАРТЫ XP (одноразовые, применяются сразу) ─────────────────────────────────
  { title:"Карта опыта: Малая",      description:"+500 XP мгновенно",               category:"xp_card",  price:300,  effect:"xp_card_500"          },
  { title:"Карта опыта: Средняя",    description:"+3500 XP мгновенно",              category:"xp_card",  price:2000, effect:"xp_card_3500"         },
  { title:"Карта опыта: Великая",    description:"+10000 XP мгновенно",             category:"xp_card",  price:5500, effect:"xp_card_10000"        },

  // ── СЕЗОННЫЕ (Рассвет) ────────────────────────────────────────────────────────
  { title:"Рамка Рассвета",          description:"Золото-оранжевая рамка аватара — эксклюзив сезона", category:"seasonal", price:2000, effect:"frame_dawn" },
  { title:"Эффект Рассвета",         description:"Оранжевый glow ника — эксклюзив сезона",            category:"seasonal", price:1500, effect:"nick_dawn"  },

  // ── РЕЙДОВЫЕ ТОВАРЫ ──────────────────────────────────────────────────────────
  { title:"Свиток воскрешения",      description:"Восстанавливает стрик если пропустил 1 день",                category:"boost",    price:500,  effect:"streak_revival"       },
  { title:"Двойной XP",              description:"×2 опыта за следующий квест",                               category:"boost",    price:200,  effect:"xp_double_next"       },
  { title:"Карта подземелья",        description:"Открывает секретный рейд с удвоенной наградой",             category:"boost",    price:1000, effect:"dungeon_map"          },
  { title:"Рамка Рейдер",            description:"Эксклюзивная рамка для победителей рейдов",                 category:"cosmetic", price:800,  effect:"frame_raider"         },
  { title:"Титул: Истребитель боссов",description:"Носи этот титул с гордостью",                             category:"cosmetic", price:600,  effect:"title_boss_slayer"    },

  // ── РЕЙДОВОЕ СНАРЯЖЕНИЕ (расходники) ─────────────────────────────────────────
  { title:"Зелье силы",        description:"+50% урона боссу за следующее выполнение квеста в рейде", category:"raid", price:100, effect:"raid_damage_boost"    },
  { title:"Свиток защиты",     description:"Снимает всё золотое и XP наказание при поражении",        category:"raid", price:150, effect:"raid_no_penalty"       },
  { title:"Паёк героя",        description:"Мгновенно снимает усталость без траты золота",            category:"raid", price:80,  effect:"raid_fatigue_cure"     },
  { title:"Факел",             description:"Нейтрализует ловушку факела в подземелье",               category:"raid", price:60,  effect:"raid_trap_immunity"    },
  { title:"Амулет удачи",      description:"Снижает шанс иллюзорного подземелья с 20% до 5%",        category:"raid", price:200, effect:"raid_illusion_reduce"  },

  // ── КОНТЕНТ PDF ───────────────────────────────────────────────────────────────
  { title:"Чеклист питания",                description:"PDF: нутрициология и питание",              category:"content", price:10000, effect:"pdf_nutrition",    contentUrl:"/pdfs/01_питание.pdf"          },
  { title:"Чеклист тренировок (набор)",     description:"PDF: программа набора мышечной массы",      category:"content", price:10000, effect:"pdf_workout_gain", contentUrl:"/pdfs/02_тренировки_набор.pdf" },
  { title:"Чеклист тренировок (сушка)",     description:"PDF: программа сжигания жира",              category:"content", price:10000, effect:"pdf_workout_cut",  contentUrl:"/pdfs/02_тренировки_сушка.pdf" },
  { title:"Утренний ритуал",                description:"PDF: гайд по утренним практикам",           category:"content", price:10000, effect:"pdf_morning",      contentUrl:"/pdfs/04_утренний_ритуал.pdf"  },
  { title:"Топ подкасты",                   description:"PDF: лучшие подкасты о саморазвитии",       category:"content", price:10000, effect:"pdf_podcasts",     contentUrl:"/pdfs/03_подкасты.pdf"         },
  { title:"Топ книги",                      description:"PDF: список лучших книг по развитию",       category:"content", price:10000, effect:"pdf_books",        contentUrl:"/pdfs/05_книги.pdf"            },
];

// Remove effects (themes + old xp cards) from shop
const TO_DEACTIVATE_EFFECTS = [
  "theme_forest","theme_cosmic","theme_solo_leveling","theme_dark_fantasy",
  "xp_card_small","xp_card_medium","xp_card_large",
];

async function main() {
  // Deactivate old theme items and old xp cards
  for (const eff of TO_DEACTIVATE_EFFECTS) {
    await prisma.shopItem.updateMany({ where: { effect: eff }, data: { active: false } });
  }

  // Upsert new items by effect
  for (const item of items) {
    const existing = await prisma.shopItem.findFirst({ where: { effect: item.effect } });
    if (existing) {
      await prisma.shopItem.update({ where: { id: existing.id }, data: { ...item, active: true } });
    } else {
      await prisma.shopItem.create({ data: item });
    }
  }

  console.log("Shop seeded ✓");
}

main().catch(console.error).finally(() => prisma.$disconnect());
