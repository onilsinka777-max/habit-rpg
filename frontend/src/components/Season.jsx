import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const RANK_ORDER = ["Бронза", "Серебро", "Золото", "Платина", "Легенда"];
const RANK_COLORS = { Бронза:"#cd7f32", Серебро:"#9ca3af", Золото:"#d97706", Платина:"#8b5cf6", Легенда:"#f5b637" };
const RANK_ICONS  = { Бронза:"🥉", Серебро:"🥈", Золото:"🥇", Платина:"💜", Легенда:"👑" };

function RankBar({ xp, nextXp, rank }) {
  const pct = nextXp === 9999 ? 100 : Math.min((xp / nextXp) * 100, 100);
  const color = RANK_COLORS[rank] || "#8d8cf8";
  return (
    <div style={{ margin:"12px 0" }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4, color:"rgba(255,255,255,0.6)" }}>
        <span>{xp} XP</span>
        {nextXp !== 9999 && <span>следующий ранг: {nextXp} XP</span>}
        {nextXp === 9999 && <span style={{ color:"#f5b637" }}>Максимальный ранг!</span>}
      </div>
      <div style={{ height:10, borderRadius:99, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:99, transition:"width 0.6s" }} />
      </div>
    </div>
  );
}

export default function Season({ token, showToast }) {
  const [season, setSeason]           = useState(null);
  const [progress, setProgress]       = useState(null);
  const [board, setBoard]             = useState([]);
  const [tab, setTab]                 = useState("me");
  const [loading, setLoading]         = useState(true);
  const [dailyQuest, setDailyQuest]   = useState(null);
  const [dqCompleting, setDqCompleting] = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const loadDailyQuest = () => {
    axios.get(`${API}/season/daily-quest`, auth)
      .then(r => setDailyQuest(r.data))
      .catch(() => {});
  };

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/season/current`, auth),
      axios.get(`${API}/season/leaderboard`, auth),
    ]).then(([cur, lb]) => {
      setSeason(cur.data.season);
      setProgress(cur.data.progress);
      setBoard(lb.data);
    }).catch(() => showToast("Ошибка загрузки сезона", "error"))
      .finally(() => setLoading(false));
    loadDailyQuest();
  }, [token]);

  const completeDailyQuest = async () => {
    setDqCompleting(true);
    try {
      await axios.post(`${API}/season/daily-quest/complete`, {}, auth);
      showToast("✅ Сезонный квест выполнен! +50 XP, +50 очков сезона", "success");
      loadDailyQuest();
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setDqCompleting(false); }
  };

  if (loading) return <div className="section-card"><p style={{ textAlign:"center", padding:32, opacity:0.5 }}>Загрузка...</p></div>;
  if (!season) return (
    <div className="section-card" style={{ textAlign:"center", padding:32 }}>
      <p style={{ fontSize:32, marginBottom:8 }}>🌅</p>
      <p style={{ opacity:0.5 }}>Активных сезонов нет</p>
    </div>
  );

  const endDate = new Date(season.endDate);
  const daysLeft = Math.max(0, Math.ceil((endDate - Date.now()) / 86400000));
  const rank = progress?.rank || "Бронза";
  const rankColor = RANK_COLORS[rank];
  const rankIdx = RANK_ORDER.indexOf(rank);

  return (
    <div className="section-card">
      <div className="season-banner" style={{ background:`linear-gradient(135deg, rgba(245,182,55,0.15), rgba(30,27,50,0.9))`, border:"1px solid rgba(245,182,55,0.25)", borderRadius:12, padding:"16px 20px", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
          <span style={{ fontSize:28 }}>🌅</span>
          <div>
            <div style={{ fontWeight:800, fontSize:18, color:"#f5b637" }}>{season.name}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Осталось {daysLeft} дней</div>
          </div>
          <div style={{ marginLeft:"auto", textAlign:"right" }}>
            <div style={{ fontSize:22 }}>{RANK_ICONS[rank]}</div>
            <div style={{ fontWeight:700, color:rankColor, fontSize:13 }}>{rank}</div>
          </div>
        </div>
        <RankBar xp={progress?.xp || 0} nextXp={progress?.nextRankXp || 250} rank={rank} />
        <div style={{ display:"flex", gap:8, marginTop:8 }}>
          {RANK_ORDER.map((r, i) => (
            <div key={r} style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:14, filter: i <= rankIdx ? "none" : "grayscale(1) opacity(0.3)" }}>{RANK_ICONS[r]}</div>
              <div style={{ fontSize:9, color: i === rankIdx ? rankColor : "rgba(255,255,255,0.3)", fontWeight: i === rankIdx ? 700 : 400 }}>{r}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Daily season quest ── */}
      {dailyQuest && (
        <div style={{
          background:"rgba(245,182,55,0.07)", border:"1px solid rgba(245,182,55,0.25)",
          borderRadius:12, padding:"14px 16px", marginBottom:16,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
            <span style={{ fontSize:20 }}>🎯</span>
            <div style={{ fontWeight:700, fontSize:14, color:"#f5b637" }}>Сезонный квест дня</div>
            <div style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.4)" }}>+50 XP · +50 очков</div>
          </div>
          <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>{dailyQuest.title}</div>
          {dailyQuest.description && (
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.55)", marginBottom:10, lineHeight:1.5 }}>{dailyQuest.description}</div>
          )}
          {dailyQuest.completed ? (
            <div style={{ color:"#34d399", fontWeight:700, fontSize:13 }}>✅ Выполнен сегодня</div>
          ) : (
            <button className="btn btn-primary btn-sm" disabled={dqCompleting} onClick={completeDailyQuest}
              style={{ background:"linear-gradient(135deg,#d97706,#f5b637)", color:"#0b0e17" }}>
              {dqCompleting ? "..." : "Выполнить"}
            </button>
          )}
        </div>
      )}

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {["me", "leaderboard"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-ghost"}`}>
            {t === "me" ? "Мой прогресс" : "Топ игроков"}
          </button>
        ))}
      </div>

      {tab === "me" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              { label:"Сезонный XP", value:progress?.xp||0, icon:"✨" },
              { label:"Квестов выполнено", value:progress?.questsCompleted||0, icon:"✅" },
              { label:"Текущий ранг", value:rank, icon:RANK_ICONS[rank] },
              { label:"Дней до конца", value:daysLeft, icon:"⏳" },
            ].map(s => (
              <div key={s.label} style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"10px 14px" }}>
                <div style={{ fontSize:18 }}>{s.icon}</div>
                <div style={{ fontWeight:700, fontSize:16 }}>{s.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "leaderboard" && (
        <div>
          {board.length === 0 && <p style={{ textAlign:"center", opacity:0.5, padding:24 }}>Пока нет участников</p>}
          {board.map((p, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ width:28, textAlign:"center", fontWeight:700, color: i === 0 ? "#f5b637" : i === 1 ? "#9ca3af" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.4)", fontSize:14 }}>
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:14 }}>{p.name}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Ур. {p.level} · {p.questsCompleted} квестов</div>
              </div>
              <div style={{ fontWeight:700, color:"#f5b637", fontSize:14 }}>{p.xp} XP</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
