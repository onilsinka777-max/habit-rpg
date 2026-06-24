export default function LockedFeature({ requiredLevel, currentLevel, icon, title, description }) {
  const diff = requiredLevel - currentLevel;
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center',
      justifyContent:'center', padding:'60px 24px', textAlign:'center',
      minHeight:300,
    }}>
      <div style={{ fontSize:64, marginBottom:16, opacity:0.4, filter:'grayscale(1)' }}>{icon}</div>
      <div style={{
        background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)',
        borderRadius:16, padding:'24px 32px', maxWidth:320,
      }}>
        <div style={{ fontSize:11, color:'#7c3aed', fontWeight:700, letterSpacing:2, marginBottom:8, textTransform:'uppercase' }}>🔒 ЗАКРЫТО</div>
        <h3 style={{ fontSize:20, fontWeight:900, color:'#c4b5fd', marginBottom:8 }}>{title}</h3>
        <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', lineHeight:1.6, marginBottom:16 }}>{description}</p>
        <div style={{ background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', borderRadius:10, padding:'10px 16px' }}>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginBottom:4 }}>Откроется на уровне</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#a78bfa' }}>{requiredLevel}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:4 }}>
            {diff > 0
              ? `Ещё ${diff} ${diff===1?'уровень':diff<5?'уровня':'уровней'}`
              : 'Доступно сейчас!'}
          </div>
        </div>
        <div style={{ marginTop:12 }}>
          <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.1)', overflow:'hidden' }}>
            <div style={{
              height:'100%', borderRadius:2,
              background:'linear-gradient(90deg,#7c3aed,#a78bfa)',
              width:`${Math.min(100, (currentLevel/requiredLevel)*100)}%`,
              transition:'width 0.5s ease',
            }}/>
          </div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4, textAlign:'right' }}>
            {currentLevel}/{requiredLevel}
          </div>
        </div>
      </div>
    </div>
  );
}
