import { useState, useEffect } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const LOCATIONS = [
  { id:1,  name:"Деревня Новичков",   icon:"🏘️", unlock:1,  x:15, y:72, branch:"discipline",
    questTitle:"Первый шаг воина",    questDesc:"Прочитай 1 страницу любой книги или статьи" },
  { id:2,  name:"Лес Дисциплины",     icon:"🌲", unlock:5,  x:33, y:55, branch:"discipline",
    questTitle:"Испытание леса",      questDesc:"Не открывай соцсети 3 часа подряд" },
  { id:3,  name:"Пещера Воли",        icon:"🕯️", unlock:10, x:20, y:35, branch:"fitness",
    questTitle:"Мрак и сила",         questDesc:"Сделай 30 отжиманий за один подход" },
  { id:4,  name:"Арена Силы",         icon:"⚔️", unlock:15, x:50, y:22, branch:"fitness",
    questTitle:"Бой с тенью",         questDesc:"15 минут силовой тренировки без остановки" },
  { id:5,  name:"Библиотека Мудрых",  icon:"📚", unlock:20, x:67, y:45, branch:"knowledge",
    questTitle:"Свиток знаний",       questDesc:"Напиши конспект на 5+ пунктов по любой теме" },
  { id:6,  name:"Башня Мастерства",   icon:"🏰", unlock:25, x:80, y:28, branch:"knowledge",
    questTitle:"Тайны башни",         questDesc:"Реши 3 задачи по изучаемому навыку" },
  { id:7,  name:"Сад Роста",          icon:"🌸", unlock:30, x:55, y:68, branch:"self_development",
    questTitle:"Цветение разума",     questDesc:"Медитируй или практикуй осознанность 10 минут" },
  { id:8,  name:"Облачный Храм",      icon:"☁️", unlock:40, x:72, y:62, branch:"self_development",
    questTitle:"Вознесение",          questDesc:"Напиши 3 вещи, за которые ты благодарен сегодня" },
  { id:9,  name:"Цитадель Легенды",   icon:"🌟", unlock:50, x:85, y:70, branch:"discipline",
    questTitle:"Испытание легенды",   questDesc:"Выполни все обязательные квесты дня без единого пропуска" },
  { id:10, name:"Вершина Бесконечности", icon:"👑", unlock:75, x:87, y:12, branch:"knowledge",
    questTitle:"За пределами",        questDesc:"Обучи кого-то тому, что умеешь лучше всего" },
  { id:11, name:"Забытые руины",      icon:"🏚️", unlock:35, x:38, y:20, branch:"knowledge",
    questTitle:"Тайны древних",       questDesc:"Изучи историю одного великого человека и запиши 3 урока" },
  { id:12, name:"Ледяные пики",       icon:"🏔️", unlock:45, x:25, y:12, branch:"fitness",
    questTitle:"Покорение высоты",    questDesc:"Выполни комплекс на выносливость: бег или скакалка 20 минут" },
  { id:13, name:"Тёмный лес",         icon:"🌑", unlock:55, x:42, y:38, branch:"self_development",
    questTitle:"Встреча с тенью",     questDesc:"Запиши свои страхи и придумай действие против каждого" },
  { id:14, name:"Огненные равнины",   icon:"🔥", unlock:60, x:60, y:12, branch:"fitness",
    questTitle:"Горящий путь",        questDesc:"Тренировка максимальной интенсивности 30 минут" },
  { id:15, name:"Небесный архипелаг", icon:"🌈", unlock:65, x:70, y:20, branch:"self_development",
    questTitle:"Между небом и землёй",questDesc:"Создай 3-месячный план развития с конкретными шагами" },
  { id:16, name:"Пустота",            icon:"🌌", unlock:70, x:10, y:20, branch:"discipline",
    questTitle:"Ничто и всё",         questDesc:"Проведи 30 минут в полной тишине без телефона и мыслей" },
  { id:17, name:"Врата богов",        icon:"⛩️", unlock:80, x:50, y:8,  branch:"knowledge",
    questTitle:"Последний экзамен",   questDesc:"Напиши эссе на тему своего пути и главных уроков" },
  { id:18, name:"Хрустальный дворец", icon:"💎", unlock:85, x:60, y:35, branch:"self_development",
    questTitle:"Совершенство формы",  questDesc:"Реализуй задачу которую откладывал дольше всего" },
  { id:19, name:"Конец времён",       icon:"🕰️", unlock:90, x:30, y:5,  branch:"discipline",
    questTitle:"Последняя черта",     questDesc:"Выполни 50 обязательных квестов без единого пропуска" },
  { id:20, name:"Начало всего",       icon:"🌅", unlock:100, x:50, y:50, branch:"self_development",
    questTitle:"Рождение заново",     questDesc:"Напиши манифест своей новой жизни — кто ты теперь" },
];

const PATHS = [
  [1,2],[2,3],[2,7],[3,4],[4,5],[5,6],[5,8],[6,10],[7,8],[8,9],[9,10],[1,7],
  [2,11],[11,12],[12,16],[3,12],[4,14],[5,17],[6,17],[7,13],[8,15],[9,16],[10,17],
  [11,13],[13,18],[14,15],[15,20],[16,19],[17,20],[18,20],[19,20],
];

const BRANCH_COLORS  = { discipline:"#8d8cf8", fitness:"#fb7878", self_development:"#34d399", knowledge:"#38bdf8" };
const BRANCH_LABELS  = { discipline:"Дисциплина", fitness:"Фитнес", self_development:"Саморазвитие", knowledge:"Знания" };

export default function WorldMap({ token, userLevel = 1, showToast }) {
  const [claimedToday, setClaimedToday] = useState(new Set());
  const [selected, setSelected] = useState(null);
  const [busy, setBusy]         = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  useEffect(() => {
    axios.get(`${API}/world-map/daily-status`, auth)
      .then(r => setClaimedToday(new Set(r.data.claimedToday || [])))
      .catch(() => {});
  }, [token]);

  const selectLoc = (loc) => {
    if (userLevel < loc.unlock) return;
    setSelected(prev => prev?.id === loc.id ? null : loc);
  };

  const claimQuest = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await axios.post(`${API}/world-map/${selected.id}/claim-quest`, {}, auth);
      setClaimedToday(prev => new Set([...prev, selected.id]));
      showToast(`✅ Квест «${selected.questTitle}» выполнен! +${res.data.xpGained} XP, +${res.data.goldGained} 💰`, "success");
      setSelected(null);
    } catch (e) { showToast(e.response?.data?.message || "Ошибка", "error"); }
    finally { setBusy(false); }
  };

  const unlockedCount = LOCATIONS.filter(l => userLevel >= l.unlock).length;

  return (
    <div className="section-card">
      <div className="section-eyebrow"><span>🗺️</span> Карта мира</div>
      <p style={{ fontSize:12, color:"rgba(255,255,255,0.35)", margin:"0 0 4px" }}>
        Нажми на локацию чтобы принять уникальный квест · Уровень {userLevel} · Открыто {unlockedCount}/{LOCATIONS.length}
      </p>

      {/* ── MAP ── */}
      <div style={{
        position:"relative", width:"100%", paddingTop:"52%",
        background:"linear-gradient(160deg,#0a0e1a 0%,#0d1428 50%,#0e1218 100%)",
        borderRadius:14, overflow:"hidden",
        border:`1px solid rgba(255,255,255,0.07)`,
        marginBottom:12,
      }}>

        {/* Ambient terrain glows */}
        {[
          {x:8, y:58, w:22, h:18, c:"#34d399"},
          {x:38,y:16, w:28, h:22, c:"#8d8cf8"},
          {x:60,y:50, w:22, h:20, c:"#38bdf8"},
          {x:76,y:8,  w:18, h:18, c:"#f5b637"},
          {x:78,y:60, w:16, h:16, c:"#fb7878"},
        ].map((b,i) => (
          <div key={i} style={{
            position:"absolute", left:`${b.x}%`, top:`${b.y}%`,
            width:`${b.w}%`, height:`${b.h}%`,
            background:b.c, borderRadius:"50%",
            filter:"blur(28px)", opacity:0.07, pointerEvents:"none",
          }} />
        ))}

        {/* SVG paths */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <style>{`
              @keyframes dash { to { stroke-dashoffset: -20; } }
              .anim-path { animation: dash 1.5s linear infinite; }
            `}</style>
          </defs>
          {PATHS.map(([a, b]) => {
            const from = LOCATIONS.find(l => l.id === a);
            const to   = LOCATIONS.find(l => l.id === b);
            if (!from || !to) return null;
            const both = userLevel >= from.unlock && userLevel >= to.unlock;
            const color = BRANCH_COLORS[from.branch] || "#fff";
            return (
              <line key={`${a}-${b}`}
                className={both ? "anim-path" : undefined}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={both ? color : "rgba(255,255,255,0.06)"}
                strokeWidth={both ? "0.7" : "0.4"}
                strokeDasharray={both ? "2.5 2" : "1.5 2"}
                opacity={both ? 0.5 : 0.25}
              />
            );
          })}
        </svg>

        {/* Location nodes */}
        {LOCATIONS.map(loc => {
          const unlocked = userLevel >= loc.unlock;
          const isSelected = selected?.id === loc.id;
          const isDone = claimedToday.has(loc.id);
          const color  = BRANCH_COLORS[loc.branch] || "#8d8cf8";
          return (
            <div key={loc.id} style={{
              position:"absolute",
              left:`${loc.x}%`, top:`${loc.y}%`,
              transform:"translate(-50%,-50%)",
              zIndex: isSelected ? 5 : 2,
            }}>
              {/* Fog effect on locked */}
              {!unlocked && (
                <div style={{
                  position:"absolute", inset:-12,
                  background:`radial-gradient(circle,rgba(8,10,18,0.6) 40%,transparent 70%)`,
                  filter:"blur(4px)", pointerEvents:"none", zIndex:-1,
                }} />
              )}
              <button
                onClick={() => selectLoc(loc)}
                title={unlocked ? `${loc.name} · ${BRANCH_LABELS[loc.branch]}` : `🔒 Открывается на ${loc.unlock} уровне`}
                style={{
                  width: isSelected ? 44 : 36, height: isSelected ? 44 : 36,
                  borderRadius:"50%",
                  border: isSelected
                    ? `3px solid ${color}`
                    : `2px solid ${unlocked ? color+"88" : "rgba(255,255,255,0.08)"}`,
                  background: isSelected
                    ? `${color}33`
                    : unlocked ? `${color}18` : "rgba(4,6,14,0.9)",
                  cursor: unlocked ? "pointer" : "not-allowed",
                  fontSize: isSelected ? 18 : 14,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow: isSelected
                    ? `0 0 24px ${color}99, 0 0 48px ${color}44`
                    : unlocked ? `0 0 12px ${color}55` : "none",
                  transition:"all 0.22s ease",
                  filter: unlocked ? "none" : "grayscale(1) blur(0.5px) brightness(0.3)",
                  position:"relative", outline:"none",
                }}>
                {unlocked ? loc.icon : "🌫️"}
                {isDone && (
                  <div style={{
                    position:"absolute", top:-5, right:-5,
                    width:14, height:14, borderRadius:"50%",
                    background:"#34d399", border:"2px solid #0b0e17",
                    fontSize:8, display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:700, color:"#0b0e17",
                  }}>✓</div>
                )}
              </button>
              {/* Tooltip label */}
              <div style={{
                position:"absolute", top:"105%", left:"50%",
                transform:"translateX(-50%)", marginTop:2,
                fontSize:9, fontWeight:600,
                color: isSelected ? color : unlocked ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.15)",
                whiteSpace:"nowrap", pointerEvents:"none",
                textShadow:"0 1px 4px rgba(0,0,0,0.9)",
              }}>
                {unlocked ? loc.name.split(" ")[0] : `Ур.${loc.unlock}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── INFO PANEL (outside overflow:hidden) ── */}
      {selected ? (
        <div style={{
          background:`linear-gradient(135deg, ${BRANCH_COLORS[selected.branch]}12, rgba(14,17,30,0.95))`,
          border:`1px solid ${BRANCH_COLORS[selected.branch]}44`,
          borderRadius:12, padding:"14px 16px",
          marginBottom:12,
          animation:"quest-flash 0.3s ease",
        }}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
            <span style={{ fontSize:32 }}>{selected.icon}</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:16, color:BRANCH_COLORS[selected.branch] }}>
                {selected.name}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:2 }}>
                {BRANCH_LABELS[selected.branch]} · Ур.{selected.unlock}+
              </div>
            </div>
            <button onClick={() => setSelected(null)} style={{
              background:"none", border:"none", color:"rgba(255,255,255,0.3)",
              cursor:"pointer", fontSize:18, lineHeight:1,
            }}>✕</button>
          </div>

          <div style={{
            background:"rgba(255,255,255,0.04)", borderRadius:8,
            padding:"10px 12px", marginBottom:12,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:4, letterSpacing:0.5 }}>
              📜 КВЕСТ ЛОКАЦИИ
            </div>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>{selected.questTitle}</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", lineHeight:1.5 }}>{selected.questDesc}</div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {claimedToday.has(selected.id) ? (
              <div style={{ display:"flex", alignItems:"center", gap:6, color:"#34d399", fontSize:13, fontWeight:600 }}>
                <span style={{ fontSize:18 }}>✅</span> Квест взят сегодня — возвращайся завтра!
              </div>
            ) : (
              <button
                className="btn btn-primary"
                disabled={busy}
                onClick={claimQuest}
                style={{ background: BRANCH_COLORS[selected.branch] }}>
                {busy ? "Выполняю..." : "⚔️ Получить награду квеста"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          background:"rgba(255,255,255,0.03)", borderRadius:12,
          padding:"12px 16px", marginBottom:12,
          border:"1px solid rgba(255,255,255,0.06)",
          fontSize:13, color:"rgba(255,255,255,0.35)", textAlign:"center",
        }}>
          Нажми на светящийся узел на карте чтобы увидеть квест
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
        {Object.entries(BRANCH_COLORS).map(([b, c]) => (
          <span key={b} style={{
            fontSize:11, color:c,
            background:`${c}12`, borderRadius:6,
            padding:"2px 8px", border:`1px solid ${c}22`,
          }}>
            ● {BRANCH_LABELS[b]}
          </span>
        ))}
        <span style={{ fontSize:11, color:"rgba(255,255,255,0.25)", padding:"2px 8px" }}>
          🔒 Заблокировано &nbsp; ✓ Квест принят
        </span>
      </div>
    </div>
  );
}
