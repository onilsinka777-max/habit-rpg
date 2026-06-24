import { useState } from "react";

const STYLE = `
  @keyframes archiveGlow {
    0%   { text-shadow: 0 0 8px #7c3aed, 0 0 16px #7c3aed; color: #a78bfa; }
    25%  { text-shadow: 0 0 8px #2563eb, 0 0 16px #2563eb; color: #93c5fd; }
    50%  { text-shadow: 0 0 8px #059669, 0 0 16px #059669; color: #6ee7b7; }
    75%  { text-shadow: 0 0 8px #d97706, 0 0 16px #d97706; color: #fcd34d; }
    100% { text-shadow: 0 0 8px #7c3aed, 0 0 16px #7c3aed; color: #a78bfa; }
  }
  @keyframes archiveRing {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .archive-badge-glyph {
    animation: archiveGlow 4s ease-in-out infinite;
    font-size: 14px;
    cursor: default;
    position: relative;
    display: inline-block;
    user-select: none;
  }
  .archive-ring {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid rgba(167,139,250,0.35);
    border-top-color: rgba(167,139,250,0.8);
    animation: archiveRing 8s linear infinite;
    pointer-events: none;
  }
  .archive-tooltip {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: rgba(10,8,20,0.97);
    border: 1px solid rgba(167,139,250,0.3);
    border-radius: 6px;
    padding: 4px 10px;
    font-size: 11px;
    white-space: nowrap;
    color: #a78bfa;
    pointer-events: none;
    z-index: 100;
  }
`;

export default function ArchiveBadge({ style }) {
  const [tip, setTip] = useState(false);
  return (
    <>
      <style>{STYLE}</style>
      <span
        className="archive-badge-glyph"
        style={{ marginLeft: 6, ...style }}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
      >
        ◈
        <span className="archive-ring" />
        {tip && <span className="archive-tooltip">Архивариус · Нашёл тайну системы</span>}
      </span>
    </>
  );
}
