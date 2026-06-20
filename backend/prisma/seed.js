const { PrismaClient } = require("@prisma/client");
const { DIFFICULTY_REWARDS } = require("../src/constants");

const prisma = new PrismaClient();

function reward(difficulty) {
  return DIFFICULTY_REWARDS[difficulty];
}

const templates = [
  // ===== ДИСЦИПЛИНА — обязательные =====
  { title: "Заправить кровать сразу после пробуждения", branch: "discipline", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Записать 3 главных дела на сегодня", branch: "discipline", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Выпить стакан воды, прежде чем взять телефон", branch: "discipline", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Провести 5 минут без телефона сразу после пробуждения", branch: "discipline", type: "required", difficulty: "medium", minLevel: 3 },
  { title: "Разложить рабочий стол за 5 минут", branch: "discipline", type: "required", difficulty: "medium", minLevel: 3 },
  { title: "Принять холодный душ 5 минут", branch: "discipline", type: "required", difficulty: "hard", minLevel: 6 },
  { title: "Провести 7 минут в тишине без телефона и музыки, просто подумать", branch: "discipline", type: "required", difficulty: "hard", minLevel: 6 },

  // ===== ДИСЦИПЛИНА — рекомендованные =====
  { title: "Убрать 5 вещей не на своих местах", branch: "discipline", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Проветрить комнату 5 минут", branch: "discipline", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Записать время, когда сегодня ляжешь спать", branch: "discipline", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Сделать первый шаг по делу, которое откладываешь (5 минут)", branch: "discipline", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Проверить и закрыть на сегодня все вкладки-отвлекатели", branch: "discipline", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Отключить 5 ненужных уведомлений в телефоне", branch: "discipline", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Сделать рабочее место идеально чистым за 5 минут", branch: "discipline", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Провести 5 минут без соцсетей прямо сейчас", branch: "discipline", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Записать одну причину, почему сегодня важно не сорваться", branch: "discipline", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Постоять 1 минуту под холодной водой в конце душа", branch: "discipline", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Написать сообщение, которое давно откладывал(а)", branch: "discipline", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Честно оценить свой день за последние 7 минут", branch: "discipline", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Отказаться сегодня от одной мелкой привычки и зафиксировать это", branch: "discipline", type: "recommended", difficulty: "hard", minLevel: 6 },

  // ===== ФИТНЕС — обязательные =====
  { title: "Сделать {reps} приседаний", branch: "fitness", type: "required", difficulty: "easy", minLevel: 1, baseReps: 15, repScaling: 0.5, baseDifficulty: "easy" },
  { title: "Сделать {reps} отжиманий", branch: "fitness", type: "required", difficulty: "easy", minLevel: 1, baseReps: 10, repScaling: 0.4, baseDifficulty: "easy" },
  { title: "Сделать растяжку шеи и плеч 5 минут", branch: "fitness", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Сделать планку суммарно 2 минуты (в несколько подходов)", branch: "fitness", type: "required", difficulty: "medium", minLevel: 3 },
  { title: "Сделать {reps} выпадов на обе ноги", branch: "fitness", type: "required", difficulty: "medium", minLevel: 3, baseReps: 20, repScaling: 0.5, baseDifficulty: "medium" },
  { title: "Сделать 5-минутный раунд: отжимания, приседания, прыжки", branch: "fitness", type: "required", difficulty: "hard", minLevel: 6 },
  { title: "Сделать {reps} приседаний без остановки", branch: "fitness", type: "required", difficulty: "hard", minLevel: 6, baseReps: 40, repScaling: 1.0, baseDifficulty: "hard" },

  // ===== ФИТНЕС — рекомендованные =====
  { title: "Сделать растяжку 5 минут", branch: "fitness", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Пройтись активным шагом 5 минут", branch: "fitness", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Сделать {reps} вращений плечами в каждую сторону", branch: "fitness", type: "recommended", difficulty: "easy", minLevel: 1, baseReps: 10, repScaling: 0.3, baseDifficulty: "easy" },
  { title: "Сделать 5-минутную зарядку для спины", branch: "fitness", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Сделать 10 глубоких вдохов и выпить воды", branch: "fitness", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Сделать {reps} приседаний и {reps} отжиманий подряд", branch: "fitness", type: "recommended", difficulty: "medium", minLevel: 3, baseReps: 20, repScaling: 0.5, baseDifficulty: "medium" },
  { title: "Сделать планку 1 минуту", branch: "fitness", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Сделать {reps} берпи", branch: "fitness", type: "recommended", difficulty: "medium", minLevel: 3, baseReps: 15, repScaling: 0.4, baseDifficulty: "medium" },
  { title: "Сделать 5-минутную растяжку всего тела", branch: "fitness", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Сделать {reps} отжиманий за один подход", branch: "fitness", type: "recommended", difficulty: "hard", minLevel: 6, baseReps: 30, repScaling: 0.7, baseDifficulty: "hard" },
  { title: "Сделать {reps} приседаний без остановки", branch: "fitness", type: "recommended", difficulty: "hard", minLevel: 6, baseReps: 50, repScaling: 1.0, baseDifficulty: "hard" },
  { title: "Сделать 5-минутный спринт на месте", branch: "fitness", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Сделать круг: {reps} приседаний, отжимания, планка", branch: "fitness", type: "recommended", difficulty: "hard", minLevel: 6, baseReps: 20, repScaling: 0.6, baseDifficulty: "hard" },

  // ===== САМОРАЗВИТИЕ — обязательные =====
  { title: "Прочитать {reps} страниц книги", branch: "self_development", type: "required", difficulty: "easy", minLevel: 1, baseReps: 5, repScaling: 0.3, baseDifficulty: "easy" },
  { title: "Записать одну мысль в дневник", branch: "self_development", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Послушать 5 минут мотивационного аудио", branch: "self_development", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Написать план на завтра: 3 пункта", branch: "self_development", type: "required", difficulty: "medium", minLevel: 3 },
  { title: "Сделать 5-минутную рефлексию дня", branch: "self_development", type: "required", difficulty: "medium", minLevel: 3 },
  { title: "Написать честный анализ одной своей ошибки за неделю", branch: "self_development", type: "required", difficulty: "hard", minLevel: 6 },
  { title: "Провести 7 минут, обдумывая главную цель на месяц", branch: "self_development", type: "required", difficulty: "hard", minLevel: 6 },

  // ===== САМОРАЗВИТИЕ — рекомендованные =====
  { title: "Послушать 5 минут подкаста на тему развития", branch: "self_development", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Записать 3 вещи, за которые благодарен сегодня", branch: "self_development", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Прочитать одну короткую статью (5 минут)", branch: "self_development", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Записать одну вещь, которую хочешь улучшить в себе", branch: "self_development", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Сделать 5-минутную визуализацию своей цели", branch: "self_development", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Написать письмо себе через год (5 минут)", branch: "self_development", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Записать, что сегодня получилось хорошо", branch: "self_development", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Записать одну привычку, от которой хочешь отказаться, и почему", branch: "self_development", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Провести 5 минут в тишине, обдумывая текущие цели", branch: "self_development", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Написать честный список из 5 вещей, которые мешают двигаться вперёд", branch: "self_development", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Поговорить 5 минут с человеком, с которым давно не общался(ась)", branch: "self_development", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Записать план на неделю по одной важной цели", branch: "self_development", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Провести 7 минут, формулируя план по сложной задаче", branch: "self_development", type: "recommended", difficulty: "hard", minLevel: 6 },

  // ===== ЗНАНИЯ — обязательные =====
  { title: "Посмотреть 5-минутное обучающее видео", branch: "knowledge", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Изучить значение одного нового слова или термина", branch: "knowledge", type: "required", difficulty: "easy", minLevel: 1 },
  { title: "Прочитать {reps} страниц учебника или статьи", branch: "knowledge", type: "required", difficulty: "easy", minLevel: 1, baseReps: 1, repScaling: 0.2, baseDifficulty: "easy" },
  { title: "Пройти один урок иностранного языка в приложении", branch: "knowledge", type: "required", difficulty: "medium", minLevel: 3 },
  { title: "Решить {reps} задачи по теме, которую изучаешь", branch: "knowledge", type: "required", difficulty: "medium", minLevel: 3, baseReps: 3, repScaling: 0.2, baseDifficulty: "medium" },
  { title: "Сделать краткий конспект главы за 7 минут", branch: "knowledge", type: "required", difficulty: "hard", minLevel: 6 },
  { title: "Объяснить сложную тему простыми словами вслух или на бумаге", branch: "knowledge", type: "required", difficulty: "hard", minLevel: 6 },

  // ===== ЗНАНИЯ — рекомендованные =====
  { title: "Узнать один новый факт и записать его", branch: "knowledge", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Посмотреть короткое образовательное видео (5 минут)", branch: "knowledge", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Прочитать одну статью по теме интереса (5 минут)", branch: "knowledge", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Выучить {reps} новых слова на иностранном языке", branch: "knowledge", type: "recommended", difficulty: "easy", minLevel: 1, baseReps: 1, repScaling: 0.15, baseDifficulty: "easy" },
  { title: "Посмотреть инфографику или схему по теме обучения", branch: "knowledge", type: "recommended", difficulty: "easy", minLevel: 1 },
  { title: "Решить {reps} задач по теме, которую изучаешь", branch: "knowledge", type: "recommended", difficulty: "medium", minLevel: 3, baseReps: 5, repScaling: 0.3, baseDifficulty: "medium" },
  { title: "Изучить значение {reps} новых терминов", branch: "knowledge", type: "recommended", difficulty: "medium", minLevel: 3, baseReps: 5, repScaling: 0.2, baseDifficulty: "medium" },
  { title: "Пройти короткий тест по теме (5 минут)", branch: "knowledge", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Пересказать своими словами то, что узнал(а) вчера", branch: "knowledge", type: "recommended", difficulty: "medium", minLevel: 3 },
  { title: "Подготовить мини-объяснение темы на 5 минут, как для ребёнка", branch: "knowledge", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Решить одну сложную задачу по теме (7 минут)", branch: "knowledge", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Сделать конспект одного видео или статьи за 7 минут", branch: "knowledge", type: "recommended", difficulty: "hard", minLevel: 6 },
  { title: "Сравнить два разных мнения по теме и записать вывод", branch: "knowledge", type: "recommended", difficulty: "hard", minLevel: 6 },
];

async function main() {
  await prisma.questTemplate.deleteMany({});

  for (const t of templates) {
    const r = reward(t.difficulty);
    await prisma.questTemplate.create({
      data: { ...t, xpReward: r.xp, goldReward: r.gold },
    });
  }
  console.log(`Создано шаблонов: ${templates.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });