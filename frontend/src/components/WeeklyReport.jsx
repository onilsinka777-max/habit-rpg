import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const DAY_LABELS = { "0":"Вс","1":"Пн","2":"Вт","3":"Ср","4":"Чт","5":"Пт","6":"Сб" };
function dayLabel(dateStr) {
  const d = new Date(dateStr);
  return DAY_LABELS[String(d.getDay())] || dateStr.slice(5);
}

export default function WeeklyReport({ token, showToast }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/report/weekly`, auth)
      .then(r => setReport(r.data))
      .catch(() => showToast("Ошибка загрузки отчёта", "error"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;
  if (!report)  return null;

  return (
    <div className="section-card">
      <div className="section-eyebrow"><span>📊</span> Недельный отчёт</div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8, marginBottom:16 }}>
        {[
          { label:"Квестов за неделю", value:report.totalTasks,  icon:"✅" },
          { label:"Опыта получено",    value:report.totalXp,     icon:"⭐" },
          { label:"Золота заработано", value:report.totalGold,   icon:"💰" },
          { label:"Лучший день",       value:dayLabel(report.bestDay?.date || ""), icon:"🏆" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:20 }}>{s.icon}</span>
              <div>
                <div style={{ fontWeight:700, fontSize:18 }}>{s.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:8 }}>Квесты по дням</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={report.days.map(d => ({ ...d, day: dayLabel(d.date) }))} margin={{ top:0, bottom:0, left:0, right:0 }}>
            <XAxis dataKey="day" tick={{ fontSize:11, fill:"rgba(255,255,255,0.45)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background:"#1e1b32", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#fff", fontSize:12 }} formatter={(v) => [v, "квестов"]} labelFormatter={l => `День: ${l}`} />
            <Bar dataKey="total" radius={[4,4,0,0]}>
              {report.days.map((d, i) => (
                <Cell key={i} fill={d.date === report.bestDay?.date ? "#f5b637" : "var(--accent,#8d8cf8)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom:12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4, color:"rgba(255,255,255,0.5)" }}>
          <span>Обязательные квесты</span>
          <span>{report.requiredPct}%</span>
        </div>
        <div style={{ height:8, borderRadius:99, background:"rgba(255,255,255,0.08)" }}>
          <div style={{ height:"100%", width:`${report.requiredPct}%`, background: report.requiredPct >= 80 ? "#34d399" : report.requiredPct >= 50 ? "#f5b637" : "#fb7878", borderRadius:99, transition:"width 0.6s" }} />
        </div>
      </div>

      <div style={{ padding:"12px 16px", borderRadius:10, background:"linear-gradient(135deg, rgba(141,140,248,0.12), rgba(30,27,50,0.8))", border:"1px solid rgba(141,140,248,0.15)", textAlign:"center", fontSize:14, color:"rgba(255,255,255,0.8)", fontStyle:"italic" }}>
        💬 {report.motivation}
      </div>
    </div>
  );
}
