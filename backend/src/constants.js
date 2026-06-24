const BRANCHES = ["discipline","fitness","self_development","knowledge"];
const TASK_TYPES = ["required","recommended","custom","legendary"];
const DIFFICULTIES = ["easy","medium","hard"];

const BASE_XP   = 15;
const BASE_GOLD = 8;
const DIFFICULTY_REWARDS = {
  easy:      { xp: BASE_XP,       gold: BASE_GOLD,       xpReward: BASE_XP,       goldReward: BASE_GOLD,       label: 'Простой'     },
  medium:    { xp: BASE_XP * 2,   gold: BASE_GOLD * 2,   xpReward: BASE_XP * 2,   goldReward: BASE_GOLD * 2,   label: 'Средний'     },
  hard:      { xp: BASE_XP * 4,   gold: BASE_GOLD * 4,   xpReward: BASE_XP * 4,   goldReward: BASE_GOLD * 4,   label: 'Сложный'     },
  legendary: { xp: BASE_XP * 10,  gold: BASE_GOLD * 10,  xpReward: BASE_XP * 10,  goldReward: BASE_GOLD * 10,  label: 'Легендарный' },
  absolute:  { xp: BASE_XP * 15,  gold: BASE_GOLD * 15,  xpReward: BASE_XP * 15,  goldReward: BASE_GOLD * 15,  label: 'Абсолют'     },
};

const DAILY_REQUIRED_PER_BRANCH    = 2;
const DAILY_RECOMMENDED_PER_BRANCH = 6;
const MAX_CUSTOM_QUESTS_PER_DAY    = 8;
const REQUIRED_QUEST_PENALTY_GOLD  = 5;
const DAILY_LOGIN_BONUS_GOLD       = 25;
const DAILY_LOGIN_BONUS_XP         = 5;
const CLAN_UNLOCK_LEVEL            = 10;
const MASTERY_UNLOCK_LEVEL         = 25;
const LEGENDARY_REWARD_MULTIPLIER  = 3;

const LEVEL_MILESTONES = [
  {level:CLAN_UNLOCK_LEVEL,    title:"Воин общины",    icon:"⚔️", perk:"Открыт доступ к кланам"},
  {level:MASTERY_UNLOCK_LEVEL, title:"Идущий по пути", icon:"🗺️", perk:"Открыта ветка «Мастерство»"},
];

const MASTERY_PATHS = {
  warrior:{
    id:"warrior", label:"Воин", icon:"🗡️", color:"#f87171",
    statusLabel:"Воин духа",
    description:"Путь силы, дисциплины и физического преодоления.",
    bonusDescription:"+10% XP и золота за Фитнес и Дисциплину",
    primaryBranches:["fitness","discipline"],
    secondaryBranches:["knowledge","self_development"],
    totalNodes:25,
    finale:{title:"Последний рубеж Воина", description:"500 отжиманий и 30 000 шагов в один день."},
  },
  sage:{
    id:"sage", label:"Мудрец", icon:"⚗️", color:"#38bdf8",
    statusLabel:"Хранитель мудрости",
    description:"Путь знаний, понимания и внутреннего роста.",
    bonusDescription:"+10% XP и золота за Знания и Саморазвитие",
    primaryBranches:["knowledge","self_development"],
    secondaryBranches:["fitness","discipline"],
    totalNodes:25,
    finale:{title:"Великое чтение", description:"Прочитай книгу от 300 страниц от начала до конца, напиши полный конспект."},
  },
  leader:{
    id:"leader", label:"Лидер", icon:"👑", color:"#fb923c",
    statusLabel:"Истинный лидер",
    description:"Путь влияния, ответственности и вдохновения других.",
    bonusDescription:"+5% золота за любые квесты",
    primaryBranches:["discipline","self_development"],
    secondaryBranches:["fitness","knowledge"],
    totalNodes:25,
    finale:{title:"Испытание ответственности", description:"Организуй мероприятие минимум для 5 человек от идеи до конца."},
  },
  balance:{
    id:"balance", label:"Баланс", icon:"🌙", color:"#2dd4bf",
    statusLabel:"Хранитель равновесия",
    description:"Путь осознанности, гармонии и внутреннего покоя.",
    bonusDescription:"Штраф за пропущенный обязательный квест снижен вдвое",
    primaryBranches:["fitness","knowledge"],
    secondaryBranches:["discipline","self_development"],
    totalNodes:25,
    finale:{title:"Цифровой пост", description:"Откажись от смартфона вне рабочей необходимости на 7 дней подряд."},
  },
};

// ── MASTERY GRAPH: predecessors + difficulty ─────────────────────────────────

const MASTERY_GRAPH = {

  // WARRIOR — меч (25 + legendary)
  warrior:{
    predecessors:{
      w0:[],
      w1:['w0'], w2:['w0'],
      w3:['w1','w2'],
      w4:['w3'], w5:['w3'],
      w6:['w4'], w7:['w4','w5'], w8:['w5'],
      w9:['w6','w7'], w10:['w7','w8'],
      w11:['w9'], w12:['w10'],
      w13:['w11','w12'],
      w14:['w13'], w15:['w13'],
      w16:['w14','w15'],
      w17:['w16'], w18:['w16'],
      w19:['w17','w18'],
      w20:['w19'], w21:['w19'],
      w22:['w20','w21'],
      w23:['w22'], w24:['w22'],
      legendary:['w23','w24'],
    },
    nodes:{
      w0: {d:"easy",   label:"Первый шаг",         desc:"Выйди на тренировку, даже если нет настроения. Главное — начать."},
      w1: {d:"easy",   label:"Ранний подъём",       desc:"Вставай в 6:00 утра 3 дня подряд."},
      w2: {d:"easy",   label:"Сила привычки",       desc:"3 дня подряд хотя бы 15 минут физической активности."},
      w3: {d:"medium", label:"Испытание тела",      desc:"100 отжиманий за один день (можно в подходах)."},
      w4: {d:"medium", label:"Левая гарда",         desc:"Пробеги 5 км без остановки."},
      w5: {d:"medium", label:"Правая гарда",        desc:"200 приседаний за один день."},
      w6: {d:"hard",   label:"Крыло левое",         desc:"10 подтягиваний подряд без остановки."},
      w7: {d:"hard",   label:"Центр гарды",         desc:"Неделя без пропусков — каждый день любая тренировка."},
      w8: {d:"hard",   label:"Крыло правое",        desc:"Вставай в 5:30 утра 5 дней подряд."},
      w9: {d:"hard",   label:"Клинок I",            desc:"Тренировка 90 минут без перерыва более 2 минут."},
      w10:{d:"hard",   label:"Клинок II",           desc:"72 часа без сладкого и фастфуда."},
      w11:{d:"hard",   label:"Клинок III",          desc:"Пройди 20 000 шагов за один день."},
      w12:{d:"hard",   label:"Клинок IV",           desc:"Холодный душ каждое утро 5 дней подряд."},
      w13:{d:"hard",   label:"Середина клинка",     desc:"Выполни все обязательные квесты 5 дней подряд."},
      w14:{d:"hard",   label:"Лезвие лево",         desc:"200 отжиманий за один день."},
      w15:{d:"hard",   label:"Лезвие право",        desc:"30 минут медитации или осознанного дыхания."},
      w16:{d:"hard",   label:"Верхний клинок",      desc:"Идеальный день: тренировка + правильное питание + ранний сон."},
      w17:{d:"hard",   label:"Острие лево",         desc:"Откажись от главной вредной привычки на 2 недели."},
      w18:{d:"hard",   label:"Острие право",        desc:"Все обязательные квесты 7 дней подряд без единого пропуска."},
      w19:{d:"hard",   label:"Кончик клинка",       desc:"Самая тяжёлая тренировка за всё время прохождения пути."},
      w20:{d:"hard",   label:"Сталь закалена",      desc:"Не пропускай ни одного обязательного квеста 10 дней подряд."},
      w21:{d:"hard",   label:"Воля нерушима",       desc:"Откажись от соцсетей на 48 часов подряд."},
      w22:{d:"hard",   label:"Вершина меча",        desc:"Запиши 10 главных изменений, произошедших с тобой на этом пути."},
      w23:{d:"hard",   label:"Перед финалом I",     desc:"Проведи идеальную неделю по своему определению успеха."},
      w24:{d:"hard",   label:"Перед финалом II",    desc:"Пробеги 10 км без остановки."},
      legendary:{d:"legendary", label:"???", desc:"Финальное испытание Воина раскрывается здесь.", hidden:true},
    },
  },

  // SAGE — колба/зелье (25 + legendary)
  sage:{
    predecessors:{
      s0:[],
      // Нижняя часть колбы (широкое дно)
      s1:['s0'], s2:['s0'],
      s3:['s1'], s4:['s2'],
      s5:['s3'], s6:['s4'],
      s7:['s5'], s8:['s6'],
      // Внутренние узлы дна
      s9:['s1','s2'],
      s10:['s3','s9'], s11:['s4','s9'],
      s12:['s5','s10'], s13:['s6','s11'],
      // Горлышко колбы (сужение)
      s14:['s7','s12'], s15:['s8','s13'],
      s16:['s14','s15'],
      // Верхний шар колбы
      s17:['s16'], s18:['s16'],
      s19:['s17'], s20:['s18'],
      s21:['s19','s20'],
      s22:['s21'], s23:['s21'],
      s24:['s22','s23'],
      legendary:['s24'],
    },
    nodes:{
      s0: {d:"easy",   label:"Первая искра",        desc:"Прочитай 20 страниц новой книги сегодня."},
      s1: {d:"easy",   label:"Любопытство",         desc:"Изучи новую тему 30 минут, запиши 5 ключевых идей."},
      s2: {d:"easy",   label:"Наблюдение",          desc:"3 дня веди дневник открытий — записывай, что узнал нового."},
      s3: {d:"medium", label:"Погружение",          desc:"2 часа на изучение одной темы без единого отвлечения."},
      s4: {d:"medium", label:"Применение",          desc:"Примени новые знания сразу — сделай что-то, что не умел раньше."},
      s5: {d:"medium", label:"Карта разума",        desc:"Создай интеллект-карту по теме, которую изучаешь."},
      s6: {d:"medium", label:"Глубина знания",      desc:"5 часов изучения одной темы за один день."},
      s7: {d:"hard",   label:"Дно колбы левое",     desc:"Прочитай 100 страниц за 3 дня."},
      s8: {d:"hard",   label:"Дно колбы правое",    desc:"Освой новый навык на базовом уровне за 5 дней."},
      s9: {d:"medium", label:"Центр знаний",        desc:"Объясни сложную концепцию простыми словами другому человеку."},
      s10:{d:"hard",   label:"Левый реагент",       desc:"Напиши конспект: ключевые идеи и выводы по изученному."},
      s11:{d:"hard",   label:"Правый реагент",      desc:"Покажи результат освоенного навыка другому — получи обратную связь."},
      s12:{d:"hard",   label:"Левый бок колбы",     desc:"Создай что-то реальное с помощью изученного навыка."},
      s13:{d:"hard",   label:"Правый бок колбы",    desc:"Доведи навык до уровня, когда можешь учить другого."},
      s14:{d:"hard",   label:"Горлышко лево",       desc:"Свяжи 3 разные темы в одну общую идею — запиши её."},
      s15:{d:"hard",   label:"Горлышко право",      desc:"Напиши эссе на 500 слов о своём главном жизненном уроке."},
      s16:{d:"hard",   label:"Горлышко центр",      desc:"Создай личную систему обучения — как ты будешь учиться дальше."},
      s17:{d:"hard",   label:"Верхний шар лево",    desc:"Веди дневник 7 дней подряд — по 3 глубоких инсайта в день."},
      s18:{d:"hard",   label:"Верхний шар право",   desc:"Проведи 15-минутный рассказ на любую тему без подготовки."},
      s19:{d:"hard",   label:"Мудрость I",          desc:"Прочитай книгу от 150 страниц, напиши краткое резюме."},
      s20:{d:"hard",   label:"Мудрость II",         desc:"Сформулируй и запиши 5 принципов, по которым ты теперь живёшь."},
      s21:{d:"hard",   label:"Квинтэссенция",       desc:"Объясни незнакомому человеку 3 сложные темы за один вечер."},
      s22:{d:"hard",   label:"Вершина шара лево",   desc:"Определи и начни реализовывать свой следующий большой учебный проект."},
      s23:{d:"hard",   label:"Вершина шара право",  desc:"Напиши манифест: 10 вещей, которые ты узнал на этом пути."},
      s24:{d:"hard",   label:"Пробка колбы",        desc:"Поделись своими знаниями публично: статья, пост или выступление."},
      legendary:{d:"legendary", label:"???", desc:"Финальное испытание Мудреца раскрывается здесь.", hidden:true},
    },
  },

  // LEADER — корона (25 + legendary)
  leader:{
    predecessors:{
      l0:[],
      l1:['l0'], l2:['l0'], l3:['l0'],
      l4:['l1'], l5:['l1','l2'], l6:['l2','l3'], l7:['l3'],
      l8:['l4'], l9:['l8'], l10:['l9'], l11:['l10'],
      l12:['l7'], l13:['l12'], l14:['l13'], l15:['l14'],
      l16:['l5','l6'], l17:['l5','l6'],
      l18:['l16'], l19:['l17'],
      l20:['l18','l19','l11','l15'],
      l21:['l20'], l22:['l21'],
      l23:['l22'], l24:['l23'],
      legendary:['l24'],
    },
    nodes:{
      l0: {d:"easy",   label:"Первое слово",          desc:"Напиши вдохновляющее сообщение в чат клана."},
      l1: {d:"easy",   label:"Слева к цели",          desc:"Помоги одному человеку справиться с его задачей сегодня."},
      l2: {d:"easy",   label:"Прямо к цели",          desc:"3 дня подряд первым выполняй обязательные квесты."},
      l3: {d:"easy",   label:"Справа к цели",         desc:"Дай честную обратную связь кому-то, кто её просит."},
      l4: {d:"medium", label:"Левый зубец — база",    desc:"Возьми на себя ответственность за провал и скажи, что сделаешь иначе."},
      l5: {d:"medium", label:"Основание Л-Ц",         desc:"Организуй групповое дело от и до."},
      l6: {d:"medium", label:"Основание Ц-П",         desc:"Делегируй важную задачу и не вмешивайся в процесс."},
      l7: {d:"medium", label:"Правый зубец — база",   desc:"Публично объяви цель на неделю и отчитайся по итогу."},
      l8: {d:"hard",   label:"Левый зубец I",         desc:"Собери команду 3+ человек для совместного проекта."},
      l9: {d:"hard",   label:"Левый зубец II",        desc:"Доведи командный проект до конкретного результата."},
      l10:{d:"hard",   label:"Левый зубец III",       desc:"Дай каждому участнику команды индивидуальную обратную связь."},
      l11:{d:"hard",   label:"Левый пик",             desc:"Команда самостоятельно выполнила задачу без твоего участия."},
      l12:{d:"hard",   label:"Правый зубец I",        desc:"10 дней подряд первым выполняй все обязательные квесты."},
      l13:{d:"hard",   label:"Правый зубец II",       desc:"Вдохнови одного человека изменить вредную привычку."},
      l14:{d:"hard",   label:"Правый зубец III",      desc:"Создай правила или принципы для своего клана."},
      l15:{d:"hard",   label:"Правый пик",            desc:"Стань соруководителем или лидером клана."},
      l16:{d:"hard",   label:"Центр-левый",           desc:"Помоги 3 людям достичь их личных целей за 2 недели."},
      l17:{d:"hard",   label:"Центр-правый",          desc:"Проведи мотивирующую беседу для группы минимум 3 человека."},
      l18:{d:"hard",   label:"Центр Л",               desc:"Соедини все стороны пути: кого-то вдохнови, кому-то делегируй, кому-то помоги."},
      l19:{d:"hard",   label:"Центр П",               desc:"Создай долгосрочный план развития своего клана."},
      l20:{d:"hard",   label:"Слияние",               desc:"Организуй событие для всего клана."},
      l21:{d:"hard",   label:"Стержень",              desc:"Введи клановую традицию, которая останется после тебя."},
      l22:{d:"hard",   label:"Высота короны",         desc:"Помоги кому-то вне клана изменить жизнь к лучшему."},
      l23:{d:"hard",   label:"Вершина короны",        desc:"Запиши 10 уроков о лидерстве, вынесенных из этого пути."},
      l24:{d:"hard",   label:"Перед легендой",        desc:"Напиши письмо себе через год — каким лидером ты хочешь стать."},
      legendary:{d:"legendary", label:"???", desc:"Финальное испытание Лидера раскрывается здесь.", hidden:true},
    },
  },

  // BALANCE — весы (25 + legendary)
  balance:{
    predecessors:{
      b0:[],
      b1:['b0'], b2:['b0'],
      // Стойка вверх
      b3:['b1','b2'],
      // Коромысло влево и вправо
      b4:['b3'], b5:['b3'],
      b6:['b4'], b7:['b5'],
      b8:['b6'], b9:['b7'],
      // Левая цепь вниз
      b10:['b8'], b11:['b10'],
      // Левая чаша
      b12:['b11'], b13:['b11'],
      b14:['b12','b13'],
      // Правая цепь вниз
      b15:['b9'], b16:['b15'],
      // Правая чаша
      b17:['b16'], b18:['b16'],
      b19:['b17','b18'],
      // Подъём с обеих чаш вверх
      b20:['b14'], b21:['b19'],
      b22:['b20'], b23:['b21'],
      b24:['b22','b23'],
      legendary:['b24'],
    },
    nodes:{
      b0: {d:"easy",   label:"Первый вдох",         desc:"Проведи 10 минут в полной тишине без телефона."},
      b1: {d:"easy",   label:"Левое начало",        desc:"3 дня записывай 3 момента благодарности перед сном."},
      b2: {d:"easy",   label:"Правое начало",       desc:"3 дня подряд ложись спать до 23:00."},
      b3: {d:"medium", label:"Основание стойки",    desc:"Один день полностью без спешки — одно дело за раз."},
      b4: {d:"medium", label:"Коромысло лево",      desc:"48 часов без соцсетей подряд."},
      b5: {d:"medium", label:"Коромысло право",     desc:"5 дней подряд прогулка 30 минут без телефона."},
      b6: {d:"medium", label:"Левый рычаг",         desc:"Ляг спать до 22:00 пять дней подряд."},
      b7: {d:"medium", label:"Правый рычаг",        desc:"Медитируй 10 минут каждый день 7 дней подряд."},
      b8: {d:"hard",   label:"Левый крюк",          desc:"Полноценный день отдыха без чувства вины."},
      b9: {d:"hard",   label:"Правый крюк",         desc:"Напиши письмо себе: что принимаешь и отпускаешь."},
      b10:{d:"hard",   label:"Левая цепь I",        desc:"Час в абсолютной тишине — никаких экранов и звуков."},
      b11:{d:"hard",   label:"Левая цепь II",       desc:"Три дня подряд строгий режим сна и пробуждения."},
      b12:{d:"hard",   label:"Левая чаша I",        desc:"Проведи целый день осознанного питания — без лишнего."},
      b13:{d:"hard",   label:"Левая чаша II",       desc:"7 дней без сахара и фастфуда подряд."},
      b14:{d:"hard",   label:"Дно левой чаши",      desc:"Неделя: просыпайся без будильника — только естественный цикл."},
      b15:{d:"hard",   label:"Правая цепь I",       desc:"Час глубокой медитации без единого отвлечения."},
      b16:{d:"hard",   label:"Правая цепь II",      desc:"5 дней подряд: утренняя медитация перед любым экраном."},
      b17:{d:"hard",   label:"Правая чаша I",       desc:"Проживи день, не вынося суждений ни о себе, ни о других."},
      b18:{d:"hard",   label:"Правая чаша II",      desc:"Напиши свои 7 правил равновесия, которым будешь следовать."},
      b19:{d:"hard",   label:"Дно правой чаши",     desc:"Неделя: засыпай и просыпайся строго по расписанию."},
      b20:{d:"hard",   label:"Подъём лево",         desc:"Три дня: идеальный баланс — работа, движение, отдых, близкие."},
      b21:{d:"hard",   label:"Подъём право",        desc:"Письмо себе через год: каким человеком хочешь стать?"},
      b22:{d:"hard",   label:"Слияние лево",        desc:"Соблюдай все 7 своих правил равновесия 5 дней подряд."},
      b23:{d:"hard",   label:"Слияние право",       desc:"Опиши, как изменилось твоё ощущение себя за этот путь."},
      b24:{d:"hard",   label:"Вершина весов",       desc:"10 дней: идеальный режим — сон, еда, движение, тишина."},
      legendary:{d:"legendary", label:"???", desc:"Финальное испытание Баланса раскрывается здесь.", hidden:true},
    },
  },
};

const NODE_DIFFICULTY_REWARDS = {
  easy:      {xp:15,  gold:8  },
  medium:    {xp:25,  gold:12 },
  hard:      {xp:50,  gold:25 },
  legendary: {xp:200, gold:100},
};

function getAvailableNodes(pathId, completedSet) {
  const graph = MASTERY_GRAPH[pathId];
  if (!graph) return [];
  return Object.keys(graph.predecessors).filter(nodeId => {
    if (completedSet.has(nodeId)) return false;
    return graph.predecessors[nodeId].every(p => completedSet.has(p));
  });
}

const REPEATABLE_SHOP_EFFECTS = ["streak_freeze","xp_boost_24h","gold_boost_24h"];

function getXpToNextLevel(level) {
  const base = Math.floor(3000 + (level - 1) * 200 + Math.pow(level - 1, 2) * 15);
  if (level <= 20) return base;
  if (level <= 50) return base * Math.floor(1 + (level - 20) * 0.05);
  if (level <= 75) return base * Math.floor(3 + (level - 50) * 0.1);
  return base * Math.floor(6 + (level - 75) * 0.16);
}

function applyXpGain(currentXp, currentLevel, xpGain) {
  let xp = currentXp + xpGain;
  let level = currentLevel;
  while (xp >= getXpToNextLevel(level)) { xp -= getXpToNextLevel(level); level++; }
  return { xp, level };
}

function getMaxCustomQuestsPerBranch() { return MAX_CUSTOM_QUESTS_PER_DAY; }
function getRequiredPenaltyGold(masteryPath) {
  return masteryPath === "balance" ? Math.round(REQUIRED_QUEST_PENALTY_GOLD/2) : REQUIRED_QUEST_PENALTY_GOLD;
}
function getGoldMultiplier() { return 1; }

function getMasteryMultipliers(pathId, branch) {
  if (pathId === "warrior" && (branch === "fitness" || branch === "discipline")) return {xp:1.1, gold:1.1};
  if (pathId === "sage"    && (branch === "knowledge" || branch === "self_development")) return {xp:1.1, gold:1.1};
  if (pathId === "leader") return {xp:1, gold:1.05};
  return {xp:1, gold:1};
}

function getEffectiveMasteryPath(user, autoClass) { return user.masteryPath || autoClass || null; }

function weightedRandomDifficulty(level) {
  const w = level < 3 ? {easy:70,medium:30,hard:0} : level < 6 ? {easy:30,medium:50,hard:20} : level < 10 ? {easy:15,medium:45,hard:40} : {easy:5,medium:35,hard:60};
  const e = Object.entries(w).filter(([,v])=>v>0);
  const t = e.reduce((s,[,v])=>s+v,0);
  let r = Math.random()*t;
  for (const [d,v] of e) { if (r<v) return d; r-=v; }
  return e[0][0];
}

function startOfToday() { const d=new Date(); d.setHours(0,0,0,0); return d; }
function endOfToday()   { const d=new Date(); d.setHours(23,59,59,999); return d; }
function getAchievements(level) { return LEVEL_MILESTONES.map(m=>({...m,unlocked:level>=m.level})); }

module.exports = {
  BRANCHES, TASK_TYPES, DIFFICULTIES, DIFFICULTY_REWARDS,
  DAILY_REQUIRED_PER_BRANCH, DAILY_RECOMMENDED_PER_BRANCH, MAX_CUSTOM_QUESTS_PER_DAY,
  REQUIRED_QUEST_PENALTY_GOLD, DAILY_LOGIN_BONUS_GOLD, DAILY_LOGIN_BONUS_XP,
  CLAN_UNLOCK_LEVEL, MASTERY_UNLOCK_LEVEL, LEGENDARY_REWARD_MULTIPLIER,
  LEVEL_MILESTONES, MASTERY_PATHS, MASTERY_GRAPH, NODE_DIFFICULTY_REWARDS,
  REPEATABLE_SHOP_EFFECTS, getAvailableNodes,
  getXpToNextLevel, applyXpGain, getMaxCustomQuestsPerBranch, getRequiredPenaltyGold,
  getGoldMultiplier, getMasteryMultipliers, getEffectiveMasteryPath,
  weightedRandomDifficulty, startOfToday, endOfToday, getAchievements,
};