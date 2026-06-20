import { useEffect, useState } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, CartesianGrid,
} from "recharts";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const BRANCH_COLORS = {
  discipline:       "#8d8cf8",
  fitness:          "#fb7878",
  self_development: "#34d399",
  knowledge:        "#38bdf8",
};
const BRANCH_LABELS = {
  discipline:       "Дисциплина",
  fitness:          "Фитнес",
  self_development: "Саморазвитие",
  knowledge:        "Знания",
};

const fmtDate = (d) => {
  const [,m,day] = d.split("-");
  return `${parseInt(day)}.${parseInt(m)}`;
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#141925", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:12 }}>
      <p style={{ margin:"0 0 6px", color:"rgba(255,255,255,0.55)" }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ margin:"2px 0", color:p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function Stats({ token }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("quests");

  useEffect(() => {
    axios.get(`${API}/stats`, authHeaders)
      .then(res => setStats(res.data))
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="empty-state">Загрузка...</p>;
  if (!stats)  return <p className="empty-state">Нет данных</p>;

  const chartData = stats.days.map(d => ({ ...d, date: fmtDate(d.date) }));

  const TABS = [
    { key:"quests", label:"Квесты" },
    { key:"xp",     label:"Опыт"   },
    { key:"gold",   label:"Золото" },
  ];

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>📊</span> Статистика</div>

      {/* Summary cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
        {[
          { label:"Квестов всего", value:stats.totalCompleted,    icon:"✅" },
          { label:"Стрик",         value:`${stats.currentStreak} дн.`, icon:"🔥" },
          { label:"Уровень",       value:stats.level,             icon:"⚡" },
        ].map(s => (
          <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#f1f5f9" }}>{s.value}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {TABS.map(t => (
          <button key={t.key}
            className={`branch-tab ${tab===t.key?"active":""}`}
            style={tab===t.key?{background:"#8d8cf8",boxShadow:"0 4px 12px rgba(141,140,248,0.3)"}:undefined}
            onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ width:"100%", height:230 }}>
        {tab === "quests" && (
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top:4, right:8, left:0, bottom:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.45)", fontSize:11 }} tickLine={false} axisLine={false} label={{ value:"Дата", position:"insideBottom", offset:-14, fill:"rgba(255,255,255,0.25)", fontSize:11 }} />
              <YAxis tick={{ fill:"rgba(255,255,255,0.45)", fontSize:11 }} tickLine={false} axisLine={false} allowDecimals={false} label={{ value:"квестов", angle:-90, position:"insideLeft", offset:14, fill:"rgba(255,255,255,0.25)", fontSize:11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize:12, color:"rgba(255,255,255,0.55)", paddingTop:4 }} />
              {Object.entries(BRANCH_COLORS).map(([key, color]) => (
                <Bar key={key} dataKey={key} name={BRANCH_LABELS[key]} stackId="a" fill={color} radius={key==="knowledge"?[3,3,0,0]:[0,0,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
        {tab === "xp" && (
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top:4, right:8, left:0, bottom:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.45)", fontSize:11 }} tickLine={false} axisLine={false} label={{ value:"Дата", position:"insideBottom", offset:-14, fill:"rgba(255,255,255,0.25)", fontSize:11 }} />
              <YAxis tick={{ fill:"rgba(255,255,255,0.45)", fontSize:11 }} tickLine={false} axisLine={false} label={{ value:"XP", angle:-90, position:"insideLeft", offset:14, fill:"rgba(255,255,255,0.25)", fontSize:11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="xp" name="Опыт (XP)" stroke="#c084fc" strokeWidth={2.5} dot={{ fill:"#c084fc", r:3 }} activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
        {tab === "gold" && (
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top:4, right:8, left:0, bottom:24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.45)", fontSize:11 }} tickLine={false} axisLine={false} label={{ value:"Дата", position:"insideBottom", offset:-14, fill:"rgba(255,255,255,0.25)", fontSize:11 }} />
              <YAxis tick={{ fill:"rgba(255,255,255,0.45)", fontSize:11 }} tickLine={false} axisLine={false} label={{ value:"Золото", angle:-90, position:"insideLeft", offset:14, fill:"rgba(255,255,255,0.25)", fontSize:11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="gold" name="Золото" stroke="#f5b637" strokeWidth={2.5} dot={{ fill:"#f5b637", r:3 }} activeDot={{ r:5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <p style={{ fontSize:11, color:"rgba(255,255,255,0.2)", textAlign:"center", marginTop:8 }}>
        Данные за последние 30 дней
      </p>
    </section>
  );
}
