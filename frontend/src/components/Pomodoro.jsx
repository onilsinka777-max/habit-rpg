import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const WORK_SEC  = 25 * 60;
const BREAK_SEC = 5  * 60;

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

export default function Pomodoro({ token, showToast, onXpGained }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [phase,    setPhase]    = useState("work");  // "work" | "break"
  const [timeLeft, setTimeLeft] = useState(WORK_SEC);
  const [running,  setRunning]  = useState(false);
  const [count,    setCount]    = useState(0);
  const intervalRef = useRef(null);

  const tick = () => {
    setTimeLeft(t => {
      if (t <= 1) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setRunning(false);
        handlePhaseEnd();
        return 0;
      }
      return t - 1;
    });
  };

  const handlePhaseEnd = () => {
    setPhase(p => {
      if (p === "work") {
        setCount(c => c + 1);
        awardXp();
        return "break";
      } else {
        return "work";
      }
    });
  };

  const awardXp = async () => {
    try {
      const res = await axios.post(`${API}/tasks/pomodoro-complete`, {}, authHeaders);
      showToast(`Помодоро завершён! +${res.data.xpGained} XP`, "success");
      if (onXpGained) onXpGained();
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setTimeLeft(phase === "work" ? WORK_SEC : BREAK_SEC);
    setRunning(false);
    clearInterval(intervalRef.current);
  }, [phase]);

  const start = () => {
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(tick, 1000);
  };

  const pause = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const reset = () => {
    pause();
    setTimeLeft(phase === "work" ? WORK_SEC : BREAK_SEC);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const total    = phase === "work" ? WORK_SEC : BREAK_SEC;
  const progress = ((total - timeLeft) / total) * 100;
  const accent   = phase === "work" ? "#f87171" : "#34d399";
  const r = 72, circ = 2 * Math.PI * r;

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>⏱️</span> Помодоро</div>

      {/* Ring timer */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 0" }}>
        <svg width={180} height={180} style={{ transform:"rotate(-90deg)" }}>
          <circle cx={90} cy={90} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
          <circle cx={90} cy={90} r={r} fill="none" stroke={accent}
            strokeWidth={10} strokeDasharray={circ}
            strokeDashoffset={circ - (circ * progress / 100)}
            strokeLinecap="round"
            style={{ transition:"stroke-dashoffset 1s linear, stroke 0.4s" }} />
        </svg>
        <div style={{ marginTop:-124, fontSize:42, fontWeight:800, color:"#f1f5f9", fontFamily:"monospace" }}>
          {fmt(timeLeft)}
        </div>
        <div style={{ marginTop:4, fontSize:13, color:"rgba(255,255,255,0.45)" }}>
          {phase === "work" ? "Работа" : "Перерыв"}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:20 }}>
        {!running ? (
          <button className="btn btn-primary" onClick={start} style={{ minWidth:100 }}>▶ Старт</button>
        ) : (
          <button className="btn btn-ghost" onClick={pause} style={{ minWidth:100 }}>⏸ Пауза</button>
        )}
        <button className="btn btn-ghost" onClick={reset}>↩ Сброс</button>
      </div>

      {/* Phase toggle */}
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
        {["work","break"].map(p => (
          <button key={p}
            className={`branch-tab ${phase===p?"active":""}`}
            style={phase===p?{background:p==="work"?"#f87171":"#34d399",boxShadow:`0 4px 12px ${p==="work"?"rgba(248,113,113,0.3)":"rgba(52,211,153,0.3)"}`}:undefined}
            onClick={() => setPhase(p)}>
            {p === "work" ? "🍅 25 мин" : "☕ 5 мин"}
          </button>
        ))}
      </div>

      {/* Counter */}
      <div style={{ textAlign:"center" }}>
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginBottom:8 }}>
          {Array.from({ length: Math.max(count, 4) }).map((_, i) => (
            <div key={i} style={{
              width:12, height:12, borderRadius:"50%",
              background: i < count ? "#f87171" : "rgba(255,255,255,0.1)",
              transition:"background 0.3s",
            }} />
          ))}
        </div>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:0 }}>
          {count === 0 ? "Начни первый помодоро" : `Выполнено помодоро: ${count} (+${count*10} XP)`}
        </p>
      </div>
    </section>
  );
}
