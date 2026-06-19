export default function PlayerCard({ user, onLogout, onOpenScroll }) {
  const xpToNext  = user?.xpToNextLevel || 100;
  const xpPercent = Math.min(((user?.xp || 0) / xpToNext) * 100, 100);

  return (
    <div className="player-card">
      <div className="player-level-badge">
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
          <span>💰 {user.gold}</span>
          <span>🔥 {user.streak} дн.</span>
          <span>{user.xp} / {xpToNext} XP</span>
        </div>
        <div className="xp-bar">
          <div className="xp-fill" style={{ width: `${xpPercent}%` }} />
        </div>
      </div>
    </div>
  );
}