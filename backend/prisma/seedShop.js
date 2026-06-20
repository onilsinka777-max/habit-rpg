const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const items = [
  // ── БУСТЫ ────────────────────────────────────────────────────────────────────
  { title:"Буст XP 24ч",            description:"×1.5 опыта на 24 часа",           category:"boost",    price:200,  effect:"xp_boost_24h"         },
  { title:"Буст Золота 24ч",        description:"×1.5 золота на 24 часа",           category:"boost",    price:200,  effect:"gold_boost_24h"       },
  { title:"Заморозка стрика",        description:"Защищает серию при пропуске 1 дня",category:"boost",    price:200,  effect:"streak_freeze"        },
  { title:"Постоянный буст XP",      description:"×1.25 опыта навсегда",            category:"boost",    price:800,  effect:"xp_boost_permanent"   },
  { title:"Постоянный буст Золота",  description:"×1.25 золота навсегда",           category:"boost",    price:800,  effect:"gold_boost_permanent"  },

  // ── КОСМЕТИКА ─────────────────────────────────────────────────────────────────
  { title:"Свиток прошлого",         description:"Смени никнейм навсегда",          category:"cosmetic", price:750,  effect:"name_change_scroll"   },
  { title:"Рамка Бронза",            description:"Бронзовая рамка для аватара",     category:"cosmetic", price:500,  effect:"frame_bronze"         },
  { title:"Рамка Серебро",           description:"Серебряная рамка для аватара",    category:"cosmetic", price:1000, effect:"frame_silver"         },
  { title:"Рамка Золото",            description:"Золотая рамка для аватара",       category:"cosmetic", price:2000, effect:"frame_gold"           },
  { title:"Рамка Легенда",           description:"Легендарная анимированная рамка", category:"cosmetic", price:5000, effect:"frame_legendary"      },
  { title:"Эффект: Свечение",        description:"Никнейм светится магией",         category:"cosmetic", price:750,  effect:"nick_glow"            },
  { title:"Эффект: Радуга",          description:"Никнейм переливается радугой",    category:"cosmetic", price:1500, effect:"nick_rainbow"         },
  { title:"Эффект: Огонь",           description:"Никнейм горит синим пламенем",   category:"cosmetic", price:2500, effect:"nick_fire"            },
  { title:"Тема «Лес»",              description:"Зелёная тема интерфейса",         category:"cosmetic", price:1000, effect:"theme_forest"         },
  { title:"Тема «Космос»",           description:"Тёмно-синяя космическая тема",   category:"cosmetic", price:1000, effect:"theme_cosmic"         },

  // ── КАРТЫ XP ──────────────────────────────────────────────────────────────────
  { title:"Карта XP: Малая",         description:"+100 опыта мгновенно",            category:"xp_card",  price:25,   effect:"xp_card_small"        },
  { title:"Карта XP: Средняя",       description:"+300 опыта мгновенно",            category:"xp_card",  price:60,   effect:"xp_card_medium"       },
  { title:"Карта XP: Большая",       description:"+750 опыта мгновенно",            category:"xp_card",  price:125,  effect:"xp_card_large"        },

  // ── КОНТЕНТ PDF ───────────────────────────────────────────────────────────────
  { title:"Чеклист питания",                description:"PDF: нутрициология и питание",              category:"content", price:25000, effect:"pdf_nutrition",      contentUrl:"/pdfs/01_питание.pdf"              },
  { title:"Чеклист тренировок: набор массы", description:"PDF: программа для набора мышечной массы", category:"content", price:25000, effect:"pdf_workout_gain",   contentUrl:"/pdfs/02_тренировки_набор.pdf"     },
  { title:"Чеклист тренировок: сушка",       description:"PDF: программа для сжигания жира",         category:"content", price:25000, effect:"pdf_workout_cut",    contentUrl:"/pdfs/02_тренировки_сушка.pdf"     },
  { title:"Утренний ритуал",                 description:"PDF: гайд по утренним практикам",          category:"content", price:20000, effect:"pdf_morning",        contentUrl:"/pdfs/04_утренний_ритуал.pdf"      },
  { title:"Топ подкасты",                    description:"PDF: лучшие подкасты о саморазвитии",      category:"content", price:15000, effect:"pdf_podcasts",       contentUrl:"/pdfs/03_подкасты.pdf"             },
  { title:"Топ книги",                       description:"PDF: список лучших книг по развитию",      category:"content", price:15000, effect:"pdf_books",          contentUrl:"/pdfs/05_книги.pdf"                },
];

async function main() {
  // Upsert by effect (unique) or title for items without effect
  for (const item of items) {
    if (item.effect) {
      const existing = await prisma.shopItem.findFirst({ where: { effect: item.effect } });
      if (existing) {
        await prisma.shopItem.update({ where: { id: existing.id }, data: item });
      } else {
        await prisma.shopItem.create({ data: item });
      }
    } else {
      const existing = await prisma.shopItem.findFirst({ where: { title: item.title } });
      if (existing) {
        await prisma.shopItem.update({ where: { id: existing.id }, data: item });
      } else {
        await prisma.shopItem.create({ data: item });
      }
    }
  }

  // Remove duplicate name_change_scroll (keep only one)
  const scrolls = await prisma.shopItem.findMany({ where: { effect: "name_change_scroll" } });
  for (let i = 1; i < scrolls.length; i++) {
    await prisma.purchase.deleteMany({ where: { itemId: scrolls[i].id } });
    await prisma.shopItem.delete({ where: { id: scrolls[i].id } });
  }

  // Remove old content items that are now replaced by PDFs
  const oldEffects = ["pdf_old"];
  // Remove old shop items not in our new list
  const newEffects = items.filter(i => i.effect).map(i => i.effect);
  const oldItems = await prisma.shopItem.findMany({ where: { category: "content", effect: null } });
  for (const old of oldItems) {
    const hasPurchase = await prisma.purchase.findFirst({ where: { itemId: old.id } });
    if (!hasPurchase) await prisma.shopItem.delete({ where: { id: old.id } });
  }
  // Remove old crafting materials (mana_crystal, fire_dust, star_dust)
  const craftMats = ["mana_crystal","fire_dust","star_dust"];
  for (const eff of craftMats) {
    const it = await prisma.shopItem.findFirst({ where: { effect: eff } });
    if (it) {
      const hasPurchase = await prisma.purchase.findFirst({ where: { itemId: it.id } });
      if (!hasPurchase) await prisma.shopItem.delete({ where: { id: it.id } });
    }
  }

  const total = await prisma.shopItem.count();
  console.log(`✓ Магазин обновлён. Товаров в базе: ${total}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
