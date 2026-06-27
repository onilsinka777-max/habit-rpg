"use strict";
require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");
const prisma = require("./prisma");
const { sanitizeForSystemPrompt } = require("./knowledgeSecurity");

const anthropicClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const WORD_BUDGET = 2800;
const GOAL_DESC_MAX = 80;
const JOURNAL_EXCERPT_MAX = 200;

const BRANCH_RU = {
  discipline: "Дисциплина",
  fitness: "Фитнес",
  self_development: "Саморазвитие",
  knowledge: "Знания",
};

const QUERY_CATEGORIES = {
  goals:        /цел|план|хочу достич|задач|мечт/i,
  journal:      /журнал|запись|написал|дневник|рефлекс/i,
  progress:     /прогресс|успех|достиж|выполн|сколько/i,
  weakness:     /слаб|не получает|провал|проседа|трудн/i,
  tasks:        /квест|задани|выполни|сегодня|ветк/i,
  chains:       /цепоч|chain|историч|эпичес|легенд/i,
  skills:       /навык|умени|skill|способн/i,
  gratitude:    /благодар|хорош|цен|радост/i,
  streak:       /страйк|стрик|серия|подряд|дней/i,
};

function classifyQuery(query) {
  const matched = new Set();
  for (const [cat, re] of Object.entries(QUERY_CATEGORIES)) {
    if (re.test(query)) matched.add(cat);
  }
  if (matched.size === 0) { matched.add("progress"); matched.add("tasks"); }
  return matched;
}

function countWords(str) {
  return str ? str.trim().split(/\s+/).length : 0;
}

async function fetchGoals(userId) {
  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    take: 5,
    select: { title: true, description: true, targetDate: true, completed: true },
  });
  if (!goals.length) return null;
  const lines = goals.map(g =>
    `[${g.completed ? "✓" : "○"}] ${sanitizeForSystemPrompt(g.title)}` +
    (g.description ? ` — ${sanitizeForSystemPrompt(g.description.slice(0, GOAL_DESC_MAX))}` : "") +
    (g.targetDate ? ` (до ${new Date(g.targetDate).toLocaleDateString("ru-RU")})` : "")
  );
  const text = lines.join("\n");
  return { tag: "user_goals", text, words: countWords(text) };
}

async function fetchJournal(userId) {
  const entries = await prisma.journalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 4,
    select: { content: true, createdAt: true },
  });
  if (!entries.length) return null;
  const lines = entries.map(e =>
    `[${new Date(e.createdAt).toLocaleDateString("ru-RU")}] ${sanitizeForSystemPrompt(e.content.slice(0, JOURNAL_EXCERPT_MAX))}`
  );
  const text = lines.join("\n");
  return { tag: "journal_entries", text, words: countWords(text) };
}

async function fetchRecentTasks(userId) {
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const tasks = await prisma.task.findMany({
    where: { userId, completed: true, completedAt: { gte: weekAgo } },
    orderBy: { completedAt: "desc" },
    take: 10,
    select: { title: true, branch: true },
  });
  if (!tasks.length) return null;
  const byBranch = {};
  for (const t of tasks) {
    if (!byBranch[t.branch]) byBranch[t.branch] = [];
    byBranch[t.branch].push(sanitizeForSystemPrompt(t.title));
  }
  const lines = Object.entries(byBranch).map(
    ([b, ts]) => `${BRANCH_RU[b] || b}: ${ts.slice(0, 4).join(", ")}`
  );
  const text = `Выполнено за 7 дней (${tasks.length} всего):\n${lines.join("\n")}`;
  return { tag: "recent_tasks", text, words: countWords(text) };
}

async function fetchChainProgress(userId) {
  const progress = await prisma.questChainProgress.findMany({
    where: { userId },
    include: { chain: { select: { title: true, branch: true, totalSteps: true } } },
    take: 6,
  });
  if (!progress.length) return null;
  const lines = progress.map(p =>
    `«${sanitizeForSystemPrompt(p.chain.title)}» (${BRANCH_RU[p.chain.branch] || p.chain.branch}): ` +
    `шаг ${p.currentStep}/${p.chain.totalSteps}${p.completed ? " ✓" : ""}`
  );
  return { tag: "quest_chains", text: lines.join("\n"), words: countWords(lines.join("\n")) };
}

async function fetchSkills(userId) {
  const userSkills = await prisma.userSkill.findMany({
    where: { userId },
    include: { skill: { select: { name: true, branch: true, tier: true } } },
    take: 10,
  });
  if (!userSkills.length) return null;
  const text = userSkills
    .map(us => `[T${us.skill.tier}] ${sanitizeForSystemPrompt(us.skill.name)} (${BRANCH_RU[us.skill.branch] || us.skill.branch})`)
    .join(", ");
  return { tag: "unlocked_skills", text, words: countWords(text) };
}

async function fetchAchievements(userId) {
  const achievements = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { unlockedAt: "desc" },
    take: 8,
    select: { type: true },
  });
  if (!achievements.length) return null;
  const text = achievements.map(a => a.type).join(", ");
  return { tag: "achievements", text, words: countWords(text) };
}

async function fetchGratitude(userId) {
  const entries = await prisma.gratitude.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { text1: true, text2: true, text3: true, createdAt: true },
  });
  if (!entries.length) return null;
  const lines = entries.map(g =>
    `[${new Date(g.createdAt).toLocaleDateString("ru-RU")}] ` +
    [g.text1, g.text2, g.text3].map(sanitizeForSystemPrompt).join("; ")
  );
  return { tag: "gratitude", text: lines.join("\n"), words: countWords(lines.join("\n")) };
}

const PRIORITY_FETCHERS = {
  goals:        fetchGoals,
  journal:      fetchJournal,
  tasks:        fetchRecentTasks,
  progress:     fetchRecentTasks,
  chains:       fetchChainProgress,
  skills:       fetchSkills,
  achievements: fetchAchievements,
  gratitude:    fetchGratitude,
  streak:       fetchRecentTasks,
  weakness:     fetchRecentTasks,
};

const FETCH_ORDER = ["goals", "journal", "tasks", "progress", "chains", "skills", "achievements", "gratitude", "streak", "weakness"];

async function buildKnowledgeContext(userId, userQuery) {
  const categories = classifyQuery(userQuery);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { level: true, streak: true, xp: true, weeklyXp: true, masteryPath: true, hasEverFinishedMastery: true },
  });

  const seen = new Set();
  const fetchPlan = [];
  for (const cat of FETCH_ORDER) {
    const fn = PRIORITY_FETCHERS[cat];
    if ((categories.has(cat) || cat === "tasks") && !seen.has(fn)) {
      fetchPlan.push(fn);
      seen.add(fn);
    }
  }

  const results = await Promise.all(fetchPlan.map(fn => fn(userId).catch(() => null)));
  const validResults = results.filter(Boolean);

  let wordsUsed = 0;
  const xmlSections = [];
  for (const { tag, text, words } of validResults) {
    if (!text || words === 0) continue;
    if (wordsUsed + words > WORD_BUDGET) break;
    xmlSections.push(`<${tag}>\n${text}\n</${tag}>`);
    wordsUsed += words;
  }
  return { user, xmlSections };
}

function buildSystemPrompt(user, xmlSections) {
  const stats = [
    `Уровень: ${user.level}`,
    `Стрик: ${user.streak} дней`,
    `Недельный XP: ${user.weeklyXp}`,
    user.masteryPath ? `Путь: ${user.masteryPath}` : null,
  ].filter(Boolean).join(" | ");

  return `Ты — LAPTEV, создатель системы LevelUp и персональный коуч.
Говоришь лаконично, как старший брат. Максимум 5-6 предложений.
Обращайся на «ты». Всегда на русском языке.
Используй данные игрока для конкретных ответов — не придумывай факты.
Если данных нет — скажи об этом честно.

<player_stats>
${stats}
</player_stats>

<player_data>
${xmlSections.join("\n\n")}
</player_data>

Отвечай ТОЛЬКО на вопросы об игроке и его развитии.`;
}

async function getKnowledgeChatReply(userId, safeHistory, safeMessage) {
  if (!anthropicClient) throw new Error("ANTHROPIC_API_KEY not set");
  const context = await buildKnowledgeContext(userId, safeMessage);
  const systemPrompt = buildSystemPrompt(context.user, context.xmlSections);
  const response = await anthropicClient.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    system: systemPrompt,
    messages: [...safeHistory, { role: "user", content: safeMessage }],
  });
  const reply = response.content?.[0]?.text;
  if (!reply) throw new Error("Empty response from Claude");
  return reply;
}

// AI Search — structured output with reliable two-line format
const SEARCH_SYSTEM = `Ты — навигационный помощник приложения LevelUp.
Отвечай СТРОГО в формате (две строки, ничего лишнего):
ANSWER: <1-2 предложения на русском>
VIEW: <одно слово из списка: tasks|goals|journal|chains|skills|achievements|stats|marathons|mastery|npc|shop|gratitude>`;

const VALID_VIEWS = new Set([
  "tasks","goals","journal","chains","skills","achievements",
  "stats","marathons","mastery","npc","shop","gratitude",
]);

function parseStructuredOutput(raw) {
  const answerMatch = raw.match(/ANSWER:\s*(.+?)(?:\nVIEW:|$)/s);
  const viewMatch   = raw.match(/VIEW:\s*(\w+)/i);
  const ai_answer   = answerMatch ? answerMatch[1].trim() : raw.trim().split("\n")[0];
  const rawView     = viewMatch ? viewMatch[1].toLowerCase().trim() : null;
  return { ai_answer, suggested_view: rawView && VALID_VIEWS.has(rawView) ? rawView : null };
}

async function getAiSearchAnswer(userId, query) {
  if (!anthropicClient) return { ai_answer: null, suggested_view: null };
  try {
    const context = await buildKnowledgeContext(userId, query);
    const ctxText = context.xmlSections.slice(0, 3).join("\n\n");
    const stats = `Уровень: ${context.user.level}, Стрик: ${context.user.streak}`;
    const response = await anthropicClient.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 150,
      system: SEARCH_SYSTEM,
      messages: [{ role: "user", content: `<player_stats>${stats}</player_stats>\n${ctxText}\n\nВопрос: ${query.slice(0, 300)}` }],
    });
    const raw = response.content?.[0]?.text;
    if (!raw) return { ai_answer: null, suggested_view: null };
    return parseStructuredOutput(raw);
  } catch (e) {
    console.warn("[knowledge] AI search failed:", e.message);
    return { ai_answer: null, suggested_view: null };
  }
}

module.exports = { buildKnowledgeContext, getKnowledgeChatReply, getAiSearchAnswer };
