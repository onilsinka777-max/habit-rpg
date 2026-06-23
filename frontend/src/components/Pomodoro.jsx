import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

const WORK_TIME   = 25 * 60;
const SHORT_BREAK =  5 * 60;
const LONG_BREAK  = 15 * 60;

export default function Pomodoro({ token, showToast }) {
  const [mode, setMode]               = useState('work');
  const [secondsLeft, setSecondsLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning]     = useState(false);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const intervalRef = useRef(null);
  const endTimeRef  = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('pomodoro_state');
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (s.endTime && s.isRunning) {
          const remaining = Math.round((s.endTime - Date.now()) / 1000);
          if (remaining > 0) {
            setSecondsLeft(remaining);
            setMode(s.mode || 'work');
            setPomodoroCount(s.count || 0);
            endTimeRef.current = s.endTime;
            setIsRunning(true);
          } else {
            localStorage.removeItem('pomodoro_state');
          }
        } else if (!s.isRunning && s.secondsLeft) {
          setSecondsLeft(s.secondsLeft);
          setMode(s.mode || 'work');
          setPomodoroCount(s.count || 0);
        }
      } catch(e) { localStorage.removeItem('pomodoro_state'); }
    }
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          handleComplete();
        } else {
          setSecondsLeft(remaining);
        }
      }, 500);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, mode]);

  const handleComplete = async () => {
    setIsRunning(false);
    localStorage.removeItem('pomodoro_state');

    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } catch(e) {}

    if (mode === 'work') {
      const newCount = pomodoroCount + 1;
      setPomodoroCount(newCount);

      try {
        const res = await fetch(`${API}/pomodoro/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (showToast) {
          showToast(`🍅 +${data.xp || 20} XP за помодоро!`, 'success');
          if (data.bonusGold) showToast(`🍅 +15 золота за помодоро!`, 'gold');
        }
      } catch(e) {}

      if (newCount % 4 === 0) {
        setMode('long');
        setSecondsLeft(LONG_BREAK);
      } else {
        setMode('short');
        setSecondsLeft(SHORT_BREAK);
      }
    } else {
      setMode('work');
      setSecondsLeft(WORK_TIME);
    }
  };

  const start = () => {
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    localStorage.setItem('pomodoro_state', JSON.stringify({
      endTime: endTimeRef.current,
      isRunning: true,
      mode,
      count: pomodoroCount,
    }));
    setIsRunning(true);
  };

  const pause = () => {
    setIsRunning(false);
    localStorage.setItem('pomodoro_state', JSON.stringify({
      endTime: endTimeRef.current,
      isRunning: false,
      secondsLeft,
      mode,
      count: pomodoroCount,
    }));
  };

  const reset = () => {
    setIsRunning(false);
    setMode('work');
    setSecondsLeft(WORK_TIME);
    endTimeRef.current = null;
    localStorage.removeItem('pomodoro_state');
  };

  const minutes  = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const seconds  = (secondsLeft % 60).toString().padStart(2, '0');
  const total    = mode === 'work' ? WORK_TIME : mode === 'short' ? SHORT_BREAK : LONG_BREAK;
  const progress = ((total - secondsLeft) / total) * 100;

  const modeLabel = mode === 'work' ? '🍅 Работа' : mode === 'short' ? '☕ Короткий перерыв' : '🌙 Длинный перерыв';
  const modeColor = mode === 'work' ? '#7c3aed' : mode === 'short' ? '#059669' : '#1d4ed8';

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>🍅</span> Помодоро</div>
      <div style={{ maxWidth:360, margin:'0 auto', textAlign:'center', padding:24 }}>
        <div style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:16 }}>{modeLabel}</div>

        <div style={{ position:'relative', width:200, height:200, margin:'0 auto 24px' }}>
          <svg width="200" height="200" style={{ transform:'rotate(-90deg)' }}>
            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8"/>
            <circle cx="100" cy="100" r="90" fill="none"
              stroke={modeColor}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              strokeLinecap="round"
              style={{ transition:'stroke-dashoffset 0.5s ease', filter:`drop-shadow(0 0 6px ${modeColor})` }}
            />
          </svg>
          <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontSize:42, fontWeight:900, color:'#e2e8f0', letterSpacing:2 }}>
              {minutes}:{seconds}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:12, justifyContent:'center', marginBottom:16 }}>
          {!isRunning ? (
            <button onClick={start} style={{
              background:modeColor, color:'#fff', border:'none',
              borderRadius:12, padding:'10px 32px', fontSize:15, fontWeight:700,
              cursor:'pointer', boxShadow:`0 0 15px ${modeColor}60`,
            }}>▶ Старт</button>
          ) : (
            <button onClick={pause} style={{
              background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.2)',
              borderRadius:12, padding:'10px 32px', fontSize:15, fontWeight:700, cursor:'pointer',
            }}>⏸ Пауза</button>
          )}
          <button onClick={reset} style={{
            background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)',
            border:'1px solid rgba(255,255,255,0.1)',
            borderRadius:12, padding:'10px 16px', fontSize:15, cursor:'pointer',
          }}>↺</button>
        </div>

        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>
          {'🍅'.repeat(pomodoroCount % 4 || (pomodoroCount > 0 ? 4 : 0))} {pomodoroCount} помидоров
        </div>

        <div style={{ marginTop:16, fontSize:12, color:'rgba(255,255,255,0.25)' }}>
          +20 XP · +15 золота за первый помодоро дня
        </div>
      </div>
    </section>
  );
}
