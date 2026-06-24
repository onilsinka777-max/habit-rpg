import { useEffect, useState } from "react";
import axios from "axios";
import LockedFeature from "./LockedFeature";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function CreatorPath({ token, showToast, userLevel=1 }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]   = useState(false);
  const [showWin, setShowWin] = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const res = await axios.get(`${API}/creator-path/status`, auth);
      setData(res.data);
    } catch (e) {
      showToast("Ошибка загрузки", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const start = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/creator-path/start`, {}, auth);
      await load();
      showToast("⚡ Путь Создателя начат! 30 дней испытаний.", "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  const completeDay = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`${API}/creator-path/complete-day`, {}, auth);
      await load();
      if (res.data.isFinished) {
        setShowWin(true);
      } else {
        showToast(`✅ День ${data.currentDay + 1} завершён! Следующий день разблокирован.`, "success");
      }
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  if (loading) return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:"rgba(255,255,255,0.3)" }}>
      Загрузка...
    </div>
  );

  // ── Locked screen ───────────────────────────────────────────────────────────
  if (!data || data.locked) {
    return (
      <LockedFeature requiredLevel={75} currentLevel={userLevel} icon="⚡" title="Путь Создателя" description="30 дней. Соревнование с LAPTEV. Победи систему." />
    );
  }
  // ── Not started ─────────────────────────────────────────────────────────────
  if (!data.started) {
    return (
      <div className="section-card">
        <style>{`
          @keyframes cpGlow    { 0%,100%{box-shadow:0 0 20px rgba(147,51,234,0.4),0 0 40px rgba(147,51,234,0.2)} 50%{box-shadow:0 0 40px #c026d3,0 0 80px rgba(192,38,211,0.5)} }
          @keyframes cpShimmer { 0%{background-position:-200%} 100%{background-position:200%} }
          @keyframes cpFloat   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        `}</style>
        <div style={{ textAlign:"center", padding:"32px 16px" }}>
          <div style={{
            width:96, height:96, borderRadius:"50%", margin:"0 auto 20px",
            background:"linear-gradient(135deg,#1a0a2e,#4a1080)",
            border:"3px solid #9333ea", display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:44, animation:"cpGlow 2s ease-in-out infinite, cpFloat 3s ease-in-out infinite",
          }}>⚡</div>
          <div style={{
            fontSize:26, fontWeight:900, letterSpacing:3, marginBottom:6,
            background:"linear-gradient(90deg,#9333ea,#c026d3,#9333ea)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"cpShimmer 3s linear infinite",
          }}>ПУТЬ СОЗДАТЕЛЯ</div>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:14, lineHeight:1.8, margin:"12px auto 24px", maxWidth:320 }}>
            30 дней. Каждый день — новое испытание от LAPTEV.<br/>
            Пройди все 30 — войди в <strong style={{ color:"#f5b637" }}>Зал Славы</strong> и получи<br/>
            <strong style={{ color:"#9333ea" }}>50 000 золота</strong> и титул <strong style={{ color:"#c026d3" }}>«Победитель системы»</strong>
          </p>
          <button onClick={start} disabled={busy} style={{
            padding:"14px 40px",
            background:"linear-gradient(135deg,#7c3aed,#9333ea,#c026d3)",
            border:"none", borderRadius:14, cursor:"pointer",
            color:"#fff", fontWeight:900, fontSize:16, letterSpacing:1,
            boxShadow:"0 0 30px rgba(147,51,234,0.6)",
            animation:"cpGlow 2s ease-in-out infinite",
          }}>
            {busy ? "Запуск..." : "⚡ ПРИНЯТЬ ВЫЗОВ"}
          </button>
          <p style={{ marginTop:12, fontSize:11, color:"rgba(255,255,255,0.2)" }}>
            Доступно с 75 уровня · Ты на уровне {userLevel}
          </p>
        </div>
      </div>
    );
  }

  const currentDay = data.currentDay;
  const isCompleted = data.status === "completed";
  const questData = data.questData;

  return (
    <div style={{ paddingBottom:24 }}>
      <style>{`
        @keyframes absoluteGlow { 0%,100%{box-shadow:0 0 20px #9333ea,0 0 40px rgba(147,51,234,0.4)} 50%{box-shadow:0 0 40px #c026d3,0 0 80px rgba(192,38,211,0.6),0 0 120px rgba(147,51,234,0.3)} }
        @keyframes cpShimmer    { 0%{background-position:-200%} 100%{background-position:200%} }
        @keyframes cpPulse      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.95)} }
        @keyframes cpLightning  { 0%,100%{opacity:0} 10%,30%{opacity:1} 20%,40%{opacity:0} }
        @keyframes winPop       { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
      `}</style>

      {/* ── WIN Popup ── */}
      {showWin && (
        <div style={{
          position:"fixed", inset:0, zIndex:10002, background:"rgba(0,0,0,0.95)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:"linear-gradient(135deg,#0a0020,#1a0a40)",
            border:"3px solid #9333ea", borderRadius:28, padding:"40px 28px",
            textAlign:"center", maxWidth:340,
            animation:"winPop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow:"0 0 80px #9333ea, 0 0 160px rgba(192,38,211,0.4)",
          }}>
            <div style={{ fontSize:64, marginBottom:12 }}>🏆</div>
            <div style={{
              fontSize:22, fontWeight:900, letterSpacing:2,
              background:"linear-gradient(90deg,#9333ea,#c026d3,#f5b637)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              marginBottom:8,
            }}>ТЫ ПОБЕДИЛ СИСТЕМУ</div>
            <p style={{ color:"rgba(255,255,255,0.7)", fontSize:14, lineHeight:1.7, marginBottom:20 }}>
              30 дней испытаний пройдены.<br/>
              Ты вошёл в <strong style={{ color:"#f5b637" }}>Зал Славы</strong>.<br/>
              +50 000 золота · Титул «Победитель системы»
            </p>
            <button onClick={() => setShowWin(false)} style={{
              padding:"12px 32px", background:"linear-gradient(135deg,#7c3aed,#c026d3)",
              border:"none", borderRadius:12, cursor:"pointer",
              color:"#fff", fontWeight:900, fontSize:15,
            }}>⚡ Принято</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{
          fontSize:22, fontWeight:900, letterSpacing:3,
          background:"linear-gradient(90deg,#9333ea,#c026d3,#9333ea)",
          backgroundSize:"200% auto",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          animation:"cpShimmer 3s linear infinite",
        }}>ПУТЬ СОЗДАТЕЛЯ</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginTop:4 }}>
          30 дней. Соревнование с LAPTEV. Победи систему.
        </div>
      </div>

      {/* Completed banner */}
      {isCompleted && (
        <div style={{
          background:"linear-gradient(135deg,rgba(147,51,234,0.2),rgba(192,38,211,0.15))",
          border:"2px solid #9333ea", borderRadius:16, padding:"16px",
          textAlign:"center", marginBottom:20,
          animation:"absoluteGlow 2s ease-in-out infinite",
        }}>
          <div style={{ fontSize:32, marginBottom:6 }}>🏆</div>
          <div style={{ fontWeight:900, fontSize:18, color:"#c4b5fd" }}>Путь завершён</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:4 }}>Ты вошёл в Зал Славы</div>
        </div>
      )}

      {/* Progress */}
      <div style={{
        background:"rgba(147,51,234,0.08)", border:"1px solid rgba(147,51,234,0.2)",
        borderRadius:14, padding:"14px 16px", marginBottom:16,
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:2 }}>ПРОГРЕСС</div>
          <div style={{ fontWeight:900, fontSize:24, color:"#c4b5fd" }}>{currentDay}<span style={{ fontSize:14, color:"rgba(255,255,255,0.3)" }}>/30</span></div>
        </div>
        <div style={{ flex:1, margin:"0 16px" }}>
          <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:4, overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:4,
              width:`${(currentDay/30)*100}%`,
              background:"linear-gradient(90deg,#7c3aed,#c026d3)",
              transition:"width 0.5s ease",
              boxShadow:"0 0 8px #9333ea",
            }}/>
          </div>
        </div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,0.4)", textAlign:"right" }}>
          <div>{Math.round((currentDay/30)*100)}%</div>
        </div>
      </div>

      {/* Tower */}
      <div style={{ display:"flex", justifyContent:"center", marginBottom:20, position:"relative" }}>
        {/* Lightning effects */}
        <div style={{ position:"absolute", left:16, top:0, bottom:0, width:20, pointerEvents:"none" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              position:"absolute", top:`${15+i*22}%`, left:0,
              fontSize:16, color:"#9333ea",
              animation:`cpLightning ${2+i*0.7}s ease-in-out ${i*0.5}s infinite`,
            }}>⚡</div>
          ))}
        </div>
        <div style={{ position:"absolute", right:16, top:0, bottom:0, width:20, pointerEvents:"none" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              position:"absolute", top:`${20+i*22}%`, right:0,
              fontSize:16, color:"#c026d3",
              animation:`cpLightning ${2.5+i*0.6}s ease-in-out ${i*0.4+0.3}s infinite`,
            }}>⚡</div>
          ))}
        </div>

        {/* Tower floors */}
        <div style={{ display:"flex", flexDirection:"column-reverse", gap:3, width:200 }}>
          {Array.from({length:30}, (_,i) => {
            const day = i + 1;
            const done = day <= currentDay;
            const current = day === currentDay + 1 && !isCompleted;
            return (
              <div key={day} style={{
                height:18, borderRadius:4, display:"flex", alignItems:"center",
                justifyContent:"space-between", padding:"0 8px",
                background: done
                  ? "linear-gradient(90deg,rgba(124,58,237,0.6),rgba(147,51,234,0.4))"
                  : current
                    ? "linear-gradient(90deg,rgba(147,51,234,0.3),rgba(192,38,211,0.2))"
                    : "rgba(255,255,255,0.04)",
                border: current ? "1px solid #9333ea" : done ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(255,255,255,0.05)",
                boxShadow: current ? "0 0 10px rgba(147,51,234,0.5), 0 0 20px rgba(192,38,211,0.3)" : done ? "0 0 4px rgba(124,58,237,0.3)" : "none",
                animation: current ? "cpPulse 1.5s ease-in-out infinite" : "none",
                transition:"all 0.2s",
              }}>
                <span style={{ fontSize:9, color: done ? "#c4b5fd" : current ? "#a78bfa" : "rgba(255,255,255,0.2)", fontWeight:700 }}>
                  {day < 10 ? `0${day}` : day}
                </span>
                <span style={{ fontSize:10 }}>
                  {done ? "✓" : current ? "▶" : "🔒"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quest of the day */}
      {!isCompleted && questData && (
        <div style={{
          background:"linear-gradient(135deg,#1a0a2e,#2d1b69)",
          border:"2px solid #9333ea", borderRadius:18, padding:20, marginBottom:16,
          animation:"absoluteGlow 1.5s ease-in-out infinite",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <span style={{
              fontSize:10, fontWeight:900, letterSpacing:2, padding:"3px 10px",
              background:"linear-gradient(135deg,#7c3aed,#c026d3)",
              borderRadius:20, color:"#fff",
            }}>⚡ АБСОЛЮТ</span>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>День {questData.day} из 30</span>
          </div>
          <h3 style={{
            fontSize:17, fontWeight:900, marginBottom:10,
            background:"linear-gradient(90deg,#c4b5fd,#e9d5ff)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          }}>{questData.title}</h3>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.65)", lineHeight:1.7, marginBottom:18 }}>
            {questData.desc}
          </p>
          <button onClick={completeDay} disabled={busy} style={{
            width:"100%", padding:"13px",
            background: busy ? "rgba(147,51,234,0.3)" : "linear-gradient(135deg,#7c3aed,#9333ea,#c026d3)",
            border:"none", borderRadius:12, cursor: busy ? "default" : "pointer",
            color:"#fff", fontWeight:900, fontSize:15,
            boxShadow: busy ? "none" : "0 0 20px rgba(147,51,234,0.5)",
            transition:"all 0.15s",
          }}>
            {busy ? "Подтверждаю..." : "✅ Выполнено"}
          </button>
        </div>
      )}

      {/* Days list */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {Array.from({length:30}, (_,i) => {
          const day = i + 1;
          const done = day <= currentDay;
          const current = day === currentDay + 1 && !isCompleted;
          if (!done && !current) return null;
          return (
            <div key={day} style={{
              display:"flex", alignItems:"center", gap:10,
              background: current ? "rgba(147,51,234,0.08)" : "rgba(255,255,255,0.03)",
              border: current ? "1px solid rgba(147,51,234,0.3)" : "1px solid rgba(255,255,255,0.05)",
              borderRadius:10, padding:"10px 14px",
            }}>
              <div style={{
                width:28, height:28, borderRadius:"50%", flexShrink:0,
                background: done ? "linear-gradient(135deg,#7c3aed,#9333ea)" : "rgba(147,51,234,0.2)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:900, color: done ? "#fff" : "#9333ea",
              }}>{done ? "✓" : day}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, color: current ? "#c4b5fd" : "rgba(255,255,255,0.6)" }}>
                  {/* We only show titles for done/current days — need CREATOR_QUESTS data */}
                  День {day}
                </div>
              </div>
            </div>
          );
        }).filter(Boolean)}
      </div>
    </div>
  );
}
