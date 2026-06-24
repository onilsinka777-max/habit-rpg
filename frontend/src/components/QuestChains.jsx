import { useEffect, useState } from "react";
import axios from "axios";
import LockedFeature from "./LockedFeature";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_COLORS = {
  discipline: "#8d8cf8", fitness: "#fb7878",
  self_development: "#34d399", knowledge: "#38bdf8",
};

export default function QuestChains({ token, showToast, askConfirm, userLevel=1 }) {
  if (userLevel < 3) return <LockedFeature requiredLevel={3} currentLevel={userLevel} icon="⛓️" title="Цепочки квестов" description="Выполняй квесты последовательно и получай большие награды" />;
  const [chains, setChains]     = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null);
  const [expanded, setExpanded] = useState({});
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const [c, p] = await Promise.all([
        axios.get(`${API}/chains`, auth),
        axios.get(`${API}/chains/my`, auth),
      ]);
      setChains(c.data);
      setProgress(p.data);
    } catch { showToast("Ошибка загрузки цепочек", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const getProgress = (chainId) => progress.find(p => p.chainId === chainId);

  const startChain = async (chainId) => {
    setBusy(chainId);
    try {
      await axios.post(`${API}/chains/${chainId}/start`, {}, auth);
      await load();
      showToast("Цепочка начата!", "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(null); }
  };

  const completeStep = async (chain, prog) => {
    const stepIdx = prog?.currentStep || 0;
    const stepLore = chain.stepLore ? JSON.parse(chain.stepLore) : [];
    const stepText = chain.steps[stepIdx];
    const loreText = stepLore[stepIdx] || "";

    setBusy(chain.id);
    try {
      const res = await axios.post(`${API}/chains/${chain.id}/complete-step`, {}, auth);
      await load();
      if (res.data.justFinished) {
        showToast(`🎉 Цепочка «${chain.title}» завершена! +${res.data.xpGained} XP, +${res.data.goldGained} золота${res.data.newTitle ? `, титул «${res.data.newTitle}»` : ""}`, "success");
        if (res.data.newTheme) {
          localStorage.setItem(`chain_theme_${res.data.newTheme}`, "true");
          showToast(`🎨 Тема «${res.data.newTheme}» разблокирована!`, "success");
        }
      } else {
        showToast(`✅ Шаг ${stepIdx + 1} выполнен! +${res.data.xpGained} XP`, "success");
      }
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(null); }
  };

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;

  return (
    <div className="section-card">
      <div className="section-eyebrow"><span>⛓️</span> Цепочки квестов</div>
      <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:"4px 0 16px" }}>
        Пройди серию связанных заданий — получи эксклюзивный титул и крупную награду
      </p>

      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {chains.map(chain => {
          const prog    = getProgress(chain.id);
          const started   = !!prog;
          const completed = prog?.completed;
          const step      = prog?.currentStep || 0;
          const color     = BRANCH_COLORS[chain.branch] || "#8d8cf8";
          const isExpanded = expanded[chain.id] || false;
          const progressPct = started ? Math.round((step / chain.totalSteps) * 100) : 0;
          const stepLore = chain.stepLore ? JSON.parse(chain.stepLore) : [];
          const currentLore = stepLore[step] || "";

          return (
            <div key={chain.id} style={{
              background: completed
                ? "linear-gradient(135deg,rgba(52,211,153,0.08),rgba(52,211,153,0.03))"
                : started
                  ? `linear-gradient(135deg,${color}10,rgba(255,255,255,0.02))`
                  : "rgba(255,255,255,0.03)",
              border: `1px solid ${completed ? "rgba(52,211,153,0.3)" : started ? `${color}40` : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14, overflow:"hidden",
            }}>
              {/* Progress bar */}
              {started && !completed && (
                <div style={{ height:3, background:"rgba(255,255,255,0.06)" }}>
                  <div style={{ height:"100%", width:`${progressPct}%`, background:color, borderRadius:2, transition:"width 0.5s ease" }} />
                </div>
              )}
              {completed && <div style={{ height:3, background:"#34d399" }} />}

              <div style={{ padding:16 }}>
                {/* Header */}
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                  <div style={{
                    width:48, height:48, borderRadius:12, flexShrink:0,
                    background:completed?"rgba(52,211,153,0.15)":`${color}20`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:26, border:`1px solid ${completed?"rgba(52,211,153,0.3)":`${color}40`}`,
                  }}>{chain.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:17, marginBottom:2 }}>{chain.title}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)" }}>{chain.description}</div>
                    {started && !completed && (
                      <div style={{ fontSize:11, color:color, marginTop:4, fontWeight:600 }}>
                        Шаг {step + 1} из {chain.totalSteps} · {progressPct}%
                      </div>
                    )}
                  </div>
                  {completed && (
                    <span style={{ fontSize:11, fontWeight:700, color:"#34d399", background:"rgba(52,211,153,0.12)", borderRadius:6, padding:"3px 10px", flexShrink:0 }}>
                      ✓ Завершено
                    </span>
                  )}
                </div>

                {/* Lore (collapsible) */}
                {chain.lore && (
                  <div style={{ marginBottom:10 }}>
                    <button style={{ background:"none", border:"none", cursor:"pointer", fontSize:11, color:"rgba(255,255,255,0.35)", padding:0, textDecoration:"underline" }}
                      onClick={() => setExpanded(e => ({ ...e, [chain.id]: !e[chain.id] }))}>
                      {isExpanded ? "Скрыть лор ▲" : "Читать лор ▼"}
                    </button>
                    {isExpanded && (
                      <p style={{ fontSize:13, color:"rgba(255,255,255,0.55)", fontStyle:"italic", lineHeight:1.6, margin:"8px 0 0", padding:"10px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8, borderLeft:`3px solid ${color}` }}>
                        {chain.lore}
                      </p>
                    )}
                  </div>
                )}

                {/* Steps */}
                <div style={{ display:"flex", gap:6, marginBottom:10, overflowX:"auto", paddingBottom:2 }}>
                  {chain.steps.map((s, i) => {
                    const done   = (step > i) || completed;
                    const active = step === i && started && !completed;
                    return (
                      <div key={i} style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                        <div title={s} style={{
                          width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center",
                          justifyContent:"center", fontWeight:700, fontSize:12, flexShrink:0,
                          background: done ? "#34d399" : active ? color : "rgba(255,255,255,0.06)",
                          color: done || active ? "#0b0e17" : "rgba(255,255,255,0.25)",
                          border: active ? `2px solid ${color}` : "2px solid transparent",
                          boxShadow: active ? `0 0 12px ${color}60` : "none",
                          transition:"all 0.3s",
                        }}>
                          {done ? "✓" : i + 1}
                        </div>
                        {i < chain.steps.length - 1 && (
                          <div style={{ width:18, height:2, background: done ? "#34d399" : "rgba(255,255,255,0.08)", borderRadius:1 }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Current step description */}
                {started && !completed && (
                  <div style={{ marginBottom:12, padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:10, borderLeft:`3px solid ${color}` }}>
                    <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:3, textTransform:"uppercase", letterSpacing:1 }}>Текущее задание</div>
                    <div style={{ fontSize:13, fontWeight:600, color:"rgba(255,255,255,0.9)" }}>{chain.steps[step]}</div>
                    {currentLore && (
                      <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", fontStyle:"italic", marginTop:6 }}>
                        {currentLore}
                      </div>
                    )}
                  </div>
                )}

                {/* Rewards & actions */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
                    <span style={{ color:"#f5b637" }}>+{chain.rewardGold} золота</span> · <span style={{ color:"#8d8cf8" }}>+{chain.rewardXp} XP</span>
                    {chain.rewardTitle && <span style={{ color:"#eab308" }}> · «{chain.rewardTitle}»</span>}
                    {chain.rewardTheme && <span style={{ color:color }}> · 🎨 тема</span>}
                  </div>
                  {!completed && (
                    <button className="btn btn-sm" disabled={!!busy}
                      onClick={() => !started ? startChain(chain.id) : completeStep(chain, prog)}
                      style={{ background:started?color:"rgba(255,255,255,0.08)", color:started?"#0b0e17":"rgba(255,255,255,0.8)", fontWeight:700, borderRadius:10, padding:"8px 18px" }}>
                      {busy === chain.id ? "..." : !started ? "Начать путь" : "Выполнен шаг ✓"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
