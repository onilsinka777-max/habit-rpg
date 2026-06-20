const STAGE_EMOJIS = {
  1:  "🧑",
  10: "⚔️",
  20: "🛡️",
  30: "🗡️",
  50: "👑",
};

function getAvatarEmoji(level) {
  if (level >= 50) return STAGE_EMOJIS[50];
  if (level >= 30) return STAGE_EMOJIS[30];
  if (level >= 20) return STAGE_EMOJIS[20];
  if (level >= 10) return STAGE_EMOJIS[10];
  return STAGE_EMOJIS[1];
}

export default function Avatar({ level = 1, frame = "none", size = 56 }) {
  const emoji = getAvatarEmoji(level);
  const hasFrame = frame && frame !== "none";

  const containerStyle = {
    position: "relative",
    width: size,
    height: size,
    flexShrink: 0,
  };

  const avatarStyle = {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: Math.round(size * 0.48),
    background: "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.1), transparent 65%), #161b29",
    border: "2px solid var(--accent, #8d8cf8)",
    boxShadow: "0 0 18px var(--accent-glow, rgba(141,140,248,0.35))",
    position: "relative",
    zIndex: 1,
    userSelect: "none",
    overflow: "hidden",
  };

  const FRAME_STYLES = {
    bronze:    { background: "conic-gradient(#cd7f32, #e9a95a, #cd7f32)" },
    silver:    { background: "conic-gradient(#9ca3af, #d1d5db, #9ca3af)" },
    gold:      { background: "conic-gradient(#d97706, #fbbf24, #d97706)" },
    legendary: {
      background: "conic-gradient(#7c3aed,#db2777,#ea580c,#d97706,#7c3aed)",
      animation: "frame-spin 4s linear infinite",
    },
  };

  return (
    <div style={containerStyle}>
      {hasFrame && (
        <div style={{
          position: "absolute", inset: -4, borderRadius: "50%",
          ...FRAME_STYLES[frame],
          padding: 3,
          zIndex: 0,
        }} />
      )}
      <div style={avatarStyle}>{emoji}</div>
    </div>
  );
}
