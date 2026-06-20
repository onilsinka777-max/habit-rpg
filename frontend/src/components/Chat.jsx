import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
}

export default function Chat({ token, showToast, friend, onBack }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState("");
  const [busy,     setBusy]     = useState(false);
  const bottomRef  = useRef(null);
  const intervalRef = useRef(null);

  const load = async () => {
    try {
      const res = await axios.get(`${API}/messages/${friend.id}`, authHeaders);
      setMessages(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 3000);
    return () => clearInterval(intervalRef.current);
  }, [friend.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim()) return;
    try {
      setBusy(true);
      const res = await axios.post(`${API}/messages/${friend.id}`, { text }, authHeaders);
      setMessages(m => [...m, res.data]);
      setText("");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка отправки", "error"); }
    finally { setBusy(false); }
  };

  return (
    <section className="quest-section" style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 280px)", minHeight:340 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>← Назад</button>
        <div className="section-eyebrow" style={{ margin:0 }}>
          <span>💬</span> {friend.name}
        </div>
      </div>

      {/* Messages area */}
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:8, padding:"4px 0", marginBottom:12 }}>
        {messages.length === 0 && (
          <p className="empty-state">Начни переписку первым!</p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ display:"flex", flexDirection:"column", alignItems:m.fromMe?"flex-end":"flex-start" }}>
            <div style={{
              maxWidth:"75%",
              background: m.fromMe ? "var(--accent, #8d8cf8)" : "rgba(255,255,255,0.07)",
              color: m.fromMe ? "#0b0e17" : "#e2e8f0",
              borderRadius: m.fromMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
              padding:"8px 12px",
              fontSize:13,
            }}>
              {m.text}
            </div>
            <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)", marginTop:2 }}>
              {formatTime(m.createdAt)}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display:"flex", gap:8 }}>
        <input
          className="input"
          placeholder="Сообщение..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !busy && send()}
          style={{ flex:1 }}
        />
        <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={send}
          style={{ flexShrink:0, minWidth:80 }}>
          {busy ? "..." : "Отправить"}
        </button>
      </div>
    </section>
  );
}
