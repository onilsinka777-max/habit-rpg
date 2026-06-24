import { useEffect, useState } from "react";
import axios from "axios";
import LockedFeature from "./LockedFeature";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_COLORS  = { discipline:"#8d8cf8", fitness:"#fb7878", self_development:"#34d399", knowledge:"#38bdf8" };
const BRANCH_LABELS  = { discipline:"Дисциплина", fitness:"Фитнес", self_development:"Саморазвитие", knowledge:"Знания" };
const BRANCH_ICONS   = { discipline:"🛡️", fitness:"💪", self_development:"🌸", knowledge:"📚" };

export default function SkillTree({ token, showToast, userLevel=1 }) {
  if (userLevel < 8) return <LockedFeature requiredLevel={8} currentLevel={userLevel} icon="⚡" title="Дерево навыков" description="Прокачивай пассивные способности за золото" />;
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]   = useState(null);
  const [filter, setFilter] = useState("all");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = async () => {
    try {
      const res = await axios.get(`${API}/skills`, auth);
      setData(res.data);
    } catch { showToast("Ошибка загрузки навыков", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const unlock = async (skillId) => {
    setBusy(skillId);
    try {
      await axios.post(`${API}/skills/${skillId}/unlock`, {}, auth);
      showToast("Навык изучен!", "success");
      load();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(null); }
  };

  if (loading) return <p className="empty-state">Загрузка...</p>;
  if (!data) return <p className="empty-state">Нет данных</p>;

  const branches = filter === "all"
    ? Object.keys(BRANCH_LABELS)
    : [filter];

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>⚡</span> Дерево навыков</div>
      <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:"0 0 4px" }}>
        Изучай навыки чтобы получать постоянные бонусы · У тебя {data.gold}g · Уровень {data.level}
      </p>

      {/* Branch filter */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20, marginTop:12 }}>
        <button className={`branch-tab ${filter==="all"?"active":""}`} onClick={() => setFilter("all")}>Все</button>
        {Object.keys(BRANCH_LABELS).map(b => (
          <button key={b} className={`branch-tab ${filter===b?"active":""}`}
            style={filter===b?{background:BRANCH_COLORS[b],boxShadow:`0 4px 12px ${BRANCH_COLORS[b]}44`}:undefined}
            onClick={() => setFilter(b)}>
            {BRANCH_ICONS[b]} {BRANCH_LABELS[b]}
          </button>
        ))}
      </div>

      {branches.map(branch => {
        const branchSkills = (data.skills || []).filter(s => s.branch === branch);
        const color = BRANCH_COLORS[branch];
        const unlockedCount = branchSkills.filter(s => s.unlocked).length;
        return (
          <div key={branch} style={{ marginBottom:28 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <span style={{ fontSize:20 }}>{BRANCH_ICONS[branch]}</span>
              <div style={{ fontWeight:700, fontSize:16, color }}>{BRANCH_LABELS[branch]}</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", background:"rgba(255,255,255,0.05)", borderRadius:20, padding:"2px 10px" }}>
                {unlockedCount}/{branchSkills.length}
              </div>
            </div>

            {/* Tier columns */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8 }}>
              {[1,2,3,4,5].map(tier => {
                const skill = branchSkills.find(s => s.tier === tier);
                if (!skill) return <div key={tier} />;
                const levelLocked = !skill.canUnlock;
                const prereqLocked = !skill.prereqsMet && !skill.unlocked;
                const noGold = skill.canUnlock && skill.prereqsMet && !skill.unlocked && !skill.available;
                return (
                  <div key={tier} title={levelLocked ? `Откроется на уровне ${skill.levelRequired}` : prereqLocked ? "Сначала изучи предыдущий навык" : ""} style={{
                    background: skill.unlocked
                      ? `${color}22`
                      : skill.canUnlock && skill.prereqsMet
                      ? "rgba(255,255,255,0.06)"
                      : skill.canUnlock
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${skill.unlocked ? color : skill.canUnlock ? color+"44" : "rgba(255,255,255,0.07)"}`,
                    borderRadius:12, padding:12,
                    opacity: skill.unlocked || skill.canUnlock ? 1 : 0.45,
                    transition:"all 0.2s",
                    position:"relative",
                    cursor: levelLocked ? "not-allowed" : "default",
                  }}>
                    {/* Tier label */}
                    <div style={{ fontSize:9, fontWeight:700, color:skill.unlocked?color:skill.canUnlock?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.2)", letterSpacing:1, marginBottom:6 }}>
                      Т{tier}
                    </div>

                    <div style={{ fontSize:22, textAlign:"center", marginBottom:8 }}>
                      {skill.canUnlock ? skill.icon : "🔒"}
                    </div>

                    <div style={{ fontSize:12, fontWeight:700, textAlign:"center", marginBottom:4, lineHeight:1.3, color: skill.unlocked ? "#f1f5f9" : skill.canUnlock ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.3)" }}>
                      {skill.name}
                    </div>

                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", textAlign:"center", lineHeight:1.4, marginBottom:10 }}>
                      {skill.description}
                    </div>

                    {skill.unlocked ? (
                      <div style={{ textAlign:"center", fontSize:11, color:"#34d399", fontWeight:700 }}>✓ Изучен</div>
                    ) : levelLocked ? (
                      <div style={{ textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.25)", fontWeight:600 }}>
                        🔒 Уровень {skill.levelRequired}
                      </div>
                    ) : prereqLocked ? (
                      <div style={{ textAlign:"center", fontSize:10, color:"rgba(255,255,255,0.25)" }}>
                        Нужен Т{tier-1}
                      </div>
                    ) : noGold ? (
                      <div style={{ textAlign:"center", fontSize:10, color:"rgba(251,191,36,0.5)" }}>
                        Нужно {skill.goldCost}g
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        disabled={!!busy}
                        onClick={() => unlock(skill.id)}
                        style={{ width:"100%", fontSize:11, padding:"6px 8px", background:color, color:"#0b0e17" }}>
                        {busy===skill.id ? "..." : `${skill.goldCost}g`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}
