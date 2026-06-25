import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const FEATURES = [
  "Все квесты без ограничений",
  "Кланы и клановые войны",
  "Путь Мастерства",
  "Легендарный путь",
  "Путь Создателя",
  "Чат с создателем LAPTEV",
  "Дерево навыков",
  "Лиги и сезонные квесты",
  "Все будущие обновления",
];

export default function SubscriptionWall({ token, onActivated }) {
  const [inviteCode, setInviteCode] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const handleActivate = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);
    setError("");
    try {
      await axios.post(
        `${API}/subscription/activate`,
        { code: inviteCode.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await onActivated();
    } catch (e) {
      setError(e.response?.data?.message || "Неверный код");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "linear-gradient(135deg,#020208,#0d0520)",
      overflowY: "auto",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "24px 0 40px",
    }}>
      <div style={{ maxWidth: 380, width: "90%", textAlign: "center", padding: "40px 24px" }}>

        <div style={{
          fontSize: 64, marginBottom: 16,
          filter: "drop-shadow(0 0 20px rgba(124,58,237,0.8))",
        }}>⚡</div>

        <div style={{
          fontSize: 11, color: "#7c3aed", letterSpacing: 3,
          marginBottom: 12, textTransform: "uppercase", fontWeight: 700,
        }}>УРОВЕНЬ 11 ДОСТИГНУТ</div>

        <h2 style={{
          fontSize: 24, fontWeight: 900, color: "#e2e8f0",
          marginBottom: 12, lineHeight: 1.3,
        }}>Путь продолжается</h2>

        <p style={{
          fontSize: 14, color: "rgba(255,255,255,0.5)",
          lineHeight: 1.8, marginBottom: 32,
        }}>
          Чтобы система могла продолжить существование —
          необходима подписка.<br/>
          Ты достиг 11 уровня. Это значит система работает.<br/>
          Теперь поддержи её.
        </p>

        <div style={{
          background: "rgba(124,58,237,0.08)",
          border: "1px solid rgba(124,58,237,0.2)",
          borderRadius: 16, padding: "20px", marginBottom: 28, textAlign: "left",
        }}>
          <div style={{
            fontSize: 11, color: "#7c3aed", fontWeight: 700,
            letterSpacing: 1, marginBottom: 12,
          }}>⚡ В ПОДПИСКЕ:</div>
          {FEATURES.map(f => (
            <div key={f} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "6px 0",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              fontSize: 13, color: "rgba(255,255,255,0.7)",
            }}>
              <span style={{ color: "#7c3aed" }}>✓</span> {f}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <div style={{
            flex: 1, background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "16px 12px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#e2e8f0" }}>299₽</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>в месяц</div>
          </div>
          <div style={{
            flex: 1,
            background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(124,58,237,0.1))",
            border: "2px solid #7c3aed",
            borderRadius: 12, padding: "16px 12px", textAlign: "center",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)",
              background: "#7c3aed", borderRadius: 20, padding: "2px 10px",
              fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap",
            }}>ВЫГОДА 44%</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa" }}>1990₽</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>в год</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input
            value={inviteCode}
            onChange={e => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Введи код доступа LVL-XXXX-XXXX"
            onKeyDown={e => e.key === "Enter" && handleActivate()}
            style={{
              width: "100%", padding: "14px 16px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 12, color: "#e2e8f0",
              fontSize: 14, textAlign: "center",
              letterSpacing: 2, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {error && (
          <div style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        <button
          onClick={handleActivate}
          disabled={loading || !inviteCode.trim()}
          style={{
            width: "100%", padding: "14px",
            background: inviteCode.trim()
              ? "linear-gradient(135deg,#7c3aed,#4c1d95)"
              : "rgba(255,255,255,0.05)",
            color: inviteCode.trim() ? "#fff" : "rgba(255,255,255,0.3)",
            border: "none", borderRadius: 12,
            fontSize: 16, fontWeight: 700, cursor: "pointer",
            boxShadow: inviteCode.trim() ? "0 0 20px rgba(124,58,237,0.4)" : "none",
            marginBottom: 16,
            transition: "all 0.2s",
          }}>
          {loading ? "Проверяем..." : "Активировать доступ"}
        </button>

        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
          Нет кода? Получи доступ:{" "}
          <a
            href="https://t.me/antonchik_zavozit"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#7c3aed" }}
          >@antonchik_zavozit</a>
        </div>
      </div>
    </div>
  );
}
