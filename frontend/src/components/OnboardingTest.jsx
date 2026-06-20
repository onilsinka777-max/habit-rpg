import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const QUESTIONS = [
  {
    key: "q1",
    text: "Что тебя больше всего привлекает?",
    options: ["Дисциплина", "Фитнес", "Знания", "Саморазвитие"],
    icons:   ["🛡️",         "💪",     "📚",    "🌱"],
  },
  {
    key: "q2",
    text: "Сколько времени в день готов уделять?",
    options: ["15 мин", "30 мин", "1 час", "Больше часа"],
    icons:   ["⏱️",     "⏰",     "🕐",    "🕒"],
  },
  {
    key: "q3",
    text: "Какая твоя главная слабость?",
    options: ["Прокрастинация", "Лень", "Неорганизованность", "Отсутствие цели"],
    icons:   ["😴",             "🛋️",  "🌀",                 "❓"],
  },
  {
    key: "q4",
    text: "Твой текущий уровень активности?",
    options: ["Новичок", "Средний", "Продвинутый", "Эксперт"],
    icons:   ["🌱",      "⚡",     "🔥",           "👑"],
  },
  {
    key: "q5",
    text: "Главная цель на 3 месяца?",
    options: ["Похудеть", "Читать больше", "Дисциплина", "Гармония"],
    icons:   ["⚖️",      "📖",            "⚔️",         "☯️"],
  },
];

const CLASS_INFO = {
  warrior: { icon: "⚔️", color: "#fb7878", title: "Воин", desc: "Ты рождён для дисциплины и физической силы. Твой путь — испытания тела и воли." },
  sage:    { icon: "📚", color: "#38bdf8", title: "Мудрец", desc: "Знания — твоя сила. Ты растёшь через обучение и саморазвитие." },
  balance: { icon: "☯️", color: "#34d399", title: "Гармоничный", desc: "Ты ищешь баланс во всём. Равномерное развитие всех сторон жизни — твой путь." },
  explorer:{ icon: "🗺️", color: "#f5b637", title: "Исследователь", desc: "Тебе нравится пробовать новое. Каждый день — новое открытие." },
  strategist:{icon:"🧭", color:"#c084fc", title:"Стратег", desc:"Ты думаешь на несколько шагов вперёд. Планирование — твоё оружие." },
};

export default function OnboardingTest({ token, onComplete }) {
  const [step, setStep]       = useState(0);
  const [answers, setAnswers] = useState({});
  const [result, setResult]   = useState(null);
  const [busy, setBusy]       = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const select = async (option) => {
    const q = QUESTIONS[step];
    const newAnswers = { ...answers, [q.key]: option };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      setBusy(true);
      try {
        const res = await axios.post(`${API}/onboarding`, { answers: newAnswers }, auth);
        setResult(res.data);
      } catch { setResult({ suggestedClass: "balance", classLabel: "Гармоничный", topBranch: "self_development" }); }
      finally { setBusy(false); }
    }
  };

  if (result) {
    const cls = CLASS_INFO[result.suggestedClass] || CLASS_INFO.balance;
    return (
      <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(7,9,16,0.98)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ maxWidth:440, width:"100%", textAlign:"center" }}>
          <div style={{ fontSize:72, marginBottom:16, animation:"quest-flash 0.6s ease" }}>{cls.icon}</div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:cls.color, marginBottom:8 }}>ТВОЙ КЛАСС</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:cls.color, margin:"0 0 12px" }}>{cls.title}</h2>
          <p style={{ fontSize:15, color:"rgba(255,255,255,0.7)", lineHeight:1.7, marginBottom:32 }}>{cls.desc}</p>

          <div style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:12, padding:16, marginBottom:28, textAlign:"left" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, marginBottom:10 }}>ТВОИ ОТВЕТЫ</div>
            {QUESTIONS.map(q => (
              <div key={q.key} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:13, borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color:"rgba(255,255,255,0.5)" }}>{q.text.replace("?","")}</span>
                <span style={{ color:cls.color, fontWeight:600 }}>{answers[q.key]}</span>
              </div>
            ))}
          </div>

          <button
            className="btn btn-primary"
            style={{ background:cls.color, color:"#0b0e17", fontSize:16, padding:"14px 32px", width:"100%" }}
            onClick={onComplete}>
            🚀 Начать путь {cls.title === "Воин" ? "Воина" : cls.title === "Мудрец" ? "Мудреца" : cls.title}
          </button>
        </div>
      </div>
    );
  }

  const q = QUESTIONS[step];
  const pct = Math.round((step / QUESTIONS.length) * 100);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(7,9,16,0.98)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ maxWidth:440, width:"100%" }}>
        {/* Progress */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:32 }}>
          <div style={{ flex:1, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
            <div style={{ height:"100%", width:`${pct}%`, background:"var(--accent,#8d8cf8)", borderRadius:2, transition:"width 0.4s ease" }} />
          </div>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.3)", flexShrink:0 }}>{step + 1}/{QUESTIONS.length}</span>
        </div>

        {step === 0 && (
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"var(--accent,#8d8cf8)", marginBottom:8 }}>ДОБРО ПОЖАЛОВАТЬ</div>
            <h1 style={{ fontSize:24, fontWeight:900, margin:"0 0 8px" }}>Создание персонажа</h1>
            <p style={{ fontSize:14, color:"rgba(255,255,255,0.5)", margin:0 }}>Ответь на 5 вопросов — и мы подберём идеальный путь именно для тебя</p>
          </div>
        )}

        <h2 style={{ fontSize:20, fontWeight:700, marginBottom:20, lineHeight:1.4 }}>{q.text}</h2>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {q.options.map((opt, i) => (
            <button key={opt} disabled={busy} onClick={() => select(opt)} style={{
              display:"flex", alignItems:"center", gap:14, padding:"14px 18px",
              background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:12, cursor:"pointer", textAlign:"left", width:"100%", color:"#f1f5f9",
              fontSize:15, fontWeight:600, transition:"all 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background="rgba(141,140,248,0.12)"}
            onMouseLeave={e => e.currentTarget.style.background="rgba(255,255,255,0.04)"}>
              <span style={{ fontSize:24, width:32, textAlign:"center" }}>{q.icons[i]}</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
