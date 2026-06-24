import { useEffect, useRef, useState } from "react";
import axios from "axios";
import LockedFeature from "./LockedFeature";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const MILESTONES = {
  5:  { gold:100,   icon:"⚔️",  label:"Первый рубеж",       extra:"" },
  10: { gold:200,   icon:"🔥",  label:"Воля закалена",      extra:"" },
  15: { gold:300,   icon:"💎",  label:"Кристальный разум",  extra:"" },
  20: { gold:500,   icon:"🌟",  label:"Половина пути",      extra:"+эффект ника 7 дней" },
  25: { gold:750,   icon:"⚡",  label:"Четверть легенды",   extra:"" },
  30: { gold:1000,  icon:"🏔️", label:"Вершина близко",     extra:"" },
  35: { gold:1500,  icon:"👑",  label:"Избранный",          extra:"" },
  40: { gold:2000,  icon:"🌙",  label:"Ночной страж",       extra:"+рамка аватара" },
  45: { gold:3000,  icon:"🔮",  label:"Предпоследний шаг",  extra:"" },
  50: { gold:10000, icon:"🏆",  label:"ЛЕГЕНДА",            extra:"+титул+Зал Славы" },
};

const NODE_STEP   = 64;
const TOP_PAD     = 60;
const BOTTOM_PAD  = 40;
const TOTAL_H     = TOP_PAD + 49 * NODE_STEP + BOTTOM_PAD + 60;

// Quest 50 at top (top = TOP_PAD), quest 1 at bottom
function nodeTop(num) {
  return TOP_PAD + (50 - num) * NODE_STEP;
}

// ── StarField ─────────────────────────────────────────────────────────────────
function StarField() {
  const stars = [];
  let s = 17;
  for (let i = 0; i < 110; i++) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const left = (s % 10000) / 100;
    s = (s * 22695477 + 1)         & 0x7fffffff;
    const top  = (s % 10000) / 100;
    s = (s * 6364136223846793005n === undefined ? s * 6364 + 1442695040 : s * 6364 + 1) & 0x7fffffff;
    const sz   = i % 12 === 0 ? 2 : 1;
    const op   = 0.15 + (i % 7) * 0.07;
    stars.push({ left, top, sz, op });
  }
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0, overflow:"hidden" }}>
      {stars.map((st, i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${st.left}%`, top:`${st.top}%`,
          width:st.sz, height:st.sz,
          borderRadius:"50%",
          background:"#fff",
          opacity:st.op,
        }} />
      ))}
    </div>
  );
}

// ── Single quest node ─────────────────────────────────────────────────────────
function QuestNode({ num, done, current, milestone, nodeRef }) {
  const [hover, setHover] = useState(false);

  const size = milestone ? 48 : done ? 20 : current ? 28 : 16;
  const top  = nodeTop(num);

  const baseStyle = {
    position:"absolute",
    top,
    left:"50%",
    transform:"translateX(-50%)",
    width:size, height:size,
    borderRadius:"50%",
    display:"flex", alignItems:"center", justifyContent:"center",
    transition:"width 0.25s, height 0.25s, box-shadow 0.25s",
    zIndex:3,
    cursor: milestone ? "pointer" : "default",
  };

  let nodeStyle;
  if (milestone) {
    nodeStyle = done ? {
      background:"linear-gradient(135deg,#4c1d95,#7c3aed)",
      border:"2px solid #a78bfa",
      boxShadow:"0 0 20px rgba(124,58,237,0.6)",
      fontSize:22,
    } : {
      background:"rgba(76,29,149,0.18)",
      border:"2px solid rgba(167,139,250,0.2)",
      fontSize:18,
      opacity:0.5,
    };
  } else if (done) {
    nodeStyle = {
      background:"#7c3aed",
      boxShadow:"0 0 8px #7c3aed",
      fontSize:9,
      color:"#fff",
    };
  } else if (current) {
    nodeStyle = {
      background:"rgba(124,58,237,0.25)",
      border:"2px solid #a78bfa",
      animation:"currentPulse 2s ease-in-out infinite",
    };
  } else {
    nodeStyle = {
      background:"rgba(255,255,255,0.04)",
      border:"1px solid rgba(255,255,255,0.1)",
    };
  }

  return (
    <div
      ref={nodeRef}
      style={{ ...baseStyle, ...nodeStyle }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {milestone
        ? milestone.icon
        : done ? "✓" : null}

      {/* Quest number on the side */}
      {!milestone && (
        <span style={{
          position:"absolute",
          left: num % 2 === 0 ? "calc(100% + 10px)" : "auto",
          right: num % 2 !== 0 ? "calc(100% + 10px)" : "auto",
          fontSize:9,
          color:"rgba(255,255,255,0.18)",
          whiteSpace:"nowrap",
          fontWeight:done?700:400,
          color: done ? "rgba(167,139,250,0.5)" : "rgba(255,255,255,0.15)",
        }}>
          {num}
        </span>
      )}

      {/* Milestone label */}
      {milestone && (
        <span style={{
          position:"absolute",
          right:"calc(100% + 10px)",
          fontSize:10,
          color: done ? "#a78bfa" : "rgba(167,139,250,0.35)",
          whiteSpace:"nowrap",
          fontWeight:700,
          textAlign:"right",
        }}>
          {milestone.label}
        </span>
      )}

      {/* Milestone tooltip on hover */}
      {milestone && hover && (
        <div style={{
          position:"absolute",
          bottom:"calc(100% + 8px)",
          left:"50%", transform:"translateX(-50%)",
          background:"rgba(8,4,24,0.97)",
          border:"1px solid #7c3aed",
          borderRadius:8,
          padding:"8px 14px",
          whiteSpace:"nowrap",
          zIndex:10,
          pointerEvents:"none",
          boxShadow:"0 0 20px rgba(124,58,237,0.4)",
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#a78bfa", marginBottom:3 }}>
            {milestone.icon} {milestone.label}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)" }}>
            +{milestone.gold} золота{milestone.extra ? " · " + milestone.extra : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Particles ─────────────────────────────────────────────────────────────────
function Particles() {
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:50, overflow:"hidden" }}>
      {Array.from({length:22}, (_, i) => (
        <div key={i} style={{
          position:"absolute",
          left:`${18 + (i * 3.2) % 64}%`,
          bottom:"25%",
          width: i % 3 === 0 ? 8 : 5,
          height: i % 3 === 0 ? 8 : 5,
          borderRadius:"50%",
          background: i % 3 === 0 ? "#f5b637" : i % 3 === 1 ? "#a78bfa" : "rgba(255,255,255,0.8)",
          animation:`particleUp ${1.4 + (i%4)*0.3}s ease-out ${i*0.07}s forwards`,
          opacity:0,
        }} />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function LegendPath({ token, showToast, userLevel }) {
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [busy,         setBusy]         = useState(false);
  const [celebrating,  setCelebrating]  = useState(false);
  const [flashActive,  setFlashActive]  = useState(false);

  const pathRef       = useRef(null);
  const currentRef    = useRef(null);
  const auth          = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const res = await axios.get(`${API}/legend-path`, auth);
      setData(res.data);
    } catch (e) {
      if (e.response?.status !== 403) showToast("Ошибка загрузки", "error");
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [token]);

  useEffect(() => {
    if (!currentRef.current || !pathRef.current) return;
    const timer = setTimeout(() => {
      currentRef.current?.scrollIntoView({ behavior:"smooth", block:"center" });
    }, 350);
    return () => clearTimeout(timer);
  }, [data]);

  const claimDaily = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`${API}/legend-path/claim-daily`, {}, auth);
      setCelebrating(true);
      setTimeout(() => setCelebrating(false), 2400);
      if (MILESTONES[res.data.questNum]) {
        setFlashActive(true);
        setTimeout(() => setFlashActive(false), 1100);
      }
      await load();
      showToast(`⚔️ Легендарный квест #${res.data.questNum} получен!`, "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  if (userLevel < 50) return (
    <LockedFeature
      requiredLevel={50} currentLevel={userLevel}
      icon="🌟" title="Легендарный путь"
      description="50 испытаний для тех кто дошёл до вершины"
    />
  );

  if (loading) return (
    <div style={{
      background:"linear-gradient(180deg,#020208 0%,#0d0520 40%,#1a0a2e 100%)",
      minHeight:"60vh", display:"flex", alignItems:"center", justifyContent:"center",
    }}>
      <div style={{ color:"rgba(167,139,250,0.5)", fontSize:13 }}>Загрузка...</div>
    </div>
  );

  const completed      = data?.completedCount || 0;
  const hasPending     = (data?.pendingToday || 0) > 0;
  const currentQuest   = data?.currentQuest;
  const currentNum     = Math.min(completed + 1, 50);
  const pct            = Math.min(Math.round((completed / 50) * 100), 100);
  const nextMilestone  = Object.keys(MILESTONES).map(Number).find(n => n > completed);
  const distToNext     = nextMilestone ? nextMilestone - completed : null;

  const questTitle = currentQuest?.title       || `Легендарный квест #${currentNum}`;
  const questDesc  = currentQuest?.description || "Выполни все обязательные квесты сегодня.";

  // Line geometry
  const lineStart    = TOP_PAD + NODE_STEP / 2;
  const lineEnd      = TOP_PAD + 49 * NODE_STEP + NODE_STEP / 2;
  const fullLineH    = lineEnd - lineStart;
  const doneH        = (completed / 50) * fullLineH;
  const remainH      = fullLineH - doneH;

  return (
    <div style={{ position:"relative", background:"linear-gradient(180deg,#020208 0%,#0d0520 40%,#1a0a2e 100%)", minHeight:"100vh" }}>
      <StarField />
      {celebrating && <Particles />}

      {/* Milestone full-screen flash */}
      {flashActive && (
        <div style={{
          position:"fixed", inset:0, zIndex:99, pointerEvents:"none",
          background:"radial-gradient(ellipse at center, rgba(167,139,250,0.35) 0%, transparent 65%)",
          animation:"lgFlash 1.1s ease-out forwards",
        }} />
      )}

      <div style={{ position:"relative", zIndex:1, paddingBottom:200 }}>

        {/* ── Progress header ── */}
        <div style={{
          position:"sticky", top:0, zIndex:20,
          background:"linear-gradient(180deg,rgba(2,2,8,0.97) 75%,transparent)",
          padding:"14px 16px 18px",
          backdropFilter:"blur(10px)",
        }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <div style={{ fontSize:15, fontWeight:800, letterSpacing:0.5, color:"#e2e8f0" }}>
              🏔️ Восхождение:{" "}
              <span style={{ color:"#a78bfa" }}>{completed}</span>
              <span style={{ color:"rgba(255,255,255,0.3)" }}> / 50</span>
            </div>
            {completed >= 50 && (
              <span style={{ fontSize:12, fontWeight:700, color:"#f5b637", background:"rgba(245,182,55,0.12)", borderRadius:6, padding:"2px 8px" }}>
                ✨ ЛЕГЕНДА
              </span>
            )}
          </div>

          <div style={{ height:6, background:"rgba(255,255,255,0.06)", borderRadius:3, overflow:"hidden", marginBottom:distToNext ? 6 : 0 }}>
            <div style={{
              height:"100%", width:`${pct}%`,
              background:"linear-gradient(90deg,#3b0764,#7c3aed,#a78bfa)",
              borderRadius:3,
              boxShadow:"0 0 12px rgba(124,58,237,0.7)",
              transition:"width 0.9s cubic-bezier(0.34,1.56,0.64,1)",
            }} />
          </div>

          {distToNext && (
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", textAlign:"center" }}>
              До следующей награды:{" "}
              <span style={{ color:"#a78bfa", fontWeight:600 }}>{distToNext}</span>
              {" "}{distToNext === 1 ? "квест" : distToNext < 5 ? "квеста" : "квестов"}
              {" · "}{MILESTONES[nextMilestone]?.icon} {MILESTONES[nextMilestone]?.label}
            </div>
          )}
        </div>

        {/* ── Mountain path ── */}
        <div
          ref={pathRef}
          style={{ overflowY:"auto", maxHeight:"60vh", position:"relative" }}
        >
          <div style={{ position:"relative", height:TOTAL_H, margin:"0 auto" }}>

            {/* Summit icon */}
            <div style={{
              position:"absolute", top:8, left:"50%", transform:"translateX(-50%)",
              textAlign:"center", pointerEvents:"none",
            }}>
              <div style={{ fontSize:22 }}>🏔️</div>
              <div style={{ fontSize:8, color:"rgba(255,255,255,0.25)", letterSpacing:2, marginTop:2 }}>ВЕРШИНА</div>
            </div>

            {/* Path line — remaining (grey) */}
            <div style={{
              position:"absolute",
              top:lineStart,
              left:"50%", transform:"translateX(-50%)",
              width:2,
              height:remainH,
              background:"rgba(255,255,255,0.08)",
            }} />

            {/* Path line — done (purple glow) */}
            <div style={{
              position:"absolute",
              top:lineStart + remainH,
              left:"50%", transform:"translateX(-50%)",
              width:2,
              height:doneH,
              background:"#7c3aed",
              boxShadow:"0 0 10px #7c3aed, 0 0 4px #a78bfa",
              transition:"height 0.6s",
            }} />

            {/* Base icon */}
            <div style={{
              position:"absolute",
              top: TOP_PAD + 49 * NODE_STEP + NODE_STEP,
              left:"50%", transform:"translateX(-50%)",
              textAlign:"center", pointerEvents:"none",
            }}>
              <div style={{ fontSize:18, opacity:0.4 }}>🧗</div>
            </div>

            {/* Quest nodes */}
            {Array.from({length:50}, (_, i) => {
              const num      = i + 1;
              const done     = num <= completed;
              const current  = num === currentNum && completed < 50;
              const ms       = MILESTONES[num];
              return (
                <QuestNode
                  key={num}
                  num={num}
                  done={done}
                  current={current}
                  milestone={ms || null}
                  nodeRef={current ? currentRef : null}
                />
              );
            })}
          </div>
        </div>

        {/* ── Milestone list (below path) ── */}
        <div style={{ padding:"16px 14px 0" }}>
          <div style={{
            fontSize:10, letterSpacing:2, textTransform:"uppercase",
            color:"rgba(255,255,255,0.25)", textAlign:"center", marginBottom:12,
          }}>
            Вехи пути
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {Object.entries(MILESTONES).map(([n, m]) => {
              const num     = Number(n);
              const reached = completed >= num;
              return (
                <div key={n} style={{
                  display:"flex", alignItems:"center", gap:10,
                  padding:"8px 12px", borderRadius:10,
                  background: reached ? "rgba(124,58,237,0.09)" : "rgba(255,255,255,0.02)",
                  border:`1px solid ${reached ? "rgba(167,139,250,0.25)" : "rgba(255,255,255,0.05)"}`,
                  opacity: reached ? 1 : 0.48,
                  transition:"opacity 0.3s, border-color 0.3s",
                }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{reached ? "✅" : m.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:reached ? "#a78bfa" : "rgba(255,255,255,0.45)" }}>
                      {num}. {m.label}
                    </div>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.28)" }}>
                      +{m.gold} золота{m.extra ? " · " + m.extra : ""}
                    </div>
                  </div>
                  {reached && (
                    <span style={{ fontSize:9, fontWeight:700, color:"#a78bfa", letterSpacing:1 }}>
                      ПРОЙДЕНО
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Fixed bottom quest card ── */}
      {completed < 50 ? (
        <div style={{
          position:"fixed",
          bottom:70, left:0, right:0,
          padding:"0 12px",
          zIndex:30,
        }}>
          <div style={{
            background:"linear-gradient(135deg,rgba(26,10,46,0.98),rgba(13,8,32,0.98))",
            border:"2px solid #7c3aed",
            boxShadow:"0 0 30px rgba(124,58,237,0.4), 0 -8px 32px rgba(5,0,18,0.85)",
            borderRadius:14,
            padding:"14px 16px",
            backdropFilter:"blur(12px)",
          }}>
            <div style={{ fontSize:9, color:"rgba(167,139,250,0.6)", letterSpacing:2, textTransform:"uppercase", marginBottom:5 }}>
              ДЕНЬ {currentNum} ИЗ 50
            </div>
            <div style={{ fontSize:16, fontWeight:800, color:"#f1f5f9", marginBottom:4, lineHeight:1.3 }}>
              {hasPending ? questTitle : `Легендарный квест #${currentNum}`}
            </div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.38)", marginBottom:10, lineHeight:1.5 }}>
              {hasPending ? questDesc : "Выполни все обязательные квесты сегодня."}
            </div>

            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <span style={{
                fontSize:10, fontWeight:700, color:"#f5b637",
                background:"rgba(245,182,55,0.1)", borderRadius:5, padding:"2px 8px",
                letterSpacing:0.5,
              }}>
                ⚡ ЛЕГЕНДАРНЫЙ
              </span>

              {hasPending ? (
                <span style={{ fontSize:12, color:"rgba(167,139,250,0.75)", fontWeight:600 }}>
                  ⚔️ Квест активен
                </span>
              ) : (
                <button
                  onClick={claimDaily}
                  disabled={busy}
                  style={{
                    background: busy ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg,#4c1d95,#7c3aed)",
                    border:"none", borderRadius:8,
                    padding:"9px 22px",
                    color:"#fff", fontWeight:700, fontSize:13,
                    cursor: busy ? "not-allowed" : "pointer",
                    boxShadow: busy ? "none" : "0 0 16px rgba(124,58,237,0.5)",
                    transition:"all 0.2s",
                    letterSpacing:0.3,
                  }}
                >
                  {busy ? "..." : "Выполнить"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          position:"fixed",
          bottom:70, left:0, right:0,
          padding:"0 12px", zIndex:30,
        }}>
          <div style={{
            background:"linear-gradient(135deg,rgba(30,18,0,0.98),rgba(18,10,0,0.98))",
            border:"2px solid #f5b637",
            boxShadow:"0 0 30px rgba(245,182,55,0.5)",
            borderRadius:14,
            padding:"20px 16px",
            textAlign:"center",
          }}>
            <div style={{ fontSize:40, marginBottom:6 }}>🏆</div>
            <div style={{ fontSize:22, fontWeight:900, color:"#f5b637", letterSpacing:3 }}>ЛЕГЕНДА</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginTop:5 }}>
              Ты прошёл весь путь. Ты — легенда.
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes currentPulse {
          0%,100% { box-shadow: 0 0 10px #7c3aed, 0 0 20px #7c3aed }
          50%      { box-shadow: 0 0 20px #a78bfa, 0 0 40px #7c3aed, 0 0 60px rgba(124,58,237,0.3) }
        }
        @keyframes particleUp {
          0%   { transform: translateY(0)      scale(1);   opacity:1 }
          100% { transform: translateY(-220px) scale(0.2); opacity:0 }
        }
        @keyframes lgFlash {
          0%   { opacity:1 }
          100% { opacity:0 }
        }
      `}</style>
    </div>
  );
}
