import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function Gratitude({ token, showToast }) {
  const [today, setToday]     = useState(null);
  const [history, setHistory] = useState([]);
  const [t1, setT1]           = useState("");
  const [t2, setT2]           = useState("");
  const [t3, setT3]           = useState("");
  const [tab, setTab]         = useState("today");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/gratitude/today`, auth).then(r => setToday(r.data)).catch(() => {}),
      axios.get(`${API}/gratitude/history`, auth).then(r => setHistory(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!t1.trim() || !t2.trim() || !t3.trim()) {
      return showToast("Заполни все 3 поля", "error");
    }
    setBusy(true);
    try {
      const res = await axios.post(`${API}/gratitude`, { text1:t1, text2:t2, text3:t3 }, auth);
      setToday(res.data);
      setHistory(h => [res.data, ...h]);
      showToast(`+${res.data.xpGained} XP за благодарность!`, "success");
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString("ru-RU", { day:"numeric", month:"long" });

  if (loading) return <p className="empty-state">Загрузка...</p>;

  return (
    <section className="quest-section">
      <div style={{
        background:"linear-gradient(135deg, rgba(52,211,153,0.08), rgba(141,140,248,0.06))",
        borderRadius:16, padding:20, marginBottom:20,
        border:"1px solid rgba(52,211,153,0.15)",
      }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#34d399", marginBottom:8 }}>ЕЖЕДНЕВНАЯ ПРАКТИКА</div>
        <h2 style={{ margin:"0 0 6px", fontSize:22, fontWeight:800 }}>🌿 Три благодарности</h2>
        <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.5)", lineHeight:1.6 }}>
          Записывай три вещи за которые благодарен каждый день.<br/>Бонус: +20 XP ежедневно.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[{key:"today",label:"Сегодня"},{key:"history",label:"История"}].map(t => (
          <button key={t.key} className={`branch-tab ${tab===t.key?"active":""}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === "today" && (
        today ? (
          <div style={{ background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.15)", borderRadius:14, padding:20 }}>
            <div style={{ color:"#34d399", fontWeight:700, marginBottom:12 }}>✅ Сегодня уже записано</div>
            {[today.text1, today.text2, today.text3].map((t, i) => (
              <div key={i} style={{ display:"flex", gap:10, marginBottom:8 }}>
                <span style={{ color:"#34d399", fontWeight:700, minWidth:20 }}>{i+1}.</span>
                <span style={{ fontSize:14, color:"rgba(255,255,255,0.8)", lineHeight:1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {[{val:t1,set:setT1,label:"Я благодарен за...",ph:"Например: здоровье, семья, хорошая погода"},
              {val:t2,set:setT2,label:"Что сделало сегодня лучше?",ph:"Маленькие радости тоже считаются"},
              {val:t3,set:setT3,label:"Кому ты признателен?",ph:"Человек, который помог или вдохновил"},
            ].map((field, i) => (
              <div key={i} style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.5)", display:"block", marginBottom:6 }}>
                  {i+1}. {field.label}
                </label>
                <textarea
                  value={field.val}
                  onChange={e => field.set(e.target.value)}
                  placeholder={field.ph}
                  rows={2}
                  style={{
                    width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                    borderRadius:10, padding:"10px 12px", color:"#f1f5f9", fontSize:14,
                    resize:"none", fontFamily:"inherit", boxSizing:"border-box",
                    outline:"none",
                  }}
                />
              </div>
            ))}
            <button className="btn btn-primary" disabled={busy} onClick={submit} style={{ width:"100%" }}>
              {busy ? "Сохраняю..." : "🌿 Сохранить (+20 XP)"}
            </button>
          </div>
        )
      )}

      {tab === "history" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {history.length === 0 ? (
            <p className="empty-state">Ещё нет записей</p>
          ) : history.map(g => (
            <div key={g.id} style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:12, padding:"12px 14px" }}>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:8 }}>{fmtDate(g.createdAt)}</div>
              {[g.text1, g.text2, g.text3].map((t, i) => (
                <div key={i} style={{ fontSize:13, color:"rgba(255,255,255,0.7)", marginBottom:4 }}>
                  <span style={{ color:"#34d399" }}>{i+1}.</span> {t}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
