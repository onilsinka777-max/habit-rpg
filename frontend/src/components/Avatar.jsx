export default function Avatar({ level = 1, frame = "none", size = 56, name = "" }) {
  const letter = (name || "?")[0].toUpperCase();
  const hasFrame = frame && frame !== "none";

  const FRAME_STYLES = {
    bronze:    { background: "conic-gradient(#cd7f32, #e9a95a, #cd7f32)" },
    silver:    { background: "conic-gradient(#9ca3af, #d1d5db, #9ca3af)" },
    gold:      { background: "conic-gradient(#d97706, #fbbf24, #d97706)" },
    legendary: { background: "conic-gradient(#7c3aed,#db2777,#ea580c,#d97706,#7c3aed)", animation:"frame-spin 4s linear infinite" },
  };

  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      {hasFrame && (
        <div style={{
          position:"absolute", inset:-4, borderRadius:"50%",
          ...FRAME_STYLES[frame], padding:3, zIndex:0,
        }} />
      )}
      <div style={{
        width:"100%", height:"100%", borderRadius:"50%",
        display:"flex", alignItems:"center", justifyContent:"center",
        background:"linear-gradient(135deg, #4c1d95, #1e1b4b)",
        border:"2px solid #7c3aed",
        boxShadow:"0 0 18px rgba(124,58,237,0.5)",
        position:"relative", zIndex:1,
        userSelect:"none",
      }}>
        <span style={{
          fontSize: Math.round(size * 0.4),
          fontWeight:900,
          color:"#c4b5fd",
          textShadow:"0 0 12px rgba(124,58,237,0.8)",
          fontFamily:"Manrope,sans-serif",
        }}>
          {letter}
        </span>
      </div>
    </div>
  );
}
