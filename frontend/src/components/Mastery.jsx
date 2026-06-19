import { useEffect, useState } from "react";
import axios from "axios";

const API = "https://habit-rpg-production.up.railway.app";

// ── Координаты узлов для каждого пути ────────────────────────────────────────
// viewBox: 0 0 360 600

const COORDS = {

  // 🗡️ ВОИН — форма меча: рукоять снизу, широкая гарда, сужающийся клинок вверх
  warrior: {
    w0: {x:180,y:575}, // Рукоять — основание
    w1: {x:155,y:538}, w2: {x:205,y:538},
    w3: {x:180,y:502},
    w4: {x:155,y:466}, w5: {x:205,y:466},
    // Гарда (широкая горизонталь)
    w6: {x:85, y:436}, w7: {x:180,y:445}, w8: {x:275,y:436},
    w9: {x:48, y:416}, w10:{x:312,y:416},
    // Клинок (сужается вверх)
    w11:{x:100,y:395}, w12:{x:260,y:395},
    w13:{x:132,y:368}, w14:{x:228,y:368},
    w15:{x:152,y:340}, w16:{x:208,y:340},
    w17:{x:160,y:310}, w18:{x:200,y:310},
    w19:{x:162,y:280}, w20:{x:198,y:280},
    w21:{x:165,y:250}, w22:{x:195,y:250},
    w23:{x:168,y:220}, w24:{x:192,y:220},
    legendary:{x:180,y:182},
  },

  // ⚗️ МУДРЕЦ — форма колбы: широкое тело снизу, узкое горлышко, шар сверху
  sage: {
    s0: {x:180,y:575}, // Дно колбы
    // Тело колбы (широкий овал)
    s1: {x:118,y:545}, s2: {x:242,y:545},
    s3: {x:75, y:512}, s4: {x:285,y:512},
    s5: {x:55, y:472}, s6: {x:305,y:472},
    s7: {x:65, y:432}, s8: {x:295,y:432},
    // Внутренние узлы тела
    s9: {x:130,y:505}, s10:{x:230,y:505},
    s11:{x:110,y:462}, s12:{x:250,y:462},
    // Верх тела колбы
    s13:{x:90, y:398}, s14:{x:270,y:398},
    // Горлышко (сужение)
    s15:{x:148,y:370}, s16:{x:212,y:370},
    s17:{x:158,y:342}, s18:{x:202,y:342},
    // Шар сверху
    s19:{x:130,y:312}, s20:{x:230,y:312},
    s21:{x:105,y:280}, s22:{x:255,y:280},
    s23:{x:125,y:252}, s24:{x:235,y:252},
    legendary:{x:180,y:215},
  },

  // 👑 ЛИДЕР — форма короны: основание снизу, три зубца вверх
  leader: {
    l0: {x:180,y:575},
    l1: {x:105,y:538}, l2: {x:180,y:538}, l3: {x:255,y:538},
    l4: {x:68, y:500}, l5: {x:148,y:500}, l6: {x:212,y:500}, l7: {x:292,y:500},
    // Левый зубец
    l8: {x:52, y:460}, l9: {x:45, y:420}, l10:{x:60, y:380}, l11:{x:75, y:340},
    // Правый зубец
    l12:{x:308,y:460}, l13:{x:315,y:420}, l14:{x:300,y:380}, l15:{x:285,y:340},
    // Средние узлы (центральный зубец — самый высокий)
    l16:{x:148,y:460}, l17:{x:212,y:460},
    l18:{x:148,y:420}, l19:{x:212,y:420},
    l20:{x:180,y:378},
    l21:{x:180,y:338}, l22:{x:180,y:298},
    l23:{x:180,y:258}, l24:{x:180,y:218},
    legendary:{x:180,y:175},
  },

  // 🌙 БАЛАНС — форма весов: стойка снизу, коромысло, цепи, чаши
  balance: {
    b0: {x:180,y:575}, // Основание стойки
    b1: {x:155,y:540}, b2: {x:205,y:540},
    b3: {x:180,y:505}, // Вершина стойки
    // Коромысло (горизонтально)
    b4: {x:120,y:480}, b5: {x:240,y:480},
    b6: {x:72, y:460}, b7: {x:288,y:460},
    b8: {x:45, y:440}, b9: {x:315,y:440},
    // Левая цепь (вниз от левого конца коромысла)
    b10:{x:42, y:400}, b11:{x:40, y:360},
    // Левая чаша
    b12:{x:25, y:325}, b13:{x:58, y:320},
    b14:{x:38, y:292},
    // Правая цепь (вниз от правого конца)
    b15:{x:318,y:400}, b16:{x:320,y:360},
    // Правая чаша
    b17:{x:302,y:325}, b18:{x:335,y:320},
    b19:{x:322,y:292},
    // Подъём с обеих чаш — сходятся вверх
    b20:{x:62, y:260}, b21:{x:298,y:260},
    b22:{x:95, y:225}, b23:{x:265,y:225},
    b24:{x:180,y:190},
    legendary:{x:180,y:150},
  },
};

const EDGES = {
  warrior: [
    ['w0','w1'],['w0','w2'],
    ['w1','w3'],['w2','w3'],
    ['w3','w4'],['w3','w5'],
    ['w4','w6'],['w4','w7'],['w5','w7'],['w5','w8'],
    ['w6','w9'],['w8','w10'],
    ['w9','w11'],['w10','w12'],
    ['w7','w11'],['w7','w12'],
    ['w11','w13'],['w12','w14'],
    ['w13','w15'],['w14','w16'],
    ['w15','w17'],['w16','w18'],
    ['w17','w19'],['w18','w20'],
    ['w19','w21'],['w20','w22'],
    ['w21','w23'],['w22','w24'],
    ['w23','legendary'],['w24','legendary'],
  ],
  sage: [
    ['s0','s1'],['s0','s2'],
    ['s1','s3'],['s2','s4'],
    ['s3','s5'],['s4','s6'],
    ['s5','s7'],['s6','s8'],
    ['s1','s9'],['s2','s10'],
    ['s3','s9'],['s4','s10'],
    ['s9','s11'],['s10','s12'],
    ['s5','s11'],['s6','s12'],
    ['s7','s13'],['s8','s14'],
    ['s13','s15'],['s14','s16'],
    ['s11','s15'],['s12','s16'],
    ['s15','s17'],['s16','s18'],
    ['s17','s19'],['s18','s20'],
    ['s19','s21'],['s20','s22'],
    ['s21','s23'],['s22','s24'],
    ['s23','legendary'],['s24','legendary'],
  ],
  leader: [
    ['l0','l1'],['l0','l2'],['l0','l3'],
    ['l1','l4'],['l1','l5'],['l2','l5'],['l2','l6'],['l3','l6'],['l3','l7'],
    ['l4','l8'],['l8','l9'],['l9','l10'],['l10','l11'],
    ['l7','l12'],['l12','l13'],['l13','l14'],['l14','l15'],
    ['l5','l16'],['l6','l16'],['l5','l17'],['l6','l17'],
    ['l16','l18'],['l17','l19'],
    ['l18','l20'],['l19','l20'],['l11','l20'],['l15','l20'],
    ['l20','l21'],['l21','l22'],['l22','l23'],['l23','l24'],
    ['l24','legendary'],
  ],
  balance: [
    ['b0','b1'],['b0','b2'],
    ['b1','b3'],['b2','b3'],
    ['b3','b4'],['b3','b5'],
    ['b4','b6'],['b5','b7'],
    ['b6','b8'],['b7','b9'],
    ['b8','b10'],['b10','b11'],
    ['b11','b12'],['b11','b13'],
    ['b12','b14'],['b13','b14'],
    ['b9','b15'],['b15','b16'],
    ['b16','b17'],['b16','b18'],
    ['b17','b19'],['b18','b19'],
    ['b14','b20'],['b19','b21'],
    ['b20','b22'],['b21','b23'],
    ['b22','b24'],['b23','b24'],
    ['b24','legendary'],
  ],
};

const DIFF_COLORS  = {easy:"#4ade80", medium:"#fb923c", hard:"#f87171", legendary:"#eab308"};
const PATH_COLORS  = {warrior:"#f87171", sage:"#38bdf8", leader:"#fb923c", balance:"#2dd4bf"};
const PATH_LABELS  = {warrior:"Воин", sage:"Мудрец", leader:"Лидер", balance:"Баланс"};
const PATH_ICONS   = {warrior:"🗡️", sage:"⚗️", leader:"👑", balance:"🌙"};
const PATH_ORDER   = ["warrior","sage","leader","balance"];

export default function Mastery({ token, showToast, askConfirm, myLevel, onFinished }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [status,       setStatus]       = useState(null);
  const [busy,         setBusy]         = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewedPath,   setViewedPath]   = useState(null);

  const loadStatus = async () => {
    try {
      const res = await axios.get(`${API}/mastery/status`, authHeaders);
      setStatus(res.data);
      if (!viewedPath) setViewedPath(res.data.masteryPath || res.data.autoClass || "warrior");
    } catch(e) { console.error(e); }
  };

  useEffect(() => { if (myLevel >= 25) loadStatus(); }, [myLevel]);

  const shiftPath = (dir) => {
    const cur = PATH_ORDER.indexOf(viewedPath || "warrior");
    setViewedPath(PATH_ORDER[(cur + dir + PATH_ORDER.length) % PATH_ORDER.length]);
    setSelectedNode(null);
  };

  const choosePath = async (pathId) => {
    try {
      setBusy(true);
      await axios.post(`${API}/mastery/choose`, { pathId }, authHeaders);
      setSelectedNode(null);
      await loadStatus();
    } catch(e) { showToast(e.response?.data?.message || "Не удалось выбрать путь","error"); }
    finally { setBusy(false); }
  };

  const confirmChoosePath = (pathId) => {
    const hasProgress = (status?.completedNodes?.length || 0) > 0;
    if (status?.masteryPath && hasProgress && status.masteryPath !== pathId) {
      askConfirm({
        title:"Сменить путь?",
        text:"Прогресс по текущему пути будет потерян.",
        confirmLabel:"Сменить",
        onConfirm: () => choosePath(pathId),
      });
    } else { choosePath(pathId); }
  };

  const completeNode = async (nodeId) => {
    try {
      setBusy(true);
      const res = await axios.post(`${API}/mastery/complete-node`, { nodeId }, authHeaders);
      if (res.data.justFinished) {
        showToast("🎉 Путь пройден! Легендарные квесты открыты!","success");
        if (onFinished) onFinished();
      } else {
        showToast(`+${res.data.xpGained} XP · +${res.data.goldGained} золота`,"success");
      }
      setSelectedNode(null);
      await loadStatus();
    } catch(e) { showToast(e.response?.data?.message || "Не удалось выполнить","error"); }
    finally { setBusy(false); }
  };

  if (myLevel < 25) {
    return (
      <section className="quest-section">
        <div className="section-eyebrow"><span>🌟</span> Мастерство</div>
        <p className="empty-state">Ветка откроется на 25 уровне.</p>
      </section>
    );
  }

  if (!status) return <p className="empty-state">Загрузка...</p>;

  const chosenPath   = status.masteryPath;
  const isChosenView = viewedPath === chosenPath;
  const pathColor    = PATH_COLORS[viewedPath] || "#8d8cf8";
  const coords       = COORDS[viewedPath]  || COORDS.warrior;
  const edges        = EDGES[viewedPath]   || EDGES.warrior;

  const completedSet = new Set(status.completedNodes || []);
  const availableSet = new Set(isChosenView ? (status.availableNodes || []) : []);
  const nodeContent  = isChosenView ? (status.nodeContent || {}) : {};
  const isComplete   = status.isComplete || false;
  const totalNodes   = status.totalNodes || 25;

  const sel = selectedNode
    ? (nodeContent[selectedNode] || { label: selectedNode, desc: "", d:"medium", hidden:false })
    : null;

  const selState = !sel ? null
    : !isChosenView              ? "preview"
    : completedSet.has(selectedNode) ? "done"
    : availableSet.has(selectedNode) ? "available"
    : "locked";

  return (
    <section className="quest-section mastery-tree-section">

      {/* ── Навигация по путям ── */}
      <div className="mastery-browser-row">
        <button className="mastery-arrow-btn" onClick={() => shiftPath(-1)}>‹</button>
        <div className="mastery-path-title">
          <span className="mastery-path-icon-sm" style={{ background: pathColor }}>
            {PATH_ICONS[viewedPath]}
          </span>
          <div>
            <span className="mastery-path-name">Путь {PATH_LABELS[viewedPath]}</span>
            {isChosenView && chosenPath && !isComplete && (
              <span className="mastery-progress-badge">{completedSet.size}/{totalNodes}</span>
            )}
            {isChosenView && isComplete && <span className="mastery-done-badge">✓ Пройден</span>}
            {!isChosenView && chosenPath && <span className="mastery-preview-badge">просмотр</span>}
          </div>
        </div>
        <button className="mastery-arrow-btn" onClick={() => shiftPath(1)}>›</button>
      </div>

      {/* Кнопка выбора пути */}
      {(!chosenPath || !isChosenView) && !isComplete && (
        <div style={{ textAlign:"center", marginBottom:12 }}>
          <button className="btn btn-primary btn-sm" disabled={busy}
            onClick={() => confirmChoosePath(viewedPath)}>
            {chosenPath && chosenPath !== viewedPath ? "Сменить на этот путь" : "Выбрать этот путь"}
          </button>
          {chosenPath && chosenPath !== viewedPath && (
            <p className="mastery-panel-hint">Текущий прогресс будет потерян</p>
          )}
        </div>
      )}

      {/* ── SVG Дерево ── */}
      <div className="mastery-svg-wrap" onClick={() => setSelectedNode(null)}>
        <svg viewBox="0 0 360 600" className="mastery-svg">

          {/* Рёбра */}
          {edges.map(([from, to]) => {
            const a = coords[from], b = coords[to];
            if (!a || !b) return null;
            const fromDone  = isChosenView && completedSet.has(from);
            const fromAvail = isChosenView && availableSet.has(from);
            const isLit = fromDone || fromAvail;
            return (
              <line key={`${from}-${to}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isLit ? pathColor : "rgba(255,255,255,0.1)"}
                strokeWidth={isLit ? 2 : 1.5}
                strokeDasharray={isLit ? "none" : "5 4"}
                style={{ filter: isLit ? `drop-shadow(0 0 3px ${pathColor})` : "none" }}
              />
            );
          })}

          {/* Узлы */}
          {Object.entries(coords).map(([nodeId, pos]) => {
            const isDone    = isChosenView && completedSet.has(nodeId);
            const isAvail   = isChosenView && availableSet.has(nodeId);
            const isPreview = !isChosenView;
            const isSel     = selectedNode === nodeId;
            const isLeg     = nodeId === "legendary";
            const r = isLeg ? 14 : 9;

            const info = nodeContent[nodeId];
            // ИСПРАВЛЕНИЕ: туман снимается когда узел ДОСТУПЕН или ВЫПОЛНЕН
            const isHidden = info?.hidden && !isDone && !isAvail;

            let fill = "rgba(18,18,32,0.92)";
            let stroke = "rgba(255,255,255,0.12)";
            let sw = 1.5;

            if      (isDone)    { fill = pathColor; stroke = pathColor; }
            else if (isAvail)   { stroke = pathColor; sw = 2.5; }
            else if (isLeg && isChosenView) { stroke = "#eab308"; sw = 2; }
            else if (isPreview) { stroke = `${pathColor}33`; }
            if (isSel) { stroke = "white"; sw = 2.5; }

            const diffColor = info ? (DIFF_COLORS[info.d] || "#888") : "rgba(255,255,255,0.15)";

            const isLeft  = pos.x < 100;
            const isRight = pos.x > 260;
            const labelX  = isLeft ? pos.x - r - 3 : isRight ? pos.x + r + 3 : pos.x;
            const labelY  = (!isLeft && !isRight) ? pos.y - r - 5 : pos.y;
            const anchor  = isLeft ? "end" : isRight ? "start" : "middle";
            const baseline = (!isLeft && !isRight) ? "auto" : "middle";
            const labelText = info?.label || "";

            return (
              <g key={nodeId}
                onClick={(e) => { e.stopPropagation(); setSelectedNode(isSel ? null : nodeId); }}
                style={{ cursor:"pointer" }}>

                {/* Туман для скрытого узла */}
                {isHidden && (
                  <ellipse cx={pos.x} cy={pos.y} rx={26} ry={20}
                    fill="rgba(80,100,160,0.25)" style={{ filter:"blur(7px)" }} />
                )}

                {/* Пульсация для доступного */}
                {(isAvail || (isLeg && isChosenView && !isDone && !isHidden)) && (
                  <circle cx={pos.x} cy={pos.y} r={r+6} fill="none"
                    stroke={isLeg ? "#eab308" : pathColor}
                    strokeWidth={1} opacity={0.4}>
                    <animate attributeName="r" values={`${r+3};${r+11};${r+3}`} dur="2.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite"/>
                  </circle>
                )}

                <circle cx={pos.x} cy={pos.y} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />

                {/* Цветовая точка сложности */}
                {!isHidden && !isDone && (
                  <circle cx={pos.x} cy={pos.y} r={r-4} fill={diffColor} opacity={0.5} />
                )}

                {/* Галочка для выполненного */}
                {isDone && (
                  <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle"
                    fill="white" fontSize="7.5" fontWeight="bold" style={{pointerEvents:"none"}}>✓</text>
                )}

                {/* Метка */}
                {!isHidden ? (
                  <text x={labelX} y={labelY} textAnchor={anchor} dominantBaseline={baseline}
                    fill={isDone ? "rgba(255,255,255,0.85)" : isAvail ? "white" : "rgba(255,255,255,0.28)"}
                    fontSize="6.5" style={{pointerEvents:"none"}}>
                    {labelText}
                  </text>
                ) : (
                  <text x={pos.x} y={pos.y-r-5} textAnchor="middle"
                    fill="rgba(234,179,8,0.6)" fontSize="8" style={{pointerEvents:"none"}}>???</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Панель узла ── */}
      {sel && (
        <div className="mastery-node-panel" onClick={(e) => e.stopPropagation()}>
          <button className="mastery-panel-close" onClick={() => setSelectedNode(null)}>✕</button>

          {sel.hidden && selState !== "done" && selState !== "available" ? (
            <>
              <h3 className="mastery-panel-title">🌫️ Скрыто туманом</h3>
              <p className="mastery-panel-desc">Выполни все предыдущие узлы — и финальное испытание откроется.</p>
            </>
          ) : (
            <>
              <div className="mastery-panel-diff">
                <span className="mastery-diff-dot" style={{ background: DIFF_COLORS[sel.d]||"#888" }} />
                {sel.d==="legendary" ? "Легендарный" : sel.d==="hard" ? "Сложный" : sel.d==="medium" ? "Средний" : "Простой"}
              </div>
              <h3 className="mastery-panel-title">{sel.label}</h3>
              {sel.desc && <p className="mastery-panel-desc">{sel.desc}</p>}

              {selState === "preview"   && <p className="mastery-panel-hint">Выбери этот путь, чтобы проходить квесты</p>}
              {selState === "available" && (
                <button className="btn btn-primary" disabled={busy} onClick={() => completeNode(selectedNode)}>
                  {busy ? "..." : "Выполнено ✓"}
                </button>
              )}
              {selState === "done"   && <p style={{color:"#4ade80",margin:0}}>✓ Пройдено</p>}
              {selState === "locked" && <p className="mastery-panel-hint">Сначала выполни предшествующие узлы</p>}
            </>
          )}
        </div>
      )}

      {isComplete && isChosenView && (
        <div className="mastery-finished-banner">
          <p>🏆 Путь {PATH_LABELS[chosenPath]} пройден!</p>
          <p className="mastery-finished-sub">Статус «{status.path?.statusLabel}» присвоен</p>
        </div>
      )}
    </section>
  );
}