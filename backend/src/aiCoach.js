require("dotenv").config();
const Anthropic = require("@anthropic-ai/sdk");

const BRANCH_LABELS = { discipline:"Дисциплина", fitness:"Фитнес", self_development:"Саморазвитие", knowledge:"Знания" };

async function getCoachAdvice(userData) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return "API ключ не настроен. Добавьте ANTHROPIC_API_KEY в .env";

  const client = new Anthropic({ apiKey: key });

  const prompt = `Ты персональный коуч в RPG приложении LevelUp.
Данные игрока:
- Уровень: ${userData.level}
- Стрик: ${userData.streak} дней
- Класс: ${userData.autoClass || "не определён"}
- Выполнено квестов за неделю: ${userData.weeklyQuests || 0}
- Слабая ветка: ${BRANCH_LABELS[userData.weakestBranch] || "—"}
- Сильная ветка: ${BRANCH_LABELS[userData.strongestBranch] || "—"}
- Лига: ${userData.league || "Бронза"}

Дай короткий (3-4 предложения) персональный совет на русском языке.
Будь мотивирующим, конкретным, говори как наставник-воин.
Обращайся на "ты". Упомяни конкретные данные игрока.`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{ role: "user", content: prompt }],
  });

  return message.content[0].text;
}

module.exports = { getCoachAdvice };
