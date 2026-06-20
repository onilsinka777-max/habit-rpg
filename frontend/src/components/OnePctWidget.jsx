import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function OnePctWidget({ token }) {
  const [data, setData]   = useState(null);
  const [count, setCount] = useState(0);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/stats/growth`, auth).then(r => setData(r.data)).catch(() => {});
  }, []);

  // Animated counter
  useEffect(() => {
    if (!data) return;
    const target = Math.max(data.compound, 1);
    let current = 1;
    const step = (target - 1) / 40;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setCount(Math.round(current * 100) / 100);
      if (current >= target) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <div style={{
      background:"linear-gradient(135deg, rgba(245,182,55,0.08), rgba(251,120,120,0.05))",
      border:"1px solid rgba(245,182,55,0.2)",
      borderRadius:14, padding:"14px 16px", marginBottom:12,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <span style={{ fontSize:20 }}>📈</span>
        <div style={{ fontWeight:700, fontSize:14 }}>Принцип 1%</div>
        {data && data.growthRate !== 0 && (
          <span style={{
            fontSize:11, fontWeight:700, borderRadius:20, padding:"2px 8px",
            background: data.growthRate > 0 ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)",
            color: data.growthRate > 0 ? "#34d399" : "#ef4444",
          }}>
            {data.growthRate > 0 ? "+" : ""}{data.growthRate}%
          </span>
        )}
      </div>

      <p style={{ fontSize:12, color:"rgba(255,255,255,0.5)", margin:"0 0 10px", lineHeight:1.5 }}>
        Улучшайся на 1% каждый день — через год ты будешь в <b style={{ color:"#f5b637" }}>37 раз лучше</b>
      </p>

      {data && (
        <div style={{ display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#f5b637" }}>{count}x</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)" }}>текущий рост</div>
          </div>
          <div style={{ flex:1, fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
            За 30 дней: <span style={{ color:"#f1f5f9", fontWeight:600 }}>{data.thisMonth} квестов</span><br/>
            Прошлый месяц: <span style={{ color:"rgba(255,255,255,0.5)" }}>{data.lastMonth} квестов</span>
          </div>
        </div>
      )}
    </div>
  );
}
