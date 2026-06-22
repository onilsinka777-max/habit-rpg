import { useEffect, useState } from "react";
import axios from "axios";
import VoiceInput from "./VoiceInput";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

export default function Journal({ token, showToast }) {
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
  const [entries,   setEntries]   = useState([]);
  const [content,   setContent]   = useState("");
  const [busy,      setBusy]      = useState(false);
  const [selected,  setSelected]  = useState(null); // просмотр записи

  const load = async () => {
    try {
      const res = await axios.get(`${API}/journal`, authHeaders);
      setEntries(res.data);
    } catch(e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!content.trim()) return;
    try {
      setBusy(true);
      await axios.post(`${API}/journal`, { content }, authHeaders);
      setContent("");
      showToast("Запись сохранена", "success");
      await load();
    } catch(e) { showToast(e.response?.data?.message || "Не удалось сохранить", "error"); }
    finally { setBusy(false); }
  };

  return (
    <section className="quest-section">
      <div className="section-eyebrow"><span>📔</span> Личный дневник</div>
      <p className="empty-state" style={{ marginBottom:12 }}>
        Записывай мысли, наблюдения и итоги дня. Записи нельзя изменить — только добавить новые.
      </p>

      {/* Новая запись */}
      <div className="journal-new-block">
        <textarea
          className="journal-textarea"
          placeholder="Что произошло сегодня? Что ты понял, почувствовал, сделал?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          maxLength={5000}
        />
        <div className="journal-footer">
          <VoiceInput onResult={text => setContent(prev => prev + text)} />
          <span className="journal-count">{content.length}/5000</span>
          <button className="btn btn-primary btn-sm" disabled={busy || !content.trim()} onClick={save}>
            {busy ? "..." : "Сохранить запись"}
          </button>
        </div>
      </div>

      {/* Список записей */}
      {entries.length === 0 ? (
        <p className="empty-state">Записей пока нет — добавь первую выше.</p>
      ) : (
        <div className="journal-list">
          {entries.map((e) => (
            <div key={e.id} className="journal-entry" onClick={() => setSelected(e)}>
              <p className="journal-entry-date">{formatDate(e.createdAt)}</p>
              <p className="journal-entry-preview">
                {e.content.length > 120 ? e.content.slice(0,120) + "..." : e.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Модалка просмотра записи */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" style={{ maxHeight:"80vh", overflowY:"auto" }} onClick={(ev) => ev.stopPropagation()}>
            <p className="modal-eyebrow">{formatDate(selected.createdAt)}</p>
            <p style={{ whiteSpace:"pre-wrap", lineHeight:1.6, color:"rgba(255,255,255,0.85)", margin:0 }}>
              {selected.content}
            </p>
            <button className="btn btn-ghost" style={{ marginTop:16 }} onClick={() => setSelected(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </section>
  );
}