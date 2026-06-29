import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CLASS_LABELS = {
  warrior:     { label:"Воин",       color:"#ef4444" },
  sage:        { label:"Мудрец",     color:"#f59e0b" },
  leader:      { label:"Атлет",      color:"#22c55e" },
  balance:     { label:"Мыслитель",  color:"#8b5cf6" },
  strategist:  { label:"Стратег",    color:"#60a5fa" },
};

export default function RaidInviteModal({ token, showToast, raidId, onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [invited, setInvited] = useState(new Set());
  const [inviting, setInviting] = useState(null);
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  const load = useCallback(async (q = "") => {
    try {
      const r = await axios.get(`${API}/players/online${q ? `?q=${encodeURIComponent(q)}` : ""}`, authH);
      setPlayers(r.data || []);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const id = setTimeout(() => load(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const invite = async (userId) => {
    setInviting(userId);
    try {
      await axios.post(`${API}/raid/invite/${userId}`, {}, authH);
      setInvited(prev => new Set([...prev, userId]));
      showToast("⚔️ Приглашение отправлено!", "success");
    } catch (e) {
      showToast(e.response?.data?.message || "Ошибка", "error");
    } finally { setInviting(null); }
  };

  const onlineCount = players.filter(p => p.isOnline).length;
  const friendCount = players.filter(p => p.isFriend && !p.isOnline).length;

  const renderSection = (label, color, list) => {
    if (list.length === 0) return null;
    return (
      <div key={label} style={{ marginBottom: 8 }}>
        <div style={{
          fontSize: 10, fontWeight: 900, color, letterSpacing: 1.5, textTransform: "uppercase",
          padding: "8px 16px 6px", opacity: 0.8,
        }}>{label}</div>
        {list.map(p => {
          const cls = CLASS_LABELS[p.masteryPath];
          const wasInvited = invited.has(p.id);
          const ago = p.lastActiveAt
            ? Math.floor((Date.now() - new Date(p.lastActiveAt)) / 60000)
            : null;

          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              background: "transparent",
            }}>
              {/* Avatar / placeholder */}
              <div style={{
                width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                background: p.avatar ? "transparent" : "rgba(124,58,237,0.25)",
                border: `2px solid ${p.isOnline ? "#34d399" : "rgba(255,255,255,0.1)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, overflow: "hidden", position: "relative",
              }}>
                {p.avatar ? (
                  <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                ) : (
                  <span>{p.name?.[0]?.toUpperCase() || "?"}</span>
                )}
                {/* Online dot */}
                <span style={{
                  position: "absolute", bottom: 0, right: 0,
                  width: 11, height: 11, borderRadius: "50%",
                  background: p.isOnline ? "#34d399" : "#4b5563",
                  border: "2px solid #0a0a14",
                }} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </span>
                  {p.isFriend && (
                    <span style={{ fontSize: 9, background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, padding: "1px 5px", color: "#4ade80", flexShrink: 0 }}>
                      ДРУГ
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ур. {p.level}</span>
                  {cls && (
                    <span style={{ fontSize: 11, color: cls.color, fontWeight: 700 }}>{cls.label}</span>
                  )}
                  <span style={{ fontSize: 10, color: p.isOnline ? "#34d399" : "rgba(255,255,255,0.25)" }}>
                    {p.isOnline ? "● онлайн" : ago !== null ? (ago < 60 ? `${ago}м назад` : `${Math.floor(ago/60)}ч назад`) : "давно"}
                  </span>
                </div>
              </div>

              {/* Invite button */}
              <button
                onClick={() => !wasInvited && invite(p.id)}
                disabled={inviting === p.id || wasInvited}
                style={{
                  background: wasInvited ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.2)",
                  border: `1px solid ${wasInvited ? "rgba(34,197,94,0.4)" : "rgba(124,58,237,0.5)"}`,
                  borderRadius: 12, padding: "7px 14px",
                  color: wasInvited ? "#4ade80" : "#c4b5fd",
                  fontSize: 12, fontWeight: 800, cursor: wasInvited ? "default" : "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                  opacity: inviting === p.id ? 0.5 : 1,
                  transition: "all 0.15s",
                }}>
                {wasInvited ? "✓ Отправлено" : inviting === p.id ? "..." : "Позвать"}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  const online = players.filter(p => p.isOnline);
  const friends = players.filter(p => p.isFriend && !p.isOnline);
  const others = players.filter(p => !p.isOnline && !p.isFriend);

  return (
    <>
      <style>{`
        @keyframes modalUp {
          from { opacity:0; transform:translateY(40px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 980,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 990,
        background: "#0a0a14",
        borderRadius: "20px 20px 0 0",
        border: "1px solid rgba(124,58,237,0.4)",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.9)",
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        animation: "modalUp 0.28s cubic-bezier(0.34,1.2,0.64,1)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>👥 Позвать в рейд</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
              {onlineCount > 0 ? `${onlineCount} онлайн` : "Никого онлайн"}
              {friendCount > 0 && ` · ${friendCount} друзей`}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "50%",
            width: 32, height: 32, cursor: "pointer", color: "rgba(255,255,255,0.6)",
            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
          }}>✕</button>
        </div>

        {/* Search */}
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "8px 12px",
          }}>
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>🔍</span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Поиск по имени..."
              autoFocus
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 14, fontFamily: "monospace",
              }}
            />
            {query && (
              <button onClick={() => setQuery("")} style={{
                background: "none", border: "none", color: "rgba(255,255,255,0.4)",
                cursor: "pointer", fontSize: 16, padding: 0,
              }}>✕</button>
            )}
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, paddingTop: 8, scrollbarWidth: "none" }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
              Загрузка...
            </div>
          ) : players.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
              Никого не найдено
            </div>
          ) : (
            <>
              {renderSection("● Онлайн сейчас", "#34d399", online)}
              {renderSection("Друзья", "#818cf8", friends)}
              {renderSection("Все игроки", "rgba(255,255,255,0.3)", others)}
            </>
          )}
          <div style={{ height: 20 }} />
        </div>
      </div>
    </>
  );
}
