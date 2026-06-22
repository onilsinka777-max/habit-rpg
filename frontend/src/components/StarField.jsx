import { useMemo } from "react";

const STAR_COUNT = 50;

export default function StarField({ side }) {
  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => ({
    id: i,
    top: `${(i * 37.3) % 100}%`,
    left: side === "left"
      ? `${15 + (i * 11.7) % 70}%`
      : `${15 + (i * 13.3) % 70}%`,
    size: 1 + (i % 3),
    delay: (i * 0.19) % 3,
    dur: 2 + (i % 3),
    color: i % 10 === 0 ? "#a78bfa" : i % 7 === 0 ? "#7c3aed" : "rgba(255,255,255,0.8)",
  })), [side]);

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%,100% { opacity:0.15; transform:scale(1); }
          50%      { opacity:1;    transform:scale(1.3); }
        }
      `}</style>
      {stars.map(s => (
        <div key={s.id} style={{
          position:"absolute",
          top: s.top,
          left: s.left,
          width: s.size,
          height: s.size,
          borderRadius:"50%",
          background: s.color,
          boxShadow: s.size > 2 ? `0 0 ${s.size*2}px ${s.color}` : "none",
          animation: `twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          pointerEvents:"none",
        }}/>
      ))}
    </>
  );
}
