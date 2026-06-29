import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BOSSES = {
  E:    { name:"Гоблин-вождь",  icon:"👺", hp:50,   color:"#22c55e",  rewardXp:50,   rewardGold:30   },
  D:    { name:"Скелет-воин",   icon:"💀", hp:100,  color:"#84cc16",  rewardXp:100,  rewardGold:60   },
  C:    { name:"Тёмный рыцарь", icon:"⚔️", hp:200,  color:"#eab308",  rewardXp:200,  rewardGold:120  },
  B:    { name:"Дракон",        icon:"🐉", hp:400,  color:"#f97316",  rewardXp:400,  rewardGold:250  },
  A:    { name:"Некромант",     icon:"🧙", hp:700,  color:"#ef4444",  rewardXp:700,  rewardGold:450  },
  S:    { name:"Древнее зло",   icon:"👁️", hp:1200, color:"#a855f7",  rewardXp:1200, rewardGold:800  },
  "S+": { name:"Тёмный бог",   icon:"☠️", hp:2500, color:"#dc2626",  rewardXp:2500, rewardGold:1500 },
};
const RANKS = ["E","D","C","B","A","S","S+"];
const PENALTY = { E:{g:0,x:0,fat:0}, D:{g:50,x:0,fat:0}, C:{g:50,x:0,fat:0}, B:{g:100,x:0,fat:30}, A:{g:200,x:50,fat:30}, S:{g:400,x:150,fat:30}, "S+":{g:800,x:300,fat:120} };
const CURE_COSTS = { 30:100, 60:180, 120:300 };

const CLASS_BONUS = {
  warrior:  { label:"Воин +25% урона",        color:"#ef4444" },
  sage:     { label:"Мудрец +25% золота",      color:"#f59e0b" },
  leader:   { label:"Атлет ×0.5 усталость",   color:"#22c55e" },
  balance:  { label:"Мыслитель +10% всё",      color:"#8b5cf6" },
};

const EQUIP_ICONS = {
  raid_damage_boost:   "🧪",
  raid_no_penalty:     "📜",
  raid_fatigue_cure:   "🍖",
  raid_trap_immunity:  "🔦",
  raid_illusion_reduce:"💎",
};

const BG = "#050510";
const RED = "#ef4444";
const ORANGE = "#f97316";
const PURPLE = "#7c3aed";

function useCountdown(endsAt) {
  const [t, setT] = useState("");
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const d = new Date(endsAt) - Date.now();
      if (d <= 0) { setT("Время вышло"); return; }
      const h = Math.floor(d / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
      setT(`${h}ч ${m}м ${s}с`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return t;
}

function FatigueTimer({ until }) {
  const [t, setT] = useState("");
  useEffect(() => {
    if (!until) return;
    const tick = () => {
      const d = new Date(until) - Date.now();
      if (d <= 0) { setT(""); return; }
      const m = Math.floor(d / 60000), s = Math.floor((d % 60000) / 1000);
      setT(`${m}м ${s}с`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);
  return t ? <span style={{ color: RED }}>{t}</span> : null;
}

// ── Equipment Screen ─────────────────────────────────────────────────────────
function EquipmentScreen({ equipment, selectedItems, onToggle, onContinue, masteryPath }) {
  const classBonus = CLASS_BONUS[masteryPath];
  return (
    <div style={{ padding: "20px 16px 120px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>🎒</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>СНАРЯЖЕНИЕ</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Выбери предметы для рейда</div>
      </div>

      {classBonus && (
        <div style={{
          background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)",
          borderRadius: 14, padding: "12px 16px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Бонус класса</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: classBonus.color }}>{classBonus.label}</div>
          </div>
        </div>
      )}

      {equipment.length === 0 ? (
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "32px", textAlign: "center",
          color: "rgba(255,255,255,0.35)", fontSize: 14, marginBottom: 20,
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🎒</div>
          <div>Снаряжения нет</div>
          <div style={{ fontSize: 12, marginTop: 6, color: "rgba(255,255,255,0.25)" }}>Купи в Магазине → Рейд</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          {equipment.map(item => {
            const sel = selectedItems.includes(item.effect);
            return (
              <button key={item.effect} onClick={() => onToggle(item.effect)} style={{
                background: sel ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${sel ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 16, padding: "14px 16px",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
                textAlign: "left", transition: "all 0.15s",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: sel ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0,
                }}>{EQUIP_ICONS[item.effect] || "🎁"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: "#fff", fontSize: 14, marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>{item.description}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    background: sel ? PURPLE : "transparent",
                    border: `2px solid ${sel ? PURPLE : "rgba(255,255,255,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#fff",
                  }}>{sel ? "✓" : ""}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>×{item.quantity}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button onClick={onContinue} style={{
        width: "100%",
        background: "linear-gradient(135deg,#7c3aed,#5b21b6)",
        border: "none", borderRadius: 16, padding: "16px",
        color: "#fff", fontSize: 16, fontWeight: 800, cursor: "pointer",
        boxShadow: "0 4px 24px rgba(124,58,237,0.4)",
      }}>
        ⚔️ Выбрать сложность
      </button>
    </div>
  );
}

// ── Difficulty Selection Screen ──────────────────────────────────────────────
function DifficultyScreen({ onStart, fatiguedUntil, gold, showToast, masteryPath, selectedItems }) {
  const [loading, setLoading] = useState(false);
  const isFatigued = fatiguedUntil && new Date(fatiguedUntil) > new Date();
  const classBonus = CLASS_BONUS[masteryPath];

  const start = async (diff) => {
    if (isFatigued && !selectedItems.includes("raid_fatigue_cure")) return;
    setLoading(true);
    try {
      const r = await axios.post(`${API}/raid/start`, { difficulty: diff, useItems: selectedItems }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      onStart(r.data);
    } catch (e) {
      showToast(e.response?.data?.message || "Ошибка", "error");
    } finally { setLoading(false); }
  };

  const cureFatigue = async (minutes) => {
    try {
      await axios.post(`${API}/raid/cure-fatigue`, { minutes }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      showToast("Усталость снята!", "success");
      onStart(null);
    } catch (e) {
      showToast(e.response?.data?.message || "Ошибка", "error");
    }
  };

  const canStart = !isFatigued || selectedItems.includes("raid_fatigue_cure");

  return (
    <div style={{ padding: "20px 16px 120px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>⚔️</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>ПОДЗЕМЕЛЬЕ</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Выбери сложность рейда</div>
      </div>

      {classBonus && (
        <div style={{
          background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: 12, padding: "8px 14px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8, fontSize: 12,
        }}>
          <span>⚡</span>
          <span style={{ color: classBonus.color, fontWeight: 700 }}>{classBonus.label}</span>
        </div>
      )}

      {selectedItems.length > 0 && (
        <div style={{
          background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 12, padding: "8px 14px", marginBottom: 16,
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Активно:</span>
          {selectedItems.map(e => (
            <span key={e} style={{ fontSize: 18 }}>{EQUIP_ICONS[e] || "🎁"}</span>
          ))}
        </div>
      )}

      {isFatigued && !selectedItems.includes("raid_fatigue_cure") && (
        <div style={{
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)",
          borderRadius: 16, padding: "16px 18px", marginBottom: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: RED, marginBottom: 6 }}>😵 Ты устал!</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
            Восстановление через: <FatigueTimer until={fatiguedUntil} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>Или вылечись золотом:</div>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(CURE_COSTS).map(([min, cost]) => (
              <button key={min} disabled={(gold || 0) < cost} onClick={() => cureFatigue(Number(min))} style={{
                flex: 1,
                background: (gold || 0) >= cost ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${(gold || 0) >= cost ? "rgba(124,58,237,0.5)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 12, padding: "8px 4px",
                cursor: (gold || 0) >= cost ? "pointer" : "not-allowed",
                color: (gold || 0) >= cost ? "#c4b5fd" : "rgba(255,255,255,0.2)",
                fontSize: 12, fontWeight: 700, textAlign: "center",
              }}>
                <div>{min} мин</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>{cost} 💰</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {RANKS.map(rank => {
          const boss = BOSSES[rank];
          const pen = PENALTY[rank];
          return (
            <button key={rank} onClick={() => canStart && !loading && start(rank)} style={{
              background: "rgba(255,255,255,0.03)",
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 16, padding: "14px 16px",
              cursor: !canStart || loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: 14,
              opacity: !canStart ? 0.4 : 1,
              transition: "all 0.15s", textAlign: "left",
            }}
              onMouseEnter={e => canStart && !loading && (e.currentTarget.style.borderColor = boss.color + "aa")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
            >
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: `${boss.color}22`, border: `2px solid ${boss.color}55`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, flexShrink: 0,
              }}>{boss.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{
                    background: `${boss.color}33`, border: `1px solid ${boss.color}66`,
                    borderRadius: 8, padding: "1px 8px", fontSize: 11, fontWeight: 800,
                    color: boss.color, letterSpacing: 1,
                  }}>{rank}</span>
                  <span style={{ fontWeight: 700, color: "#fff", fontSize: 15 }}>{boss.name}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                  <span>❤️ {boss.hp} HP</span>
                  <span style={{ color: "#22c55e" }}>+{boss.rewardXp} XP</span>
                  <span style={{ color: "#f59e0b" }}>+{boss.rewardGold} 💰</span>
                  {pen.g > 0 && <span style={{ color: RED }}>-{pen.g} 💰</span>}
                  {pen.fat > 0 && <span style={{ color: RED }}>💤{pen.fat}м</span>}
                </div>
              </div>
              <div style={{ fontSize: 18, color: "rgba(255,255,255,0.2)" }}>›</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Illusion Screen ──────────────────────────────────────────────────────────
function IllusionScreen({ raid, onEnter, onRetreat }) {
  const [retreating, setRetreating] = useState(false);
  const retreat = async () => { setRetreating(true); await onRetreat(); };
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px 120px", textAlign: "center",
    }}>
      <style>{`
        @keyframes illusionFlash { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(1.05)} }
        @keyframes shake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-8px)} 75%{transform:translateX(8px)} }
      `}</style>
      <div style={{ fontSize: 72, animation: "illusionFlash 1.5s ease-in-out infinite", marginBottom: 20 }}>⚠️</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: RED, letterSpacing: 2, textTransform: "uppercase", animation: "shake 0.5s ease-in-out 1", marginBottom: 12 }}>
        ИЛЛЮЗОРНОЕ ПОДЗЕМЕЛЬЕ
      </div>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{BOSSES[raid.difficulty]?.icon}</div>
      <div style={{ fontSize: 14, color: "rgba(255,200,50,0.8)", marginBottom: 32, lineHeight: 1.6 }}>
        Ты попал в подземелье уровня{" "}
        <span style={{ fontWeight: 900, color: BOSSES[raid.difficulty]?.color }}>{raid.difficulty}</span>
        {" "}— {BOSSES[raid.difficulty]?.name}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        <button onClick={onEnter} style={{
          background: "linear-gradient(135deg,#7f1d1d,#dc2626)",
          border: "1px solid rgba(239,68,68,0.5)",
          borderRadius: 16, padding: "16px", color: "#fff",
          fontSize: 16, fontWeight: 800, cursor: "pointer",
          boxShadow: "0 4px 24px rgba(239,68,68,0.4)",
        }}>⚔️ Войти в подземелье</button>
        <button onClick={retreat} disabled={retreating} style={{
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 16, padding: "14px", color: "rgba(255,255,255,0.5)",
          fontSize: 14, fontWeight: 600, cursor: retreating ? "not-allowed" : "pointer",
          opacity: retreating ? 0.6 : 1,
        }}>
          {retreating ? "Отступаю..." : "🏃 Отступить (штраф 50 💰)"}
        </button>
      </div>
    </div>
  );
}

// ── Active Raid Screen ───────────────────────────────────────────────────────
function ActiveRaidScreen({ raid: initialRaid, token, showToast, onRaidEnd }) {
  const [raid, setRaid] = useState(initialRaid);
  const [friends, setFriends] = useState([]);
  const [showFriends, setShowFriends] = useState(false);
  const [hitAnim, setHitAnim] = useState(false);
  const socketRef = useRef(null);
  const countdown = useCountdown(raid?.endsAt);
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  const reload = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/raid/active`, authH);
      if (r.data) { setRaid(r.data); if (r.data.status !== "active") onRaidEnd(r.data); }
    } catch {}
  }, [token]);

  useEffect(() => {
    socketRef.current = io(API, { transports: ["websocket"] });
    socketRef.current.on("raid:hp_update", ({ raidId, currentHp }) => {
      if (raidId !== raid?.id) return;
      setHitAnim(true);
      setTimeout(() => setHitAnim(false), 400);
      setRaid(prev => prev ? { ...prev, currentHp } : prev);
    });
    socketRef.current.on("raid:boss_defeated", ({ raidId }) => {
      if (raidId !== raid?.id) return;
      setRaid(prev => prev ? { ...prev, status: "victory", currentHp: 0 } : prev);
      setTimeout(() => onRaidEnd({ status: "victory" }), 2000);
    });
    socketRef.current.on("raid:participant_joined", () => reload());
    return () => socketRef.current?.disconnect();
  }, [raid?.id]);

  const loadFriends = async () => {
    try { const r = await axios.get(`${API}/friends`, authH); setFriends(r.data); } catch {}
  };

  const invite = async (fid) => {
    try {
      await axios.post(`${API}/raid/invite/${fid}`, {}, authH);
      showToast("Приглашение отправлено!", "success");
      setShowFriends(false);
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const abandon = async () => {
    if (!window.confirm("Покинуть рейд? Штраф: 50% от наказания за поражение.")) return;
    try {
      const r = await axios.post(`${API}/raid/abandon`, {}, authH);
      showToast(`Рейд покинут. -${r.data.penaltyGold} 💰`, "error");
      onRaidEnd({ status: "abandoned" });
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  if (!raid) return null;
  const boss = BOSSES[raid.difficulty] || BOSSES.E;
  const hpPct = Math.max(0, (raid.currentHp / raid.bossHp) * 100);
  const trapEvent = typeof raid.trapEvent === "string" ? JSON.parse(raid.trapEvent) : raid.trapEvent;
  const participants = raid.raidParticipants || [];

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <style>{`
        @keyframes bossPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
        @keyframes bossHit { 0%{transform:scale(1.15) rotate(-5deg);filter:brightness(2)} 100%{transform:scale(1) rotate(0)} }
        @keyframes stageGlow { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ background: `${boss.color}22`, border: `1px solid ${boss.color}66`, borderRadius: 10, padding: "4px 12px", fontSize: 13, fontWeight: 800, color: boss.color, letterSpacing: 1 }}>
          {raid.difficulty} — {boss.name}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,100,50,0.8)", fontWeight: 700 }}>⏱️ {countdown}</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {["Коридор","Ловушка","Босс"].map((label, i) => {
          const active = raid.stage === i + 1;
          const done = raid.stage > i + 1;
          return (
            <div key={i} style={{
              flex: 1, textAlign: "center", padding: "6px 4px",
              background: active ? "rgba(239,68,68,0.15)" : done ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${active ? "rgba(239,68,68,0.4)" : done ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.06)"}`,
              borderRadius: 10, fontSize: 10, fontWeight: 700,
              color: active ? RED : done ? "#22c55e" : "rgba(255,255,255,0.25)",
              animation: active ? "stageGlow 2s ease infinite" : "none",
            }}>
              {done ? "✓" : i + 1}. {label}
            </div>
          );
        })}
      </div>

      {raid.stage === 1 && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🌑</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Тёмный коридор</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 16 }}>Выполняй квесты, чтобы продвигаться вперёд</div>
          {(() => {
            const done = Math.min(participants.reduce((s, p) => s + p.damage, 0), 2);
            return (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  <span>Прогресс</span><span>{done}/2 квестов</span>
                </div>
                <div style={{ height: 10, background: "rgba(255,255,255,0.08)", borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(done / 2) * 100}%`, background: "linear-gradient(90deg,#7c3aed,#a855f7)", borderRadius: 5, transition: "width 0.4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 12 }}>
                  {[0, 1].map(i => (
                    <div key={i} style={{ fontSize: 28, opacity: done > i ? 1 : 0.2, transition: "opacity 0.3s" }}>
                      {done > i ? "⚔️" : "🗡️"}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {raid.stage === 2 && trapEvent && (
        <div style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.35)", borderRadius: 16, padding: "20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 10 }}>{trapEvent.icon}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: ORANGE, marginBottom: 8 }}>СОБЫТИЕ ЛОВУШКИ</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginBottom: 12 }}>{trapEvent.text}</div>
          {trapEvent.effect === "poison_timer" && (
            <div style={{ fontSize: 12, color: RED, fontWeight: 700, padding: "8px 12px", background: "rgba(239,68,68,0.1)", borderRadius: 10 }}>
              ⏰ Выполни квест как можно скорее!
            </div>
          )}
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 12 }}>Выполни следующий квест, чтобы продолжить</div>
        </div>
      )}

      {raid.stage === 3 && (
        <div>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 88, lineHeight: 1, display: "inline-block", animation: hitAnim ? "bossHit 0.4s ease" : "bossPulse 3s ease-in-out infinite", filter: `drop-shadow(0 0 24px ${boss.color})` }}>{boss.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginTop: 8, textShadow: `0 0 20px ${boss.color}` }}>{boss.name}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>HP БОССА</span>
              <span style={{ color: RED, fontWeight: 800 }}>{Math.max(0, raid.currentHp)} / {raid.bossHp}</span>
            </div>
            <div style={{ height: 16, background: "rgba(0,0,0,0.5)", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(239,68,68,0.2)" }}>
              <div style={{ height: "100%", width: `${hpPct}%`, background: hpPct > 50 ? "linear-gradient(90deg,#dc2626,#ef4444)" : hpPct > 20 ? "linear-gradient(90deg,#b45309,#f97316)" : "linear-gradient(90deg,#7f1d1d,#dc2626)", borderRadius: 8, transition: "width 0.5s ease" }} />
            </div>
          </div>

          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "10px 14px", fontSize: 10, fontWeight: 800, color: "rgba(239,68,68,0.6)", letterSpacing: 1.5, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              Участники ({participants.length})
            </div>
            {[...participants].sort((a, b) => b.damage - a.damage).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "rgba(239,68,68,0.5)", width: 18 }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{p.user?.name || "Игрок"}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Ур. {p.user?.level}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: RED }}>{p.damage} ⚔️</div>
              </div>
            ))}
            {participants.length === 0 && (
              <div style={{ padding: 16, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Только ты в рейде</div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <button onClick={() => { setShowFriends(!showFriends); if (!showFriends) loadFriends(); }} style={{
              width: "100%", background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.35)",
              borderRadius: 14, padding: "12px", color: "#c4b5fd", fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              {showFriends ? "Скрыть" : "👥 Позвать друга в рейд"}
            </button>
            {showFriends && (
              <div style={{ marginTop: 8, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 14, overflow: "hidden" }}>
                {friends.length === 0 ? (
                  <div style={{ padding: 14, textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13 }}>Нет друзей</div>
                ) : friends.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Ур. {f.level}</div>
                    </div>
                    <button onClick={() => invite(f.id)} style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 10, padding: "6px 12px", color: "#fca5a5", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Позвать</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px", marginBottom: 16, fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
        💡 Каждый квест продвигает рейд. Обычный = 10 урона, сложный = 20. +5% за участника. Классовые бонусы применяются автоматически.
      </div>
      <button onClick={abandon} style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "12px", color: "rgba(255,80,80,0.6)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        🏳️ Покинуть рейд (штраф)
      </button>
    </div>
  );
}

// ── Result Screen ────────────────────────────────────────────────────────────
function ResultScreen({ raid, status, raidResult, onBack }) {
  const won = status === "victory";
  const achs = raidResult?.newAchievements || [];
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px 120px", textAlign: "center" }}>
      <style>{`@keyframes resultPop { 0%{transform:scale(0.5);opacity:0} 80%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }`}</style>
      <div style={{ fontSize: 80, animation: "resultPop 0.6s cubic-bezier(0.34,1.56,0.64,1)", marginBottom: 20 }}>
        {won ? "🏆" : "💀"}
      </div>
      <div style={{ fontSize: 24, fontWeight: 900, color: won ? "#22c55e" : RED, marginBottom: 12 }}>
        {won ? "ПОБЕДА!" : status === "abandoned" ? "ПОБЕГ" : "ПОРАЖЕНИЕ"}
      </div>
      {won && raidResult && (
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
          +{raidResult.rewardXp || raid?.rewardXp || "?"} XP &nbsp;·&nbsp; +{raidResult.rewardGold || raid?.rewardGold || "?"} 💰
        </div>
      )}
      {!won && raid && (raid.penaltyGold > 0 || raid.penaltyXp > 0) && (
        <div style={{ fontSize: 14, color: "rgba(239,68,68,0.7)", marginBottom: 16 }}>
          {raid.penaltyGold > 0 && <span>-{raid.penaltyGold} 💰 </span>}
          {raid.penaltyXp > 0 && <span>-{raid.penaltyXp} XP</span>}
        </div>
      )}
      {achs.length > 0 && (
        <div style={{ marginBottom: 20, width: "100%", maxWidth: 320 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Новые достижения</div>
          {achs.map(a => (
            <div key={a.type} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
              background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 12, marginBottom: 6,
            }}>
              <span style={{ fontSize: 22 }}>{a.icon || "🏆"}</span>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#c4b5fd" }}>{a.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{a.desc}</div>
              </div>
              {a.xpReward > 0 && <div style={{ marginLeft: "auto", fontSize: 11, color: "#22c55e", fontWeight: 700 }}>+{a.xpReward} XP</div>}
            </div>
          ))}
        </div>
      )}
      <button onClick={onBack} style={{
        background: won ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
        border: `1px solid ${won ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)"}`,
        borderRadius: 14, padding: "14px 28px",
        color: won ? "#22c55e" : RED, fontSize: 15, fontWeight: 700, cursor: "pointer",
      }}>
        {won ? "Отлично! ⚔️" : "Попробовать снова"}
      </button>
    </div>
  );
}

// ── Weekly Boss Screen ────────────────────────────────────────────────────────
function WeeklyBossScreen({ token }) {
  const [boss, setBoss] = useState(null);
  const [loading, setLoading] = useState(true);
  const authH = { headers: { Authorization: `Bearer ${token}` } };
  const socketRef = useRef(null);

  const loadBoss = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/raid/weekly`, authH);
      setBoss(r.data);
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    loadBoss();
    socketRef.current = io(API, { transports: ["websocket"] });
    socketRef.current.on("weekly_boss:defeated", loadBoss);
    return () => socketRef.current?.disconnect();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Загрузка...</div>;
  if (!boss) return null;

  const hpPct = Math.max(0, (boss.currentHp / boss.totalHp) * 100);
  const isDefeated = boss.status === "defeated";

  return (
    <div style={{ padding: "20px 16px 120px" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 64, marginBottom: 8, filter: isDefeated ? "grayscale(1)" : "drop-shadow(0 0 20px rgba(99,102,241,0.8))" }}>
          {boss.icon}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: 1 }}>{boss.name}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>Недельный рейд-босс</div>
      </div>

      {isDefeated ? (
        <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 16, padding: "20px", textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
          <div style={{ fontWeight: 800, color: "#22c55e", fontSize: 16 }}>Левиафан побеждён на этой неделе!</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>Новый появится в понедельник</div>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>HP ЛЕВИАФАНА</span>
            <span style={{ color: "#a78bfa", fontWeight: 800 }}>{boss.currentHp.toLocaleString()} / {boss.totalHp.toLocaleString()}</span>
          </div>
          <div style={{ height: 18, background: "rgba(0,0,0,0.5)", borderRadius: 9, overflow: "hidden", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div style={{ height: "100%", width: `${hpPct}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed,#a855f7)", borderRadius: 9, transition: "width 0.8s ease", boxShadow: "0 0 16px rgba(124,58,237,0.5)" }} />
          </div>
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            Каждый квест наносит урон! Сложный квест = 20 ⚔️, обычный = 10 ⚔️
          </div>
        </div>
      )}

      {/* My contribution */}
      {boss.myDamage > 0 && (
        <div style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Твой вклад</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#c4b5fd" }}>{boss.myDamage} ⚔️</div>
            </div>
            {boss.myRank && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>Место</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: boss.myRank <= 3 ? "#f59e0b" : "#fff" }}>
                  #{boss.myRank} {boss.myRank === 1 ? "🥇" : boss.myRank === 2 ? "🥈" : boss.myRank === 3 ? "🥉" : ""}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top 10 leaderboard */}
      {boss.damages?.length > 0 && (
        <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "10px 14px", fontSize: 10, fontWeight: 800, color: "rgba(99,102,241,0.7)", letterSpacing: 1.5, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            Топ участников
          </div>
          {boss.damages.map((d, i) => (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", background: d.userId === boss.myDamage ? "rgba(124,58,237,0.08)" : "transparent" }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: i < 3 ? ["#f59e0b","#94a3b8","#b45309"][i] : "rgba(255,255,255,0.3)", width: 20 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{d.user?.name || "Игрок"}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>Ур. {d.user?.level}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#a78bfa" }}>{d.damage} ⚔️</div>
            </div>
          ))}
        </div>
      )}

      {!isDefeated && (
        <div style={{ marginTop: 16, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px", fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
          🏆 Топ-3 по урону получат: 1500/1200/900 💰 + 2000/1500/1000 XP + Титул "Покоритель Левиафана"
        </div>
      )}
    </div>
  );
}

// ── History Screen ────────────────────────────────────────────────────────────
function HistoryScreen({ token }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/raid/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setHistory(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Загрузка...</div>;

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>📜 История рейдов</div>
      {history.length === 0 ? (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 40 }}>Рейдов ещё не было</div>
      ) : history.map(r => {
        const boss = BOSSES[r.difficulty] || BOSSES.E;
        const won = r.status === "victory";
        return (
          <div key={r.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 32 }}>{boss.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontWeight: 800, color: boss.color }}>{r.difficulty}</span>
                <span style={{ fontWeight: 700, color: "#fff" }}>{r.bossName}</span>
                {r.isIllusion && <span style={{ fontSize: 10, background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", borderRadius: 6, padding: "1px 6px", color: "#a78bfa" }}>ИЛЛЮЗИЯ</span>}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                Урон: {r.myDamage} · {new Date(r.createdAt).toLocaleDateString("ru")}
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: won ? "#22c55e" : RED }}>
              {won ? "Победа" : r.status === "abandoned" ? "Побег" : "Поражение"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Raid Component ──────────────────────────────────────────────────────
export default function Raid({ token, showToast, userLevel = 1, masteryPath = null }) {
  const [screen, setScreen] = useState("loading"); // loading | equipment | select | illusion | active | result | history
  const [activeRaid, setActiveRaid] = useState(null);
  const [resultRaid, setResultRaid] = useState(null);
  const [resultStatus, setResultStatus] = useState(null);
  const [raidResult, setRaidResult] = useState(null);
  const [fatiguedUntil, setFatiguedUntil] = useState(null);
  const [gold, setGold] = useState(0);
  const [equipment, setEquipment] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [tab, setTab] = useState("raid"); // raid | leviathan | history
  const authH = { headers: { Authorization: `Bearer ${token}` } };

  const init = useCallback(async () => {
    try {
      const [me, active, equip] = await Promise.all([
        axios.get(`${API}/me`, authH),
        axios.get(`${API}/raid/active`, authH),
        axios.get(`${API}/raid/equipment`, authH),
      ]);
      setFatiguedUntil(me.data.fatiguedUntil);
      setGold(me.data.gold || 0);
      setEquipment(equip.data || []);
      if (active.data) {
        if (active.data.status === "active") {
          setActiveRaid(active.data); setScreen("active");
        } else if (["victory","defeat","abandoned"].includes(active.data.status)) {
          setResultRaid(active.data); setResultStatus(active.data.status); setScreen("result");
        } else { setScreen("equipment"); }
      } else { setScreen("equipment"); }
    } catch { setScreen("equipment"); }
  }, [token]);

  useEffect(() => { init(); }, []);

  const toggleItem = (effect) => {
    setSelectedItems(prev => prev.includes(effect) ? prev.filter(e => e !== effect) : [...prev, effect]);
  };

  const handleStart = (raidData) => {
    if (!raidData) { init(); return; }
    if (raidData.isIllusion) { setActiveRaid(raidData); setScreen("illusion"); }
    else { setActiveRaid(raidData); setScreen("active"); }
  };

  const handleEnterIllusion = () => setScreen("active");

  const handleRetreat = async () => {
    try {
      const r = await axios.post(`${API}/raid/abandon`, {}, authH);
      showToast(`Отступление. -${r.data.penaltyGold} 💰`, "error");
      setActiveRaid(null); init();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
  };

  const handleRaidEnd = (endedRaid) => {
    setResultRaid(endedRaid);
    setResultStatus(endedRaid.status);
    setRaidResult(endedRaid.raidResult || null);
    setScreen("result");
  };

  const handleResultBack = () => {
    setActiveRaid(null); setResultRaid(null); setResultStatus(null); setRaidResult(null);
    setSelectedItems([]);
    init();
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", fontFamily: "monospace" }}>
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.4)", position: "sticky", top: 0, zIndex: 10 }}>
        {[["raid","⚔️ Рейд"],["leviathan","🐋 Левиафан"],["history","📜 История"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            flex: 1, background: "none", border: "none",
            borderBottom: tab === id ? `2px solid ${RED}` : "2px solid transparent",
            padding: "12px 4px", color: tab === id ? "#fff" : "rgba(255,255,255,0.4)",
            fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>

      {tab === "history" ? (
        <HistoryScreen token={token} />
      ) : tab === "leviathan" ? (
        <WeeklyBossScreen token={token} />
      ) : screen === "loading" ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <div style={{ fontSize: 36, animation: "spin 1s linear infinite" }}>⚔️</div>
          <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : screen === "equipment" ? (
        <EquipmentScreen
          equipment={equipment}
          selectedItems={selectedItems}
          onToggle={toggleItem}
          onContinue={() => setScreen("select")}
          masteryPath={masteryPath}
        />
      ) : screen === "select" ? (
        <DifficultyScreen
          onStart={handleStart}
          fatiguedUntil={fatiguedUntil}
          gold={gold}
          showToast={showToast}
          masteryPath={masteryPath}
          selectedItems={selectedItems}
        />
      ) : screen === "illusion" && activeRaid ? (
        <IllusionScreen raid={activeRaid} onEnter={handleEnterIllusion} onRetreat={handleRetreat} />
      ) : screen === "active" && activeRaid ? (
        <ActiveRaidScreen raid={activeRaid} token={token} showToast={showToast} onRaidEnd={handleRaidEnd} />
      ) : screen === "result" ? (
        <ResultScreen raid={resultRaid} status={resultStatus} raidResult={raidResult} onBack={handleResultBack} />
      ) : null}
    </div>
  );
}
