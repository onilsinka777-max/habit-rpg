import { useState } from "react";

const DAILY_MESSAGES = [
  "Первый день — самый важный. Большинство сдаются здесь. Ты уже не большинство.",
  "Вчера начал. Сегодня продолжаешь. Это делает тебя лучше 80% людей.",
  "Три дня. Привычка за 21 день. Ты прошёл 14%.",
  "Каждый день это выбор. Ты снова выбрал правильно.",
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

function LaptevAvatar({ size = 56, showOnline = true }) {
  const [err, setErr] = useState(false);
  return (
    <div style={{ position:"relative", flexShrink:0 }}>
      {err ? (
        <div style={{
          width:size, height:size, borderRadius:"50%",
          background:"linear-gradient(135deg,#7c3aed,#1e1b4b)",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:`${size>60?3:2}px solid #7c3aed`,
          boxShadow:`0 0 ${size>60?20:12}px rgba(124,58,237,0.7)`,
          fontSize:size*0.35, fontWeight:900, color:"#c4b5fd",
        }}>L</div>
      ) : (
        <div style={{ position:"relative" }}>
          <img src="/images/laptev.jpg" alt="LAPTEV"
            onError={() => setErr(true)}
            style={{
              width:size, height:size, borderRadius:"50%",
              border:`${size>60?3:2}px solid #7c3aed`,
              boxShadow:`0 0 ${size>60?20:12}px rgba(124,58,237,0.7)`,
              objectFit:"cover", display:"block",
            }}
          />
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:"rgba(124,58,237,0.2)", pointerEvents:"none" }} />
        </div>
      )}
      {showOnline && (
        <div style={{
          position:"absolute", bottom:size>60?4:2, right:size>60?4:2,
          width:size>60?14:10, height:size>60?14:10,
          borderRadius:"50%", background:"#22c55e",
          border:`2px solid #0d0d0d`,
          boxShadow:"0 0 6px #22c55e",
        }} />
      )}
    </div>
  );
}

export { LaptevAvatar };

export default function LaptevAI({ user, onNavigate }) {
  const daysSince = user?.createdAt
    ? Math.max(0, Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000))
    : 0;
  const message = DAILY_MESSAGES[daysSince % 30];

  return (
    <div style={{
      background:"linear-gradient(135deg,#0d0d0d,#1a0a2e)",
      border:"1px solid #7c3aed",
      borderRadius:16,
      boxShadow:"0 0 20px rgba(124,58,237,0.25)",
      padding:16, marginBottom:16,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
        <LaptevAvatar size={56} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:900, fontSize:16, color:"#c4b5fd", letterSpacing:3, marginBottom:2 }}>LAPTEV</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:2 }}>Создатель системы · Уровень ∞</div>
          <div style={{ fontSize:11, color:"#22c55e", fontWeight:700 }}>● ОНЛАЙН</div>
        </div>
      </div>

      <div style={{
        background:"rgba(124,58,237,0.07)",
        borderLeft:"3px solid #7c3aed",
        borderRadius:"0 8px 8px 0",
        padding:"10px 14px", marginBottom:14,
        fontSize:13, lineHeight:1.65,
        color:"rgba(255,255,255,0.8)", fontStyle:"italic",
      }}>
        "{message}"
      </div>

      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => onNavigate("laptev")} style={{
          flex:1, padding:"10px 8px",
          background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
          border:"none", borderRadius:10, cursor:"pointer",
          color:"#fff", fontSize:13, fontWeight:700,
          boxShadow:"0 0 12px rgba(124,58,237,0.4)",
        }}>💬 Открыть чат</button>
        <button onClick={() => onNavigate("laptev")} style={{
          flex:1, padding:"10px 8px",
          background:"rgba(124,58,237,0.1)",
          border:"1px solid rgba(124,58,237,0.3)",
          borderRadius:10, cursor:"pointer",
          color:"#c4b5fd", fontSize:13, fontWeight:700,
        }}>👑 LAPTEV</button>
      </div>
    </div>
  );
}
