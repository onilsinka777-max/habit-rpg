import { useEffect, useState } from "react";
import axios from "axios";
import Avatar from "./Avatar";
import ArchiveBadge from "./ArchiveBadge";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_LABELS = {
  discipline: "Дисциплина", fitness: "Фитнес",
  self_development: "Саморазвитие", knowledge: "Знания",
};

export default function Profile({ token, showToast, userId, currentUserId, onBack, onProfileRefresh }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [titles, setTitles] = useState([]);
  const [activeTitle, setActiveTitle] = useState("Игрок");
  const [settingTitle, setSettingTitle] = useState(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const targetId = userId || currentUserId;
  const isOwn = !userId || userId === currentUserId;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!targetId) return;
    axios.get(`${API}/profile/${targetId}`, auth)
      .then(r => { setProfile(r.data); setActiveTitle(r.data.activeTitle || "Игрок"); })
      .catch(() => showToast("Ошибка загрузки профиля", "error"))
      .finally(() => setLoading(false));
    if (isOwn) {
      axios.get(`${API}/titles`, auth)
        .then(r => { setTitles(r.data.titles || []); setActiveTitle(r.data.activeTitle || "Игрок"); })
        .catch(() => {});
    }
  }, [targetId, token]);

  const selectTitle = async (title) => {
    setSettingTitle(title);
    try {
      await axios.patch(`${API}/titles/active`, { title }, auth);
      setActiveTitle(title);
      showToast(`Титул "${title}" выбран`, "success");
      onProfileRefresh?.();
    } catch { showToast("Ошибка", "error"); }
    finally { setSettingTitle(null); }
  };

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;
  if (!profile) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Профиль не найден</p></div>;

  const rankXp = profile.seasonXp || 0;
  const seasonRank = rankXp >= 5000 ? "Легенда" : rankXp >= 2000 ? "Платина" : rankXp >= 800 ? "Золото" : rankXp >= 250 ? "Серебро" : "Бронза";

  return (
    <div className="section-card">
      {onBack && userId && (
        <button
          onClick={onBack}
          style={{
            background:"none", border:"none", color:"rgba(255,255,255,0.5)", cursor:"pointer",
            fontSize:13, padding:"0 0 12px", display:"flex", alignItems:"center", gap:6,
          }}>
          ← Назад к друзьям
        </button>
      )}
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
              {profile.archiveSolved && <ArchiveBadge />}
            </div>
            {(activeTitle || profile.activeTitle) && (
              <div style={{ marginTop:3 }}>
                <span style={{ fontSize:11, color:"#a78bfa", fontWeight:600, background:"rgba(167,139,250,0.12)", borderRadius:5, padding:"1px 8px" }}>
                  {isOwn ? activeTitle : (profile.activeTitle || "Игрок")}
                </span>
              </div>
            )}
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

      {profile.pet && (
        <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(74,222,128,0.06)", border:"1px solid rgba(74,222,128,0.15)", borderRadius:8, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>{profile.pet.stage === "adult" ? "🐉" : profile.pet.stage === "baby" ? "🐣" : "🥚"}</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700 }}>{profile.pet.name}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Настроение {profile.pet.mood}%</div>
          </div>
        </div>
      )}

      {targetId === currentUserId && profile.hasEverFinishedMastery && (
        <div style={{ marginTop:12, padding:"8px 12px", background:"rgba(245,182,55,0.08)", border:"1px solid rgba(245,182,55,0.2)", borderRadius:8, fontSize:12, color:"#f5b637" }}>
          ⚔️ Мастерство завершено · Ранг сезона: {seasonRank}
        </div>
      )}

      {isOwn && titles.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontWeight:700, fontSize:13, marginBottom:10, color:"rgba(255,255,255,0.6)" }}>Мои титулы</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {titles.map(t => {
              const isActive = t === activeTitle;
              return (
                <div key={t} style={{
                  display:"flex", alignItems:"center", gap:6,
                  background: isActive ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.1)"}`,
                  borderRadius:8, padding:"6px 12px",
                  transition:"all 0.2s",
                }}>
                  <span style={{ fontSize:13, fontWeight:isActive?700:500, color: isActive ? "#a78bfa" : "rgba(255,255,255,0.7)" }}>{t}</span>
                  {!isActive && (
                    <button
                      style={{ background:"none", border:"none", color:"#a78bfa", cursor:"pointer", fontSize:11, padding:0, opacity:0.7 }}
                      disabled={settingTitle === t}
                      onClick={() => selectTitle(t)}
                    >{settingTitle === t ? "..." : "Выбрать"}</button>
                  )}
                  {isActive && <span style={{ fontSize:10, color:"#a78bfa" }}>✓ активен</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
