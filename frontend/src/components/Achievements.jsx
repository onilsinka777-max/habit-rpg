import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" });
}

export default function Achievements({ token, showToast }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [achievements, setAchievements] = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    axios.get(`${API}/achievements`, authHeaders)
      .then(res => setAchievements(res.data))
      .catch(e => { console.error(e); showToast("Не удалось загрузить достижения", "error"); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="empty-state">Загрузка...</p>;

  const unlocked = achievements.filter(a => a.unlocked);
  const locked   = achievements.filter(a => !a.unlocked);

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🏅</span> Достижения</div>

      <p style={{ fontSize:13, color:"rgba(255,255,255,0.45)", marginBottom:16 }}>
        {unlocked.length} / {achievements.length} открыто
      </p>

      {unlocked.length > 0 && (
        <>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
            Получено
          </div>
          <div className="quest-list" style={{ marginBottom:20 }}>
            {unlocked.map(a => (
              <div key={a.type} className="quest-card" style={{ borderColor:"rgba(234,179,8,0.3)", background:"rgba(234,179,8,0.05)" }}>
                <div className="quest-main">
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:28 }}>{a.icon}</span>
                    <div>
                      <h4 className="quest-title" style={{ margin:"0 0 2px", color:"#f1f5f9" }}>{a.label}</h4>
                      <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.45)" }}>{a.desc}</p>
                    </div>
                  </div>
                  {a.unlockedAt && (
                    <p style={{ margin:"6px 0 0", fontSize:11, color:"rgba(234,179,8,0.7)" }}>
                      🏆 {formatDate(a.unlockedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {locked.length > 0 && (
        <>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8 }}>
            Не открыто
          </div>
          <div className="quest-list">
            {locked.map(a => (
              <div key={a.type} className="quest-card" style={{ opacity:0.45 }}>
                <div className="quest-main">
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:28, filter:"grayscale(1)" }}>{a.icon}</span>
                    <div>
                      <h4 className="quest-title" style={{ margin:"0 0 2px" }}>{a.label}</h4>
                      <p style={{ margin:0, fontSize:12, color:"rgba(255,255,255,0.4)" }}>{a.desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
