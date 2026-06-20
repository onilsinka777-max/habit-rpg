import { useEffect, useRef, useState } from "react";

const BRANCH_COLORS = { discipline:"#8d8cf8", fitness:"#fb7878", self_development:"#34d399", knowledge:"#38bdf8" };
const BRANCH_ICONS  = { discipline:"🛡️", fitness:"💪", self_development:"🌱", knowledge:"📘" };

function pad(n) { return String(n).padStart(2, "0"); }

export default function FocusMode({ tasks = [], onComplete, onClose }) {
  const allTasks = tasks.filter(t => !t.completed && t.type !== "legendary");
  const required = allTasks.filter(t => t.type === "required");
  const other    = allTasks.filter(t => t.type !== "required");

  const [done,    setDone]    = useState(new Set());
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    if (running) timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    else clearInterval(timerRef.current);
    return () => clearInterval(timerRef.current);
  }, [running]);

  const toggleDone = (task) => {
    if (done.has(task.id)) return;
    setDone(prev => new Set([...prev, task.id]));
    onComplete(task.id);
  };

  const total = allTasks.length;
  const completedCount = done.size;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 100;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const timeStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  const allRequired = required.every(t => done.has(t.id));

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:999,
      background:"rgba(7,9,16,0.98)",
      display:"flex", flexDirection:"column",
      fontFamily:"inherit",
    }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"rgba(255,255,255,0.3)" }}>БОЕВОЙ ПЛАН ДНЯ</div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:3 }}>
            <div style={{ fontSize:22, fontWeight:800, color:"var(--accent,#8d8cf8)", fontVariantNumeric:"tabular-nums" }}>{timeStr}</div>
            <button onClick={() => setRunning(r => !r)} style={{ background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, padding:"2px 8px", color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:11 }}>
              {running ? "⏸" : "▶"}
            </button>
          </div>
        </div>

        <div style={{ textAlign:"center" }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4"/>
            <circle cx="26" cy="26" r="22" fill="none" stroke="var(--accent,#8d8cf8)" strokeWidth="4"
              strokeDasharray={`${2*Math.PI*22}`}
              strokeDashoffset={`${2*Math.PI*22*(1-pct/100)}`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              style={{ transition:"stroke-dashoffset 0.4s ease" }}/>
            <text x="26" y="30" textAnchor="middle" fill="white" fontSize="13" fontWeight="700">{pct}%</text>
          </svg>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginTop:2 }}>{completedCount}/{total}</div>
        </div>

        <button onClick={onClose} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"6px 14px", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:13 }}>
          ✕ ESC
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height:3, background:"rgba(255,255,255,0.05)" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"var(--accent,#8d8cf8)", transition:"width 0.4s ease" }} />
      </div>

      {/* Task list */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 20px", maxWidth:600, margin:"0 auto", width:"100%" }}>
        {total === 0 && (
          <div style={{ textAlign:"center", paddingTop:60 }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:700, color:"#34d399" }}>Все квесты выполнены!</div>
            <div style={{ fontSize:14, color:"rgba(255,255,255,0.4)", marginTop:8 }}>Отличная работа сегодня</div>
            <button className="btn btn-primary" onClick={onClose} style={{ marginTop:24 }}>Закрыть</button>
          </div>
        )}

        {required.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:"#fb7878" }}>ОБЯЗАТЕЛЬНЫЕ</span>
              {allRequired && <span style={{ fontSize:10, color:"#34d399", background:"rgba(52,211,153,0.1)", borderRadius:4, padding:"1px 6px" }}>✓ Всё выполнено</span>}
            </div>
            {required.map(t => <TaskRow key={t.id} task={t} done={done.has(t.id)} onToggle={() => toggleDone(t)} />)}
          </div>
        )}

        {other.length > 0 && (
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:1.5, color:"rgba(255,255,255,0.3)", marginBottom:10 }}>
              {required.length > 0 ? "ДОПОЛНИТЕЛЬНЫЕ" : "КВЕСТЫ"}
            </div>
            {other.map(t => <TaskRow key={t.id} task={t} done={done.has(t.id)} onToggle={() => toggleDone(t)} />)}
          </div>
        )}
      </div>

      {/* Footer summary */}
      {completedCount > 0 && (
        <div style={{ padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,0.06)", display:"flex", justifyContent:"center", gap:24, fontSize:13, color:"rgba(255,255,255,0.5)" }}>
          <span>✅ {completedCount} выполнено</span>
          <span>⏱ {timeStr}</span>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, done, onToggle }) {
  const color = BRANCH_COLORS[task.branch] || "#8d8cf8";
  return (
    <div onClick={() => !done && onToggle()} style={{
      display:"flex", alignItems:"center", gap:12,
      padding:"11px 14px", borderRadius:10, marginBottom:6, cursor:done ? "default" : "pointer",
      background: done ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${done ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.07)"}`,
      opacity: done ? 0.6 : 1, transition:"all 0.25s",
    }}>
      <div style={{
        width:22, height:22, borderRadius:"50%", flexShrink:0,
        border: `2px solid ${done ? "#34d399" : color}`,
        background: done ? "#34d399" : "transparent",
        display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#0b0e17",
        transition:"all 0.2s",
      }}>
        {done ? "✓" : ""}
      </div>
      <span style={{ fontSize:14 }}>{BRANCH_ICONS[task.branch] || "📌"}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, fontWeight:done ? 400 : 600, textDecoration:done ? "line-through" : "none", color:done ? "rgba(255,255,255,0.4)" : "#f1f5f9" }}>
          {task.title}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:1 }}>
          +{task.xpReward} XP · +{task.goldReward} зол.
        </div>
      </div>
      {!done && (
        <div style={{ fontSize:11, color:color, fontWeight:600, background:`${color}15`, borderRadius:5, padding:"2px 7px" }}>
          {task.type === "required" ? "🔒" : "⭐"}
        </div>
      )}
    </div>
  );
}
