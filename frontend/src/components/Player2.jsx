import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const INTRO_MSGS = [
  "Ты думаешь что система — это четыре ветки.\nДисциплина. Фитнес. Знания. Саморазвитие.\nЯ тоже так думал.",
  "До Легендарного пути.\nТам я сломался. Дважды.\nПотому что не знал о пятой ветке.",
  "Давай пройдём кое-что вместе.\n7 квестов. Тематика будет другой — сам заметишь.\nПосле — расскажу о пятой ветке.",
];

const FINAL_MSG = `Видишь разницу?
Эти квесты не про тело и не про знания.
Они про то что внутри.
Есть пятая ветка. Она всегда была в системе.
Просто её не показывают сразу.

Называется — ПОКОЙ.
Квесты про сосредоточенность и внутренний контроль.
Самые сложные в системе.
Она твоя.`;

function TypeWriter({ text, speed = 28, onDone }) {
  const [count, setCount] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (count >= text.length) { onDone?.(); return; }
    const id = setTimeout(() => setCount(c => c + 1), speed);
    return () => clearTimeout(id);
  }, [count, text.length, speed]);
  return (
    <span style={{ whiteSpace: "pre-line" }}>{text.slice(0, count)}</span>
  );
}

function P2Avatar() {
  return (
    <div style={{
      width: 80, height: 80, borderRadius: "50%",
      background: "#1a1a2e",
      border: "2px solid #4a4a6a",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 36, color: "#6a6a9a" }}>?</span>
    </div>
  );
}

export default function Player2({ token, showToast, onPeaceUnlocked }) {
  const [status,        setStatus]        = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [phase,         setPhase]         = useState("loading");
  const [introStep,     setIntroStep]     = useState(0);
  const [introDone,     setIntroDone]     = useState(false);
  const [starting,      setStarting]      = useState(false);
  const [completing,    setCompleting]    = useState(null);
  const [afterMsgs,     setAfterMsgs]     = useState({});
  const [quest7Msg,     setQuest7Msg]     = useState("");
  const [quest7Reply,   setQuest7Reply]   = useState(null);
  const [q7Sending,     setQ7Sending]     = useState(false);
  const [unlocking,     setUnlocking]     = useState(false);
  const [finalTypeDone, setFinalTypeDone] = useState(false);

  const authH = { Authorization: `Bearer ${token}` };

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/player2/status`, { headers: authH });
      setStatus(data);
      if (!data.unlocked) {
        setPhase("locked");
      } else if (data.questDay === 0) {
        setPhase("intro");
      } else if (data.completed || data.questDay > 7) {
        setPhase("final");
      } else {
        setPhase("quests");
      }
    } catch {
      setPhase("locked");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line
  useEffect(() => { load(); }, []);

  const handleIntroDone = () => {
    setIntroDone(true);
  };

  const advanceIntro = () => {
    if (introStep < INTRO_MSGS.length - 1) {
      setIntroDone(false);
      setIntroStep(s => s + 1);
    }
  };

  const startChain = async () => {
    setStarting(true);
    try {
      await axios.post(`${API}/player2/start`, {}, { headers: authH });
      setStatus(s => ({ ...s, questDay: 1 }));
      setPhase("quests");
    } catch {
      showToast("Ошибка запуска", "error");
    } finally {
      setStarting(false);
    }
  };

  const completeQuest = async (num) => {
    if (num === 7 && !quest7Reply) return;
    setCompleting(num);
    try {
      const { data } = await axios.post(`${API}/player2/quest/${num}/complete`, {}, { headers: authH });
      setStatus(s => ({ ...s, questDay: data.nextQuestDay, completed: data.allCompleted,
        completedQuests: [...(s.completedQuests||[]), { questNumber: num, completed: true, completedAt: new Date().toISOString() }] }));
      if (data.afterMsg) setAfterMsgs(m => ({ ...m, [num]: data.afterMsg }));
      showToast(`+${data.xpGained} XP · +${data.goldGained} 💰`, "success");
      if (data.allCompleted) {
        setFinalTypeDone(false);
        setPhase("final");
      }
    } catch (e) {
      showToast(e?.response?.data?.message || "Ошибка", "error");
    } finally {
      setCompleting(null);
    }
  };

  const sendQuest7 = async () => {
    if (!quest7Msg.trim()) return;
    setQ7Sending(true);
    try {
      const { data } = await axios.post(`${API}/player2/quest7-reply`, { message: quest7Msg }, { headers: authH });
      setQuest7Reply(data.reply);
    } catch {
      setQuest7Reply("Слова сказаны. Остальное — внутри.");
    } finally {
      setQ7Sending(false);
    }
  };

  const unlockPeace = async () => {
    setUnlocking(true);
    try {
      await axios.post(`${API}/player2/unlock-peace`, {}, { headers: authH });
      setStatus(s => ({ ...s, peaceUnlocked: true }));
      showToast("🌑 Ветка ПОКОЙ открыта!", "success");
      onPeaceUnlocked && onPeaceUnlocked();
    } catch (e) {
      showToast(e?.response?.data?.message || "Ошибка", "error");
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return (
    <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
      ...
    </div>
  );

  if (phase === "locked") return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 16, color: "#4a4a6a" }}>❓</div>
      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, lineHeight: 1.8 }}>
        Доступно с 45 уровня.
      </div>
    </div>
  );

  return (
    <div style={{
      background: "linear-gradient(135deg, #050508, #0d0a1a)",
      minHeight: "calc(100vh - 120px)",
      padding: "16px 0",
    }}>
      <style>{`
        @keyframes p2Pulse {
          0%,100%{box-shadow:0 0 8px rgba(74,74,106,0.3)}
          50%{box-shadow:0 0 20px rgba(74,74,106,0.7)}
        }
        @keyframes peacePulse {
          0%,100%{box-shadow:0 0 10px rgba(74,53,112,0.3)}
          50%{box-shadow:0 0 25px rgba(74,53,112,0.6),0 0 50px rgba(74,53,112,0.2)}
        }
        .p2-header{display:flex;align-items:center;gap:14px;padding:0 16px 20px;}
        .p2-bubble{
          background:rgba(26,26,46,0.9);
          border:1px solid #2a2a4a;
          border-radius:12px;
          padding:16px;
          margin:0 16px 12px;
          font-size:14px;
          color:rgba(255,255,255,0.75);
          line-height:1.8;
          min-height:80px;
          animation:p2Pulse 3s ease-in-out infinite;
        }
        .p2-quest-card{
          background:linear-gradient(135deg,#0a0a1a,#1a0a2e);
          border:1px solid #4a4a6a;
          border-left:4px solid #6a6a9a;
          border-radius:10px;
          padding:14px;
          margin:0 16px 10px;
        }
        .p2-quest-card.active{animation:p2Pulse 3s ease-in-out infinite;}
        .p2-quest-card.done{opacity:0.7;border-left-color:#34d399;}
        .p2-label{font-size:11px;color:#6a6a9a;font-weight:700;letter-spacing:1px;margin-bottom:6px;}
        .p2-btn{
          background:rgba(106,106,154,0.3);
          border:1px solid #6a6a9a;
          border-radius:8px;
          color:#a0a0c8;
          padding:8px 20px;
          font-size:13px;font-weight:700;cursor:pointer;
          transition:background 0.2s;
        }
        .p2-btn:hover{background:rgba(106,106,154,0.5);}
        .p2-btn:disabled{opacity:0.4;cursor:default;}
        .p2-after-msg{
          background:rgba(10,10,20,0.8);
          border-left:3px solid #6a6a9a;
          padding:10px 12px;
          margin-top:10px;
          font-size:12px;
          color:rgba(255,255,255,0.5);
          font-style:italic;
          border-radius:0 6px 6px 0;
        }
        .peace-card{
          background:linear-gradient(135deg,#050508,#0d0a15);
          border:1px solid #2d2040;
          border-left:4px solid #4a3570;
          border-radius:10px;
          padding:16px;
          margin:0 16px 10px;
          animation:peacePulse 4s ease-in-out infinite;
        }
        .p2-textarea{
          width:100%;background:rgba(10,10,20,0.9);border:1px solid #4a4a6a;
          border-radius:8px;color:#e2e8f0;padding:10px;font-size:13px;
          resize:vertical;min-height:80px;box-sizing:border-box;
          font-family:inherit;line-height:1.6;
        }
        .p2-textarea:focus{outline:none;border-color:#6a6a9a;}
      `}</style>

      {/* Header */}
      <div className="p2-header">
        <P2Avatar />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#a0a0c8", marginBottom: 2 }}>❓</div>
          <div style={{ fontSize: 11, color: "#4a4a6a", letterSpacing: 2, fontWeight: 700 }}>● В СЕТИ</div>
        </div>
      </div>

      {/* ── INTRO PHASE ── */}
      {phase === "intro" && (
        <>
          <div className="p2-bubble">
            <TypeWriter
              key={introStep}
              text={INTRO_MSGS[introStep]}
              speed={30}
              onDone={handleIntroDone}
            />
          </div>

          {introDone && introStep < INTRO_MSGS.length - 1 && (
            <div style={{ padding: "0 16px 12px" }}>
              <button className="p2-btn" onClick={advanceIntro} style={{ marginTop: 4 }}>
                Продолжить
              </button>
            </div>
          )}

          {introDone && introStep === INTRO_MSGS.length - 1 && (
            <div style={{ padding: "0 16px 12px" }}>
              <button className="p2-btn" onClick={startChain} disabled={starting}>
                {starting ? "..." : "Я готов"}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── QUESTS PHASE ── */}
      {phase === "quests" && status && (
        <>
          <div style={{ padding: "0 16px", marginBottom: 12, fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
            КВЕСТ {Math.min(status.questDay, 7)} ИЗ 7
          </div>
          {(status.quests || []).map(q => {
            const isDone = (status.completedQuests || []).some(c => c.questNumber === q.number);
            const isActive = status.questDay === q.number;
            const isLocked = q.number > status.questDay;
            return (
              <div key={q.number} className={`p2-quest-card${isActive ? " active" : isDone ? " done" : ""}`}
                style={{ opacity: isLocked ? 0.3 : 1 }}>
                <div className="p2-label">❓ ИГРОК №2 · КВЕСТ {q.number}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: isDone ? "#34d399" : "#c8c8e8", marginBottom: 6 }}>
                  {isDone && "✓ "}{q.title}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, marginBottom: 10 }}>
                  {q.description}
                </div>
                <div style={{ fontSize: 11, color: "#6a6a9a", marginBottom: isDone ? 0 : 10 }}>
                  +60 XP · +30 💰 · Сложный
                </div>

                {isActive && q.number === 7 && !isDone && (
                  <>
                    <textarea
                      className="p2-textarea"
                      placeholder="Напиши здесь свой ответ..."
                      value={quest7Msg}
                      onChange={e => setQuest7Msg(e.target.value)}
                    />
                    {!quest7Reply ? (
                      <button className="p2-btn" style={{ marginTop: 8 }}
                        onClick={sendQuest7} disabled={q7Sending || !quest7Msg.trim()}>
                        {q7Sending ? "..." : "Отправить"}
                      </button>
                    ) : (
                      <>
                        <div className="p2-after-msg">{quest7Reply}</div>
                        <button className="p2-btn" style={{ marginTop: 8 }}
                          onClick={() => completeQuest(7)} disabled={completing === 7}>
                          {completing === 7 ? "..." : "Завершить"}
                        </button>
                      </>
                    )}
                  </>
                )}

                {isActive && q.number !== 7 && !isDone && (
                  <button className="p2-btn"
                    onClick={() => completeQuest(q.number)} disabled={completing === q.number}>
                    {completing === q.number ? "..." : "Выполнить"}
                  </button>
                )}

                {isDone && afterMsgs[q.number] && (
                  <div className="p2-after-msg">{afterMsgs[q.number]}</div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── FINAL PHASE ── */}
      {phase === "final" && (
        <>
          <div className="p2-bubble" style={{ whiteSpace: "pre-line", lineHeight: 2 }}>
            {finalTypeDone ? FINAL_MSG : (
              <TypeWriter key="final" text={FINAL_MSG} speed={20} onDone={() => setFinalTypeDone(true)} />
            )}
          </div>

          {(finalTypeDone || status?.peaceUnlocked) && (
            <div style={{ padding: "0 16px" }}>
              {status?.peaceUnlocked ? (
                <div style={{
                  background: "rgba(74,53,112,0.2)", border: "1px solid #4a3570",
                  borderRadius: 10, padding: 14, textAlign: "center",
                }}>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🌑</div>
                  <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 700 }}>Ветка ПОКОЙ открыта</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                    Квесты появились в разделе Квесты → 🌑 Покой
                  </div>
                </div>
              ) : (
                <>
                  <button
                    className="p2-btn"
                    style={{ width: "100%", padding: "14px", fontSize: 15, background: "rgba(74,53,112,0.4)", borderColor: "#4a3570", color: "#c4b5fd" }}
                    onClick={unlockPeace}
                    disabled={unlocking}
                  >
                    {unlocking ? "..." : "Открыть ветку ПОКОЙ"}
                  </button>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
