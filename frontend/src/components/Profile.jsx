import { useEffect, useState } from "react";
import axios from "axios";
import Avatar from "./Avatar";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_LABELS = {
  discipline: "Дисциплина", fitness: "Фитнес",
  self_development: "Саморазвитие", knowledge: "Знания",
};

export default function Profile({ token, showToast, userId, currentUserId }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const targetId = userId || currentUserId;

  useEffect(() => {
    if (!targetId) return;
    axios.get(`${API}/profile/${targetId}`, auth)
      .then(r => setProfile(r.data))
      .catch(() => showToast("Ошибка загрузки профиля", "error"))
      .finally(() => setLoading(false));
  }, [targetId, token]);

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;
  if (!profile) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Профиль не найден</p></div>;

  const rankXp = profile.seasonXp || 0;
  const seasonRank = rankXp >= 5000 ? "Легенда" : rankXp >= 2000 ? "Платина" : rankXp >= 800 ? "Золото" : rankXp >= 250 ? "Серебро" : "Бронза";

  return (
    <div className="section-card">
      <div className="profile-header" style={{
        background: "linear-gradient(135deg, rgba(141,140,248,0.1), rgba(30,27,50,0.8))",
        border: "1px solid rgba(141,140,248,0.2)", borderRadius: 14, padding: "20px 16px", marginBottom: 16,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <Avatar level={profile.level} frame={profile.avatarFrame || "none"} size={72} />
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              {profile.title && profile.title !== "Новичок" && (
                <span style={{ fontSize:11, fontWeight:700, color:"#eab308", background:"rgba(234,179,8,0.12)", borderRadius:5, padding:"1px 7px" }}>
                  {profile.title}
                </span>
              )}
              <span style={{ fontWeight:800, fontSize:20 }}>{profile.name}</span>
            </div>
            {profile.clan && (
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:3 }}>
                {profile.clan.bannerIcon} {profile.clan.name}
              </div>
            )}
            {profile.masteryPath && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                Путь: {BRANCH_LABELS[profile.masteryPath] || profile.masteryPath}
              </div>
            )}
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:28, fontWeight:900, color:"var(--accent,#8d8cf8)" }}>{profile.level}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>уровень</div>
          </div>
        </div>
      </div>

      <div className="profile-stat-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:16 }}>
        {[
          { label:"Квестов", value:profile.taskCount, icon:"✅" },
          { label:"Серия", value:profile.streak, icon:"🔥" },
          { label:"Сезон XP", value:rankXp, icon:"🌅" },
        ].map(s => (
          <div key={s.label} style={{ textAlign:"center", background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 6px" }}>
            <div style={{ fontSize:18 }}>{s.icon}</div>
            <div style={{ fontWeight:700, fontSize:18 }}>{s.value}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {profile.achievements?.length > 0 && (
        <div>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:8, color:"rgba(255,255,255,0.6)" }}>Достижения</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {profile.achievements.map(a => (
              <div key={a.id} style={{ background:"rgba(234,179,8,0.1)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:8, padding:"6px 12px", display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:18 }}>{a.icon || "🏅"}</span>
                <span style={{ fontSize:12, fontWeight:600 }}>{a.label || a.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {targetId === currentUserId && profile.hasEverFinishedMastery && (
        <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(245,182,55,0.08)", border:"1px solid rgba(245,182,55,0.2)", borderRadius:8, fontSize:12, color:"#f5b637" }}>
          ⚔️ Мастерство завершено · Ранг сезона: {seasonRank}
        </div>
      )}
    </div>
  );
}
