import { useState, useRef, useEffect } from "react";
import axios from "axios";
import VoiceInput from "./VoiceInput";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const DAILY_MSGS = [
  "Первый день — самый важный. Большинство сдаются здесь. Ты уже не большинство.",
  "Вчера начал. Сегодня продолжаешь. Это делает тебя лучше 80% людей.",
  "Три дня. Привычка за 21 день. Ты прошёл 14%.",
  "Каждый день — это выбор. Ты снова выбрал правильно.",
  "Пять дней подряд. Это уже не случайность — это характер.",
  "Почти неделя. Большинство бросили на день 3.",
  "Неделя. Первый рубеж. Ты уже другой человек чем был 7 дней назад.",
  "Начинается вторая неделя. Теперь держи темп.",
  "Девять дней. Ты в топ 20% по стрику среди всех игроков.",
  "10 дней. Две цифры. Гордись.",
  "Одиннадцать дней без остановки. Большинство людей не могут продержаться столько.",
  "Ты не просто качаешь персонажа. Ты качаешь себя.",
  "Завтра две недели. Не останавливайся.",
  "Две недели. По науке — половина пути к привычке. Ты на правильном пути.",
  "Полмесяца. Теперь это часть тебя.",
  "Шестнадцать дней. Уже не вопрос 'продолжать ли' — вопрос 'насколько далеко'.",
  "Семнадцать дней. Ты строишь что-то реальное.",
  "Три дня до трёх недель. Не притормаживай именно сейчас.",
  "Большинство марафонов проигрываются на 19-й день. Не ты.",
  "Двадцать дней. Финишная прямая к первому месяцу видна.",
  "21 день. Официально — привычка сформирована. Это наука.",
  "Теперь это не усилие. Это ты.",
  "Двадцать три дня подряд. Запомни это число.",
  "Шесть дней до месяца. Ты дойдёшь.",
  "Четверть сотни дней. Ты сильнее чем думаешь.",
  "Двадцать шесть дней без остановки. Я создавал эту систему именно для таких как ты.",
  "Три дня до месяца. Это уже история.",
  "Двадцать восемь дней. Помни зачем начинал.",
  "Завтра месяц. Ты это сделаешь.",
  "Месяц. Ты доказал себе что можешь. Теперь докажи что не остановишься.",
];

const SOCIALS = [
  { icon:"📸", label:"Instagram", url:"https://www.instagram.com/_lap_tev_",   color:"#E1306C" },
  { icon:"🎵", label:"TikTok",    url:"https://www.tiktok.com/@laptev_",        color:"#69C9D0" },
  { icon:"✈️", label:"Telegram", url:"https://t.me/antonchik_zavozit",         color:"#2AABEE" },
];

function Avatar({ size = 80 }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      {/* Spinning ring */}
      <div style={{
        position:"absolute", inset:-6,
        borderRadius:"50%",
        border:"2px solid transparent",
        borderTopColor:"#7c3aed",
        borderRightColor:"#a78bfa",
        animation:"laptevSpin 3s linear infinite",
        boxShadow:"0 0 20px rgba(124,58,237,0.4)",
      }}/>
      <div style={{
        position:"absolute", inset:-12,
        borderRadius:"50%",
        background:"radial-gradient(circle, rgba(124,58,237,0.25), transparent 70%)",
        animation:"laptevPulse 2.5s ease-in-out infinite",
      }}/>
      {err ? (
        <div style={{
          width:size, height:size, borderRadius:"50%",
          background:"linear-gradient(135deg,#7c3aed,#1e1b4b)",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:"3px solid #7c3aed",
          fontSize:size * 0.4, fontWeight:900, color:"#c4b5fd",
        }}>L</div>
      ) : (
        <div style={{ position:"relative" }}>
          <img src="/images/laptev.jpg" alt="LAPTEV"
            onError={() => setErr(true)}
            style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", display:"block", border:"3px solid #7c3aed" }}
          />
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(124,58,237,0.15)", pointerEvents:"none" }}/>
        </div>
      )}
      {/* Online dot */}
      <div style={{
        position:"absolute", bottom:4, right:4,
        width:16, height:16, borderRadius:"50%",
        background:"#22c55e", border:"2px solid #0d0d0d",
        boxShadow:"0 0 8px #22c55e",
      }}/>
    </div>
  );
}

export default function Laptev({ token, user, showToast }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const [tab, setTab] = useState("chat");
  const [msgs, setMsgs] = useState([{
    role:"assistant",
    content:"Привет. Я Антон. Создал эту систему для себя — она изменила мою жизнь. Теперь она твоя. О чём поговорим?",
  }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [msgsLeft, setMsgsLeft] = useState(30);
  const [talked, setTalked] = useState(() => !!localStorage.getItem("laptev_talked"));
  const [chessMode, setChessMode] = useState(false);
  const bottomRef = useRef(null);

  const daysSince = user?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
    : 0;
  const dailyMsg = DAILY_MSGS[daysSince % 30];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending || msgsLeft <= 0) return;
    const newMsgs = [...msgs, { role:"user", content:text }];
    setMsgs(newMsgs);
    setInput("");
    setSending(true);
    try {
      const history = newMsgs.slice(-9).slice(0,-1).map(m => ({ role:m.role, content:m.content }));
      const res = await axios.post(`${API}/laptev/chat`, { message:text, history }, auth);
      setMsgs(prev => [...prev, { role:"assistant", content:res.data.reply }]);
      setMsgsLeft(res.data.messagesLeft ?? 29);
      if (!talked) { localStorage.setItem("laptev_talked","1"); setTalked(true); }
    } catch(e) {
      const msg = e.response?.data?.message || "Ошибка связи";
      setMsgs(prev => [...prev, { role:"assistant", content:msg }]);
    } finally { setSending(false); }
  };

  const SmallAvatar = () => {
    const [err, setErr] = useState(false);
    return err ? (
      <div style={{ width:28,height:28,borderRadius:"50%",background:"linear-gradient(135deg,#7c3aed,#1e1b4b)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:"#c4b5fd",border:"1px solid #7c3aed",flexShrink:0 }}>L</div>
    ) : (
      <div style={{ position:"relative", flexShrink:0 }}>
        <img src="/images/laptev.jpg" onError={()=>setErr(true)} alt="L" style={{ width:28,height:28,borderRadius:"50%",border:"1px solid #7c3aed",objectFit:"cover",display:"block" }}/>
        <div style={{ position:"absolute",inset:0,borderRadius:"50%",background:"rgba(124,58,237,0.2)",pointerEvents:"none" }}/>
      </div>
    );
  };

  return (
    <section className="quest-section page-enter" style={{ display:"flex", flexDirection:"column" }}>
      <style>{`
        @keyframes laptevSpin { to { transform:rotate(360deg); } }
        @keyframes laptevPulse { 0%,100%{opacity:0.5;transform:scale(1);} 50%{opacity:1;transform:scale(1.1);} }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14, paddingBottom:20, borderBottom:"1px solid rgba(124,58,237,0.15)" }}>
        <Avatar size={80} />
        <div style={{ textAlign:"center" }}>
          <div style={{
            fontSize:28, fontWeight:900, letterSpacing:4,
            background:"linear-gradient(135deg,#c4b5fd,#7c3aed,#a78bfa)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            animation:"titleShimmer 3s linear infinite", marginBottom:4,
          }}>LAPTEV</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.35)", marginBottom:6 }}>
            Создатель системы · Прошёл путь до Легенды
          </div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
            <div style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 6px #22c55e" }}/>
            <span style={{ fontSize:11, color:"#22c55e", fontWeight:700 }}>ОНЛАЙН</span>
          </div>
        </div>
        {/* Social links */}
        <div style={{ display:"flex", gap:10 }}>
          {SOCIALS.map(s => (
            <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:20, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", textDecoration:"none", color:"rgba(255,255,255,0.6)", fontSize:12, transition:"all 0.15s" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=s.color;e.currentTarget.style.color=s.color;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.6)";}}>
              <span>{s.icon}</span><span>{s.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* ── DAILY MSG ── */}
      <div style={{
        background:"rgba(124,58,237,0.07)", borderLeft:"3px solid #7c3aed",
        borderRadius:"0 10px 10px 0", padding:"10px 14px", margin:"16px 0",
        fontSize:13, lineHeight:1.65, color:"rgba(255,255,255,0.75)", fontStyle:"italic",
      }}>
        "{dailyMsg}"
      </div>

      {/* ── TAB SWITCH ── */}
      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        {[["chat","💬 Чат"],["chess","♟ Шахматы"]].map(([id,label]) => (
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, padding:"9px 0",
            background:tab===id?"linear-gradient(135deg,#7c3aed,#4c1d95)":"rgba(255,255,255,0.04)",
            border:`1px solid ${tab===id?"#7c3aed":"rgba(255,255,255,0.08)"}`,
            borderRadius:10, cursor:"pointer", color:tab===id?"#fff":"rgba(255,255,255,0.5)",
            fontWeight:700, fontSize:14,
            boxShadow:tab===id?"0 0 12px rgba(124,58,237,0.4)":"none",
            transition:"all 0.15s",
          }}>{label}</button>
        ))}
      </div>

      {/* ── CHAT ── */}
      {tab === "chat" && (
        <div style={{ display:"flex", flexDirection:"column", flex:1 }}>
          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:10, marginBottom:12, maxHeight:"45vh" }}>
            {msgs.map((m,i) => (
              <div key={i} style={{ display:"flex", alignItems:"flex-end", gap:8, justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                {m.role==="assistant" && <SmallAvatar />}
                <div style={{
                  maxWidth:"76%",
                  background:m.role==="user"?"linear-gradient(135deg,#7c3aed,#4c1d95)":"rgba(26,10,46,0.8)",
                  border:m.role==="user"?"none":"1px solid rgba(124,58,237,0.2)",
                  borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  padding:"10px 14px",
                  fontSize:14, lineHeight:1.55, color:"#e2e8f0",
                  boxShadow:m.role==="user"?"0 0 12px rgba(124,58,237,0.25)":"none",
                }}>{m.content}</div>
              </div>
            ))}
            {sending && (
              <div style={{ display:"flex",alignItems:"flex-end",gap:8 }}>
                <SmallAvatar />
                <div style={{ background:"rgba(26,10,46,0.8)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:"18px 18px 18px 4px",padding:"10px 14px",fontSize:14,color:"rgba(255,255,255,0.4)" }}>
                  печатает...
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ display:"flex", gap:8 }}>
            <VoiceInput onResult={text => setInput(prev => prev + text)} size={14} />
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
              placeholder={msgsLeft>0?"Написать LAPTEV...":"Лимит на сегодня исчерпан"}
              disabled={sending||msgsLeft<=0}
              style={{ flex:1,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(124,58,237,0.25)",borderRadius:24,padding:"10px 16px",color:"#e2e8f0",fontSize:14,outline:"none" }}
            />
            <button onClick={send} disabled={sending||!input.trim()||msgsLeft<=0}
              style={{ background:sending||!input.trim()||msgsLeft<=0?"rgba(124,58,237,0.2)":"linear-gradient(135deg,#7c3aed,#4c1d95)",border:"none",borderRadius:24,padding:"10px 18px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:16,flexShrink:0 }}>
              →
            </button>
          </div>
          <div style={{ fontSize:10,color:"rgba(255,255,255,0.2)",textAlign:"right",marginTop:4 }}>{msgsLeft}/30 сообщений</div>

          {/* Chess button - shows after first conversation */}
          {talked && (
            <button onClick={()=>setTab("chess")} style={{
              marginTop:14, padding:"12px",
              background:"rgba(124,58,237,0.08)", border:"1px solid rgba(124,58,237,0.3)",
              borderRadius:12, cursor:"pointer", color:"#c4b5fd",
              fontSize:14, fontWeight:700, transition:"all 0.15s",
            }}>
              ♟ Сыграть с создателем
            </button>
          )}
        </div>
      )}

      {/* ── CHESS ── */}
      {tab === "chess" && <LaptevChessSection token={token} showToast={showToast} user={user} />}
    </section>
  );
}

// ── INLINE CHESS VS BOT ──────────────────────────────────────────────────────

const INIT_BOARD = [
  ['r','n','b','q','k','b','n','r'],
  ['p','p','p','p','p','p','p','p'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['P','P','P','P','P','P','P','P'],
  ['R','N','B','Q','K','B','N','R'],
];
const GLYPHS={K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
const isW=p=>p&&p===p.toUpperCase();
const isB=p=>p&&p===p.toLowerCase();
const clr=p=>p?(isW(p)?'w':'b'):null;

function attacked(board,row,col,by){
  const knight=[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for(const[dr,dc]of knight){const r=row+dr,c=col+dc;if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.toLowerCase()==='n'&&clr(p)===by)return true;}}
  const pr=by==='w'?row+1:row-1;
  for(const dc of[-1,1]){const c=col+dc;if(pr>=0&&pr<8&&c>=0&&c<8){const p=board[pr][c];if(p&&p.toLowerCase()==='p'&&clr(p)===by)return true;}}
  for(const[dr,dc]of[[-1,0],[1,0],[0,-1],[0,1]]){let r=row+dr,c=col+dc;while(r>=0&&r<8&&c>=0&&c<8){if(board[r][c]){const p=board[r][c];if((p.toLowerCase()==='r'||p.toLowerCase()==='q')&&clr(p)===by)return true;break;}r+=dr;c+=dc;}}
  for(const[dr,dc]of[[-1,-1],[-1,1],[1,-1],[1,1]]){let r=row+dr,c=col+dc;while(r>=0&&r<8&&c>=0&&c<8){if(board[r][c]){const p=board[r][c];if((p.toLowerCase()==='b'||p.toLowerCase()==='q')&&clr(p)===by)return true;break;}r+=dr;c+=dc;}}
  for(const[dr,dc]of[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]){const r=row+dr,c=col+dc;if(r>=0&&r<8&&c>=0&&c<8){const p=board[r][c];if(p&&p.toLowerCase()==='k'&&clr(p)===by)return true;}}
  return false;
}
function inCheck(board,color){
  const k=color==='w'?'K':'k';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]===k)return attacked(board,r,c,color==='w'?'b':'w');
  return false;
}
function legalMovesFor(board,color){
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=board[r][c];if(!p||clr(p)!==color)continue;
    const t=p.toLowerCase();
    const friendly=color==='w'?isW:isB;
    const enemy=color==='w'?isB:isW;
    const pseudo=[];
    const add=(tr,tc)=>{if(tr<0||tr>7||tc<0||tc>7)return false;if(friendly(board[tr][tc]))return false;pseudo.push([tr,tc]);return!board[tr][tc];};
    const ray=(dr,dc)=>{let rr=r+dr,cc=c+dc;while(rr>=0&&rr<8&&cc>=0&&cc<8){if(!add(rr,cc))break;rr+=dr;cc+=dc;}};
    if(t==='p'){const dir=color==='w'?-1:1;const st=color==='w'?6:1;if(!board[r+dir]?.[c]){pseudo.push([r+dir,c]);if(r===st&&!board[r+dir*2]?.[c])pseudo.push([r+dir*2,c]);}for(const dc of[-1,1])if(enemy(board[r+dir]?.[c+dc]))pseudo.push([r+dir,c+dc]);}
    else if(t==='r')[[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='b')[[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='q')[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr,dc])=>ray(dr,dc));
    else if(t==='n')[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    else if(t==='k')[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]].forEach(([dr,dc])=>add(r+dr,c+dc));
    for(const[tr,tc]of pseudo){
      const nb=board.map(row=>[...row]);nb[tr][tc]=nb[r][c];nb[r][c]=null;
      if(!inCheck(nb,color))moves.push({fr:r,fc:c,tr,tc});
    }
  }
  return moves;
}

const PIECE_VAL={p:1,n:3,b:3,r:5,q:9,k:0};
const BOT_MSGS_CAPTURE=["Неплохо.","Хороший ход.","Уважаю."];
const BOT_MSGS_MOVE=["Классика.","Интересно.","Хм.","Посмотрим."];
const BOT_MSGS_CHECK=["Думай.","Осторожнее.","Смотри."];
const pick=arr=>arr[Math.floor(Math.random()*arr.length)];

function botMove(board,wins,losses){
  const errRate=wins>=losses+2?0.05:losses>=wins+2?0.30:0.15;
  const all=legalMovesFor(board,'b');
  if(!all.length)return null;
  if(Math.random()<errRate)return all[Math.floor(Math.random()*all.length)];
  const caps=all.filter(m=>board[m.tr][m.tc]);
  if(caps.length>0){
    caps.sort((a,b)=>(PIECE_VAL[board[b.tr][b.tc].toLowerCase()]||0)-(PIECE_VAL[board[a.tr][a.tc].toLowerCase()]||0));
    return caps[0];
  }
  return all[Math.floor(Math.random()*all.length)];
}

const BOT_RATING = 1500;

function calcEloChange(myRating, oppRating, result) {
  const K = 32;
  const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
  const score = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
  return Math.round(K * (score - expected));
}

function LaptevChessSection({ token, showToast, user }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };
  const boardRef = useRef(INIT_BOARD.map(r=>[...r]));
  const [renderTick, setRenderTick] = useState(0);
  const [sel, setSel] = useState(null);
  const [lm, setLm] = useState([]);
  const [status, setStatus] = useState("playing");
  const [xpGained, setXpGained] = useState(null);
  const [eggUnlocked, setEggUnlocked] = useState(null);
  const [botComment, setBotComment] = useState(null);
  const [ratingChange, setRatingChange] = useState(null);
  const [botThinking, setBotThinking] = useState(false);
  const workerRef = useRef(null);

  const myRating = user?.chessRating || 1000;
  const board = boardRef.current;

  useEffect(() => {
    workerRef.current = new Worker('/chessWorker.js');
    workerRef.current.onmessage = (e) => {
      const bm = e.data.move;
      setBotThinking(false);
      const nb = boardRef.current.map(r=>[...r]);
      if(!bm) { finishGame("draw", nb); return; }
      const botCaptured = nb[bm.tr][bm.tc];
      nb[bm.tr][bm.tc] = nb[bm.fr][bm.fc];
      nb[bm.fr][bm.fc] = null;
      if(nb[bm.tr][bm.tc]==='p'&&bm.tr===7) nb[bm.tr][bm.tc]='q';
      const comment = botCaptured ? pick(BOT_MSGS_CAPTURE) : inCheck(nb,'w') ? pick(BOT_MSGS_CHECK) : pick(BOT_MSGS_MOVE);
      setBotComment(comment);
      setTimeout(() => setBotComment(null), 2500);
      const playerMoves = legalMovesFor(nb, 'w');
      if(!playerMoves.length) {
        boardRef.current = nb; setRenderTick(t=>t+1);
        finishGame(inCheck(nb,'w') ? "lose" : "draw", nb); return;
      }
      boardRef.current = nb;
      setRenderTick(t=>t+1);
    };
    return () => workerRef.current?.terminate();
  }, []);

  const finishGame = async (result, finalBoard) => {
    if(finalBoard) boardRef.current = finalBoard;
    setStatus(result);
    const delta = calcEloChange(myRating, BOT_RATING, result === 'player' ? 'win' : result === 'draw' ? 'draw' : 'loss');
    setRatingChange(delta);
    try {
      const res = await axios.post(`${API}/chess/vs-bot/result`, { result, ratingChange: delta }, auth);
      setXpGained(res.data.xp);
      if(res.data.easterEgg) setEggUnlocked(res.data.easterEgg);
    } catch {}
  };

  const handleClick = (r, c) => {
    if(status !== "playing" || botThinking) return;
    const p = board[r][c];
    if(sel) {
      if(lm.some(([lr,lc]) => lr===r && lc===c)) {
        const nb = board.map(row=>[...row]);
        nb[r][c] = nb[sel[0]][sel[1]]; nb[sel[0]][sel[1]] = null;
        if(nb[r][c]==='P' && r===0) nb[r][c] = 'Q';
        setSel(null); setLm([]);
        const oppMoves = legalMovesFor(nb, 'b');
        if(!oppMoves.length) {
          boardRef.current = nb; setRenderTick(t=>t+1);
          finishGame(inCheck(nb,'b') ? "player" : "draw", nb); return;
        }
        boardRef.current = nb; setRenderTick(t=>t+1);
        setBotThinking(true);
        workerRef.current?.postMessage({ board: nb });
      } else if(p && clr(p)==='w') {
        const moves = legalMovesFor(board,'w').filter(m=>m.fr===r&&m.fc===c).map(m=>[m.tr,m.tc]);
        setSel([r,c]); setLm(moves);
      } else { setSel(null); setLm([]); }
    } else {
      if(!p || clr(p)!=='w') return;
      const moves = legalMovesFor(board,'w').filter(m=>m.fr===r&&m.fc===c).map(m=>[m.tr,m.tc]);
      setSel([r,c]); setLm(moves);
    }
  };

  const resign = () => { if(status==="playing") finishGame("lose", null); };
  const reset = () => {
    workerRef.current?.terminate();
    workerRef.current = new Worker('/chessWorker.js');
    workerRef.current.onmessage = (e) => {
      const bm = e.data.move; setBotThinking(false);
      const nb = boardRef.current.map(r=>[...r]);
      if(!bm) { finishGame("draw", nb); return; }
      const botCaptured = nb[bm.tr][bm.tc];
      nb[bm.tr][bm.tc] = nb[bm.fr][bm.fc]; nb[bm.fr][bm.fc] = null;
      if(nb[bm.tr][bm.tc]==='p'&&bm.tr===7) nb[bm.tr][bm.tc]='q';
      const comment = botCaptured ? pick(BOT_MSGS_CAPTURE) : inCheck(nb,'w') ? pick(BOT_MSGS_CHECK) : pick(BOT_MSGS_MOVE);
      setBotComment(comment); setTimeout(() => setBotComment(null), 2500);
      const playerMoves = legalMovesFor(nb,'w');
      if(!playerMoves.length) { boardRef.current = nb; setRenderTick(t=>t+1); finishGame(inCheck(nb,'w')?"lose":"draw", nb); return; }
      boardRef.current = nb; setRenderTick(t=>t+1);
    };
    boardRef.current = INIT_BOARD.map(r=>[...r]);
    setSel(null); setLm([]); setStatus("playing");
    setXpGained(null); setEggUnlocked(null); setRatingChange(null); setBotThinking(false);
    setRenderTick(t=>t+1);
  };

  const kingInCheck = inCheck(board,'w');
  let kingPos = null;
  if(kingInCheck) { outer: for(let r=0;r<8;r++) for(let c=0;c<8;c++) if(board[r][c]==='K'){kingPos=[r,c];break outer;} }

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* Elo ratings */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", background:"rgba(124,58,237,0.06)", borderRadius:10, border:"1px solid rgba(124,58,237,0.15)" }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>Вы (белые)</div>
          <div style={{ fontWeight:800, fontSize:16, color:"#fff" }}>{myRating}</div>
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontStyle:"italic" }}>vs</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>LAPTEV (чёрные)</div>
          <div style={{ fontWeight:800, fontSize:16, color:"#c4b5fd" }}>{BOT_RATING}</div>
        </div>
      </div>

      {/* Bot comment */}
      {botComment && (
        <div style={{ background:"rgba(26,10,46,0.95)", border:"1px solid rgba(124,58,237,0.4)", borderRadius:10, padding:"8px 12px", fontSize:13, color:"rgba(255,255,255,0.8)", fontStyle:"italic", textAlign:"center" }}>
          LAPTEV: "{botComment}"
        </div>
      )}

      {/* Bot thinking */}
      {botThinking && (
        <div style={{ textAlign:"center", fontSize:12, color:"#a78bfa" }}>🤔 LAPTEV думает...</div>
      )}

      {/* Result popup */}
      {status !== "playing" && (
        <div style={{ background:"rgba(26,10,46,0.97)", border:"1px solid #7c3aed", borderRadius:14, padding:"18px", textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:8 }}>
            {status==="player" ? "🏆" : status==="draw" ? "🤝" : "😤"}
          </div>
          <div style={{ fontWeight:900, fontSize:20, color:status==="player"?"#34d399":status==="draw"?"#fbbf24":"#ef4444", marginBottom:6 }}>
            {status==="player" ? "Победа!" : status==="draw" ? "Ничья" : "Поражение"}
          </div>
          {ratingChange !== null && (
            <div style={{ fontSize:15, fontWeight:700, color:ratingChange>=0?"#34d399":"#ef4444", marginBottom:6 }}>
              {ratingChange>=0?"+":""}{ratingChange} рейтинга
            </div>
          )}
          {xpGained && <div style={{ fontSize:13, color:"#a78bfa", marginBottom:8 }}>+{xpGained} XP</div>}
          {eggUnlocked && (
            <div style={{ background:"rgba(251,191,36,0.1)", border:"1px solid rgba(251,191,36,0.3)", borderRadius:10, padding:"10px", marginBottom:10 }}>
              <div style={{ fontSize:20 }}>{eggUnlocked.icon||"♟️"}</div>
              <div style={{ fontWeight:700, color:"#fbbf24", fontSize:13 }}>🥚 {eggUnlocked.title}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>+{eggUnlocked.rewardGold}💰 +{eggUnlocked.rewardXp}XP</div>
            </div>
          )}
          <button onClick={reset} style={{ padding:"10px 28px", background:"linear-gradient(135deg,#7c3aed,#4c1d95)", border:"none", borderRadius:10, cursor:"pointer", color:"#fff", fontWeight:700 }}>Сыграть снова</button>
        </div>
      )}

      {/* Board */}
      <div style={{ display:"flex", justifyContent:"center" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", width:"min(340px,100%)", aspectRatio:"1", border:"2px solid rgba(124,58,237,0.4)", borderRadius:6, overflow:"hidden", boxShadow:"0 0 24px rgba(124,58,237,0.2)" }}>
          {board.map((row,r)=>row.map((piece,c)=>{
            const light = (r+c)%2===0;
            const isSel = sel?.[0]===r && sel?.[1]===c;
            const isLegal = lm.some(([lr,lc])=>lr===r&&lc===c);
            const isKingCheck = kingPos && kingPos[0]===r && kingPos[1]===c;
            return (
              <div key={`${r}${c}`} onClick={()=>handleClick(r,c)} style={{
                background: isSel ? "rgba(124,58,237,0.55)" : isKingCheck ? "rgba(239,68,68,0.45)" : light ? "#2d2060" : "#1a1040",
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor: botThinking||status!=="playing" ? "default" : "pointer",
                aspectRatio:"1", position:"relative",
              }}>
                {isLegal && !piece && <div style={{ width:"32%", height:"32%", borderRadius:"50%", background:"rgba(52,211,153,0.6)" }}/>}
                {isLegal && piece && <div style={{ position:"absolute", inset:0, border:"2px solid rgba(52,211,153,0.65)", boxSizing:"border-box", pointerEvents:"none" }}/>}
                {piece && <span style={{
                  fontSize:"clamp(16px,4.2vw,32px)", lineHeight:1, userSelect:"none",
                  color: isW(piece) ? "#FFFFFF" : "#c4b5fd",
                  textShadow: isW(piece)
                    ? "0 0 3px #000, 0 0 6px #000, 2px 2px 0 #000"
                    : "0 0 8px #7c3aed, 0 0 15px #7c3aed, 0 0 3px #000",
                }}>{GLYPHS[piece]}</span>}
              </div>
            );
          }))}
        </div>
      </div>

      {/* Controls */}
      {status === "playing" && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ fontSize:12, color:kingInCheck?"#ef4444":"rgba(255,255,255,0.4)" }}>
            {botThinking ? "⏳ Ход LAPTEV..." : kingInCheck ? "⚠️ Шах!" : "Ваш ход ♙"}
          </div>
          <button onClick={resign} disabled={botThinking} style={{
            background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:8, padding:"5px 12px", color:"#ef4444",
            cursor:"pointer", fontSize:12, fontWeight:700,
          }}>🏳️ Сдаться</button>
        </div>
      )}
    </div>
  );
}
