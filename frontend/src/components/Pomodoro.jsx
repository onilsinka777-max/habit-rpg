import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";
const WORK_SEC  = 25 * 60;
const BREAK_SEC = 5  * 60;

function fmt(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, "0");
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sine"; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
  } catch {}
}

function notify(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(p => {
      if (p === "granted") new Notification(title, { body });
    });
  }
}

export default function Pomodoro({ token, showToast, onXpGained }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // Restore timer from localStorage on mount
  const initState = () => {
    const saved = JSON.parse(localStorage.getItem("pomodoro_state") || "null");
    if (saved && saved.endTime && saved.endTime > Date.now()) {
      const secondsLeft = Math.round((saved.endTime - Date.now()) / 1000);
      return { phase: saved.phase || "work", timeLeft: secondsLeft, running: true };
    }
    return { phase: "work", timeLeft: WORK_SEC, running: false };
  };
  const init = initState();

  const [phase,    setPhase]    = useState(init.phase);
  const [timeLeft, setTimeLeft] = useState(init.timeLeft);
  const [running,  setRunning]  = useState(init.running);
  const [count,    setCount]    = useState(Number(localStorage.getItem("pomodoro_count") || 0));
  const [flash,    setFlash]    = useState(false);
  const intervalRef  = useRef(null);
  const phaseEndedRef = useRef(false);

  // Watch for timer reaching 0
  useEffect(() => {
    if (timeLeft === 0 && !phaseEndedRef.current) {
      phaseEndedRef.current = true;
      handlePhaseEnd();
    }
    if (timeLeft > 0) phaseEndedRef.current = false;
  }, [timeLeft]);

  const handlePhaseEnd = useCallback(() => {
    beep();
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);

    setPhase(prev => {
      const next = prev === "work" ? "break" : "work";
      setTimeLeft(next === "work" ? WORK_SEC : BREAK_SEC);
      if (prev === "work") {
        setCount(c => { const n=c+1; localStorage.setItem("pomodoro_count",n); return n; });
        awardXp();
        notify("🍅 Помодоро завершён!", "Отличная работа! Время перерыва.");
      } else {
        notify("☕ Перерыв закончен", "Пора вернуться к работе!");
      }
      return next;
    });
    setRunning(false);
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }, []);

  const awardXp = async () => {
    try {
      const res = await axios.post(`${API}/tasks/pomodoro-complete`, {}, auth);
      showToast(`Помодоро засчитан! +${res.data.xpGained || 15} XP`, "success");
      if (onXpGained) onXpGained();
    } catch { /* endpoint might not exist, silent */ }
  };

  const start = (curTime) => {
    const secs = curTime ?? timeLeft;
    if (running || secs === 0) return;
    setRunning(true);
    const endTime = Date.now() + secs * 1000;
    localStorage.setItem("pomodoro_state", JSON.stringify({ phase, endTime }));
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      setTimeLeft(left);
    }, 500);
    if (Notification.permission === "default") Notification.requestPermission();
  };

  // Auto-start if restored as running
  useEffect(() => { if (init.running) start(init.timeLeft); }, []);

  const pause = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    localStorage.removeItem("pomodoro_state");
  };

  const reset = () => {
    pause();
    phaseEndedRef.current = false;
    setTimeLeft(phase === "work" ? WORK_SEC : BREAK_SEC);
  };

  const switchPhase = (p) => {
    pause();
    phaseEndedRef.current = false;
    setPhase(p);
    setTimeLeft(p === "work" ? WORK_SEC : BREAK_SEC);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const total    = phase === "work" ? WORK_SEC : BREAK_SEC;
  const progress = ((total - timeLeft) / total) * 100;
  const accent   = phase === "work" ? "#f87171" : "#34d399";
  const r = 72, circ = 2 * Math.PI * r;

  return (
    <section className="quest-section" style={{ position:"relative" }}>
      {/* Flash overlay */}
      {flash && (
        <div style={{
          position:"fixed", inset:0, zIndex:8999, pointerEvents:"none",
          background:"rgba(248,113,113,0.25)",
          animation:"flashOut 1.2s ease forwards",
        }} />
      )}
      <style>{`@keyframes flashOut{0%{opacity:1}100%{opacity:0}}`}</style>

      <div className="section-eyebrow"><span>⏱️</span> Помодоро</div>

      {/* Ring timer */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"24px 0" }}>
        <div style={{ position:"relative", width:180, height:180 }}>
          <svg width={180} height={180} style={{ transform:"rotate(-90deg)", position:"absolute", top:0, left:0 }}>
            <circle cx={90} cy={90} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
            <circle cx={90} cy={90} r={r} fill="none" stroke={accent}
              strokeWidth={10} strokeDasharray={circ}
              strokeDashoffset={circ - (circ * progress / 100)}
              strokeLinecap="round"
              style={{ transition:"stroke-dashoffset 1s linear, stroke 0.4s" }} />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ fontSize:40, fontWeight:800, color:"#f1f5f9", fontFamily:"monospace", lineHeight:1 }}>
              {fmt(timeLeft)}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4 }}>
              {phase === "work" ? "Работа" : "Перерыв"}
            </div>
          </div>
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

      {/* Phase tabs */}
      <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:20 }}>
        {[{id:"work",label:"🍅 25 мин"},{id:"break",label:"☕ 5 мин"}].map(p => (
          <button key={p.id}
            className={`branch-tab ${phase===p.id?"active":""}`}
            style={phase===p.id?{background:p.id==="work"?"#f87171":"#34d399",boxShadow:`0 4px 12px ${p.id==="work"?"rgba(248,113,113,0.3)":"rgba(52,211,153,0.3)"}`}:undefined}
            onClick={() => switchPhase(p.id)}>
            {p.label}
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
              boxShadow: i < count ? "0 0 6px rgba(248,113,113,0.5)" : "none",
            }} />
          ))}
        </div>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:0 }}>
          {count === 0 ? "Начни первый помодоро!" : `Выполнено: ${count} помодоро · +${count * 15} XP`}
        </p>
      </div>
    </section>
  );
}
