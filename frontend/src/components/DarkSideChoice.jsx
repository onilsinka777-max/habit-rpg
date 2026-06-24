import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const NOW_AT_LOAD = new Date().getTime();

function useCountdown(targetMs) {
  const [left, setLeft] = useState(Math.max(0, targetMs - NOW_AT_LOAD));
  useEffect(() => {
    const id = setInterval(() => setLeft(t => Math.max(0, t - 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export default function DarkSideChoice({ token, user, onChoose }) {
  const [choosing, setChoosing] = useState(null);
  const [done, setDone]         = useState(false);
  const [result, setResult]     = useState(null);

  const darkStart = user?.darkSideStartedAt ? new Date(user.darkSideStartedAt).getTime() : NOW_AT_LOAD;
  const deadline  = darkStart + 24 * 3600 * 1000;
  const countdown = useCountdown(deadline);

  const choose = async (choice) => {
    if (choosing) return;
    setChoosing(choice);
    try {
      const res = await fetch(`${API}/dark-side/choose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ choice }),
      });
      const data = await res.json();
      setResult({ choice, ...data });
      setDone(true);
    } catch {
      setChoosing(null);
    }
  };

  if (done && result) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9998,
        background: result.choice === "light"
          ? "linear-gradient(135deg,#0d0820,#1a0a2e)"
          : "linear-gradient(135deg,#0a0000,#1a0000)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: 32,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {result.choice === "light" ? "⚡" : "🌑"}
        </div>
        <div style={{ fontWeight: 900, fontSize: 24, color: result.choice === "light" ? "#a78bfa" : "#cc0000", marginBottom: 12 }}>
          {result.choice === "light" ? "Ты вернулся к свету" : "Ты выбрал тень"}
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", textAlign: "center", maxWidth: 400, lineHeight: 1.7, marginBottom: 28 }}>
          {result.message}
        </div>
        {result.warning && (
          <div style={{ fontSize: 12, color: "#f87171", marginBottom: 28, fontStyle: "italic" }}>
            ⚠️ {result.warning}
          </div>
        )}
        <button onClick={() => onChoose(result.choice)} style={{
          padding: "14px 40px",
          background: result.choice === "light" ? "linear-gradient(135deg,#7c3aed,#4c1d95)" : "rgba(204,0,0,0.4)",
          border: result.choice === "light" ? "none" : "1px solid #cc0000",
          borderRadius: 14, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
        }}>
          Продолжить
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9998,
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes darkFlicker { 0%,100%{opacity:1} 92%{opacity:1} 94%{opacity:0.85} 96%{opacity:1} }
        @keyframes lightGlow   { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 40px rgba(124,58,237,0.6)} }
        .ds-half { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 24px; cursor:pointer; transition:filter 0.2s; }
        .ds-half:hover { filter:brightness(1.12); }
        .ds-dark { background:linear-gradient(135deg,#0a0000,#1a0000); animation:darkFlicker 4s infinite; }
        .ds-light { background:linear-gradient(135deg,#0d0820,#1a0a2e); animation:lightGlow 3s ease-in-out infinite; }
        .ds-split { display:flex; flex:1; }
        .ds-center { position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); z-index:2; width:220px; text-align:center; pointer-events:none; }
        .ds-divider { position:absolute; left:50%; top:0; bottom:0; width:2px; background:linear-gradient(180deg,transparent,#cc0000,transparent); transform:translateX(-50%); }
      `}</style>

      {/* Top bar */}
      <div style={{
        background: "rgba(0,0,0,0.8)", borderBottom: "1px solid rgba(204,0,0,0.3)",
        padding: "10px 20px", textAlign: "center",
        fontSize: 12, fontWeight: 700, letterSpacing: 1, color: "#f87171",
      }}>
        ⚫ ТЁМНАЯ СТОРОНА · ВЫБОР НЕОБРАТИМ · АВТОВОЗВРАТ ЧЕРЕЗ {countdown}
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <div className="ds-split">
          {/* Dark half */}
          <div className="ds-half ds-dark" onClick={() => choose("shadow")} style={{ position: "relative" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🌑</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#cc0000", marginBottom: 10, letterSpacing: 1 }}>
              ОСТАТЬСЯ В ТЕНИ
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, textAlign: "center", maxWidth: 200, marginBottom: 28 }}>
              Золото × 5 каждый квест.<br/>Но уровень продолжит падать.
            </div>
            <button onClick={(e) => { e.stopPropagation(); choose("shadow"); }}
              disabled={!!choosing} style={{
              padding: "12px 28px",
              background: choosing === "shadow" ? "rgba(204,0,0,0.8)" : "rgba(204,0,0,0.4)",
              border: "1px solid #cc0000", borderRadius: 12,
              color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
              pointerEvents: "auto",
            }}>
              {choosing === "shadow" ? "..." : "Уйти в тень"}
            </button>
          </div>

          {/* Light half */}
          <div className="ds-half ds-light" onClick={() => choose("light")} style={{ position: "relative" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚡</div>
            <div style={{ fontWeight: 900, fontSize: 22, color: "#a78bfa", marginBottom: 10, letterSpacing: 1 }}>
              ВЕРНУТЬСЯ К СВЕТУ
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, textAlign: "center", maxWidth: 200, marginBottom: 28 }}>
              Система ждёт.<br/>LAPTEV ждёт.<br/>Твой путь ждёт.
            </div>
            <button onClick={(e) => { e.stopPropagation(); choose("light"); }}
              disabled={!!choosing} style={{
              padding: "12px 28px",
              background: choosing === "light" ? "rgba(124,58,237,0.8)" : "rgba(124,58,237,0.4)",
              border: "1px solid #7c3aed", borderRadius: 12,
              color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer",
              pointerEvents: "auto",
            }}>
              {choosing === "light" ? "..." : "Вернуться"}
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="ds-divider" />

        {/* Center LAPTEV block */}
        <div className="ds-center" style={{ pointerEvents: "none" }}>
          <div style={{
            background: "rgba(0,0,0,0.9)", border: "1px solid rgba(204,0,0,0.5)",
            borderRadius: 16, padding: "20px 16px",
            boxShadow: "0 0 40px rgba(0,0,0,0.8)",
          }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👁️</div>
            <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>
              LAPTEV
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, fontStyle: "italic" }}>
              «Я видел многих кто выбирал тень.<br/>
              Все они возвращались.<br/>
              Вопрос только — когда.»
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
