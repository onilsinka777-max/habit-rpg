import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function TimeLeft({ endsAt }) {
  const [left, setLeft] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt) - new Date();
      if (diff <= 0) { setLeft("Время вышло"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setLeft(`${d}д ${h}ч ${m}м`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [endsAt]);
  return <span>{left}</span>;
}

export default function WeeklyBoss({ token, showToast }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/clans/weekly-boss`, auth)
      .then(r => setData(r.data))
      .catch(e => {
        if (e.response?.status !== 400) showToast("Ошибка загрузки босса", "error");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <p className="empty-state">Загрузка...</p>;
  if (!data)   return <p className="empty-state">Вступи в клан чтобы сражаться с боссом недели</p>;

  const { boss } = data;
  const pct = Math.min(100, Math.round((boss.currentQuests / boss.totalQuests) * 100));

  return (
    <div style={{
      background: boss.defeated
        ? "linear-gradient(135deg,rgba(52,211,153,0.12),rgba(10,14,26,0.95))"
        : "linear-gradient(135deg,rgba(220,38,38,0.1),rgba(10,14,26,0.97))",
      border: `1px solid ${boss.defeated ? "rgba(52,211,153,0.35)" : "rgba(220,38,38,0.35)"}`,
      borderRadius: 16, padding: 20,
      boxShadow: boss.defeated
        ? "0 0 30px rgba(52,211,153,0.15)"
        : "0 0 30px rgba(220,38,38,0.15)",
    }}>
      <style>{`
        @keyframes bossGlow { 0%,100%{box-shadow:0 0 20px rgba(220,38,38,0.4)} 50%{box-shadow:0 0 50px rgba(220,38,38,0.8)} }
        @keyframes bossShake { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-3px)} 75%{transform:translateX(3px)} }
        @keyframes defeated  { 0%{opacity:0;transform:scale(0.8)} 100%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
        <div style={{
          width:60, height:60, borderRadius:"50%", flexShrink:0,
          background: boss.defeated ? "rgba(52,211,153,0.2)" : "rgba(220,38,38,0.15)",
          border: `2px solid ${boss.defeated ? "#34d399" : "#dc2626"}`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:28,
          animation: boss.defeated ? "none" : "bossGlow 2s ease-in-out infinite",
        }}>
          {boss.defeated ? "💀" : "👹"}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color: boss.defeated ? "#34d399" : "#dc2626", marginBottom:4 }}>
            БОСС НЕДЕЛИ
          </div>
          <div style={{ fontWeight:900, fontSize:18, color: boss.defeated ? "#34d399" : "#f1f5f9", letterSpacing:1 }}>
            {boss.name}
          </div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", fontStyle:"italic", marginTop:4 }}>
            {boss.description}
          </div>
        </div>
      </div>

      {/* Defeated screen */}
      {boss.defeated ? (
        <div style={{ textAlign:"center", padding:"20px 0", animation:"defeated 0.5s ease" }}>
          <div style={{ fontSize:48, marginBottom:8 }}>🏆</div>
          <div style={{ fontSize:22, fontWeight:900, color:"#34d399", marginBottom:8 }}>БОСС ПОВЕРЖЕН!</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.6)", marginBottom:16 }}>
            Клан выполнил {boss.currentQuests} квестов
          </div>
          <div style={{ display:"flex", gap:16, justifyContent:"center" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:20, color:"#f5b637" }}>+{boss.rewardGold}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>золота</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontWeight:800, fontSize:20, color:"#a78bfa" }}>+{boss.rewardXp}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>XP</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6, color:"rgba(255,255,255,0.7)" }}>
              <span><b style={{ color:"#f1f5f9" }}>{boss.currentQuests}</b> / {boss.totalQuests} квестов</span>
              <span style={{ fontWeight:700, color: pct >= 75 ? "#34d399" : pct >= 50 ? "#f5b637" : "#f1f5f9" }}>{pct}%</span>
            </div>
            <div style={{ height:14, borderRadius:99, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:99, transition:"width 0.6s ease",
                width:`${pct}%`,
                background: pct >= 75 ? "linear-gradient(90deg,#34d399,#10b981)" : pct >= 50 ? "linear-gradient(90deg,#f5b637,#f59e0b)" : "linear-gradient(90deg,#dc2626,#b91c1c)",
                boxShadow: `0 0 12px ${pct >= 75 ? "#34d399" : "#dc2626"}66`,
              }}/>
            </div>
          </div>

          {/* Rewards & timer */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            <div style={{ flex:1, background:"rgba(245,182,55,0.08)", border:"1px solid rgba(245,182,55,0.2)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
              <div style={{ fontSize:18 }}>💰</div>
              <div style={{ fontWeight:700, color:"#f5b637" }}>{boss.rewardGold}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>золота</div>
            </div>
            <div style={{ flex:1, background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
              <div style={{ fontSize:18 }}>⭐</div>
              <div style={{ fontWeight:700, color:"#a78bfa" }}>{boss.rewardXp}</div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>XP</div>
            </div>
            <div style={{ flex:1, background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)", borderRadius:10, padding:"10px 14px", textAlign:"center" }}>
              <div style={{ fontSize:18 }}>⏳</div>
              <div style={{ fontWeight:700, color:"#f87171", fontSize:11 }}><TimeLeft endsAt={boss.weekEnd} /></div>
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>до конца</div>
            </div>
          </div>

          <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", textAlign:"center", margin:0 }}>
            Выполняй квесты — каждый засчитывается боссу
          </p>
        </>
      )}
    </div>
  );
}
