import { useState } from "react";

export default function PlayerCard({ user, onLogout, onOpenScroll, onGoToShop }) {
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

      <div className="player-level-badge"
        onClick={() => showTip(tooltip === "level" ? null : "level")}
        onMouseEnter={() => showTip("level")}
        onMouseLeave={hideTip}
        style={{ cursor:"pointer" }}>
        <span className="player-level-number">{user.level}</span>
        <span className="player-level-caption">уровень</span>
      </div>

      <div className="player-info">
        <div className="player-row">
          <span className="player-email">
            {user.name}
            {user.masteryStatusLabel && (
              <span className="player-status-label"> · {user.masteryStatusLabel}</span>
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