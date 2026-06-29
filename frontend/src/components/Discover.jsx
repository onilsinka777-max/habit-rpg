import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const CLASS_ICON = {
  warrior: "⚔️", sage: "📚", strategist: "♟️", explorer: "🗺️", balance: "☯️",
};

function PlayerCard({ player, onAdd, addedIds }) {
  const isAdded = addedIds.has(player.id);
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (isAdded || loading) return;
    setLoading(true);
    await onAdd(player.id);
    setLoading(false);
  };

  return (
    <div style={{
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}>
      {/* Avatar */}
      <div style={{
        width: 46, height: 46, borderRadius: "50%",
        background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, flexShrink: 0,
        boxShadow: "0 0 12px rgba(124,58,237,0.4)",
      }}>
        {player.avatar ? (
          <img src={player.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <span>{CLASS_ICON[player.hiddenClass] || "🧙"}</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {player.name || "Игрок"}
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 11, color: "rgba(255,255,255,0.45)", flexWrap: "wrap" }}>
          <span>⚡ Ур. {player.level}</span>
          {player.streak > 0 && <span>🔥 {player.streak} дн.</span>}
          {player.title && <span style={{ color: "#a78bfa" }}>{player.title}</span>}
        </div>
      </div>

      {/* Add button */}
      <button
        onClick={handle}
        disabled={isAdded || loading}
        style={{
          background: isAdded
            ? "rgba(34,197,94,0.15)"
            : "rgba(124,58,237,0.2)",
          border: `1px solid ${isAdded ? "rgba(34,197,94,0.4)" : "rgba(124,58,237,0.4)"}`,
          borderRadius: 12,
          padding: "8px 14px",
          color: isAdded ? "#22c55e" : "#c4b5fd",
          fontSize: 12,
          fontWeight: 700,
          cursor: isAdded ? "default" : "pointer",
          whiteSpace: "nowrap",
          flexShrink: 0,
          transition: "all 0.15s",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "..." : isAdded ? "✓ Отправлено" : "+ Добавить"}
      </button>
    </div>
  );
}

export default function Discover({ token, showToast }) {
  const [players, setPlayers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [addedIds, setAddedIds] = useState(new Set());
  const loaderRef = useRef(null);
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const loadMore = useCallback(async (pageNum = 1, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const r = await axios.get(`${API}/players/discover?page=${pageNum}&limit=20`, authHeaders);
      const { players: newPlayers, hasMore: more } = r.data;
      setPlayers(prev => reset ? newPlayers : [...prev, ...newPlayers]);
      setHasMore(more);
      setPage(pageNum + 1);
    } catch {
      showToast("Не удалось загрузить игроков", "error");
    } finally {
      setLoading(false);
    }
  }, [loading, token]);

  useEffect(() => {
    loadMore(1, true);
  }, []);

  // Infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore(page);
      }
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, loading, page, loadMore]);

  const addFriend = async (userId) => {
    try {
      const r = await axios.post(`${API}/friends/request-by-id`, { userId }, authHeaders);
      showToast(r.data.message, "success");
      setAddedIds(prev => new Set([...prev, userId]));
    } catch (e) {
      const msg = e.response?.data?.message || "Ошибка";
      if (msg === "Уже в друзьях" || msg === "Заявка уже отправлена") {
        setAddedIds(prev => new Set([...prev, userId]));
      }
      showToast(msg, "error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a14",
      padding: "16px 16px 120px",
      color: "#fff",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>
          🌐 Открытие игроков
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          Находи новых союзников и добавляй в друзья
        </div>
      </div>

      {/* Player list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {players.map(p => (
          <PlayerCard key={p.id} player={p} onAdd={addFriend} addedIds={addedIds} />
        ))}
      </div>

      {/* Loader sentinel */}
      <div ref={loaderRef} style={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loading && (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>Загрузка...</div>
        )}
        {!loading && !hasMore && players.length > 0 && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 16 }}>
            Все игроки загружены
          </div>
        )}
        {!loading && players.length === 0 && (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14, marginTop: 20 }}>
            Нет новых игроков для открытия
          </div>
        )}
      </div>
    </div>
  );
}
