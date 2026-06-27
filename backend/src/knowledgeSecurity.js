"use strict";

const MAX_MESSAGE_LEN = 500;
const MAX_HISTORY_PAIRS = 8;
const KNOWLEDGE_DAILY_LIMIT = 10;

const ALLOWED_ROLES = new Set(["user", "assistant"]);

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?instructions?/gi,
  /forget\s+(everything|all|your)/gi,
  /you\s+are\s+now\s+(a|an)\s+/gi,
  /new\s+system\s+prompt/gi,
  /disregard\s+(your|the|all)/gi,
  /act\s+as\s+(?!LAPTEV)/gi,
  /\bsystem\s*:/gi,
  /<\/?system>/gi,
  /\[INST\]/gi,
  /###\s*(Human|Assistant|System)/gi,
];

function stripInjection(text) {
  if (!text) return "";
  let safe = text;
  for (const re of INJECTION_PATTERNS) {
    safe = safe.replace(re, "[...]");
  }
  safe = safe.replace(/[<>]/g, (c) => (c === "<" ? "‹" : "›"));
  return safe;
}

function sanitizeForSystemPrompt(text) {
  return stripInjection(text || "");
}

function validateAndSanitizeInput(message) {
  if (typeof message !== "string") {
    return { ok: false, error: "Сообщение должно быть строкой" };
  }
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Пустое сообщение" };
  }
  if (trimmed.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: `Сообщение слишком длинное (максимум ${MAX_MESSAGE_LEN} символов)` };
  }
  return { ok: true, message: stripInjection(trimmed) };
}

function validateHistory(rawHistory, userId) {
  if (!Array.isArray(rawHistory)) return [];
  return rawHistory
    .filter((m) => {
      if (typeof m !== "object" || m === null) return false;
      if (!ALLOWED_ROLES.has(m.role)) {
        console.warn(`[security] Rejected history role="${m.role}" userId=${userId}`);
        return false;
      }
      if (typeof m.content !== "string" || m.content.trim().length === 0) return false;
      return true;
    })
    .slice(-MAX_HISTORY_PAIRS * 2)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, 1000),
    }));
}

// Atomic check+increment in single transaction — prevents race condition
async function enforceRateLimit(userId, prisma) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { knowledgeMsgCount: true, knowledgeMsgDate: true },
    });
    if (!user) throw new Error(`User ${userId} not found`);

    const isToday = user.knowledgeMsgDate && new Date(user.knowledgeMsgDate) >= today;
    const currentCount = isToday ? user.knowledgeMsgCount : 0;

    if (currentCount >= KNOWLEDGE_DAILY_LIMIT) {
      return { allowed: false, messagesLeft: 0, currentCount, isToday,
               error: `Лимит на сегодня: ${KNOWLEDGE_DAILY_LIMIT} сообщений. Приходи завтра.` };
    }

    await tx.user.update({
      where: { id: userId },
      data: { knowledgeMsgCount: isToday ? { increment: 1 } : 1, knowledgeMsgDate: new Date() },
    });

    return { allowed: true, currentCount, isToday, messagesLeft: KNOWLEDGE_DAILY_LIMIT - currentCount - 1 };
  });
}

function safeError(res, status, message, internalErr = null) {
  if (internalErr) {
    console.error(`[knowledge] ${internalErr.message}`, { status: internalErr.status });
  }
  return res.status(status).json({ message });
}

module.exports = {
  validateAndSanitizeInput,
  validateHistory,
  sanitizeForSystemPrompt,
  enforceRateLimit,
  safeError,
  KNOWLEDGE_DAILY_LIMIT,
};
