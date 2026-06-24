import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric" });
}

export default function Sages({ token, showToast }) {
  const [sages, setSages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/sages`).then(r => { setSages(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <section className="quest-section page-enter">
      {/* Header */}
      <div style={{ textAlign:"center", padding:"24px 0 20px" }}>
        <div style={{ fontSize:36, marginBottom:12 }}>🏛️</div>
        <h1 style={{
          fontSize:22, fontWeight:900, letterSpacing:3,
          background:"linear-gradient(135deg,#fbbf24,#f59e0b,#a78bfa)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          margin:"0 0 8px",
        }}>ЗАЛ МУДРЕЦОВ</h1>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:0, lineHeight:1.6 }}>
          Эти игроки изменили LevelUp своими идеями
        </p>
      </div>

      {/* Decorative divider */}
      <div style={{
        display:"flex", alignItems:"center", gap:12, marginBottom:24,
        opacity:0.4,
      }}>
        <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,#fbbf24)" }}/>
        <span style={{ fontSize:14, color:"#fbbf24" }}>✦</span>
        <div style={{ flex:1, height:1, background:"linear-gradient(90deg,#fbbf24,transparent)" }}/>
      </div>

      {loading ? (
        <p className="empty-state">Загрузка...</p>
      ) : sages.length === 0 ? (
        <p className="empty-state">Здесь пока никого нет. Стань первым Мудрецом.</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {sages.map((sage, i) => (
            <div key={sage.id} style={{
              background:"linear-gradient(135deg,rgba(251,191,36,0.05),rgba(124,58,237,0.05))",
              border:"1px solid rgba(251,191,36,0.2)",
              borderRadius:14, padding:"16px 18px",
              position:"relative", overflow:"hidden",
              animation:`fadeInUp 0.3s ease-out ${i * 0.06}s both`,
            }}>
              {/* Gold number */}
              <div style={{
                position:"absolute", top:12, right:14,
                fontSize:32, fontWeight:900, opacity:0.05,
                color:"#fbbf24", lineHeight:1,
              }}>{i + 1}</div>

              <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                <div style={{
                  width:40, height:40, borderRadius:"50%", flexShrink:0,
                  background:"linear-gradient(135deg,#fbbf24,#f59e0b)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16, fontWeight:900, color:"#0d0d0d",
                }}>
                  {sage.name[0].toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:15, color:"#fbbf24", marginBottom:6 }}>
                    {sage.name}
                  </div>
                  <div style={{
                    fontSize:14, color:"rgba(255,255,255,0.8)", lineHeight:1.6,
                    paddingLeft:12, borderLeft:"2px solid rgba(251,191,36,0.3)",
                  }}>
                    💡 {sage.idea}
                  </div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.25)", marginTop:8 }}>
                    {fmtDate(sage.addedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
      `}</style>
    </section>
  );
}
