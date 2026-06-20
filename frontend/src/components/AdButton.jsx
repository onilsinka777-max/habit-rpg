import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AdButton({ token, onGoldEarned, compact = false }) {
  const [watchesLeft, setWatchesLeft] = useState(3);
  const [countdown, setCountdown]     = useState(null);
  const [busy, setBusy]               = useState(false);
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  const startAd = async () => {
    if (busy || countdown !== null || watchesLeft <= 0) return;
    setBusy(true);
    // 5-second countdown simulation
    let sec = 5;
    setCountdown(sec);
    const tick = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(tick);
        setCountdown(null);
        collectReward();
      } else {
        setCountdown(sec);
      }
    }, 1000);
  };

  const collectReward = async () => {
    try {
      const res = await axios.post(`${API}/watch-ad`, {}, auth);
      setWatchesLeft(res.data.watchesLeft);
      onGoldEarned?.(res.data.gold);
    } catch (e) {
      const left = e.response?.data?.watchesLeft ?? 0;
      setWatchesLeft(left);
    } finally {
      setBusy(false);
    }
  };

  if (watchesLeft <= 0) {
    return compact ? null : (
      <div style={{
        background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)",
        borderRadius:12, padding:"12px 16px", textAlign:"center",
        fontSize:13, color:"rgba(255,255,255,0.3)",
      }}>
        📺 Лимит просмотров на сегодня исчерпан (0/3)
      </div>
    );
  }

  if (compact) {
    return (
      <button
        onClick={startAd}
        disabled={busy || countdown !== null}
        style={{
          background:"linear-gradient(135deg, rgba(245,182,55,0.15), rgba(251,120,120,0.1))",
          border:"1px solid rgba(245,182,55,0.3)", borderRadius:10,
          padding:"8px 14px", cursor:"pointer", color:"#f5b637",
          fontSize:13, fontWeight:700, width:"100%",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
        {countdown !== null ? (
          <><span>⏳</span> Смотрю рекламу... {countdown}с</>
        ) : (
          <><span>📺</span> Смотреть рекламу (+15 монет) · осталось {watchesLeft}/3</>
        )}
      </button>
    );
  }

  return (
    <div style={{
      background:"linear-gradient(135deg, rgba(245,182,55,0.08), rgba(251,120,120,0.05))",
      border:"1px solid rgba(245,182,55,0.2)", borderRadius:14, padding:"16px",
      marginBottom:12,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
        <span style={{ fontSize:22 }}>📺</span>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>Бесплатное золото</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Осталось просмотров сегодня: {watchesLeft}/3</div>
        </div>
      </div>

      {countdown !== null ? (
        <div style={{ textAlign:"center", padding:"12px 0" }}>
          <div style={{ fontSize:36, fontWeight:900, color:"#f5b637", marginBottom:4 }}>{countdown}</div>
          <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Рекламный ролик...</div>
          <div style={{ marginTop:8, height:4, borderRadius:4, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
            <div style={{
              height:"100%", borderRadius:4, background:"#f5b637",
              width:`${((5 - countdown) / 5) * 100}%`,
              transition:"width 1s linear",
            }} />
          </div>
        </div>
      ) : (
        <button
          onClick={startAd}
          disabled={busy}
          style={{
            width:"100%", padding:"10px 16px", borderRadius:10, border:"none",
            background:"linear-gradient(135deg, #f5b637, #fb7878)",
            color:"#0b0e17", fontWeight:800, fontSize:14, cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
          <span>📺</span> Смотреть рекламу <span style={{ background:"rgba(0,0,0,0.15)", borderRadius:6, padding:"1px 8px" }}>+15 монет</span>
        </button>
      )}
    </div>
  );
}
