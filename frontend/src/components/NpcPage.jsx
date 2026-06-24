import { useEffect, useState } from "react";
import axios from "axios";
import LockedFeature from "./LockedFeature";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_COLORS = { discipline:"#8d8cf8", fitness:"#fb7878", self_development:"#34d399", knowledge:"#38bdf8" };

export default function NpcPage({ token, showToast, userLevel=1 }) {
  if (userLevel < 5) return <LockedFeature requiredLevel={5} currentLevel={userLevel} icon="🧙" title="Наставники" description="Получай задания от NPC персонажей с уникальными наградами" />;
  const [npcs, setNpcs]       = useState([]);
  const [activeNpcId, setActiveNpcId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult]   = useState(null);
  const [condErr, setCondErr] = useState(null);
  const [busy, setBusy]       = useState(null);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const load = () => {
    axios.get(`${API}/npc`, auth)
      .then(r => { setNpcs(r.data.npcs || r.data); setActiveNpcId(r.data.activeNpcId || null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const interact = async (npcId) => {
    setBusy(npcId);
    setCondErr(null);
    try {
      const res = await axios.post(`${API}/npc/${npcId}/interact`, {}, auth);
      setResult(res.data);
      setCondErr(null);
      load();
      showToast(`Получен квест от ${res.data.npc.name}!`, "success");
    } catch (e) {
      const data = e.response?.data;
      if (data?.cannotAccept) {
        setCondErr(data.reason || data.message);
      } else {
        showToast(data?.message || "Ошибка", "error");
      }
    }
    finally { setBusy(null); }
  };

  const activate = async (npcId) => {
    setBusy(`act_${npcId}`);
    try {
      const res = await axios.patch(`${API}/npc/${npcId}/activate`, {}, auth);
      setActiveNpcId(res.data.activeNpcId);
      showToast(res.data.message, "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(null); }
  };

  if (loading) return <p className="empty-state">Загрузка...</p>;

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>👤</span> Наставники</div>
      <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:"0 0 20px" }}>
        Поговори с наставником — получи особый квест и совет раз в неделю
      </p>

      {condErr && (
        <div style={{ background:"rgba(127,29,29,0.5)", border:"1px solid #f87171", borderRadius:12, padding:"12px 16px", marginBottom:16 }}>
          <div style={{ fontWeight:700, color:"#fca5a5", marginBottom:4 }}>⚠️ Условие не выполнено</div>
          <div style={{ fontSize:13, color:"#fca5a5", lineHeight:1.5 }}>{condErr}</div>
          <button onClick={() => setCondErr(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:12, marginTop:6 }}>Закрыть</button>
        </div>
      )}

      {result && (
        <div style={{ background:"rgba(141,140,248,0.08)", border:"1px solid rgba(141,140,248,0.2)", borderRadius:14, padding:16, marginBottom:16 }}>
          <div style={{ fontWeight:700, marginBottom:6 }}>💬 {result.npc.name} говорит:</div>
          <p style={{ fontStyle:"italic", color:"rgba(255,255,255,0.7)", fontSize:14, lineHeight:1.6, margin:"0 0 10px" }}>
            «{result.tip}»
          </p>
          <div style={{ fontSize:12, color:"#34d399" }}>✅ Квест добавлен: «{result.task.title}»</div>
          <button onClick={() => setResult(null)} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:12, marginTop:8 }}>Закрыть</button>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {npcs.map(npc => {
          const color = BRANCH_COLORS[npc.branch] || "#8d8cf8";
          return (
            <div key={npc.id} style={{
              background: npc.canInteract ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${npc.canInteract ? color+"44" : "rgba(255,255,255,0.06)"}`,
              borderRadius:14, padding:"16px 18px",
              opacity: npc.canInteract ? 1 : 0.7,
            }}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:12 }}>
                <div style={{
                  width:52, height:52, borderRadius:"50%",
                  background: `${color}22`,
                  border: `2px solid ${color}66`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:26, flexShrink:0,
                }}>
                  {npc.avatar}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                    <span style={{ fontWeight:800, fontSize:16 }}>{npc.name}</span>
                    <span style={{ fontSize:10, background:`${color}22`, color, borderRadius:5, padding:"1px 7px", fontWeight:700 }}>
                      {npc.icon} {npc.role}
                    </span>
                  </div>
                  <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.55)", fontStyle:"italic", lineHeight:1.5 }}>
                    «{npc.greeting}»
                  </p>
                </div>
              </div>

              <p style={{ fontSize:13, color:"rgba(255,255,255,0.6)", margin:"0 0 12px", lineHeight:1.6 }}>
                {npc.description}
              </p>

              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>
                  {npc.questsGiven > 0 ? `Заданий выдано: ${npc.questsGiven}` : "Ещё не общались"}
                  {activeNpcId === npc.id && (
                    <span style={{ marginLeft:8, background:"rgba(124,58,237,0.25)", color:"#a78bfa", borderRadius:5, padding:"1px 7px", fontWeight:700 }}>
                      ⭐ Активный
                    </span>
                  )}
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button
                    className="btn btn-sm"
                    disabled={!!busy}
                    onClick={() => activate(npc.id)}
                    style={{
                      background: activeNpcId === npc.id ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)",
                      border: `1px solid ${activeNpcId === npc.id ? "#7c3aed" : "rgba(255,255,255,0.12)"}`,
                      color: activeNpcId === npc.id ? "#a78bfa" : "rgba(255,255,255,0.6)",
                      borderRadius:8, padding:"5px 10px", cursor:"pointer", fontSize:12,
                    }}>
                    {busy === `act_${npc.id}` ? "..." : activeNpcId === npc.id ? "⭐ Деактивировать" : "⭐ Активировать"}
                  </button>
                  {npc.canInteract ? (
                    <button
                      className="btn btn-primary"
                      disabled={!!busy}
                      onClick={() => interact(npc.id)}
                      style={{ background:color, color:"#0b0e17", fontSize:13 }}>
                      {busy === npc.id ? "..." : "💬 Поговорить"}
                    </button>
                  ) : (
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", paddingTop:4 }}>
                      {npc.lastInteractedAt ? "Следующий разговор через несколько дней" : "Недоступен"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {npcs.length === 0 && <p className="empty-state">Нет доступных наставников</p>}
      </div>
    </section>
  );
}
