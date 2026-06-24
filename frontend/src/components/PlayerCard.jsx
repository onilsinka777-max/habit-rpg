import { useState, useRef } from "react";
import axios from "axios";
import ArchiveBadge from "./ArchiveBadge";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CLASS_ICONS = {
  warrior:    '⚔️',
  sage:       '📚',
  balance:    '☯️',
  explorer:   '🗺️',
  strategist: '🧭',
  leader:     '👑',
  monk:       '🧘',
  athlete:    '💪',
  mage:       '🧙',
};

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

  const userClass = user.effectiveMasteryPath || user.autoClass || null;
  const classIcon = CLASS_ICONS[userClass] || null;
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
          background:"linear-gradient(135deg,rgba(124,58,237,0.25),rgba(76,29,149,0.35))",
          border:"2px solid rgba(124,58,237,0.4)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize: classIcon ? 28 : size*0.38, fontWeight:900, color:"rgba(255,255,255,0.5)",
          position:"relative",
        }}>
          <span style={{ opacity: classIcon ? 1 : (user.name ? 0.7 : 0.3) }}>
            {classIcon || (user.name ? initials : "📷")}
          </span>
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
  @keyframes darkPulse {
    0%,100%{opacity:0.8} 50%{opacity:1}
  }
  .player-badge {
    animation: neonPulse 2s ease-in-out infinite;
    font-size:11px; font-weight:700; letter-spacing:1px;
    text-transform:uppercase; margin-right:8px;
  }
`;

// eslint-disable-next-line no-unused-vars
export default function PlayerCard({ user, onLogout, onOpenScroll, onGoToShop, onGoToProfile, onAvatarChange }) {
  const xpToNext  = user?.xpToNextLevel || (1000 + ((user?.level || 1) - 1) * 100);
  const xpPercent = Math.min(((user?.xp || 0) / xpToNext) * 100, 100);
  const [tooltip, setTooltip] = useState(null);

  const showTip = (key) => setTooltip(key);
  const hideTip = () => setTooltip(null);

  const isDark = !!user?.darkSideActive;
  const darkInt = isDark ? Math.min((user?.darkSideDay || 1) / 3, 1) : 0;

  const cardBg    = isDark
    ? "linear-gradient(135deg, #1a0000, #0d0000)"
    : undefined;
  const nameColor = isDark
    ? `rgb(${Math.round(200 - darkInt * 100)}, 0, 0)`
    : undefined;
  const avatarFilter = isDark
    ? `saturate(${1 - darkInt * 0.8}) brightness(${1 - darkInt * 0.3}) contrast(${1 + darkInt * 0.3})`
    : undefined;
  const avatarBorder = isDark
    ? `3px solid rgba(139,0,0,${darkInt})`
    : undefined;
  const avatarShadow = isDark
    ? `0 0 ${Math.round(darkInt * 20)}px rgba(139,0,0,${(darkInt * 0.8).toFixed(2)})`
    : undefined;
  const xpBarBg = isDark
    ? "linear-gradient(90deg, #8b0000, #cc0000)"
    : "linear-gradient(90deg, #7c3aed, #a78bfa)";

  return (
    <>
      {isDark && (
        <div style={{
          background: "linear-gradient(90deg, #8b0000, #cc0000)",
          color: "#fff", padding: "6px", textAlign: "center",
          fontSize: 12, fontWeight: 700, letterSpacing: 1,
          animation: "darkPulse 2s ease-in-out infinite",
        }}>
          ⚠️ ТЁМНАЯ СТОРОНА АКТИВНА · ДЕНЬ {user.darkSideDay} · УРОВЕНЬ ПАДАЕТ
        </div>
      )}
      <div className="player-card" style={cardBg ? { background: cardBg } : undefined}>
        <style>{NEON_STYLE}</style>
        {tooltip && (
          <div className="pc-tooltip">
            {tooltip === "gold"  && "Нажми, чтобы перейти в магазин"}
            {tooltip === "xp"   && `До следующего уровня: ${Math.max(0, xpToNext - (user?.xp || 0))} XP`}
            {tooltip === "level" && `${user.level} уровень`}
          </div>
        )}

        <div onMouseEnter={() => showTip("level")} onMouseLeave={hideTip}
          style={{ filter: avatarFilter, borderRadius: "50%",
            border: avatarBorder, boxShadow: avatarShadow }}>
          <AvatarCircle user={user} size={64} onGoToProfile={onGoToProfile} onAvatarChange={onAvatarChange} />
        </div>

        <div className="player-info">
          <div className="player-row">
            <span className="player-email" style={nameColor ? { color: nameColor } : undefined}>
              <span className="player-badge">{isDark ? "ТЁМНАЯ" : "ИГРОК"}</span>
              <span className={user?.nicknameEffect ? `nick-${user.nicknameEffect}` : ""}>{user?.name}</span>
              {user?.archiveSolved && <ArchiveBadge />}
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
              background: xpBarBg,
              boxShadow: isDark ? "0 0 8px #8b0000" : "0 0 8px #7c3aed",
              transition: "width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            }}/>
          </div>
          <div style={{ fontSize:10, color: isDark ? "#cc0000" : "#a78bfa", textAlign:"right", marginTop:2,
            textShadow: isDark ? "0 0 8px rgba(139,0,0,0.6)" : "0 0 8px rgba(124,58,237,0.6)" }}>
            {user?.level} ур.{isDark ? " ↓" : ""}
          </div>
        </div>
      </div>
    </>
  );
}
