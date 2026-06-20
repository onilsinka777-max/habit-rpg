import { useRef, useState } from "react";
import { startAmbient } from "../sounds";

export default function AmbientMusic() {
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef(null);

  const toggle = () => {
    if (playing) {
      stopRef.current?.();
      stopRef.current = null;
      setPlaying(false);
    } else {
      stopRef.current = startAmbient();
      setPlaying(true);
    }
  };

  return (
    <button onClick={toggle} title={playing ? "Выключить музыку" : "Включить фоновую музыку"}
      style={{
        position: "fixed", bottom: 20, right: 20, zIndex: 50,
        width: 42, height: 42, borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.14)",
        background: playing ? "var(--accent,#8d8cf8)" : "rgba(20,25,37,0.9)",
        color: playing ? "#0b0e17" : "#cbd5e1",
        fontSize: 18, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(8px)",
        transition: "background 0.3s, color 0.3s",
        boxShadow: playing ? "0 0 14px var(--accent-glow,rgba(141,140,248,0.4))" : "none",
      }}>
      {playing ? "🎵" : "🔇"}
    </button>
  );
}
