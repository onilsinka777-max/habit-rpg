import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Marathons({ token, showToast }) {
  const [marathons, setMarathons] = useState([]);
  const [loading, setLoading]     = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const res = await axios.get(`${API}/marathons`, auth);
      setMarathons(res.data);
    } catch { showToast("Ошибка загрузки", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const join = async (id) => {
    try {
      await axios.post(`${API}/marathons/${id}/join`, {}, auth);
      showToast("Марафон начат!", "success");
      load();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const checkin = async (id) => {
    try {
      const res = await axios.post(`${API}/marathons/${id}/checkin`, {}, auth);
      showToast(`День ${res.data.day} засчитан!${res.data.bonus ? " " + res.data.bonus : ""}`, "success");
      if (res.data.completed) showToast("🎉 Марафон завершён!", "success");
      load();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  if (loading) return <p className="empty-state">Загрузка...</p>;

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🏃</span> Марафоны</div>
      <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:"0 0 20px" }}>
        Придерживайся цели каждый день — пропустил день, марафон сбрасывается
      </p>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {marathons.map(m => {
          const p = m.progress;
          const pct = p ? Math.round((p.currentDay / m.durationDays) * 100) : 0;
          const isActive = p && !p.completed && !p.failed;
          const isDone   = p?.completed;
          const isFailed = p?.failed;

          return (
            <div key={m.id} style={{
              background: isDone ? "rgba(52,211,153,0.06)" : isFailed ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${isDone ? "rgba(52,211,153,0.2)" : isFailed ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.07)"}`,
              borderRadius:14, padding:"16px 18px",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
                <span style={{ fontSize:32 }}>{m.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:16 }}>{m.title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", marginTop:2 }}>{m.description}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Награда</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#f5b637" }}>+{m.rewardGold}g</div>
                  <div style={{ fontSize:12, color:"#c084fc" }}>+{m.rewardXp}XP</div>
                </div>
              </div>

              {isActive && (
                <>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:6 }}>
                    <span>День {p.currentDay} / {m.durationDays}</span>
                    <span>{pct}%</span>
                  </div>
                  <div style={{ height:8, background:"rgba(255,255,255,0.08)", borderRadius:4, marginBottom:12 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:"var(--accent,#8d8cf8)", borderRadius:4, transition:"width 0.4s" }} />
                  </div>
                  <button className="btn btn-primary" onClick={() => checkin(m.id)} style={{ width:"100%", fontSize:13 }}>
                    ✓ Отметить день
                  </button>
                </>
              )}

              {!p && (
                <button className="btn btn-primary" onClick={() => join(m.id)} style={{ width:"100%", fontSize:13, marginTop:8 }}>
                  Начать марафон
                </button>
              )}

              {isDone && <div style={{ color:"#34d399", fontWeight:700, fontSize:14, textAlign:"center", marginTop:4 }}>✅ Завершён!</div>}
              {isFailed && (
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:4 }}>
                  <span style={{ color:"#ef4444", fontSize:13 }}>❌ Сброшен (пропустил день)</span>
                  <button className="btn" onClick={() => join(m.id)} style={{ fontSize:12, padding:"4px 10px" }}>Начать заново</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
