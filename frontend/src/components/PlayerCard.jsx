import { useState } from "react";
import Avatar from "./Avatar";

export default function PlayerCard({ user, onLogout, onOpenScroll, onGoToShop, onGoToProfile }) {
  const xpToNext  = user?.xpToNextLevel || 100;
  const xpPercent = Math.min(((user?.xp || 0) / xpToNext) * 100, 100);
  const [tooltip, setTooltip] = useState(null);

  const showTip = (key) => setTooltip(key);
  const hideTip = () => setTooltip(null);

  return (
    <div className="player-card">
      {/* Tooltip */}
      {tooltip && (
        <div className="pc-tooltip">
          {tooltip === "gold"   && "Нажми, чтобы перейти в магазин"}
          {tooltip === "streak" && `Серия: ${user.streak} ${user.streak===1?"день":user.streak<5?"дня":"дней"} подряд`}
          {tooltip === "xp"    && `До следующего уровня: ${xpToNext - (user?.xp || 0)} XP`}
          {tooltip === "level" && `Сейчас у вас ${user.level} уровень`}
        </div>
      )}

      <div onClick={() => onGoToProfile ? onGoToProfile() : showTip(tooltip === "level" ? null : "level")}
        onMouseEnter={() => showTip("level")} onMouseLeave={hideTip}
        style={{ cursor:"pointer", position:"relative" }} title="Открыть профиль">
        <Avatar level={user.level} frame={user.avatarFrame || "none"} size={64} />
        <div style={{
          position:"absolute", bottom:-8, left:"50%", transform:"translateX(-50%)",
          background:"var(--accent,#8d8cf8)", borderRadius:999, minWidth:26,
          padding:"2px 7px", textAlign:"center",
          fontSize:12, fontWeight:900, color:"#0b0e17",
          zIndex:10, boxShadow:"0 2px 8px rgba(0,0,0,0.5)",
          whiteSpace:"nowrap",
        }}>{user.level} ур.</div>
      </div>

      <div className="player-info">
        <div className="player-row">
          <span className="player-email">
            {user.title && user.title !== "Новичок" && (
              <span style={{ fontSize:11, fontWeight:700, color:"#eab308", marginRight:6,
                background:"rgba(234,179,8,0.12)", borderRadius:5, padding:"1px 6px" }}>
                {user.title}
              </span>
            )}
            <span className={user.nicknameEffect ? `nick-${user.nicknameEffect}` : ""}>{user.name}</span>
            {user.masteryStatusLabel && (
              <span className="player-status-label"> · {user.masteryStatusLabel}</span>
            )}
            {user.autoClass && (
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.3)", marginLeft:6 }}>
                [{user.autoClass}]
              </span>
            )}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>Выйти</button>
        </div>

        <div className="player-stats">
          <span
            className="player-stat-btn"
            onClick={() => onGoToShop && onGoToShop()}
            onMouseEnter={() => showTip("gold")}
            onMouseLeave={hideTip}
            title="Перейти в магазин"
          >
            💰 {user.gold}
          </span>
          <span
            className="player-stat-btn"
            onMouseEnter={() => showTip("streak")}
            onMouseLeave={hideTip}
            onClick={() => showTip(tooltip === "streak" ? null : "streak")}
          >
            🔥 {user.streak} дн.
          </span>
          <span
            className="player-stat-btn"
            onMouseEnter={() => showTip("xp")}
            onMouseLeave={hideTip}
            onClick={() => showTip(tooltip === "xp" ? null : "xp")}
          >
            {user.xp} / {xpToNext} XP
          </span>
        </div>

        <div className="xp-bar"
          onMouseEnter={() => showTip("xp")}
          onMouseLeave={hideTip}>
          <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>
    </div>
  );
}