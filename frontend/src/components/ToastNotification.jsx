import { useState, useEffect } from 'react';

let _setToasts = null;

export function showRewardToast(message, type = 'xp') {
  const colors = {
    xp:    { bg:'#4c1d95', border:'#7c3aed', text:'#c4b5fd' },
    gold:  { bg:'#78350f', border:'#f5b637', text:'#fbbf24' },
    level: { bg:'#065f46', border:'#34d399', text:'#6ee7b7' },
  };
  const id = Date.now() + Math.random();
  const toast = { id, message, colors: colors[type] || colors.xp };
  _setToasts?.(prev => [...prev, toast]);
  setTimeout(() => {
    _setToasts?.(prev => prev.filter(t => t.id !== id));
  }, 2500);
}

export default function RewardToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _setToasts = setToasts; return () => { _setToasts = null; }; }, []);

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 10001,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.colors.bg,
          border: `1px solid ${t.colors.border}`,
          borderRadius: 10,
          padding: '8px 16px',
          color: t.colors.text,
          fontSize: 14,
          fontWeight: 700,
          boxShadow: `0 0 12px ${t.colors.border}66`,
          animation: 'slideInRight 0.3s ease',
          whiteSpace: 'nowrap',
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
