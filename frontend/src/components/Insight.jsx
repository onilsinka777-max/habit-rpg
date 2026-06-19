export default function Insight({ insight }) {
  if (!insight) return null;

  return (
    <div className={`insight-card ${insight.type}`}>
      <span className="insight-icon">{insight.type === "warning" ? "💡" : "✨"}</span>
      <p className="insight-text">{insight.text}</p>
    </div>
  );
}