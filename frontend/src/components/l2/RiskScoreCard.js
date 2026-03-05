import { useState, useEffect } from "react";
import axios from "axios";

const RiskScoreCard = ({ profileId, onScoreLoaded }) => {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.post(`/api/l2/profile/${profileId}/score`);
        setRisk(res.data.data);
        onScoreLoaded && onScoreLoaded(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [profileId]);

  if (loading) return <div style={r.loading}>Computing risk score…</div>;
  if (!risk) return <div style={r.loading}>Could not compute score.</div>;

  const color =
    risk.score >= 65 ? "#ff4444" : risk.score >= 35 ? "#ff9900" : "#4ec9b0";
  const label = risk.level;
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - risk.score / 100);

  const DRIVER_LABELS = {
    hiring_decline: "Hiring Decline",
    ai_mentions: "AI Mention Rate",
    skill_match: "Skill Gap",
    experience_penalty: "Experience Factor",
  };

  return (
    <div style={r.card}>
      <div style={r.topRow}>
        {/* Circular gauge */}
        <div style={r.gaugeWrap}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle
              cx="65"
              cy="65"
              r="54"
              fill="none"
              stroke="#1a1a2e"
              strokeWidth="12"
            />
            <circle
              cx="65"
              cy="65"
              r="54"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
            <text
              x="65"
              y="60"
              textAnchor="middle"
              fill={color}
              fontSize="26"
              fontWeight="bold"
            >
              {risk.score}
            </text>
            <text
              x="65"
              y="78"
              textAnchor="middle"
              fill="#a0a0b0"
              fontSize="11"
            >
              /100
            </text>
          </svg>
          <div
            style={{
              ...r.levelBadge,
              background: color + "22",
              color,
              border: `1px solid ${color}`,
            }}
          >
            {label} RISK
          </div>
        </div>

        {/* Drivers bar chart */}
        <div style={r.drivers}>
          <div style={r.driversTitle}>Risk Drivers</div>
          {Object.entries(risk.drivers).map(([key, val]) => (
            <div key={key} style={r.driverRow}>
              <div style={r.driverLabel}>{DRIVER_LABELS[key] || key}</div>
              <div style={r.driverBarTrack}>
                <div
                  style={{
                    ...r.driverBar,
                    width: `${val}%`,
                    background:
                      val > 60 ? "#ff4444" : val > 35 ? "#ff9900" : "#4ec9b0",
                  }}
                />
              </div>
              <div style={r.driverVal}>{val.toFixed(0)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Evidence toggle */}
      <button style={r.evidenceBtn} onClick={() => setExpanded(!expanded)}>
        {expanded ? "▲ Hide" : "▼ Show"} L1 Evidence (
        {risk.evidence?.length || 0} docs)
      </button>

      {expanded && risk.evidence?.length > 0 && (
        <div style={r.evidenceBox}>
          {risk.evidence.map((e, i) => (
            <div key={i} style={r.evidenceRow}>
              <span style={r.evidenceTag}>EVIDENCE_{i + 1}</span>
              <span style={r.evidenceText}>
                {e.city} — {e.role_norm} — {e.date} &nbsp;|&nbsp;
                {e.posting_count} postings &nbsp;|&nbsp; AI rate:{" "}
                {(e.ai_tool_mention_rate * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Skills extracted */}
      <div style={r.skillsWrap}>
        <div style={r.skillsTitle}>Skills detected from your writeup:</div>
        <div style={r.chips}>
          {risk.meta?.posting_skills?.map((s) => (
            <span key={s} style={r.chip}>
              {s}
            </span>
          ))}
          {!risk.meta?.posting_skills?.length && (
            <span style={r.noSkills}>
              None detected in job market for your role
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const r = {
  card: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  loading: { color: "#a0a0b0", textAlign: "center", padding: "2rem" },
  topRow: {
    display: "flex",
    gap: "2rem",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "1rem",
  },
  gaugeWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
  },
  levelBadge: {
    padding: "0.25rem 0.8rem",
    borderRadius: "4px",
    fontWeight: 700,
    fontSize: "0.8rem",
    letterSpacing: "0.05em",
  },
  drivers: { flex: 1, minWidth: "200px" },
  driversTitle: {
    color: "#a0a0b0",
    fontSize: "0.82rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
  },
  driverRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.6rem",
  },
  driverLabel: {
    width: "130px",
    fontSize: "0.78rem",
    color: "#c0c0d0",
    flexShrink: 0,
  },
  driverBarTrack: {
    flex: 1,
    height: "8px",
    background: "#1a1a2e",
    borderRadius: "4px",
    overflow: "hidden",
  },
  driverBar: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.8s ease",
  },
  driverVal: {
    width: "28px",
    fontSize: "0.75rem",
    color: "#606080",
    textAlign: "right",
  },
  evidenceBtn: {
    background: "transparent",
    color: "#606080",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.3rem 0.8rem",
    cursor: "pointer",
    fontSize: "0.78rem",
    marginBottom: "0.5rem",
  },
  evidenceBox: {
    background: "#0a0a12",
    borderRadius: "6px",
    padding: "0.75rem",
    marginBottom: "1rem",
  },
  evidenceRow: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "0.4rem",
    alignItems: "flex-start",
  },
  evidenceTag: {
    color: "#e94560",
    fontSize: "0.72rem",
    fontWeight: 700,
    flexShrink: 0,
    fontFamily: "monospace",
  },
  evidenceText: { color: "#a0a0b0", fontSize: "0.75rem" },
  skillsWrap: { marginTop: "0.75rem" },
  skillsTitle: {
    color: "#a0a0b0",
    fontSize: "0.78rem",
    marginBottom: "0.4rem",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  chip: {
    background: "#1a1a2e",
    color: "#4ec9b0",
    border: "1px solid #2a4a3a",
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    fontSize: "0.75rem",
  },
  noSkills: { color: "#606080", fontSize: "0.78rem", fontStyle: "italic" },
};

export default RiskScoreCard;
