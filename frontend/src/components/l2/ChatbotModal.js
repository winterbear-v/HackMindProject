import { useState, useRef, useEffect } from "react";
import axios from "axios";

const JUDGE_QUESTIONS = [
  {
    en: "Why is my risk score so high?",
    hi: "मेरा जोखिम स्कोर इतना अधिक क्यों है?",
  },
  {
    en: "What are the best roles for me to transition to?",
    hi: "मेरे लिए सबसे अच्छे करियर विकल्प कौन से हैं?",
  },
  {
    en: "How long will my reskilling take?",
    hi: "मेरी री-स्किलिंग में कितना समय लगेगा?",
  },
  {
    en: "Which free courses should I start with?",
    hi: "मुझे कौन से मुफ्त कोर्स से शुरुआत करनी चाहिए?",
  },
  {
    en: "Is AI replacing my job in the next 2 years?",
    hi: "क्या AI अगले 2 साल में मेरी नौकरी ले लेगा?",
  },
];

const ChatbotModal = ({ profileId, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm your SkillsMirage career advisor. Ask me anything about your risk score, reskilling path, or job market trends. You can also ask in Hindi — मैं हिंदी में भी जवाब दे सकता हूँ।",
      citations: [],
    },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (question) => {
    const q = question || input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await axios.post("/api/l2/chat", {
        profile_id: profileId,
        question: q,
        language,
      });
      const { answer, citations } = res.data.data;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: answer, citations: citations || [] },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text:
            " " +
            (e.response?.data?.message ||
              "Failed to get response. Check ANTHROPIC_API_KEY in .env"),
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
        <div style={c.header}>
          <div>
            <div style={c.headerTitle}>SkillsMirage AI Advisor</div>
            <div style={c.headerSub}>
              Powered by Claude · Context-aware · Bilingual EN/HI
            </div>
          </div>
          <div style={c.headerRight}>
            <div style={c.langToggle}>
              <button
                style={{
                  ...c.langBtn,
                  ...(language === "en" ? c.langActive : {}),
                }}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
              <button
                style={{
                  ...c.langBtn,
                  ...(language === "hi" ? c.langActive : {}),
                }}
                onClick={() => setLanguage("hi")}
              >
                हि
              </button>
            </div>
            <button style={c.closeBtn} onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* Quick question buttons */}
        <div style={c.quickWrap}>
          <div style={c.quickLabel}>Quick questions:</div>
          <div style={c.quickBtns}>
            {JUDGE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                style={c.quickBtn}
                onClick={() => send(language === "hi" ? q.hi : q.en)}
              >
                {language === "hi" ? q.hi : q.en}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div style={c.messages}>
          {messages.map((m, i) => (
            <div
              key={i}
              style={{
                ...c.msgWrap,
                justifyContent: m.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  ...c.bubble,
                  ...(m.role === "user" ? c.userBubble : c.aiBubble),
                }}
              >
                <div style={c.msgText}>{m.text}</div>
                {m.citations?.length > 0 && (
                  <div style={c.citations}>
                    <div style={c.citLabel}>Evidence used:</div>
                    {m.citations.map((cit, ci) => (
                      <div key={ci} style={c.citRow}>
                        <span style={c.citTag}>{cit.id}</span>
                        <span style={c.citText}>
                          {cit.city} — {cit.role} — {cit.date} (
                          {cit.posting_count} postings)
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
              <div style={{ ...c.bubble, ...c.aiBubble }}>
                <div style={c.typing}>
                  <span style={c.dot} />
                  <span style={{ ...c.dot, animationDelay: "0.2s" }} />
                  <span style={{ ...c.dot, animationDelay: "0.4s" }} />
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
              language === "hi"
                ? "अपना सवाल यहाँ लिखें…"
                : "Ask about your risk, career path, or courses…"
            }
            disabled={loading}
          />
          <button
            style={{ ...c.sendBtn, ...(loading ? c.sendDisabled : {}) }}
            onClick={() => send()}
            disabled={loading}
          >
            ➤
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>
    </div>
  );
};

const c = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
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
    maxWidth: "700px",
    maxHeight: "90vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid #2a2a4a",
    flexShrink: 0,
  },
  headerTitle: { color: "#fff", fontWeight: 700, fontSize: "1rem" },
  headerSub: { color: "#606080", fontSize: "0.75rem", marginTop: "0.15rem" },
  headerRight: { display: "flex", gap: "0.5rem", alignItems: "center" },
  langToggle: {
    display: "flex",
    background: "#1a1a2e",
    borderRadius: "6px",
    overflow: "hidden",
    border: "1px solid #2a2a4a",
  },
  langBtn: {
    padding: "0.3rem 0.7rem",
    background: "transparent",
    color: "#a0a0b0",
    border: "none",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  langActive: { background: "#e94560", color: "#fff" },
  closeBtn: {
    background: "transparent",
    color: "#a0a0b0",
    border: "none",
    cursor: "pointer",
    fontSize: "1.1rem",
    padding: "0.2rem 0.4rem",
  },
  quickWrap: {
    padding: "0.75rem 1.25rem",
    borderBottom: "1px solid #2a2a4a",
    flexShrink: 0,
  },
  quickLabel: { color: "#606080", fontSize: "0.72rem", marginBottom: "0.4rem" },
  quickBtns: { display: "flex", gap: "0.4rem", flexWrap: "wrap" },
  quickBtn: {
    background: "#1a1a2e",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.25rem 0.6rem",
    cursor: "pointer",
    fontSize: "0.72rem",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "1rem 1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  msgWrap: { display: "flex" },
  bubble: { maxWidth: "85%", borderRadius: "10px", padding: "0.75rem 1rem" },
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
  msgText: { fontSize: "0.88rem", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  citations: {
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
    display: "inline-block",
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
  sendDisabled: { background: "#555", cursor: "not-allowed" },
};

export default ChatbotModal;
