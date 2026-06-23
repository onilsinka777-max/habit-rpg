import { useEffect, useState } from 'react';

export default function RewardAnimation({ xp, gold, onComplete }) {
  const [phase, setPhase] = useState('appear');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('float'), 100);
    const t2 = setTimeout(() => setPhase('fade'), 1200);
    const t3 = setTimeout(() => { setVisible(false); onComplete?.(); }, 1800);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: phase === 'appear' ? '60%' : phase === 'float' ? '20%' : '10%',
      left: '50%',
      transform: 'translateX(-50%)',
      transition: 'top 1.2s cubic-bezier(0.25,0.46,0.45,0.94), opacity 0.6s',
      opacity: phase === 'fade' ? 0 : 1,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      pointerEvents: 'none',
    }}>
      {xp > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed, #4c1d95)',
          border: '2px solid #a78bfa',
          borderRadius: 12,
          padding: '8px 20px',
          color: '#e2e8f0',
          fontSize: 18,
          fontWeight: 700,
          boxShadow: '0 0 20px rgba(124,58,237,0.6)',
          whiteSpace: 'nowrap',
        }}>✨ +{xp} XP</div>
      )}
      {gold > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #92400e, #78350f)',
          border: '2px solid #f5b637',
          borderRadius: 12,
          padding: '8px 20px',
          color: '#fbbf24',
          fontSize: 18,
          fontWeight: 700,
          boxShadow: '0 0 20px rgba(245,182,55,0.5)',
          whiteSpace: 'nowrap',
        }}>💰 +{gold} золота</div>
      )}
    </div>
  );
}
