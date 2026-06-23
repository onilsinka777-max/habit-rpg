import { useState, useEffect } from 'react';

let _setToasts = null;

export function showRewardToast(msg, type = 'xp') {
  const id = Date.now() + Math.random();
  const cfg = {
    xp:    { bg:'linear-gradient(135deg,#4c1d95,#2d1b69)', border:'#7c3aed', color:'#c4b5fd', shadow:'rgba(124,58,237,0.5)' },
    gold:  { bg:'linear-gradient(135deg,#78350f,#451a03)', border:'#f5b637', color:'#fbbf24', shadow:'rgba(245,182,55,0.5)'  },
    level: { bg:'linear-gradient(135deg,#065f46,#022c22)', border:'#34d399', color:'#6ee7b7', shadow:'rgba(52,211,153,0.5)'  },
  };
  const c = cfg[type] || cfg.xp;
  if (_setToasts) _setToasts(p => [...p, { id, msg, c }]);
  setTimeout(() => { if (_setToasts) _setToasts(p => p.filter(t => t.id !== id)); }, 2500);
}

export default function RewardToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);

  return (
    <div style={{ position:'fixed', top:16, right:16, zIndex:10001, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      <style>{`@keyframes toastIn{from{transform:translateX(120%) scale(0.8);opacity:0}to{transform:translateX(0) scale(1);opacity:1}}`}</style>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.c.bg,
          border: `1px solid ${t.c.border}`,
          borderRadius: 12,
          padding: '10px 18px',
          color: t.c.color,
          fontSize: 15,
          fontWeight: 700,
          boxShadow: `0 4px 20px ${t.c.shadow}`,
          whiteSpace: 'nowrap',
          animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        }}>{t.msg}</div>
      ))}
    </div>
  );
}
