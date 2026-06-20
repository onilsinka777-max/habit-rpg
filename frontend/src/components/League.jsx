import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const LEAGUE_TIERS = [
  { name:"Бронза",    icon:"🥉", color:"#cd7f32" },
  { name:"Серебро",   icon:"🥈", color:"#9ca3af" },
  { name:"Золото",    icon:"🥇", color:"#d97706" },
  { name:"Платина",   icon:"💎", color:"#38bdf8" },
  { name:"Бриллиант", icon:"💠", color:"#6366f1" },
];

function getTimeToReset() {
  const now = new Date();
  const nextSun = new Date(now);
  nextSun.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
  nextSun.setHours(23, 59, 0, 0);
  const diff = nextSun - now;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${d}д ${h}ч ${m}м`;
}

export default function League({ token, showToast }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/league/current`, auth)
      .then(r => setData(r.data))
      .catch(() => showToast("Ошибка загрузки лиги", "error"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="empty-state">Загрузка...</p>;
  if (!data) return <p className="empty-state">Нет данных</p>;

  const tier = LEAGUE_TIERS.find(l => l.name === data.leagueName) || LEAGUE_TIERS[0];
  const myRank = data.myRank || 1;

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🏆</span> Лиги</div>

      {/* My league card */}
      <div style={{
        background: `linear-gradient(135deg, ${tier.color}18, rgba(14,17,30,0.9))`,
        border: `1px solid ${tier.color}44`,
        borderRadius:16, padding:20, marginBottom:20,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <span style={{ fontSize:48 }}>{tier.icon}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:tier.color, marginBottom:4 }}>ТВОЯ ЛИГА</div>
            <div style={{ fontSize:26, fontWeight:900, color:tier.color }}>{tier.name}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:4 }}>
              {data.weeklyXp} XP за эту неделю · Место #{myRank}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:4 }}>Сброс через</div>
            <div style={{ fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.6)" }}>{getTimeToReset()}</div>
          </div>
        </div>

        {/* League progress dots */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:16 }}>
          {LEAGUE_TIERS.map((l, i) => {
            const myTierIdx = LEAGUE_TIERS.findIndex(t => t.name === data.leagueName);
            const status = i < myTierIdx ? "done" : i === myTierIdx ? "current" : "locked";
            return (
              <div key={l.name} style={{ textAlign:"center", flex:1 }}>
                <div style={{
                  width:32, height:32, borderRadius:"50%", margin:"0 auto 4px",
                  background: status==="done" ? `${l.color}66` : status==="current" ? l.color : "rgba(255,255,255,0.08)",
                  border: `2px solid ${status!=="locked" ? l.color : "rgba(255,255,255,0.1)"}`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:16,
                }}>{l.icon}</div>
                <div style={{ fontSize:9, color: status==="current" ? l.color : "rgba(255,255,255,0.25)" }}>{l.name}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,0.35)", letterSpacing:1, marginBottom:12 }}>
        ТАБЛИЦА ЛИДЕРОВ · {data.leagueName.toUpperCase()}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {(data.leaderboard || []).map((row, i) => (
          <div key={row.userId} style={{
            display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
            background: row.isMe ? `${tier.color}18` : "rgba(255,255,255,0.03)",
            border: `1px solid ${row.isMe ? tier.color+"44" : "rgba(255,255,255,0.06)"}`,
            borderRadius:10,
          }}>
            <div style={{
              width:28, height:28, borderRadius:"50%",
              background: i===0?"#f5b637":i===1?"#9ca3af":i===2?"#cd7f32":"rgba(255,255,255,0.08)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:12, fontWeight:800,
              color: i<3 ? "#0b0e17" : "rgba(255,255,255,0.5)",
            }}>
              {i===0?"🥇":i===1?"🥈":i===2?"🥉":row.rank}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:14, color: row.isMe ? tier.color : "#f1f5f9" }}>
                {row.name} {row.isMe && <span style={{ fontSize:11, color:tier.color }}>(ты)</span>}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Ур.{row.level}</div>
            </div>
            <div style={{ fontWeight:700, fontSize:14, color: i===0?"#f5b637":i===1?"#9ca3af":i===2?"#cd7f32":"rgba(255,255,255,0.7)" }}>
              {row.weeklyXp} XP
            </div>
          </div>
        ))}
        {(!data.leaderboard || data.leaderboard.length === 0) && (
          <p className="empty-state">В лиге пока никого нет</p>
        )}
      </div>
    </section>
  );
}
