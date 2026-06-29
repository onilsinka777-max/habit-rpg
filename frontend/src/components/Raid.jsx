import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const DIFF_COLOR = {
  easy: "#22c55e", medium: "#f59e0b", hard: "#ef4444",
  epic: "#a855f7", legendary: "#f97316",
};

function useCountdown(endsAt) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) { setTimeLeft("Завершён"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}ч ${m}м ${s}с`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return timeLeft;
}

export default function Raid({ token, showToast, userLevel = 1 }) {
  const [raid, setRaid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friends, setFriends] = useState([]);
  const [victory, setVictory] = useState(false);
  const [defeat, setDefeat] = useState(false);
  const socketRef = useRef(null);
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const countdown = useCountdown(raid?.endsAt);

  const loadRaid = async () => {
    try {
      const r = await axios.get(`${API}/raid/today`, authHeaders);
      setRaid(r.data);
      if (r.data.status === "completed") setVictory(true);
      if (r.data.status === "failed") setDefeat(true);
    } catch {
      showToast("Не удалось загрузить рейд", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const r = await axios.get(`${API}/friends`, authHeaders);
      setFriends(r.data);
    } catch {}
  };

  useEffect(() => {
    loadRaid();
    socketRef.current = io(API, { transports: ["websocket"] });
    socketRef.current.on("raid:hp_update", ({ raidId, currentHp, damage, userId }) => {
      setRaid(prev => {
        if (!prev || prev.id !== raidId) return prev;
        const updated = { ...prev, currentHp };
        if (currentHp <= 0) { setVictory(true); updated.status = "completed"; }
        // Update participant damage in list
        updated.participants = (prev.participants || []).map(p =>
          p.userId === userId ? { ...p, damage: p.damage + damage } : p
        );
        return updated;
      });
    });
    socketRef.current.on("raid:boss_defeated", () => setVictory(true));
    socketRef.current.on("raid:participant_joined", () => loadRaid());
    return () => socketRef.current?.disconnect();
  }, []);

  const joinRaid = async () => {
    setJoining(true);
    try {
      await axios.post(`${API}/raid/join`, {}, authHeaders);
      showToast("Ты вступил в рейд! ⚔️", "success");
      loadRaid();
    } catch (e) {
      showToast(e.response?.data?.message || "Ошибка", "error");
    } finally {
      setJoining(false);
    }
  };

  const inviteFriend = async (friendId) => {
    try {
      await axios.post(`${API}/raid/invite/${friendId}`, {}, authHeaders);
      showToast("Приглашение отправлено!", "success");
      setShowFriends(false);
    } catch (e) {
      showToast(e.response?.data?.message || "Ошибка", "error");
    }
  };

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60, color: "#ef4444" }}>
      <div style={{ fontSize: 40, animation: "spin 1s linear infinite" }}>⚔️</div>
    </div>
  );

  if (!raid) return (
    <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.5)" }}>
      Рейд не найден
    </div>
  );

  const hpPct = Math.max(0, (raid.currentHp / raid.bossHp) * 100);
  const diffColor = DIFF_COLOR[raid.difficulty] || "#ef4444";
  const isCompleted = raid.status === "completed" || victory;
  const isFailed = raid.status === "failed" || defeat;

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at top, #1a0505 0%, #0a0010 60%, #000 100%)",
      padding: "20px 16px 120px",
      color: "#fff",
      fontFamily: "monospace",
    }}>
      <style>{`
        @keyframes bossPulse { 0%,100%{transform:scale(1) rotate(-2deg)} 50%{transform:scale(1.08) rotate(2deg)} }
        @keyframes hpGlow { 0%,100%{box-shadow:0 0 10px #ef4444} 50%{box-shadow:0 0 30px #ef4444,0 0 60px #b91c1c} }
        @keyframes victoryPop { 0%{transform:scale(0.5);opacity:0} 80%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{
          display: "inline-block",
          background: "rgba(239,68,68,0.15)",
          border: "1px solid rgba(239,68,68,0.4)",
          borderRadius: 20,
          padding: "4px 16px",
          fontSize: 11,
          color: diffColor,
          letterSpacing: 2,
          textTransform: "uppercase",
          fontWeight: 700,
          marginBottom: 8,
        }}>{raid.difficulty}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>
          РЕЙД ПОДЗЕМЕЛЬЯ — ЕЖЕДНЕВНЫЙ
        </div>
      </div>

      {/* Boss */}
      <div style={{ textAlign: "center", margin: "24px 0 20px" }}>
        <div style={{
          fontSize: isCompleted ? 100 : 90,
          lineHeight: 1,
          display: "inline-block",
          animation: isCompleted ? "none" : "bossPulse 3s ease-in-out infinite",
          filter: isCompleted
            ? "grayscale(1) brightness(0.3)"
            : `drop-shadow(0 0 24px ${diffColor})`,
          transition: "all 0.5s",
        }}>{raid.bossIcon}</div>
        <div style={{
          fontSize: 22,
          fontWeight: 800,
          color: isCompleted ? "rgba(255,255,255,0.25)" : "#fff",
          marginTop: 8,
          textShadow: isCompleted ? "none" : `0 0 20px ${diffColor}`,
          letterSpacing: 1,
        }}>{raid.bossName}</div>
      </div>

      {/* Victory / Defeat overlay */}
      {isCompleted && (
        <div style={{
          textAlign: "center", marginBottom: 24,
          animation: "victoryPop 0.6s cubic-bezier(0.34,1.56,0.64,1)",
        }}>
          <div style={{ fontSize: 48 }}>🎉</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", marginBottom: 4 }}>
            БОСС ПОБЕЖДЁН!
          </div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>
            +{raid.rewardXp} XP &nbsp;·&nbsp; +{raid.rewardGold} 💰
          </div>
        </div>
      )}

      {/* HP Bar */}
      <div style={{
        background: "rgba(0,0,0,0.5)",
        border: "1px solid rgba(239,68,68,0.25)",
        borderRadius: 16,
        padding: "16px 20px",
        marginBottom: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>HP БОССА</span>
          <span style={{ color: "#ef4444", fontWeight: 800 }}>
            {raid.currentHp.toLocaleString()} / {raid.bossHp.toLocaleString()}
          </span>
        </div>
        <div style={{
          height: 18, background: "rgba(0,0,0,0.6)",
          borderRadius: 9, overflow: "hidden",
          border: "1px solid rgba(239,68,68,0.2)",
        }}>
          <div style={{
            height: "100%",
            width: `${hpPct}%`,
            background: hpPct > 50
              ? "linear-gradient(90deg,#dc2626,#ef4444)"
              : hpPct > 20
              ? "linear-gradient(90deg,#b45309,#f59e0b)"
              : "linear-gradient(90deg,#7f1d1d,#dc2626)",
            borderRadius: 9,
            transition: "width 0.4s ease",
            animation: !isCompleted && hpPct < 30 ? "hpGlow 1.5s ease infinite" : "none",
          }} />
        </div>
      </div>

      {/* Timer */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        marginBottom: 20, color: "rgba(255,100,50,0.8)", fontSize: 14, fontWeight: 700,
      }}>
        <span>⏱️</span>
        <span>{countdown}</span>
      </div>

      {/* Join / Joined status */}
      {!isCompleted && !isFailed && (
        <div style={{ marginBottom: 16 }}>
          {!raid.joined ? (
            <button
              onClick={joinRaid}
              disabled={joining}
              style={{
                width: "100%",
                background: "linear-gradient(135deg,#7f1d1d,#dc2626)",
                border: "1px solid rgba(239,68,68,0.5)",
                borderRadius: 16,
                padding: "16px",
                color: "#fff",
                fontSize: 16,
                fontWeight: 800,
                cursor: joining ? "not-allowed" : "pointer",
                letterSpacing: 1,
                boxShadow: "0 4px 24px rgba(239,68,68,0.4)",
                opacity: joining ? 0.7 : 1,
              }}
            >
              {joining ? "Вступаю..." : "⚔️ ВСТУПИТЬ В РЕЙ Д"}
            </button>
          ) : (
            <div style={{
              textAlign: "center",
              padding: 14,
              background: "rgba(34,197,94,0.1)",
              border: "1px solid rgba(34,197,94,0.3)",
              borderRadius: 14,
              color: "#22c55e",
              fontSize: 14,
              fontWeight: 700,
            }}>
              ✅ Ты в рейде · Твой урон: {raid.myDamage}
            </div>
          )}
        </div>
      )}

      {/* Invite friends */}
      {raid.joined && !isCompleted && (
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => { setShowFriends(!showFriends); if (!showFriends) loadFriends(); }}
            style={{
              width: "100%",
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.35)",
              borderRadius: 14,
              padding: "12px",
              color: "#c4b5fd",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 0.5,
            }}
          >
            {showFriends ? "Скрыть" : "👥 Позвать друга"}
          </button>
          {showFriends && (
            <div style={{
              marginTop: 10,
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: 14,
              overflow: "hidden",
            }}>
              {friends.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  Нет друзей для приглашения
                </div>
              ) : friends.map(f => (
                <div key={f.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ур. {f.level}</div>
                  </div>
                  <button
                    onClick={() => inviteFriend(f.id)}
                    style={{
                      background: "rgba(239,68,68,0.2)",
                      border: "1px solid rgba(239,68,68,0.4)",
                      borderRadius: 10,
                      padding: "6px 12px",
                      color: "#fca5a5",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Позвать
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Participants */}
      <div style={{
        background: "rgba(0,0,0,0.4)",
        border: "1px solid rgba(239,68,68,0.15)",
        borderRadius: 16,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11,
          fontWeight: 800,
          color: "rgba(239,68,68,0.7)",
          letterSpacing: 1.5,
          textTransform: "uppercase",
        }}>
          Участники рейда ({(raid.participants || []).length})
        </div>
        {(raid.participants || []).length === 0 ? (
          <div style={{ padding: "20px 16px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Никто ещё не вступил в рейд
          </div>
        ) : [...(raid.participants || [])].sort((a, b) => b.damage - a.damage).map((p, i) => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
            background: p.userId === (raid.participants.find(x => x.userId === p.userId)?.userId) && raid.joined
              ? "rgba(239,68,68,0.04)" : "transparent",
          }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(239,68,68,0.6)", width: 20 }}>
              {i + 1}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{p.user?.name || "Игрок"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ур. {p.user?.level}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#ef4444" }}>
                {p.damage} ⚔️
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>урон</div>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={{
        marginTop: 16,
        padding: "12px 16px",
        background: "rgba(239,68,68,0.06)",
        border: "1px solid rgba(239,68,68,0.15)",
        borderRadius: 14,
        fontSize: 12,
        color: "rgba(255,255,255,0.45)",
        lineHeight: 1.6,
      }}>
        💡 Каждый выполненный квест наносит <b style={{ color: "#ef4444" }}>10+ урона</b> боссу.<br />
        Чем больше участников — тем выше урон (+20% за каждого).<br />
        Победите вместе и получите <b style={{ color: "#f59e0b" }}>{raid.rewardXp} XP + {raid.rewardGold} 💰</b>
      </div>
    </div>
  );
}
