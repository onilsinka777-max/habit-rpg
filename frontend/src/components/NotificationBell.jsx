import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const TYPE_ICONS = {
  gift_received: "🎁", quest_complete: "✅", chain_complete: "⛓️",
  friend_request: "🤝", coop_invite: "🤜", mention: "@",
  achievement: "🏅", default: "🔔",
};

export default function NotificationBell({ token }) {
  const [notifs, setNotifs]   = useState([]);
  const [open, setOpen]       = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const panelRef = useRef(null);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/notifications`, auth);
      setNotifs(res.data);
    } catch {}
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [token]);

  useEffect(() => {
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unread = notifs.filter(n => !n.read).length;

  const markRead = async (id) => {
    await axios.patch(`${API}/notifications/${id}/read`, {}, auth).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAll = async () => {
    await axios.patch(`${API}/notifications/read-all`, {}, auth).catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="notif-bell-wrap" ref={panelRef} style={{ position:"relative" }}>
      <button className="rules-btn" onClick={() => setOpen(v => !v)} style={{ position:"relative", fontSize:18 }}>
        🔔
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px 6px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontWeight:700, fontSize:14 }}>Уведомления</span>
            {unread > 0 && <button className="btn btn-ghost btn-sm" onClick={markAll} style={{ fontSize:11 }}>Прочитать все</button>}
          </div>
          {notifs.length === 0 && (
            <p style={{ textAlign:"center", padding:20, opacity:0.4, fontSize:13 }}>Нет уведомлений</p>
          )}
          <div style={{ maxHeight:340, overflowY:"auto" }}>
            {notifs.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)} className="notif-item"
                style={{ background: n.read ? "transparent" : "rgba(141,140,248,0.08)", cursor:"pointer" }}>
                <span style={{ fontSize:20 }}>{TYPE_ICONS[n.type] || TYPE_ICONS.default}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{n.title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{n.text}</div>
                </div>
                {!n.read && <div style={{ width:7, height:7, borderRadius:"50%", background:"var(--accent,#8d8cf8)", flexShrink:0 }} />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
