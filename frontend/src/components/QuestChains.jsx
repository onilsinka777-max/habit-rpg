import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_COLORS = {
  discipline: "#8d8cf8", fitness: "#fb7878",
  self_development: "#34d399", knowledge: "#38bdf8",
};

function StepDot({ done, active, num }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: 12,
      background: done ? "#34d399" : active ? "var(--accent,#8d8cf8)" : "rgba(255,255,255,0.08)",
      color: done || active ? "#0b0e17" : "rgba(255,255,255,0.3)",
      border: active ? "2px solid var(--accent,#8d8cf8)" : "none",
      transition: "all 0.3s",
    }}>
      {done ? "✓" : num}
    </div>
  );
}

export default function QuestChains({ token, showToast, askConfirm }) {
  const [chains, setChains]     = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null);
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

  const completeStep = (chain, prog) => {
    const stepIdx = prog?.currentStep || 0;
    const step = chain.steps[stepIdx];
    askConfirm({
      title: `Шаг ${stepIdx + 1}: выполнен?`,
      text: step,
      confirmLabel: "Отметить выполненным",
      onConfirm: async () => {
        setBusy(chain.id);
        try {
          const res = await axios.post(`${API}/chains/${chain.id}/complete-step`, {}, auth);
          await load();
          if (res.data.justFinished) {
            showToast(`🎉 Цепочка «${chain.title}» завершена! +${res.data.xpGained} XP, +${res.data.goldGained} золота${res.data.newTitle ? `, титул «${res.data.newTitle}»` : ""}`, "success");
          } else {
            showToast(`✅ Шаг ${stepIdx + 1} выполнен! +${res.data.xpGained} XP`, "success");
          }
        } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
        finally { setBusy(null); }
      },
    });
  };

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;

  return (
    <div className="section-card">
      <div className="section-eyebrow"><span>⛓️</span> Цепочки квестов</div>
      <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", margin:"4px 0 16px" }}>
        Пройди серию связанных заданий — получи эксклюзивный титул и крупную награду
      </p>

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {chains.map(chain => {
          const prog = getProgress(chain.id);
          const started   = !!prog;
          const completed = prog?.completed;
          const step      = prog?.currentStep || 0;
          const color     = BRANCH_COLORS[chain.branch] || "#8d8cf8";

          return (
            <div key={chain.id} className="chain-card" style={{
              background: completed ? "rgba(52,211,153,0.07)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${completed ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12, padding: 16,
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:12 }}>
                <span style={{ fontSize:28 }}>{chain.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:16 }}>{chain.title}</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.45)", marginTop:2 }}>{chain.description}</div>
                </div>
                {completed && <span style={{ fontSize:11, fontWeight:700, color:"#34d399", background:"rgba(52,211,153,0.1)", borderRadius:6, padding:"2px 8px" }}>✓ Завершено</span>}
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:12, flexWrap:"wrap" }}>
                {chain.steps.map((s, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <StepDot done={step > i || completed} active={step === i && started && !completed} num={i + 1} />
                    {i < chain.steps.length - 1 && (
                      <div style={{ width:16, height:2, background: step > i || completed ? "#34d399" : "rgba(255,255,255,0.1)", borderRadius:1 }} />
                    )}
                  </div>
                ))}
              </div>

              {started && !completed && (
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:10, padding:"8px 12px", background:"rgba(255,255,255,0.04)", borderRadius:8 }}>
                  📍 Текущий шаг: {chain.steps[step]}
                </div>
              )}

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>
                  Награда: <span style={{ color:"#f5b637" }}>+{chain.rewardGold} золота</span> · <span style={{ color:"#8d8cf8" }}>+{chain.rewardXp} XP</span>
                  {chain.rewardTitle && <span style={{ color:"#eab308" }}> · «{chain.rewardTitle}»</span>}
                </div>
                {!completed && (
                  <button className="btn btn-sm" disabled={!!busy} onClick={() => !started ? startChain(chain.id) : completeStep(chain, prog)}
                    style={{ background: started ? color : "rgba(255,255,255,0.1)" }}>
                    {busy === chain.id ? "..." : started ? "Выполнить шаг" : "Начать"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
