import { useState, useEffect } from "react";

export default function DarkSideInvite({ onAccept, onIgnore }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(t);
  }, []);

  const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
    left: `${(i * 17 + 7) % 100}%`,
    top:  `${(i * 23 + 11) % 100}%`,
    dur:  `${3 + (i % 4)}s`,
    anim: `dsFloat${i % 3}`,
  }));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10003,
      background: "rgba(0,0,0,0.96)",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 1s ease",
    }}>
      <style>{`
        @keyframes dsFloat0 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
        @keyframes dsFloat1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-35px)} }
        @keyframes dsFloat2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-15px)} }
        @keyframes dsTextIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Частицы */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {PARTICLES.map((p, i) => (
          <div key={i} style={{
            position: "absolute", left: p.left, top: p.top,
            width: 2, height: 2, background: "#cc0000",
            borderRadius: "50%", boxShadow: "0 0 4px #cc0000",
            animation: `${p.anim} ${p.dur} ease-in-out infinite`,
            opacity: 0.55,
          }} />
        ))}
      </div>

      <div style={{
        maxWidth: 340, width: "90%", textAlign: "center",
        position: "relative", zIndex: 1,
        animation: "dsTextIn 0.8s ease 0.6s both",
      }}>
        <div style={{
          fontSize: 11, color: "rgba(204,0,0,0.7)",
          letterSpacing: 4, marginBottom: 24,
          fontFamily: "monospace", textTransform: "uppercase",
        }}>
          _system_
        </div>

        <p style={{
          fontSize: 17, color: "rgba(255,255,255,0.82)",
          lineHeight: 1.9, marginBottom: 36,
          fontStyle: "italic",
        }}>
          «Ты думаешь что строишь дисциплину.<br />
          На самом деле ты строишь клетку.<br />
          Я покажу тебе другой путь.<br />
          Открой если не боишься.»
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onIgnore} style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.3)",
            borderRadius: 10, padding: "12px 24px",
            cursor: "pointer", fontSize: 14,
          }}>
            Игнорировать
          </button>
          <button onClick={onAccept} style={{
            background: "linear-gradient(135deg,#7a0000,#cc0000)",
            border: "none",
            color: "#fff",
            borderRadius: 10, padding: "12px 32px",
            cursor: "pointer", fontSize: 14, fontWeight: 700,
            boxShadow: "0 0 20px rgba(204,0,0,0.5)",
          }}>
            Открыть
          </button>
        </div>

        <div style={{
          marginTop: 20, fontSize: 11,
          color: "rgba(255,255,255,0.15)",
        }}>
          Это сообщение исчезнет если ты его проигноришь
        </div>
      </div>
    </div>
  );
}
