import { useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function NicknameModal({ token, onDone }) {
  const [name,  setName]  = useState("");
  const [error, setError] = useState("");
  const [busy,  setBusy]  = useState(false);

  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const save = async () => {
    if (!name.trim()) return;
    try {
      setBusy(true);
      setError("");
      await axios.patch(`${API}/me`, { name }, authHeaders);
      onDone(name.trim());
    } catch (e) {
      setError(e.response?.data?.message || "Ошибка");
    } finally { setBusy(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 8 }}>⚔️</div>
        <p className="modal-eyebrow">Добро пожаловать</p>
        <h3 className="modal-title">Как тебя зовут, герой?</h3>
        <p className="modal-text">
          Придумай уникальный ник — под ним тебя будут знать в этом мире.
          Сменить его можно только один раз за «Свиток прошлого».
        </p>
        <input
          className="input"
          placeholder="Твой ник"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={30}
          autoFocus
          onKeyDown={e => e.key === "Enter" && save()}
        />
        {error && <p style={{ color:"#f87171", fontSize:13, margin:"6px 0 0" }}>{error}</p>}
        <button
          className="btn btn-primary"
          style={{ marginTop:16, width:"100%" }}
          disabled={busy || !name.trim()}
          onClick={save}
        >
          {busy ? "..." : "Начать приключение →"}
        </button>
      </div>
    </div>
  );
}