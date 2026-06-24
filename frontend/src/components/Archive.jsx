import { useState, useEffect, useRef } from "react";
import LockedFeature from "./LockedFeature";

const PARTICLE_COUNT = 40;

function DustParticles() {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 0.15 + Math.random() * 0.25,
      opacity: 0.1 + Math.random() * 0.25,
      size: Math.random() < 0.7 ? 1 : 1.5,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesRef.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
        ctx.fill();
        p.y += p.speed;
        if (p.y > canvas.height) {
          p.y = -2;
          p.x = Math.random() * canvas.width;
        }
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "absolute", inset: 0, width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 0,
    }} />
  );
}

export default function Archive({ userLevel = 1, archiveSolved = false, archiveFitnessDays = 0 }) {
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);

  if (userLevel < 40) {
    return (
      <LockedFeature
        requiredLevel={40}
        currentLevel={userLevel}
        icon="◈"
        title="Архив"
        description="Старая комната. Здесь хранится что-то важное."
      />
    );
  }

  const handleBookClick = () => {
    if (flipped) return;
    setFlipped(true);
    setTimeout(() => setOpen(true), 600);
  };

  return (
    <div style={{
      position: "relative", minHeight: "calc(100vh - 120px)",
      background: "#050508", overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <style>{`
        @keyframes archiveGlow {
          0%   { text-shadow: 0 0 8px #7c3aed, 0 0 16px #7c3aed; color: #a78bfa; }
          25%  { text-shadow: 0 0 8px #2563eb, 0 0 16px #2563eb; color: #93c5fd; }
          50%  { text-shadow: 0 0 8px #059669, 0 0 16px #059669; color: #6ee7b7; }
          75%  { text-shadow: 0 0 8px #d97706, 0 0 16px #d97706; color: #fcd34d; }
          100% { text-shadow: 0 0 8px #7c3aed, 0 0 16px #7c3aed; color: #a78bfa; }
        }
        @keyframes archiveSolvedPulse {
          0%,100%{box-shadow:0 0 30px rgba(52,211,153,0.15)}
          50%{box-shadow:0 0 60px rgba(52,211,153,0.35)}
        }
        .book-cover {
          width: 220px; height: 300px;
          background: linear-gradient(135deg, #2c1a0e, #1a0f07);
          border: 2px solid #3d2510;
          border-radius: 4px 16px 16px 4px;
          box-shadow: -4px 4px 20px rgba(0,0,0,0.8), inset 2px 0 8px rgba(0,0,0,0.5);
          cursor: pointer;
          position: relative;
          transition: transform 0.15s;
        }
        .book-cover:hover { transform: scale(1.02); }
        .book-cover::before {
          content: '';
          position: absolute;
          left: 18px; top: 0; bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #4a2c14, #2c1a0e, #4a2c14);
          border-radius: 2px;
        }
        .book-spine-line {
          position: absolute; left: 22px; top: 0; bottom: 0;
          width: 1px; background: rgba(255,255,255,0.05);
        }
        .book-flip {
          animation: bookFlip 0.6s ease-in-out forwards;
          transform-origin: left center;
          perspective: 800px;
        }
        @keyframes bookFlip {
          0%  { transform: rotateY(0deg); }
          100%{ transform: rotateY(-180deg); opacity: 0; }
        }
        .page {
          background: #f5e6c8;
          border-radius: 2px 8px 8px 2px;
          padding: 32px 28px;
          width: 260px;
          min-height: 340px;
          box-shadow: 4px 4px 20px rgba(0,0,0,0.6),
                      inset -2px 0 8px rgba(0,0,0,0.08);
          position: relative;
          animation: pageAppear 0.4s ease;
        }
        @keyframes pageAppear {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .page::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: linear-gradient(180deg, #d4a574, #a0714c, #d4a574);
        }
        .handwriting {
          font-family: 'Caveat', cursive, 'Comic Sans MS';
          color: #5c3d1e;
          font-size: 17px;
          line-height: 1.9;
        }
        .page-date {
          font-family: 'Caveat', cursive;
          color: #c8b89a;
          font-size: 11px;
          opacity: 0.6;
          position: absolute;
          bottom: 20px;
          right: 24px;
        }
        .page-lines {
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            transparent,
            transparent 31px,
            rgba(90,55,20,0.08) 31px,
            rgba(90,55,20,0.08) 32px
          );
          border-radius: inherit;
          pointer-events: none;
        }
        .solved-banner {
          background: rgba(52,211,153,0.1);
          border: 1px solid rgba(52,211,153,0.3);
          border-radius: 8px;
          padding: 8px 14px;
          margin-top: 16px;
          font-family: 'Caveat', cursive;
          font-size: 13px;
          color: #34d399;
        }
      `}</style>

      <DustParticles />

      {/* Dim ambient light from top */}
      <div style={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 200, height: 120,
        background: "radial-gradient(ellipse at top, rgba(255,220,150,0.04) 0%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1 }}>
        {!open ? (
          <div
            className={`book-cover${flipped ? " book-flip" : ""}`}
            onClick={handleBookClick}
            title="Открыть дневник"
          >
            <div className="book-spine-line" />
            {/* Cover decoration */}
            <div style={{
              position: "absolute", inset: "24px 16px",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 4,
            }} />
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%,-50%)",
              textAlign: "center",
            }}>
              <div style={{
                fontSize: 28, opacity: 0.15, color: "#c8a96e",
                fontFamily: "serif", letterSpacing: 3,
              }}>◈</div>
            </div>
          </div>
        ) : (
          <div className="page">
            <div className="page-lines" />
            <div className="handwriting">
              Изначально я планировал заниматься только фитнесом.
            </div>
            {archiveSolved && (
              <div className="solved-banner">
                ✓ Тайна раскрыта
              </div>
            )}
            {!archiveSolved && archiveFitnessDays > 0 && (
              <div style={{
                marginTop: 12, fontFamily: "'Caveat', cursive",
                fontSize: 12, color: "#8b6914", opacity: 0.7,
              }}>
                {'·'.repeat(archiveFitnessDays)}
              </div>
            )}
            <div className="page-date">День 1</div>
          </div>
        )}
      </div>

      {/* Subtle room corners */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)",
      }} />
    </div>
  );
}
