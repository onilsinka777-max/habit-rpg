import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function ActiveBonuses({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/bonuses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [token]);

  return (
    <div style={{
      background: "linear-gradient(135deg, #0b0e1a, #1a0a2e)",
      minHeight: "100vh",
      padding: "16px 14px 120px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>
            АКТИВНЫЕ БОНУСЫ
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0" }}>
            Все множители XP и золота
          </div>
        </div>
        <button
          onClick={load}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            padding: "8px 14px",
            color: "rgba(255,255,255,0.6)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          🔄 Обновить
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "60px 0", fontSize: 13 }}>
          Загрузка...
        </div>
      ) : (
        <>
          {/* Total multipliers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
            {/* XP */}
            <div style={{
              background: "linear-gradient(135deg, #1a0a2e, #2d1b69)",
              border: "1px solid #7c3aed",
              boxShadow: "0 0 20px rgba(124,58,237,0.3)",
              borderRadius: 16,
              padding: "18px 14px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>⚡</div>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "rgba(167,139,250,0.6)", marginBottom: 6 }}>
                МНОЖИТЕЛЬ ОПЫТА
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#a78bfa", lineHeight: 1 }}>
                {data?.totalMultipliers?.xpLabel || "×1.00"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>
                от всех источников
              </div>
            </div>

            {/* Gold */}
            <div style={{
              background: "linear-gradient(135deg, #1a0a00, #2d1500)",
              border: "1px solid #f5b637",
              boxShadow: "0 0 20px rgba(245,182,55,0.3)",
              borderRadius: 16,
              padding: "18px 14px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>💰</div>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "rgba(245,182,55,0.6)", marginBottom: 6 }}>
                МНОЖИТЕЛЬ ЗОЛОТА
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#f5b637", lineHeight: 1 }}>
                {data?.totalMultipliers?.goldLabel || "×1.00"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>
                от всех источников
              </div>
            </div>
          </div>

          {/* Bonus list */}
          <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 10 }}>
            Источники
          </div>

          {(!data?.bonuses || data.bonuses.length === 0) ? (
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: "32px 20px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>💤</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>
                Пока нет активных бонусов
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
                Выполняй квесты, покупай навыки, прокачивай питомца.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.bonuses.map((b, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}>
                  <div style={{ fontSize: 22, flexShrink: 0, width: 32, textAlign: "center" }}>
                    {b.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 2 }}>
                      {b.name}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                      {b.description}
                    </div>
                    {b.expiresAt && (
                      <div style={{ fontSize: 10, color: "rgba(245,182,55,0.5)", marginTop: 2 }}>
                        до {new Date(b.expiresAt).toLocaleString("ru", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginBottom: 4 }}>
                      {b.source}
                    </div>
                    {b.xpBonus && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#34d399" }}>
                        {b.xpBonus}
                      </div>
                    )}
                    {b.goldBonus && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#f5b637" }}>
                        {b.goldBonus}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* How formula works */}
          <div style={{
            marginTop: 20,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.05)",
            borderRadius: 12,
            padding: "14px 16px",
          }}>
            <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 8 }}>
              Как считается
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", lineHeight: 1.8 }}>
              Все множители перемножаются. Класс даёт +10% к своей ветке квестов и к золоту.
              Навыки ветки суммируются. Комбо (5+ квестов за 30 мин) даёт +25%.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
