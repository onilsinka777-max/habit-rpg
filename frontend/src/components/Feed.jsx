import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const EVENT_ICONS = {
  chain_complete: "⛓️", level_up: "🆙", achievement: "🏅",
  streak_milestone: "🔥", legendary_complete: "⚔️", default: "✅",
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "только что";
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

function eventText(type, data) {
  if (type === "chain_complete") return `завершил цепочку «${data.chainTitle}» ${data.chainIcon || ""}`;
  if (type === "level_up")       return `достиг ${data.level} уровня!`;
  if (type === "achievement")    return `получил достижение «${data.label || data.type}»`;
  if (type === "streak_milestone") return `набрал серию ${data.streak} дней 🔥`;
  return "выполнил квест";
}

export default function Feed({ token, showToast }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/feed`, auth)
      .then(r => setEvents(r.data))
      .catch(() => showToast("Ошибка загрузки ленты", "error"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;

  return (
    <div className="section-card">
      <div className="section-eyebrow"><span>📡</span> Лента друзей</div>
      {events.length === 0 && (
        <div style={{ textAlign:"center", padding:32 }}>
          <p style={{ fontSize:32, marginBottom:8 }}>📡</p>
          <p style={{ opacity:0.5, fontSize:13 }}>Лента пуста — добавь друзей, чтобы видеть их прогресс</p>
        </div>
      )}
      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
        {events.map(e => (
          <div key={e.id} className="feed-item" style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"10px 0", borderBottom:"1px solid rgba(255,255,255,0.05)",
          }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{EVENT_ICONS[e.type] || EVENT_ICONS.default}</span>
            <div style={{ flex:1 }}>
              <span style={{ fontWeight:600, fontSize:13 }}>{e.userName}</span>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.55)" }}> {eventText(e.type, e.data)}</span>
            </div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", flexShrink:0 }}>{timeAgo(e.createdAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
