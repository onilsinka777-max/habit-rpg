import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SOCIALS = [
  { icon:"📸", label:"Instagram", url:"https://www.instagram.com/_lap_tev_",  color:"#E1306C" },
  { icon:"🎵", label:"TikTok",    url:"https://www.tiktok.com/@laptev_",       color:"#69C9D0" },
  { icon:"✈️", label:"Telegram", url:"https://t.me/antonchik_zavozit",        color:"#2AABEE" },
];

function LaptevAvatar() {
  const [err, setErr] = useState(false);
  if (err) return (
    <div style={{ width:80, height:80, borderRadius:"50%",
      background:"linear-gradient(135deg,#f5b637,#d97706)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:32, fontWeight:900, color:"#020208", flexShrink:0,
      border:"3px solid #f5b637", boxShadow:"0 0 24px rgba(245,182,55,0.5)" }}>Л</div>
  );
  return (
    <img src="/images/laptev.jpg" alt="LAPTEV" onError={() => setErr(true)} style={{
      width:80, height:80, borderRadius:"50%", border:"3px solid #f5b637",
      objectFit:"cover", boxShadow:"0 0 24px rgba(245,182,55,0.5)", display:"block",
    }}/>
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
    <div style={{ paddingBottom:32 }}>
      <style>{`
        @keyframes hofShimmer { 0%{background-position:-200%} 100%{background-position:200%} }
        @keyframes hofGoldRing { to { transform:rotate(360deg); } }
        @keyframes hofPulse    { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes hofTwinkle  { 0%,100%{opacity:0.2} 50%{opacity:0.9} }
      `}</style>

      {/* Stars */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
        {Array.from({length:40}, (_,i) => (
          <div key={i} style={{
            position:"absolute",
            left:`${(i*173.5)%100}%`, top:`${(i*89.3)%100}%`,
            width:(i%3)+1, height:(i%3)+1, borderRadius:"50%", background:"#f5b637",
            animation:`hofTwinkle ${2+(i%3)}s ease-in-out ${(i*0.25)%3}s infinite`,
          }}/>
        ))}
      </div>

      <div style={{ position:"relative", zIndex:1 }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{
            fontSize:28, fontWeight:900, letterSpacing:4,
            background:"linear-gradient(90deg,#f5b637,#fde68a,#f5b637,#d97706,#f5b637)",
            backgroundSize:"200% auto",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"hofShimmer 3s linear infinite",
          }}>⚡ ЗАЛ СЛАВЫ</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", marginTop:6, letterSpacing:1 }}>
            ЛЕГЕНДЫ СИСТЕМЫ LEVELUP
          </div>
        </div>

        {/* ── СОЗДАТЕЛЬ СИСТЕМЫ ── */}
        <div style={{ marginBottom:24 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"rgba(245,182,55,0.5)",
            textTransform:"uppercase", marginBottom:12, paddingLeft:4 }}>
            Создатель системы
          </div>

          <div style={{
            background:"linear-gradient(135deg,rgba(10,8,0,0.98),rgba(30,20,0,0.97))",
            border:"2px solid rgba(245,182,55,0.5)", borderRadius:20, padding:24,
            boxShadow:"0 0 40px rgba(245,182,55,0.15), inset 0 1px 0 rgba(245,182,55,0.1)",
            position:"relative", overflow:"hidden",
          }}>
            {/* Gold corner glow */}
            <div style={{ position:"absolute", top:-40, right:-40, width:120, height:120,
              background:"rgba(245,182,55,0.1)", borderRadius:"50%", filter:"blur(30px)" }}/>
            <div style={{ position:"absolute", bottom:-40, left:-40, width:120, height:120,
              background:"rgba(245,182,55,0.08)", borderRadius:"50%", filter:"blur(30px)" }}/>

            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, position:"relative" }}>
              {/* Avatar with gold ring */}
              <div style={{ position:"relative", width:100, height:100,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <div style={{
                  position:"absolute", inset:-4, borderRadius:"50%",
                  border:"2px solid transparent",
                  borderTopColor:"#f5b637", borderRightColor:"rgba(245,182,55,0.5)",
                  animation:"hofGoldRing 3s linear infinite",
                }}/>
                <div style={{
                  position:"absolute", inset:-8, borderRadius:"50%",
                  border:"1px solid transparent",
                  borderBottomColor:"rgba(245,182,55,0.3)",
                  animation:"hofGoldRing 5s linear infinite reverse",
                }}/>
                <LaptevAvatar />
              </div>

              {/* Name */}
              <div style={{
                fontSize:28, fontWeight:900, letterSpacing:4,
                background:"linear-gradient(90deg,#f5b637,#fde68a,#f5b637)",
                backgroundSize:"200% auto",
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                animation:"hofShimmer 3s linear infinite",
              }}>LAPTEV</div>

              <div style={{ fontSize:12, color:"rgba(255,255,255,0.3)", letterSpacing:1 }}>
                Создатель системы · Уровень ∞
              </div>

              {/* Socials */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"center" }}>
                {SOCIALS.map(s => (
                  <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" style={{
                    display:"flex", alignItems:"center", gap:6, padding:"6px 12px",
                    borderRadius:20, background:"rgba(255,255,255,0.04)",
                    border:"1px solid rgba(245,182,55,0.2)",
                    textDecoration:"none", color:"rgba(255,255,255,0.5)", fontSize:12,
                    transition:"all 0.15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.color = s.color; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,182,55,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
                  >
                    <span>{s.icon}</span><span style={{ fontWeight:600 }}>{s.label}</span>
                  </a>
                ))}
              </div>

              {/* Quote */}
              <div style={{
                background:"rgba(245,182,55,0.06)", borderLeft:"3px solid rgba(245,182,55,0.4)",
                borderRadius:"0 10px 10px 0", padding:"10px 14px", maxWidth:320,
                fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.65, fontStyle:"italic",
                textAlign:"center",
              }}>
                "Я создал эту систему. Докажи что можешь меня превзойти."
              </div>
            </div>
          </div>
        </div>

        {/* ── ПОБЕДИТЕЛИ СИСТЕМЫ ── */}
        <div>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:3, color:"rgba(245,182,55,0.5)",
            textTransform:"uppercase", marginBottom:12, paddingLeft:4 }}>
            Победители системы
          </div>

          {loading ? (
            <div style={{ textAlign:"center", padding:"24px", color:"rgba(255,255,255,0.3)", fontSize:13 }}>Загрузка...</div>
          ) : winners.length === 0 ? (
            <div style={{
              background:"linear-gradient(135deg,rgba(10,8,0,0.95),rgba(20,15,0,0.95))",
              border:"1px dashed rgba(245,182,55,0.2)", borderRadius:16, padding:28,
              textAlign:"center",
            }}>
              {/* Empty slots */}
              {[1,2,3].map(i => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:12, marginBottom:10,
                  background:"rgba(245,182,55,0.03)", border:"1px dashed rgba(245,182,55,0.12)",
                  borderRadius:12, padding:"12px 16px",
                }}>
                  <div style={{ width:36, height:36, borderRadius:"50%",
                    border:"1px dashed rgba(245,182,55,0.2)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:16, color:"rgba(245,182,55,0.2)", flexShrink:0 }}>#{i}</div>
                  <div style={{ fontSize:13, color:"rgba(255,255,255,0.15)", fontStyle:"italic" }}>
                    Место пустует...
                  </div>
                </div>
              ))}
              <p style={{ fontSize:13, color:"rgba(245,182,55,0.5)", marginTop:16, fontStyle:"italic" }}>
                Здесь появятся имена тех кто прошёл Путь Создателя.<br/>
                <strong style={{ color:"rgba(245,182,55,0.7)" }}>Стань первым.</strong>
              </p>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {winners.map((w, i) => (
                <div key={w.id} style={{
                  display:"flex", alignItems:"center", gap:12,
                  background:"linear-gradient(135deg,rgba(10,8,0,0.97),rgba(20,15,0,0.95))",
                  border:`1px solid ${i===0?"rgba(245,182,55,0.5)":"rgba(245,182,55,0.15)"}`,
                  borderRadius:14, padding:"14px 16px",
                  boxShadow: i===0 ? "0 0 20px rgba(245,182,55,0.15)" : "none",
                }}>
                  <div style={{
                    width:36, height:36, borderRadius:"50%", flexShrink:0,
                    background: i===0 ? "linear-gradient(135deg,#f5b637,#d97706)" : "rgba(245,182,55,0.1)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:16, fontWeight:900,
                    color: i===0 ? "#020208" : "rgba(245,182,55,0.5)",
                    border: i===0 ? "none" : "1px solid rgba(245,182,55,0.2)",
                  }}>{i===0?"🏆":`#${i+1}`}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:15, color: i===0?"#fde68a":"rgba(255,255,255,0.7)" }}>
                      {w.name || "Игрок"}
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>
                      Уровень {w.level} · {w.completedAt ? new Date(w.completedAt).toLocaleDateString("ru-RU") : ""}
                    </div>
                  </div>
                  <div style={{ fontSize:11, fontWeight:700, color:"rgba(245,182,55,0.6)",
                    letterSpacing:1, textAlign:"right" }}>
                    ПОБЕДИТЕЛЬ<br/>СИСТЕМЫ
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
