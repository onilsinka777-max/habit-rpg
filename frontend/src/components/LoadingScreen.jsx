import { useEffect, useState } from "react";

export default function LoadingScreen({ onDone }) {
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState(0);

  const PHASES = ["Загрузка мира...", "Пробуждение героя...", "Готово!"];

  useEffect(() => {
    const shown = sessionStorage.getItem("loading_shown");
    if (shown) { onDone(); return; }
    sessionStorage.setItem("loading_shown", "1");

    const start = Date.now();
    const dur = 2500;
    const tick = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(100, Math.round((elapsed / dur) * 100));
      setPct(p);
      if (p < 40) setPhase(0);
      else if (p < 80) setPhase(1);
      else setPhase(2);
      if (p >= 100) { clearInterval(tick); setTimeout(onDone, 300); }
    }, 30);
    return () => clearInterval(tick);
  }, []);

  const particles = Array.from({ length: 12 }, (_, i) => ({
    left: `${(i * 8.3) % 100}%`,
    top:  `${(i * 13) % 80}%`,
    delay: `${i * 0.15}s`,
    size: `${4 + (i % 4) * 2}px`,
  }));

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:9999,
      background:"#0b0e17", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      animation:"fadeIn 0.3s ease",
    }}>
      <style>{`
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes sparkle { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
      `}</style>

      {/* Gold particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position:"absolute", left:p.left, top:p.top,
          width:p.size, height:p.size, borderRadius:"50%",
          background:"rgba(245,182,55,0.6)",
          animation:`sparkle 1.5s ${p.delay} infinite`,
        }} />
      ))}

      <div style={{ textAlign:"center", position:"relative", zIndex:1 }}>
        <div style={{ fontSize:64, animation:"float 2s ease-in-out infinite", marginBottom:16 }}>⚔️</div>
        <h1 style={{ fontSize:36, fontWeight:900, color:"#f5b637", margin:"0 0 4px", letterSpacing:2, textShadow:"0 0 30px rgba(245,182,55,0.6)" }}>
          LEVELUP
        </h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, letterSpacing:3, textTransform:"uppercase", margin:"0 0 32px" }}>
          Геймификация жизни
        </p>

        <div style={{ width:220, height:4, background:"rgba(255,255,255,0.08)", borderRadius:2, overflow:"hidden", margin:"0 auto 12px" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#8d8cf8,#f5b637)", borderRadius:2, transition:"width 0.1s" }} />
        </div>
        <p style={{ color:"rgba(255,255,255,0.35)", fontSize:12 }}>{PHASES[phase]}</p>
      </div>
    </div>
  );
}
