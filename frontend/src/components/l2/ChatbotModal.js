import { useState, useRef, useEffect } from "react";
import axios from "axios";

// All 5 required question types from the PPT spec
const QUESTIONS = {
  en: [
    {
      label: "Why high risk?",
      text: "Why is my risk score so high? Cite specific signals.",
    },
    {
      label: "Safer jobs for me",
      text: "What jobs are safer for someone like me in my city?",
    },
    {
      label: "Paths < 3 months",
      text: "Show me reskilling paths that take less than 3 months.",
    },
    {
      label: "Live job count",
      text: "How many BPO jobs are available in my city right now?",
    },
    {
      label: "NPTEL recognition",
      text: "Is an NPTEL certification recognised by employers in India?",
    },
  ],
  hi: [
    {
      label: "जोखिम क्यों अधिक?",
      text: "मेरा जोखिम स्कोर इतना अधिक क्यों है?",
    },
    {
      label: "मेरे लिए सुरक्षित काम",
      text: "मेरे जैसे व्यक्ति के लिए कौन सी नौकरियाँ सुरक्षित हैं?",
    },
    {
      label: "3 महीने से कम रास्ता",
      text: "3 महीने से कम समय में कौन से रास्ते हैं?",
    },
    { label: "अभी नौकरियाँ", text: "मेरे शहर में अभी कितनी BPO नौकरियाँ हैं?" },
    { label: "कहाँ से शुरू करूँ?", text: "मुझे कहाँ से शुरू करना चाहिए?" },
  ],
};

const ChatbotModal = ({ profileId, onClose }) => {
  const [msgs, setMsgs] = useState([
    {
      role: "assistant",
      text: "👋 Hello! I'm your SkillsMirage AI Advisor — powered by live job market data.\n\nAsk me anything about your risk score, safer career options, reskilling paths, or live job counts.\n\nमैं हिंदी में भी जवाब दे सकता हूँ — बस हिंदी में पूछें।",
      citations: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (q) => {
    const question = q || input.trim();
    if (!question || loading) return;
    setInput("");
    setMsgs((p) => [...p, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res = await axios.post("/api/l2/chat", {
        profile_id: profileId,
        question,
        language: lang,
      });
      const { answer, citations } = res.data.data;
      setMsgs((p) => [
        ...p,
        { role: "assistant", text: answer, citations: citations || [] },
      ]);
    } catch (e) {
      setMsgs((p) => [
        ...p,
        {
          role: "assistant",
          text:
            "❌ " +
            (e.response?.data?.message ||
              "API error. Check GROQ_API_KEY or ANTHROPIC_API_KEY in backend/.env"),
          citations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={c.overlay}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={c.modal}>
        {/* Header */}
        <div style={c.hdr}>
          <div>
            <div style={c.hdrTitle}>🤖 SkillsMirage AI Advisor</div>
            <div style={c.hdrSub}>
              Live L1 data · 5 question types · EN + HI
            </div>
          </div>
          <div style={c.hdrRight}>
            <div style={c.langToggle}>
              <button
                style={{ ...c.langBtn, ...(lang === "en" ? c.langOn : {}) }}
                onClick={() => setLang("en")}
              >
                EN
              </button>
              <button
                style={{ ...c.langBtn, ...(lang === "hi" ? c.langOn : {}) }}
                onClick={() => setLang("hi")}
              >
                हि
              </button>
            </div>
            <button style={c.closeBtn} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* 5 Quick Questions */}
        <div style={c.quickWrap}>
          <div style={c.quickLabel}>
            {lang === "hi" ? "त्वरित प्रश्न:" : "5 Question types (PPT spec):"}
          </div>
          <div style={c.quickRow}>
            {QUESTIONS[lang].map((q, i) => (
              <button key={i} style={c.qBtn} onClick={() => send(q.text)}>
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={c.msgs}>
          {msgs.map((m, i) => (
            <div
              key={i}
              style={{
                ...c.msgWrap,
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {m.role === "assistant" && <div style={c.avatar}>AI</div>}
              <div
                style={{
                  ...c.bubble,
                  ...(m.role === "user" ? c.userBubble : c.aiBubble),
                }}
              >
                <div style={c.msgText}>{m.text}</div>
                {m.citations?.length > 0 && (
                  <div style={c.cits}>
                    <div style={c.citLabel}>📊 L1 Evidence cited:</div>
                    {m.citations.map((ct, ci) => (
                      <div key={ci} style={c.citRow}>
                        <span style={c.citTag}>{ct.id}</span>
                        <span style={c.citText}>
                          {ct.city} — {ct.role} — {ct.date} ({ct.posting_count}{" "}
                          postings)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...c.msgWrap, justifyContent: "flex-start" }}>
              <div style={c.avatar}>AI</div>
              <div style={{ ...c.bubble, ...c.aiBubble }}>
                <div style={c.typing}>
                  {[0, 0.2, 0.4].map((d, i) => (
                    <div
                      key={i}
                      style={{ ...c.dot, animationDelay: `${d}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={c.inputRow}>
          <input
            style={c.input}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={
              lang === "hi"
                ? "हिंदी या English में पूछें…"
                : "Ask about risk, jobs, courses, or salary…"
            }
            disabled={loading}
          />
          <button
            style={{ ...c.sendBtn, ...(loading ? c.sendOff : {}) }}
            onClick={() => send()}
            disabled={loading}
          >
            ➤
          </button>
        </div>
      </div>
      <style>{`
        @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}
      `}</style>
    </div>
  );
};

const c = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1rem",
  },
  modal: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "14px",
    width: "100%",
    maxWidth: "720px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  hdr: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #2a2a4a",
    flexShrink: 0,
  },
  hdrTitle: { color: "#fff", fontWeight: 700, fontSize: "1rem" },
  hdrSub: { color: "#606080", fontSize: "0.72rem", marginTop: "0.15rem" },
  hdrRight: { display: "flex", gap: "0.5rem", alignItems: "center" },
  langToggle: {
    display: "flex",
    background: "#1a1a2e",
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid #2a2a4a",
  },
  langBtn: {
    padding: "0.3rem 0.75rem",
    background: "transparent",
    color: "#a0a0b0",
    border: "none",
    cursor: "pointer",
    fontSize: "0.82rem",
  },
  langOn: { background: "#e94560", color: "#fff" },
  closeBtn: {
    background: "transparent",
    color: "#a0a0b0",
    border: "none",
    cursor: "pointer",
    fontSize: "1.1rem",
    padding: "0.2rem 0.4rem",
  },
  quickWrap: {
    padding: "0.65rem 1.25rem",
    borderBottom: "1px solid #2a2a4a",
    flexShrink: 0,
  },
  quickLabel: { color: "#606080", fontSize: "0.7rem", marginBottom: "0.4rem" },
  quickRow: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  qBtn: {
    background: "#1a1a2e",
    color: "#c0c0d0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.25rem 0.65rem",
    cursor: "pointer",
    fontSize: "0.73rem",
    transition: "all 0.15s",
  },
  msgs: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  msgWrap: { display: "flex", gap: "0.5rem", alignItems: "flex-end" },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#e94560",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  bubble: { maxWidth: "82%", borderRadius: "10px", padding: "0.75rem 1rem" },
  userBubble: {
    background: "#e94560",
    color: "#fff",
    borderBottomRightRadius: "2px",
  },
  aiBubble: {
    background: "#1a1a2e",
    color: "#c0c0d0",
    borderBottomLeftRadius: "2px",
    border: "1px solid #2a2a4a",
  },
  msgText: { fontSize: "0.875rem", lineHeight: 1.65, whiteSpace: "pre-wrap" },
  cits: {
    marginTop: "0.6rem",
    paddingTop: "0.5rem",
    borderTop: "1px solid #2a2a4a",
  },
  citLabel: { color: "#606080", fontSize: "0.68rem", marginBottom: "0.3rem" },
  citRow: { display: "flex", gap: "0.4rem", marginBottom: "0.2rem" },
  citTag: {
    color: "#e94560",
    fontSize: "0.68rem",
    fontFamily: "monospace",
    flexShrink: 0,
  },
  citText: { color: "#808090", fontSize: "0.68rem" },
  typing: { display: "flex", gap: "4px", padding: "0.2rem 0" },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#e94560",
    animation: "bounce 1.2s infinite ease-in-out",
  },
  inputRow: {
    display: "flex",
    gap: "0.5rem",
    padding: "0.75rem 1.25rem",
    borderTop: "1px solid #2a2a4a",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: "#1a1a2e",
    color: "#fff",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.6rem 0.9rem",
    fontSize: "0.9rem",
  },
  sendBtn: {
    background: "#e94560",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.6rem 1rem",
    cursor: "pointer",
    fontSize: "1rem",
  },
  sendOff: { background: "#555", cursor: "not-allowed" },
};

export default ChatbotModal;
