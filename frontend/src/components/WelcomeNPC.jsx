import { useState, useEffect } from "react";

const DIALOGS = [
  {
    text: "Приветствую тебя, путник! Я — Мастер Кай, страж этого пути. Ты сделал первый шаг, выбрав путь роста.",
    emoji: "🧙",
  },
  {
    text: "Каждый квест, каждая победа над собой — это кирпич в фундаменте твоей личности. Дисциплина станет твоим мечом.",
    emoji: "⚔️",
  },
  {
    text: "Помни: здесь нет врагов снаружи. Главный враг — это ленивая версия тебя. Побеждай её каждый день!",
    emoji: "🔥",
  },
];

export default function WelcomeNPC({ onDone }) {
  const [step, setStep]     = useState(0);
  const [text, setText]     = useState("");
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (localStorage.getItem("welcome_npc_done")) { onDone(); return; }
  }, []);

  useEffect(() => {
    const full = DIALOGS[step].text;
    setText("");
    setTyping(true);
    let i = 0;
    const timer = setInterval(() => {
      setText(full.slice(0, ++i));
      if (i >= full.length) { clearInterval(timer); setTyping(false); }
    }, 25);
    return () => clearInterval(timer);
  }, [step]);

  const next = () => {
    if (typing) { setText(DIALOGS[step].text); setTyping(false); return; }
    if (step < DIALOGS.length - 1) { setStep(s => s + 1); }
    else {
      localStorage.setItem("welcome_npc_done", "1");
      onDone();
    }
  };

  if (localStorage.getItem("welcome_npc_done")) return null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:8000,
      background:"rgba(0,0,0,0.85)",
      backdropFilter:"blur(8px)",
      display:"flex", alignItems:"flex-end", justifyContent:"center",
      padding:"0 0 80px",
    }} onClick={next}>
      <div style={{
        width:"100%", maxWidth:480,
        background:"linear-gradient(135deg,#13142a,#1a1b35)",
        border:"1px solid rgba(141,140,248,0.3)",
        borderRadius:"20px 20px 16px 16px",
        padding:20,
        animation:"slideUp 0.3s ease",
      }} onClick={e => e.stopPropagation()}>
        <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

        <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:16 }}>
          <div style={{
            width:56, height:56, borderRadius:14, flexShrink:0,
            background:"rgba(141,140,248,0.15)",
            border:"2px solid rgba(141,140,248,0.3)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:28,
          }}>
            {DIALOGS[step].emoji}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#8d8cf8", marginBottom:4 }}>Мастер Кай</div>
            <p style={{ fontSize:15, lineHeight:1.65, color:"rgba(255,255,255,0.88)", margin:0 }}>
              {text}
              {typing && <span style={{ animation:"blink 0.8s infinite", color:"#8d8cf8" }}>|</span>}
            </p>
          </div>
        </div>
        <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>

        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", gap:6 }}>
            {DIALOGS.map((_, i) => (
              <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:i <= step ? "#8d8cf8" : "rgba(255,255,255,0.15)" }} />
            ))}
          </div>
          <button style={{
            background:"linear-gradient(90deg,#8d8cf8,#6366f1)", color:"#fff",
            border:"none", borderRadius:10, padding:"8px 20px",
            fontWeight:700, fontSize:14, cursor:"pointer",
          }} onClick={next}>
            {typing ? "Пропустить" : step < DIALOGS.length - 1 ? "Далее →" : "Начать путь ⚔️"}
          </button>
        </div>
      </div>
    </div>
  );
}
