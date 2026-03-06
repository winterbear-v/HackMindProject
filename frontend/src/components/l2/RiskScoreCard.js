import { useState } from "react";
import axios from "axios";

const RiskScoreCard = ({ profileId, initialResult, onScored }) => {
  const [result, setResult] = useState(initialResult || null);
  const [loading, setLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const recompute = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`/api/l2/profile/${profileId}/score`);
      const r = res.data.data;
      setResult(r);
      onScored && onScored(r);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!result && !loading)
    return (
      <div style={s.empty}>
        <div style={s.emptyIcon}></div>
        <div style={s.emptyText}>Compute your AI displacement risk score</div>
        <div style={s.emptySub}>
          Uses live L1 job market signals for your city and role
        </div>
        <button style={s.computeBtn} onClick={recompute}>
          Analyse My Risk →
        </button>
      </div>
    );

  if (loading)
    return (
      <div style={s.loadingBox}>
        <div style={s.spin} />
        <div>
          <div
            style={{ color: "#fff", fontWeight: 600, marginBottom: "0.25rem" }}
          >
            Computing risk score…
          </div>
          <div style={{ color: "#606080", fontSize: "0.8rem" }}>
            Querying live L1 data for your city + role
          </div>
        </div>
      </div>
    );

  const { score, level, score_delta, top_pct, drivers, context } = result;

  const levelColor =
    score >= 65 ? "#ff4444" : score >= 35 ? "#ff9900" : "#4ec9b0";
  const driverData = [
    {
      label: "Hiring Decline",
      val: drivers.hiring_decline,
      desc: "Job postings falling in your city/role",
    },
    {
      label: "AI in Job Desc",
      val: drivers.ai_mentions,
      desc: "AI/automation tools mentioned in JDs",
    },
    {
      label: "Skill Gap",
      val: drivers.skill_gap,
      desc: "Gap between your skills and market demand",
    },
    {
      label: "Exp. Penalty",
      val: drivers.xp_penalty,
      desc: "Experience curve effect on displacement risk",
    },
  ];

  // SVG gauge
  const R = 54,
    cx = 64,
    cy = 64;
  const circumference = Math.PI * R; // half-circle
  const dashOffset = circumference * (1 - score / 100);
  const gaugeColor = levelColor;

  return (
    <div style={s.card}>
      {/* Top row: gauge + key metrics */}
      <div style={s.topRow}>
        {/* Gauge */}
        <div style={s.gaugeWrap}>
          <svg width="128" height="80" viewBox="0 0 128 80">
            {/* Track */}
            <path
              d={`M 10 70 A ${R} ${R} 0 0 1 118 70`}
              fill="none"
              stroke="#1a1a2e"
              strokeWidth="12"
              strokeLinecap="round"
            />
            {/* Fill */}
            <path
              d={`M 10 70 A ${R} ${R} 0 0 1 118 70`}
              fill="none"
              stroke={gaugeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div style={s.gaugeCenter}>
            <div style={{ ...s.scoreNum, color: gaugeColor }}>{score}</div>
            <div style={s.scoreOf}>/100</div>
          </div>
          <div
            style={{
              ...s.levelBadge,
              background: gaugeColor + "22",
              color: gaugeColor,
              border: `1px solid ${gaugeColor}44`,
            }}
          >
            {level} RISK
          </div>
        </div>

        {/* PPT-spec metrics */}
        <div style={s.metrics}>
          {/* Score trend */}
          <div style={s.metric}>
            <div style={s.mLabel}>vs 30 days ago</div>
            <div
              style={{
                ...s.mVal,
                color:
                  score_delta > 0
                    ? "#ff6b6b"
                    : score_delta < 0
                      ? "#4ec9b0"
                      : "#a0a0b0",
              }}
            >
              {score_delta > 0
                ? `↑ +${score_delta}`
                : score_delta < 0
                  ? `↓ ${score_delta}`
                  : "→ 0"}
            </div>
          </div>
          {/* vs peers */}
          <div style={s.metric}>
            <div style={s.mLabel}>vs peers in {context.city}</div>
            <div
              style={{
                ...s.mVal,
                color:
                  top_pct <= 20
                    ? "#ff6b6b"
                    : top_pct <= 40
                      ? "#ff9900"
                      : "#4ec9b0",
              }}
            >
              top {top_pct}% at‑risk
            </div>
          </div>
          {/* Hiring change */}
          <div style={s.metric}>
            <div style={s.mLabel}>
              {context.role} hiring in {context.city}
            </div>
            <div
              style={{
                ...s.mVal,
                color: context.hiring_change_pct < 0 ? "#ff6b6b" : "#4ec9b0",
              }}
            >
              {context.hiring_change_pct > 0 ? "+" : ""}
              {context.hiring_change_pct}% (30d)
            </div>
          </div>
          {/* AI rate */}
          <div style={s.metric}>
            <div style={s.mLabel}>AI tool mentions in JDs</div>
            <div
              style={{
                ...s.mVal,
                color: context.avg_ai_mention_rate > 20 ? "#ff9900" : "#a0a0b0",
              }}
            >
              +{context.avg_ai_mention_rate}%
            </div>
          </div>
        </div>
      </div>

      {/* Driver bars */}
      <div style={s.driversWrap}>
        <div style={s.driversTitle}>Score breakdown</div>
        {driverData.map((d) => (
          <div key={d.label} style={s.driverRow}>
            <div style={s.driverLabel} title={d.desc}>
              {d.label}
            </div>
            <div style={s.driverTrack}>
              <div
                style={{
                  ...s.driverFill,
                  width: `${d.val}%`,
                  background:
                    d.val >= 65
                      ? "#ff4444"
                      : d.val >= 35
                        ? "#ff9900"
                        : "#4ec9b0",
                }}
              />
            </div>
            <div style={s.driverVal}>{d.val}</div>
          </div>
        ))}
      </div>

      {/* Evidence toggle */}
      <div style={s.evidenceRow}>
        <button
          style={s.evidenceBtn}
          onClick={() => setShowEvidence(!showEvidence)}
        >
          {showEvidence ? "▲" : "▼"} L1 Evidence ({result.evidence?.length || 0}{" "}
          signals)
        </button>
        <button style={s.recomputeBtn} onClick={recompute} disabled={loading}>
          Recompute from live L1
        </button>
      </div>

      {showEvidence && result.evidence?.length > 0 && (
        <div style={s.evidenceList}>
          {result.evidence.map((ev, i) => (
            <div key={i} style={s.evItem}>
              <span style={s.evTag}>EVIDENCE_{i + 1}</span>
              <span style={s.evText}>
                {ev.city} — {ev.role_norm} — {ev.date} &nbsp;|&nbsp;
                {ev.posting_count} postings &nbsp;|&nbsp; AI rate:{" "}
                {(ev.ai_tool_mention_rate * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

const s = {
  card: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.25rem",
  },
  empty: { textAlign: "center", padding: "2.5rem 1rem" },
  emptyIcon: { fontSize: "2.5rem", marginBottom: "0.5rem" },
  emptyText: {
    color: "#fff",
    fontWeight: 600,
    fontSize: "1rem",
    marginBottom: "0.25rem",
  },
  emptySub: { color: "#606080", fontSize: "0.82rem", marginBottom: "1.25rem" },
  computeBtn: {
    background: "#e94560",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.7rem 2rem",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "2rem",
    background: "#0f0f1a",
    borderRadius: "12px",
    border: "1px solid #2a2a4a",
  },
  spin: {
    width: "24px",
    height: "24px",
    border: "3px solid #2a2a4a",
    borderTop: "3px solid #e94560",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  topRow: {
    display: "flex",
    gap: "1.5rem",
    flexWrap: "wrap",
    marginBottom: "1.25rem",
  },
  gaugeWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.25rem",
    flexShrink: 0,
  },
  gaugeCenter: {
    display: "flex",
    alignItems: "baseline",
    gap: "2px",
    marginTop: "-12px",
  },
  scoreNum: { fontSize: "2.5rem", fontWeight: 900, lineHeight: 1 },
  scoreOf: { color: "#606080", fontSize: "0.9rem" },
  levelBadge: {
    padding: "0.2rem 0.75rem",
    borderRadius: "4px",
    fontSize: "0.72rem",
    fontWeight: 700,
    letterSpacing: "0.05em",
  },
  metrics: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.65rem",
  },
  metric: {
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.7rem 0.9rem",
  },
  mLabel: { color: "#606080", fontSize: "0.7rem", marginBottom: "0.2rem" },
  mVal: { fontWeight: 700, fontSize: "0.95rem" },
  driversWrap: { marginBottom: "1rem" },
  driversTitle: {
    color: "#606080",
    fontSize: "0.72rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.65rem",
  },
  driverRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    marginBottom: "0.45rem",
  },
  driverLabel: {
    width: "130px",
    color: "#c0c0d0",
    fontSize: "0.8rem",
    flexShrink: 0,
    cursor: "help",
  },
  driverTrack: {
    flex: 1,
    height: "8px",
    background: "#1a1a2e",
    borderRadius: "4px",
    overflow: "hidden",
  },
  driverFill: {
    height: "100%",
    borderRadius: "4px",
    transition: "width 0.6s ease",
  },
  driverVal: {
    width: "28px",
    color: "#fff",
    fontSize: "0.8rem",
    fontWeight: 600,
    textAlign: "right",
    flexShrink: 0,
  },
  evidenceRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.5rem",
  },
  evidenceBtn: {
    background: "transparent",
    color: "#606080",
    border: "none",
    cursor: "pointer",
    fontSize: "0.78rem",
    padding: "0.2rem 0",
  },
  recomputeBtn: {
    background: "transparent",
    color: "#e94560",
    border: "1px solid #e9456044",
    borderRadius: "6px",
    padding: "0.3rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.78rem",
  },
  evidenceList: {
    marginTop: "0.75rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  evItem: { display: "flex", gap: "0.5rem", alignItems: "flex-start" },
  evTag: {
    color: "#e94560",
    fontSize: "0.7rem",
    fontFamily: "monospace",
    flexShrink: 0,
    paddingTop: "1px",
  },
  evText: { color: "#808090", fontSize: "0.75rem", lineHeight: 1.5 },
};

export default RiskScoreCard;
