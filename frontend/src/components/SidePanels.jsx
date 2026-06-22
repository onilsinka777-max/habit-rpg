import { useEffect, useState } from "react";
import axios from "axios";
import StarField from "./StarField";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Left panel: scan lines + daily stats
function LeftPanel({ token }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStats(r.data)).catch(() => {});
  }, [token]);

  return (
    <div style={{
      position:"fixed", left:0, top:0, bottom:0, zIndex:10,
      width:"calc((100vw - 480px) / 2)",
      background:"linear-gradient(180deg, #0a0718 0%, #0d0820 100%)",
      borderRight:"1px solid #2d1b69",
      overflow:"hidden",
      display:"flex", flexDirection:"column", justifyContent:"flex-end",
      pointerEvents:"none",
    }}>
      <style>{`
        @keyframes scanLine {
          0%   { transform: translateY(-100vh); opacity: 0; }
          15%  { opacity: 0.7; }
          85%  { opacity: 0.7; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
        @keyframes scanGlow {
          0%   { transform: translateY(-100vh); opacity: 0; }
          20%  { opacity: 0.3; }
          80%  { opacity: 0.3; }
          100% { transform: translateY(100vh); opacity: 0; }
        }
      `}</style>

      <StarField side="left" />

      {/* Scan lines */}
      {[0, 2.5, 5, 7.5].map((delay, i) => (
        <div key={i} style={{
          position:"absolute",
          left:"30%", right:0,
          height: i % 2 === 0 ? 2 : 1,
          background: i % 2 === 0
            ? "linear-gradient(90deg, transparent, #7c3aed, #a78bfa, transparent)"
            : "linear-gradient(90deg, transparent, #4c1d95, transparent)",
          animation:`scanLine ${8 + i * 1.5}s linear ${delay}s infinite`,
          boxShadow: i % 2 === 0 ? "0 0 8px #7c3aed" : "none",
        }}/>
      ))}

      {/* Daily stats widget */}
      {stats && (
        <div style={{
          padding:"16px 14px 24px",
          pointerEvents:"auto",
        }}>
          <div style={{ fontSize:9, fontWeight:800, color:"rgba(124,58,237,0.6)", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>
            СЕГОДНЯ
          </div>
          {[
            { icon:"⚔️", label:"Квестов", value: stats.tasksToday ?? "—" },
            { icon:"✨", label:"XP",       value: stats.xpToday   ?? "—" },
            { icon:"🔥", label:"Стрик",    value: `${stats.streak ?? 0} д.` },
          ].map(s => (
            <div key={s.label} style={{ display:"flex", alignItems:"center", gap:7, marginBottom:7 }}>
              <span style={{ fontSize:13 }}>{s.icon}</span>
              <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)", flex:1 }}>{s.label}</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#a78bfa" }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Right panel: floating particles + top players
function RightPanel({ token }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    axios.get(`${API}/online-count`).then(r => setData(r.data)).catch(() => {});
  }, []);

  const particles = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${15 + (i * 5.7) % 70}%`,
    size: 2 + (i % 3),
    delay: (i * 0.7) % 5,
    dur: 3 + (i % 3),
  }));

  return (
    <div style={{
      position:"fixed", right:0, top:0, bottom:0, zIndex:10,
      width:"calc((100vw - 480px) / 2)",
      background:"linear-gradient(180deg, #0a0718 0%, #0d0820 100%)",
      borderLeft:"1px solid #2d1b69",
      overflow:"hidden",
      display:"flex", flexDirection:"column", justifyContent:"flex-start",
      pointerEvents:"none",
    }}>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1); opacity: 0.8; }
          100% { transform: translateY(-110px) scale(0.3); opacity: 0; }
        }
      `}</style>

      <StarField side="right" />

      {/* Floating particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position:"absolute",
          left: p.left,
          bottom: `${10 + (p.id * 6.3) % 60}%`,
          width: p.size, height: p.size,
          borderRadius:"50%",
          background: p.id % 3 === 0 ? "#7c3aed" : p.id % 3 === 1 ? "#a78bfa" : "#4c1d95",
          boxShadow: `0 0 ${p.size * 2}px currentColor`,
          animation:`floatUp ${p.dur}s ease-in ${p.delay}s infinite`,
        }}/>
      ))}

      {/* Top widget */}
      {data && (
        <div style={{
          padding:"24px 14px 16px",
          pointerEvents:"auto",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", boxShadow:"0 0 6px #22c55e" }}/>
            <span style={{ fontSize:11, fontWeight:700, color:"#22c55e" }}>{data.online} онлайн</span>
          </div>

          {data.topWeek?.length > 0 && (
            <>
              <div style={{ fontSize:9, fontWeight:800, color:"rgba(124,58,237,0.6)", letterSpacing:2, textTransform:"uppercase", marginBottom:8 }}>
                ТОП НЕДЕЛИ
              </div>
              {data.topWeek.map((p, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
                  <span style={{ fontSize:11, color:["#fbbf24","#94a3b8","#cd7c3a"][i], fontWeight:700 }}>
                    {["1","2","3"][i]}
                  </span>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {(p.name||"").slice(0,10)}
                  </span>
                  <span style={{ fontSize:10, color:"#a78bfa" }}>Ур.{p.level}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SidePanels({ token }) {
  const [wide, setWide] = useState(window.innerWidth > 900);
  useEffect(() => {
    const handler = () => setWide(window.innerWidth > 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  if (!wide) return null;
  return (
    <>
      <LeftPanel token={token} />
      <RightPanel token={token} />
    </>
  );
}
