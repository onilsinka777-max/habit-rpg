import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SOCIALS = [
  { icon:"📸", url:"https://www.instagram.com/_lap_tev_",  color:"#E1306C" },
  { icon:"🎵", url:"https://www.tiktok.com/@laptev_",       color:"#69C9D0" },
  { icon:"✈️", url:"https://t.me/antonchik_zavozit",        color:"#2AABEE" },
];

function LaptevAvatar({ size = 32 }) {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ width:size, height:size, borderRadius:"50%",
      background:"linear-gradient(135deg,#f5b637,#d97706)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.4, fontWeight:900, color:"#020208", flexShrink:0,
      border:`2px solid #f5b637` }}>Л</div>
  );
  return (
    <img src="/images/laptev.jpg" alt="L" onError={() => setErr(true)} style={{
      width:size, height:size, borderRadius:"50%",
      border:"2px solid rgba(245,182,55,0.6)", objectFit:"cover",
      boxShadow:"0 0 8px rgba(245,182,55,0.4)", display:"block", flexShrink:0,
    }}/>
  );
}

// ── Animated torch ────────────────────────────────────────────────────────────
function Torch({ side }) {
  return (
    <div style={{
      position:"fixed", [side]:12, top:"15%",
      display:"flex", flexDirection:"column", alignItems:"center",
      zIndex:2, pointerEvents:"none",
    }}>
      {/* Flame */}
      <div style={{ position:"relative", width:16, height:28 }}>
        <div style={{
          position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:14, height:22,
          background:"linear-gradient(180deg,#fff7c0,#f5b637,#ef4444)",
          borderRadius:"50% 50% 30% 30%",
          animation:`hofFlicker${side} 1.2s ease-in-out infinite`,
          boxShadow:"0 0 12px #f5b637, 0 0 24px rgba(245,182,55,0.4)",
        }}/>
        <div style={{
          position:"absolute", bottom:4, left:"50%", transform:"translateX(-50%)",
          width:8, height:12,
          background:"rgba(255,255,200,0.7)",
          borderRadius:"50% 50% 30% 30%",
          animation:`hofFlicker${side}2 1.5s ease-in-out infinite`,
        }}/>
      </div>
      {/* Pole */}
      <div style={{
        width:6, height:80, borderRadius:3,
        background:"linear-gradient(180deg,rgba(245,182,55,0.4),rgba(100,70,20,0.6))",
        border:"1px solid rgba(245,182,55,0.2)",
      }}/>
      {/* Base */}
      <div style={{ width:14, height:6, borderRadius:3,
        background:"rgba(245,182,55,0.3)", border:"1px solid rgba(245,182,55,0.2)" }}/>

      {/* Second torch lower */}
      <div style={{ height:80 }}/>
      <div style={{ position:"relative", width:16, height:28 }}>
        <div style={{
          position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:14, height:22,
          background:"linear-gradient(180deg,#fff7c0,#f5b637,#ef4444)",
          borderRadius:"50% 50% 30% 30%",
          animation:`hofFlicker${side} 1.8s ease-in-out 0.4s infinite`,
          boxShadow:"0 0 12px #f5b637, 0 0 24px rgba(245,182,55,0.4)",
        }}/>
      </div>
      <div style={{ width:6, height:80, borderRadius:3,
        background:"linear-gradient(180deg,rgba(245,182,55,0.4),rgba(100,70,20,0.6))",
        border:"1px solid rgba(245,182,55,0.2)" }}/>
      <div style={{ width:14, height:6, borderRadius:3,
        background:"rgba(245,182,55,0.3)", border:"1px solid rgba(245,182,55,0.2)" }}/>
    </div>
  );
}

export default function HallOfFame({ token }) {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/hall-of-fame`, auth)
      .then(r => setWinners(r.data.winners || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ position:"relative", minHeight:"100vh", paddingBottom:40, overflow:"hidden" }}>
      <style>{`
        @keyframes hofShimmer   { 0%{background-position:-200%} 100%{background-position:200%} }
        @keyframes hofTwinkle   { 0%,100%{opacity:0.15} 50%{opacity:0.85} }
        @keyframes hofGoldRing  { to { transform:rotate(360deg); } }
        @keyframes hofFlickerleft  { 0%,100%{opacity:1;transform:translateX(-50%) scaleY(1) scaleX(1)} 33%{opacity:0.85;transform:translateX(-52%) scaleY(0.93) scaleX(1.05)} 66%{opacity:0.95;transform:translateX(-48%) scaleY(1.05) scaleX(0.95)} }
        @keyframes hofFlickerright { 0%,100%{opacity:1;transform:translateX(-50%) scaleY(1) scaleX(1)} 33%{opacity:0.9;transform:translateX(-48%) scaleY(0.95) scaleX(1.05)} 66%{opacity:0.85;transform:translateX(-52%) scaleY(1.05) scaleX(0.95)} }
        @keyframes hofFlickerleft2  { 0%,100%{opacity:0.7;transform:translateX(-50%) scaleY(0.9)} 50%{opacity:1;transform:translateX(-50%) scaleY(1.1)} }
        @keyframes hofFlickerright2 { 0%,100%{opacity:0.8;transform:translateX(-50%) scaleY(1)} 50%{opacity:0.5;transform:translateX(-50%) scaleY(0.8)} }
      `}</style>

      {/* Background */}
      <div style={{
        position:"fixed", inset:0, zIndex:0, pointerEvents:"none",
        background:"linear-gradient(180deg,#020208 0%,#0d0520 50%,#020208 100%)",
      }}/>

      {/* Stars */}
      <div style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }}>
        {Array.from({length:50}, (_,i) => (
          <div key={i} style={{
            position:"absolute",
            left:`${(i*173.5)%100}%`, top:`${(i*89.3)%100}%`,
            width:(i%3)+1, height:(i%3)+1,
            borderRadius:"50%", background:"#f5b637",
            animation:`hofTwinkle ${2+(i%3)}s ease-in-out ${(i*0.22)%3}s infinite`,
            opacity:0.3,
          }}/>
        ))}
      </div>

      {/* Gold side lines */}
      <div style={{ position:"fixed", left:32, top:0, bottom:0, width:1, zIndex:1, pointerEvents:"none",
        background:"linear-gradient(180deg,transparent,rgba(245,182,55,0.3),rgba(245,182,55,0.15),transparent)" }}/>
      <div style={{ position:"fixed", right:32, top:0, bottom:0, width:1, zIndex:1, pointerEvents:"none",
        background:"linear-gradient(180deg,transparent,rgba(245,182,55,0.3),rgba(245,182,55,0.15),transparent)" }}/>

      {/* Torches */}
      <Torch side="left" />
      <Torch side="right" />

      {/* Back button header */}
      <div style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        padding:"12px 20px", display:"flex", alignItems:"center", gap:12,
        background:"linear-gradient(180deg,rgba(2,2,8,0.95) 0%,transparent 100%)",
      }}>
        <button onClick={() => window.history.back()} style={{
          background:"rgba(124,58,237,0.2)", border:"1px solid rgba(124,58,237,0.4)",
          borderRadius:10, color:"#a78bfa", padding:"8px 16px",
          cursor:"pointer", fontSize:14, fontWeight:600,
          display:"flex", alignItems:"center", gap:6,
        }}>← Назад</button>
        <span style={{ color:"rgba(255,255,255,0.4)", fontSize:13 }}>LevelUp</span>
      </div>

      {/* Content */}
      <div style={{ position:"relative", zIndex:10, maxWidth:560, margin:"0 auto", padding:"24px 16px 0", paddingTop:60 }}>

        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{
            fontSize:28, fontWeight:900, letterSpacing:4,
            background:"linear-gradient(90deg,#d97706,#f5b637,#ffd700,#f5b637,#d97706)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"hofShimmer 3s linear infinite",
          }}>⚡ ЗАЛ СЛАВЫ</div>
          <div style={{ fontSize:12, color:"rgba(245,182,55,0.4)", marginTop:6, letterSpacing:2 }}>
            ТЕ КТО ПОБЕДИЛ СИСТЕМУ
          </div>

          {/* Decorative divider */}
          <div style={{ display:"flex", alignItems:"center", gap:8, margin:"16px 0 0" }}>
            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,rgba(245,182,55,0.4))" }}/>
            <span style={{ fontSize:14, color:"rgba(245,182,55,0.5)" }}>✦</span>
            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,rgba(245,182,55,0.4),transparent)" }}/>
          </div>
        </div>

        {/* ── Таблица ── */}
        <div style={{
          background:"rgba(0,0,0,0.6)", borderRadius:16,
          border:"1px solid rgba(245,182,55,0.15)",
          overflow:"hidden",
          boxShadow:"0 4px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(245,182,55,0.08)",
        }}>
          {/* Table header */}
          <div style={{
            display:"grid", gridTemplateColumns:"32px 1fr 80px 60px 70px",
            gap:8, padding:"8px 14px",
            background:"rgba(245,182,55,0.05)",
            borderBottom:"1px solid rgba(245,182,55,0.1)",
          }}>
            {["", "Имя", "Статус", "Уровень", "Дата"].map((h, i) => (
              <div key={i} style={{ fontSize:9, color:"rgba(245,182,55,0.4)", fontWeight:700, letterSpacing:1 }}>{h}</div>
            ))}
          </div>

          {/* LAPTEV row */}
          <div style={{
            display:"grid", gridTemplateColumns:"32px 1fr 80px 60px 70px",
            gap:8, padding:"12px 14px", alignItems:"center",
            background:"linear-gradient(135deg,rgba(245,182,55,0.1),rgba(245,182,55,0.05))",
            borderBottom:"1px solid rgba(245,182,55,0.15)",
          }}>
            <LaptevAvatar size={32} />
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontWeight:900, fontSize:15,
                background:"linear-gradient(90deg,#f5b637,#ffd700)",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              }}>LAPTEV</span>
              <div style={{ display:"flex", gap:4 }}>
                {SOCIALS.map(s => (
                  <a key={s.icon} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                    fontSize:11, textDecoration:"none", opacity:0.7,
                    transition:"opacity 0.15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                  >{s.icon}</a>
                ))}
              </div>
            </div>
            <div style={{ fontSize:10, color:"#f5b637", fontWeight:700, letterSpacing:0.5 }}>Создатель</div>
            <div style={{ fontSize:13, color:"rgba(245,182,55,0.7)", fontWeight:700, textAlign:"center" }}>∞</div>
            <div style={{ fontSize:10, color:"rgba(245,182,55,0.4)" }}>Основатель</div>
          </div>

          {/* Gold separator */}
          <div style={{ height:1, background:"linear-gradient(90deg,transparent,rgba(245,182,55,0.2),transparent)" }}/>

          {/* Winners / empty rows */}
          {loading ? (
            <div style={{ padding:"20px", textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.3)" }}>Загрузка...</div>
          ) : (
            <>
              {winners.map((w, i) => (
                <div key={w.id} style={{
                  display:"grid", gridTemplateColumns:"32px 1fr 80px 60px 70px",
                  gap:8, padding:"10px 14px", alignItems:"center",
                  background: i%2===0 ? "rgba(245,182,55,0.03)" : "transparent",
                  borderBottom:"1px solid rgba(245,182,55,0.06)",
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:"50%", flexShrink:0,
                    background:"rgba(245,182,55,0.1)", border:"1px solid rgba(245,182,55,0.3)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:14, fontWeight:900, color:"#f5b637",
                  }}>{i===0 ? "👑" : `${i+1}`}</div>
                  <div style={{ fontWeight:700, fontSize:14, color:"rgba(255,255,255,0.85)" }}>{w.name || "Игрок"}</div>
                  <div style={{ fontSize:10, color:"rgba(245,182,55,0.6)", fontWeight:600 }}>
                    {w.type === "legendary_path" ? "Легенда" : "Победитель"}
                  </div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)", textAlign:"center" }}>{w.level}</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)" }}>
                    {w.completedAt ? new Date(w.completedAt).toLocaleDateString("ru-RU") : ""}
                  </div>
                </div>
              ))}

              {/* Empty rows */}
              {Array.from({length: Math.max(0, 9 - winners.length)}, (_, i) => (
                <div key={`empty-${i}`} style={{
                  display:"grid", gridTemplateColumns:"32px 1fr 80px 60px 70px",
                  gap:8, padding:"10px 14px", alignItems:"center",
                  borderBottom:"1px dashed rgba(245,182,55,0.06)",
                  opacity:0.4,
                }}>
                  <div style={{
                    width:32, height:32, borderRadius:"50%", flexShrink:0,
                    border:"1px dashed rgba(245,182,55,0.2)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:11, color:"rgba(245,182,55,0.3)",
                  }}>{winners.length + i + 1}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.15)", fontStyle:"italic" }}>
                    - - - ожидает героя - - -
                  </div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.08)" }}>—</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.08)", textAlign:"center" }}>—</div>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.08)" }}>—</div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign:"center", marginTop:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,transparent,rgba(245,182,55,0.2))" }}/>
            <span style={{ fontSize:12, color:"rgba(245,182,55,0.3)", fontStyle:"italic" }}>
              Заверши Легендарный путь (50 квестов) чтобы войти в историю
            </span>
            <div style={{ flex:1, height:1, background:"linear-gradient(90deg,rgba(245,182,55,0.2),transparent)" }}/>
          </div>
        </div>

      </div>
    </div>
  );
}
