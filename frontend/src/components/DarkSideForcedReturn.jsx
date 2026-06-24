import { useState, useEffect } from "react";

export default function DarkSideForcedReturn({ onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  const LINES = [
    "Время вышло.",
    "Я говорил что все возвращаются.",
    "Система ждала тебя.",
  ];
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!visible) return;
    if (shown >= LINES.length) return;
    const t = setTimeout(() => setShown(s => s + 1), 900);
    return () => clearTimeout(t);
  }, [visible, shown]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 10003,
      background: "rgba(0,0,0,0.97)",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0, transition: "opacity 0.8s ease",
    }}>
      <style>{`
        @keyframes frFadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes frGlow { 0%,100%{box-shadow:0 0 30px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 60px rgba(124,58,237,0.6)} }
      `}</style>

      <div style={{
        maxWidth: 340, width: "90%", textAlign: "center",
        padding: "40px 28px",
        background: "linear-gradient(135deg,#0d0820,#1a0a2e)",
        border: "1px solid #7c3aed",
        borderRadius: 24,
        animation: "frGlow 3s ease-in-out infinite",
      }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>⚡</div>

        <div style={{
          fontSize: 11, color: "#7c3aed",
          letterSpacing: 2, marginBottom: 24,
          textTransform: "uppercase", fontWeight: 700,
        }}>
          LAPTEV
        </div>

        <div style={{ marginBottom: 28, minHeight: 100 }}>
          {LINES.map((line, i) => (
            <p key={i} style={{
              fontSize: 16,
              color: i === LINES.length - 1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)",
              lineHeight: 1.8, margin: "0 0 4px",
              fontStyle: "italic",
              opacity: shown > i ? 1 : 0,
              transform: shown > i ? "translateY(0)" : "translateY(6px)",
              transition: "opacity 0.6s ease, transform 0.6s ease",
            }}>
              "{line}
            </p>
          ))}
          {shown >= LINES.length && (
            <p style={{
              fontSize: 16, color: "#a78bfa",
              lineHeight: 1.8, margin: "4px 0 0",
              fontStyle: "italic", fontWeight: 700,
              animation: "frFadeIn 0.6s ease both",
            }}>
              Добро пожаловать обратно."
            </p>
          )}
        </div>

        {shown >= LINES.length && (
          <button onClick={onClose} style={{
            width: "100%",
            background: "linear-gradient(135deg,#7c3aed,#4c1d95)",
            color: "#fff", border: "none", borderRadius: 12,
            padding: "14px", fontSize: 16, fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            animation: "frFadeIn 0.6s ease both",
          }}>
            Продолжить путь ⚡
          </button>
        )}
      </div>
    </div>
  );
}
