import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const MILESTONES = {
  5:  { gold:100,  xp:500,   title:"Ученик Легенды",  icon:"🌟" },
  10: { gold:200,  xp:1000,  title:"Воин Легенды",    icon:"⚔️" },
  25: { gold:500,  xp:2500,  title:"Страж Легенды",   icon:"🛡️" },
  40: { gold:1000, xp:5000,  title:"Мастер Легенды",  icon:"👑" },
  50: { gold:2000, xp:10000, title:"ЛЕГЕНДА",          icon:"🌠" },
};

export default function LegendPath({ token, showToast, userLevel }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const res = await axios.get(`${API}/legend-path`, auth);
      setData(res.data);
    } catch (e) {
      if (e.response?.status !== 403) showToast("Ошибка загрузки", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const claimDaily = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`${API}/legend-path/claim-daily`, {}, auth);
      await load();
      showToast(`⚔️ Легендарный квест #${res.data.questNum} получен! Выполни его сегодня.`, "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  if (userLevel < 50) {
    return (
      <div className="section-card">
        <div className="section-eyebrow"><span>🌳</span> Легендарный путь</div>
        <div style={{ textAlign:"center", padding:"40px 20px" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
          <h3 style={{ fontSize:20, fontWeight:700, color:"#f5b637", marginBottom:8 }}>Легендарный путь</h3>
          <p style={{ color:"rgba(255,255,255,0.45)", fontSize:14, lineHeight:1.6 }}>
            Откроется на 50 уровне.<br />
            Твой уровень: {userLevel} / 50
          </p>
          <div style={{ marginTop:20, padding:"12px 20px", background:"rgba(245,182,55,0.08)", border:"1px solid rgba(245,182,55,0.2)", borderRadius:12 }}>
            <p style={{ fontSize:13, color:"rgba(245,182,55,0.8)", margin:0, fontStyle:"italic" }}>
              «Только те, кто прошёл 50 уровней испытаний, достойны встать на Легендарный путь»
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;

  const completed = data?.completedCount || 0;
  const total = 50;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="section-card">
      <div className="section-eyebrow"><span>🌟</span> Легендарный путь</div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, margin:"12px 0" }}>
        {[
          { label:"Выполнено", value:`${completed}/50`, icon:"⚔️" },
          { label:"Прогресс",  value:`${pct}%`,         icon:"📈" },
          { label:"Осталось",  value:total - completed,  icon:"🎯" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 8px", textAlign:"center" }}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:18, fontWeight:700, color:"#f5b637" }}>{s.value}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height:8, background:"rgba(255,255,255,0.06)", borderRadius:4, marginBottom:16, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#f5b637,#fb7878)", borderRadius:4, transition:"width 0.5s" }} />
      </div>

      {/* Visual tree — 50 nodes in rows of 10 */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:20 }}>
        {Array.from({ length: 50 }, (_, i) => {
          const num = i + 1;
          const done = num <= completed;
          const current = num === completed + 1;
          const milestone = MILESTONES[num];
          return (
            <div key={num} title={milestone ? milestone.title : `Квест #${num}`} style={{
              width:32, height:32, borderRadius:8,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize: milestone ? 16 : 11,
              fontWeight:700,
              background: done
                ? "linear-gradient(135deg,#f5b637,#fb7878)"
                : current
                  ? "rgba(245,182,55,0.2)"
                  : "rgba(255,255,255,0.04)",
              color: done ? "#0b0e17" : current ? "#f5b637" : "rgba(255,255,255,0.2)",
              border: current
                ? "2px solid #f5b637"
                : milestone
                  ? "1px solid rgba(245,182,55,0.3)"
                  : "1px solid rgba(255,255,255,0.06)",
              boxShadow: current ? "0 0 12px rgba(245,182,55,0.5)" : "none",
              animation: current ? "pulse 2s infinite" : "none",
              cursor: milestone ? "help" : "default",
              flexShrink:0,
            }}>
              {milestone ? milestone.icon : done ? "✓" : num}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 12px rgba(245,182,55,0.5)} 50%{box-shadow:0 0 20px rgba(245,182,55,0.9)} }`}</style>

      {/* Milestones */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:1, marginBottom:8 }}>Вехи пути</div>
        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
          {Object.entries(MILESTONES).map(([n, m]) => {
            const num = Number(n);
            const reached = completed >= num;
            return (
              <div key={n} style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"8px 12px", borderRadius:10,
                background: reached ? "rgba(245,182,55,0.08)" : "rgba(255,255,255,0.03)",
                border:`1px solid ${reached ? "rgba(245,182,55,0.25)" : "rgba(255,255,255,0.06)"}`,
                opacity: reached ? 1 : 0.6,
              }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{reached ? "✅" : m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:reached?"#f5b637":"rgba(255,255,255,0.6)" }}>
                    {num} квестов — {m.title}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>
                    +{m.gold} золота · +{m.xp} XP
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claim daily */}
      {data?.pendingToday === 0 && completed < 50 && (
        <button className="btn btn-primary" style={{ width:"100%", background:"linear-gradient(90deg,#f5b637,#fb7878)", color:"#0b0e17", fontWeight:700 }}
          onClick={claimDaily} disabled={busy}>
          {busy ? "..." : "⚔️ Получить квест дня"}
        </button>
      )}
      {data?.pendingToday > 0 && (
        <div style={{ textAlign:"center", padding:12, background:"rgba(245,182,55,0.06)", borderRadius:10, fontSize:13, color:"rgba(245,182,55,0.8)" }}>
          Легендарный квест уже активен — выполни его!
        </div>
      )}
      {completed >= 50 && (
        <div style={{ textAlign:"center", padding:20 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🌠</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#f5b637" }}>ЛЕГЕНДА</div>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:13 }}>Ты прошёл весь легендарный путь. Ты — легенда.</p>
        </div>
      )}
    </div>
  );
}
