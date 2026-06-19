import { useState } from "react";

export default function PlayerCard({ user, onLogout, onUpdateName }) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || "");

  const xpToNext = user?.xpToNextLevel || 100;
  const xpPercent = Math.min(((user?.xp || 0) / xpToNext) * 100, 100);

  const startEdit = () => {
    setNameInput(user?.name || "");
    setEditing(true);
  };

  const saveName = async () => {
    if (!nameInput.trim()) return;
    await onUpdateName(nameInput.trim());
    setEditing(false);
  };

  return (
    <div className="player-card">
      <div className="player-level-badge">
        <span className="player-level-number">{user.level}</span>
        <span className="player-level-caption">уровень</span>
      </div>

      <div className="player-info">
        <div className="player-row">
          {editing ? (
            <div className="name-edit-row">
              <input
                className="input name-edit-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={30}
                autoFocus
              />
              <button className="btn btn-primary btn-sm" onClick={saveName}>
                Сохранить
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                Отмена
              </button>
            </div>
          ) : (
            <span className="player-email" onClick={startEdit} title="Нажми, чтобы изменить имя">
              {user.name} <span className="edit-icon">✎</span>
            </span>
          )}

          {!editing && (
            <button className="btn btn-ghost btn-sm" onClick={onLogout}>
              Выйти
            </button>
          )}
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