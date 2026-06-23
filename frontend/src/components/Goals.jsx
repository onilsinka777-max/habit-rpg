import { useEffect, useState } from "react";
import axios from "axios";
import VoiceInput from "./VoiceInput";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export default function Goals({ token, showToast, askConfirm }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [goals,      setGoals]      = useState([]);
  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [busy,       setBusy]       = useState(false);
  const [showForm,   setShowForm]   = useState(false);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/goals`, authHeaders);
      setGoals(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) return;
    try {
      setBusy(true);
      const res = await axios.post(`${API}/goals`, {
        title,
        description: desc,
        targetDate: targetDate || undefined,
      }, authHeaders);
      setTitle(""); setDesc(""); setTargetDate(""); setShowForm(false);
      showToast("Цель добавлена!", "success");
      if (res.data.goldBonus > 0) showToast(`🎯 +${res.data.goldBonus} золота за цель!`, "gold");
      await load();
    } catch (e) {
      showToast(e.response?.data?.message || "Не удалось добавить", "error");
    } finally { setBusy(false); }
  };

  const toggle = async (goal) => {
    try {
      await axios.patch(`${API}/goals/${goal.id}`, { completed: !goal.completed }, authHeaders);
      await load();
    } catch (e) { showToast("Ошибка обновления", "error"); }
  };

  const remove = (goal) => {
    askConfirm({
      title: "Удалить цель?",
      text: `«${goal.title}» будет удалена навсегда.`,
      confirmLabel: "Удалить",
      onConfirm: async () => {
        try {
          await axios.delete(`${API}/goals/${goal.id}`, authHeaders);
          await load();
        } catch (e) { showToast("Не удалось удалить", "error"); }
      },
    });
  };

  const active    = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🎯</span> Мои цели</div>

      <button
        className="btn btn-primary btn-sm"
        style={{ marginBottom: 16 }}
        onClick={() => setShowForm(v => !v)}
      >
        {showForm ? "Отмена" : "+ Новая цель"}
      </button>

      {showForm && (
        <div className="goal-form">
          <input
            className="input"
            placeholder="Название цели"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div style={{ position:"relative" }}>
            <textarea
              className="journal-textarea"
              placeholder="Описание (необязательно)"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
            />
            <div style={{ position:"absolute", bottom:8, right:8 }}>
              <VoiceInput onResult={text => setDesc(prev => prev + text)} />
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
            <label style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>Дедлайн:</label>
            <input
              type="date"
              className="input"
              style={{ flex:1, minWidth:140 }}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <button
            className="btn btn-primary"
            disabled={busy || !title.trim()}
            onClick={create}
          >
            {busy ? "..." : "Добавить цель"}
          </button>
        </div>
      )}

      {goals.length === 0 ? (
        <p className="empty-state">Нет целей — добавь первую выше.</p>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <div className="section-eyebrow" style={{ marginTop:8 }}>
                <span>⏳</span> В процессе
              </div>
              <div className="goal-list">
                {active.map((g) => (
                  <GoalCard key={g.id} goal={g} onToggle={() => toggle(g)} onDelete={() => remove(g)} />
                ))}
              </div>
            </>
          )}

          {completed.length > 0 && (
            <>
              <div className="section-eyebrow" style={{ marginTop:16 }}>
                <span>✅</span> Выполнено
              </div>
              <div className="goal-list">
                {completed.map((g) => (
                  <GoalCard key={g.id} goal={g} onToggle={() => toggle(g)} onDelete={() => remove(g)} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

function GoalCard({ goal, onToggle, onDelete }) {
  const date = formatDate(goal.targetDate);
  const isOverdue = goal.targetDate && !goal.completed && new Date(goal.targetDate) < new Date();

  return (
    <div className={`goal-card ${goal.completed ? "completed" : ""}`}>
      <div className="goal-main">
        <div className="goal-title-row">
          <button className="goal-checkbox" onClick={onToggle}>
            {goal.completed ? "✓" : ""}
          </button>
          <h4 className="goal-title" style={{ textDecoration: goal.completed ? "line-through" : "none" }}>
            {goal.title}
          </h4>
        </div>
        {goal.description && (
          <p className="goal-desc">{goal.description}</p>
        )}
        {date && (
          <p className="goal-date" style={{ color: isOverdue ? "#f87171" : "rgba(255,255,255,0.4)" }}>
            {isOverdue ? "⚠️ Просрочено: " : "📅 Дедлайн: "}{date}
          </p>
        )}
      </div>
      <button className="btn btn-danger btn-sm" onClick={onDelete}>✕</button>
    </div>
  );
}