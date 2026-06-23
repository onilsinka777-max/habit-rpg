import { useState, useRef } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function AvatarCircle({ user, size, onGoToProfile, onAvatarChange }) {
  const inputRef = useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      try {
        const token = localStorage.getItem("token");
        await axios.patch(`${API}/me/avatar`, { avatar: base64 }, { headers: { Authorization: `Bearer ${token}` } });
        onAvatarChange?.(base64);
      } catch { /* silent */ }
    };
    reader.readAsDataURL(file);
  };

  const initials = (user.name || user.email || "?")[0].toUpperCase();

  return (
    <div style={{ position:"relative", cursor:"pointer" }}
      onClick={() => inputRef.current?.click()}
      title="Нажми чтобы загрузить фото">
      <input ref={inputRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handleFile} />
      {user.avatar ? (
        <img src={user.avatar} alt="avatar" style={{
          width:size, height:size, borderRadius:"50%", objectFit:"cover",
          border:"2px solid rgba(124,58,237,0.6)", display:"block",
        }}/>
      ) : (
        <div style={{
          width:size, height:size, borderRadius:"50%",
          background:"rgba(124,58,237,0.15)",
          border:"2px solid rgba(124,58,237,0.3)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:size*0.38, fontWeight:900, color:"rgba(255,255,255,0.5)",
          position:"relative",
        }}>
          <span style={{ opacity: user.name ? 0.7 : 0.3 }}>{user.name ? initials : "📷"}</span>
          <div style={{
            position:"absolute", inset:0, borderRadius:"50%",
            background:"rgba(124,58,237,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center",
            opacity:0, transition:"opacity 0.15s",
          }} className="avatar-hover-overlay">📷</div>
        </div>
      )}
      {/* Level badge */}
      <div onClick={(e)=>{e.stopPropagation();onGoToProfile?.();}} style={{
        position:"absolute", bottom:-8, left:"50%", transform:"translateX(-50%)",
        background:"linear-gradient(135deg,#7c3aed,#4c1d95)", borderRadius:999, minWidth:28,
        padding:"2px 8px", textAlign:"center",
        fontSize:11, fontWeight:900, color:"#fff",
        zIndex:10, boxShadow:"0 2px 8px rgba(124,58,237,0.4)",
        whiteSpace:"nowrap", cursor:"pointer",
        textShadow:"0 0 8px #7c3aed",
      }}>{user.level} ур.</div>
    </div>
  );
}

const NEON_STYLE = `
  @keyframes neonPulse {
    0%,100% { text-shadow:0 0 5px #7c3aed,0 0 10px #7c3aed; color:#a78bfa; }
    50% { text-shadow:0 0 10px #a78bfa,0 0 20px #7c3aed,0 0 30px #7c3aed; color:#c4b5fd; }
  }
  .player-badge {
    animation: neonPulse 2s ease-in-out infinite;
    font-size:11px; font-weight:700; letter-spacing:1px;
    text-transform:uppercase; margin-right:8px;
  }
`;

export default function PlayerCard({ user, onLogout, onOpenScroll, onGoToShop, onGoToProfile, onAvatarChange }) {
  const xpToNext  = user?.xpToNextLevel || 100;
  const xpPercent = Math.min(((user?.xp || 0) / xpToNext) * 100, 100);
  const [tooltip, setTooltip] = useState(null);

  const showTip = (key) => setTooltip(key);
  const hideTip = () => setTooltip(null);

  return (
    <div className="player-card">
      <style>{NEON_STYLE}</style>
      {tooltip && (
        <div className="pc-tooltip">
          {tooltip === "gold"  && "Нажми, чтобы перейти в магазин"}
          {tooltip === "xp"   && `До следующего уровня: ${Math.max(0, xpToNext - (user?.xp || 0))} XP`}
          {tooltip === "level" && `${user.level} уровень`}
        </div>
      )}

      <div onMouseEnter={() => showTip("level")} onMouseLeave={hideTip}>
        <AvatarCircle user={user} size={64} onGoToProfile={onGoToProfile} onAvatarChange={onAvatarChange} />
      </div>

      <div className="player-info">
        <div className="player-row">
          <span className="player-email">
            <span className="player-badge">ИГРОК</span>
            <span className={user?.nicknameEffect ? `nick-${user.nicknameEffect}` : ""}>{user?.name}</span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Выйти</button>
        </div>

        <div className="player-stats">
          <span className="player-stat-btn"
            onClick={() => onGoToShop && onGoToShop()}
            onMouseEnter={() => showTip("gold")} onMouseLeave={hideTip}>
            💰 {user?.gold}
          </span>
          <span className="player-stat-btn"
            onMouseEnter={() => showTip("xp")} onMouseLeave={hideTip}>
            {user?.xp} / {xpToNext} XP
          </span>
          {(user?.streak > 0) && (
            <span style={{ fontSize:12, fontWeight:700, color:"#fb923c" }}>
              🔥 {user.streak}
            </span>
          )}
        </div>

        <div className="xp-bar" onMouseEnter={() => showTip("xp")} onMouseLeave={hideTip}>
          <div className="xp-fill" style={{
            width: `${xpPercent}%`,
            background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
            boxShadow: "0 0 8px #7c3aed",
          }}/>
        </div>
        <div style={{ fontSize:10, color:"#a78bfa", textAlign:"right", marginTop:2,
          textShadow:"0 0 8px rgba(124,58,237,0.6)" }}>
          {user?.level} ур.
        </div>
      </div>
    </div>
  );
}
