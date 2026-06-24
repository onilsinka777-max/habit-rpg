const UNLOCK_MESSAGES = {
  shop:        { icon:'🛒', title:'Магазин открыт!',         desc:'Трать золото на бусты и косметику' },
  chains:      { icon:'⛓️', title:'Цепочки квестов!',        desc:'Выполняй квесты последовательно для больших наград' },
  marathons:   { icon:'🏃', title:'Марафоны!',               desc:'Долгосрочные испытания с крутыми призами' },
  npc:         { icon:'🧙', title:'Наставники!',             desc:'Получай задания от NPC персонажей' },
  league:      { icon:'🏆', title:'Лиги!',                   desc:'Соревнуйся с другими игроками' },
  season:      { icon:'🌟', title:'Сезонные квесты!',        desc:'Уникальные квесты текущего сезона' },
  skills:      { icon:'⚡', title:'Дерево навыков!',         desc:'Прокачивай пассивные способности' },
  pet:         { icon:'🥚', title:'Что-то появилось...',     desc:'Загляни в профиль — там ждёт сюрприз' },
  clans:       { icon:'🏰', title:'Кланы!',                  desc:'Создай клан или вступи в существующий' },
  mastery:     { icon:'🌳', title:'Путь Мастерства!',        desc:'Выбери свой путь развития' },
  legendPath:  { icon:'🌟', title:'Легендарный путь!',       desc:'50 испытаний для настоящих легенд' },
  creatorPath: { icon:'⚡', title:'Путь Создателя!',         desc:'Соревнование с самим LAPTEV' },
};

export default function UnlockNotification({ feature, onClose }) {
  const info = UNLOCK_MESSAGES[feature];
  if (!info) return null;
  return (
    <div style={{
      position:'fixed', inset:0, zIndex:10001,
      background:'rgba(0,0,0,0.85)',
      display:'flex', alignItems:'center', justifyContent:'center',
      animation:'fadeIn 0.3s ease',
    }} onClick={onClose}>
      <div style={{
        background:'linear-gradient(135deg,#0d0d0d,#1a0a2e)',
        border:'2px solid #7c3aed',
        borderRadius:24, padding:'40px 32px',
        textAlign:'center', maxWidth:320,
        boxShadow:'0 0 60px rgba(124,58,237,0.6)',
        animation:'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize:64, marginBottom:16, animation:'unlockBounce 0.6s ease infinite alternate' }}>{info.icon}</div>
        <div style={{ fontSize:11, color:'#7c3aed', fontWeight:700, letterSpacing:2, marginBottom:8, textTransform:'uppercase' }}>НОВЫЙ РАЗДЕЛ</div>
        <h2 style={{ fontSize:22, fontWeight:900, color:'#c4b5fd', marginBottom:8 }}>{info.title}</h2>
        <p style={{ fontSize:14, color:'rgba(255,255,255,0.6)', lineHeight:1.6, marginBottom:24 }}>{info.desc}</p>
        <button onClick={onClose} style={{
          background:'linear-gradient(135deg,#7c3aed,#4c1d95)',
          color:'#fff', border:'none', borderRadius:12,
          padding:'12px 32px', fontSize:15, fontWeight:700, cursor:'pointer',
          boxShadow:'0 0 20px rgba(124,58,237,0.4)',
        }}>Исследовать!</button>
      </div>
      <style>{`
        @keyframes unlockBounce{from{transform:translateY(0)}to{transform:translateY(-10px)}}
        @keyframes scaleIn{from{transform:scale(0.5);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>
    </div>
  );
}
