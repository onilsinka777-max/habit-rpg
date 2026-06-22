import { useState, useRef, useEffect } from "react";

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const supported = !!SpeechRecognition;

export default function VoiceInput({ onResult, size = 16 }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef(null);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "ru-RU";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      onResult?.(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    rec.start();
    recRef.current = rec;
    setListening(true);
  };

  return (
    <button onClick={toggle} title={listening ? "Остановить запись" : "Голосовой ввод"}
      style={{
        background:"none", border:"none", cursor:"pointer", padding:"4px",
        fontSize:size, lineHeight:1, flexShrink:0,
        opacity: listening ? 1 : 0.5,
        animation: listening ? "voicePulse 0.8s ease-in-out infinite" : "none",
        filter: listening ? "drop-shadow(0 0 4px #ef4444)" : "none",
        transition:"opacity 0.15s",
      }}>
      🎤
      <style>{`@keyframes voicePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }`}</style>
    </button>
  );
}
