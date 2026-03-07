import { useState } from "react";
import api from "../../api";

const RiskScoreCard = ({ profileId, initialResult, onScored }) => {
  const [result, setResult] = useState(initialResult || null);
  const [loading, setLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  const recompute = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/api/l2/profile/${profileId}/score`);
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
        <div style={s.emptyIcon}>🎯</div>
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
      val: drivers.exp_penalty,
      desc: "Experience-based risk adjustment",
    },
  ];

  return (
    <div style={s.wrap}>
      {/* Score header */}
      <div style={s.header}>
        <div style={s.scoreCircle(levelColor)}>
          <div style={s.scoreNum(levelColor)}>{score}</div>
          <div style={s.scoreLabel}>/100</div>
        </div>
        <div style={s.headerInfo}>
          <div style={{ ...s.level, color: levelColor }}>{level} RISK</div>
          <div style={s.scoreDesc}>
            You are in the{" "}
            <strong style={{ color: levelColor }}>top {top_pct}%</strong> most
            at-risk workers in your city+role.
          </div>
          {score_delta !== 0 && (
            <div
              style={{
                ...s.delta,
                color: score_delta > 0 ? "#ff4444" : "#4ec9b0",
              }}
            >
              {score_delta > 0 ? "▲" : "▼"} {Math.abs(score_delta)} pts from
              last week
            </div>
          )}
        </div>
        <button style={s.recompBtn} onClick={recompute}>
          Refresh Score
        </button>
      </div>

      {/* Risk drivers */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Risk Drivers</div>
        <div style={s.driversGrid}>
          {driverData.map((d) => (
            <div key={d.label} style={s.driverCard}>
              <div style={s.driverLabel}>{d.label}</div>
              <div
                style={{
                  ...s.driverVal,
                  color:
                    d.val > 50 ? "#ff4444" : d.val > 25 ? "#ff9900" : "#4ec9b0",
                }}
              >
                {d.val}
              </div>
              <div style={s.driverBar}>
                <div
                  style={{
                    ...s.driverFill,
                    width: `${Math.min(d.val, 100)}%`,
                    background:
                      d.val > 50
                        ? "#ff4444"
                        : d.val > 25
                          ? "#ff9900"
                          : "#4ec9b0",
                  }}
                />
              </div>
              <div style={s.driverDesc}>{d.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Market context */}
      {context && (
        <div style={s.section}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={s.sectionTitle}>Live Market Context</div>
            <button
              style={s.evidBtn}
              onClick={() => setShowEvidence(!showEvidence)}
            >
              {showEvidence ? "Hide" : "Show"} Evidence
            </button>
          </div>
          {showEvidence && (
            <div style={s.contextGrid}>
              {[
                { label: "Current Postings", val: context.current_postings },
                {
                  label: "AI Mention Rate",
                  val: `${(context.ai_mention_rate * 100).toFixed(1)}%`,
                },
                {
                  label: "Hiring Trend",
                  val: `${context.hiring_trend > 0 ? "+" : ""}${context.hiring_trend.toFixed(1)}%`,
                },
                { label: "Data Points Used", val: context.data_points },
              ].map((item) => (
                <div key={item.label} style={s.ctxCard}>
                  <div style={s.ctxLabel}>{item.label}</div>
                  <div style={s.ctxVal}>{item.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const s = {
  wrap: {
    background: "#0f0f1a",
    borderRadius: "10px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    padding: "3rem",
    background: "#0f0f1a",
    borderRadius: "10px",
    textAlign: "center",
  },
  emptyIcon: { fontSize: "2.5rem" },
  emptyText: { color: "#fff", fontWeight: 600, fontSize: "1rem" },
  emptySub: { color: "#606080", fontSize: "0.85rem" },
  computeBtn: {
    background: "#e94560",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.7rem 1.5rem",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.9rem",
  },
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    padding: "2rem",
    background: "#0f0f1a",
    borderRadius: "10px",
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
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1.25rem",
    flexWrap: "wrap",
  },
  scoreCircle: (col) => ({
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    border: `4px solid ${col}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: col + "15",
  }),
  scoreNum: (col) => ({
    fontSize: "2rem",
    fontWeight: 800,
    color: col,
    lineHeight: 1,
  }),
  scoreLabel: { fontSize: "0.65rem", color: "#606080" },
  headerInfo: { flex: 1 },
  level: { fontWeight: 800, fontSize: "1.1rem", letterSpacing: "0.05em" },
  scoreDesc: {
    color: "#a0a0b0",
    fontSize: "0.85rem",
    marginTop: "0.3rem",
    lineHeight: 1.4,
  },
  delta: { fontSize: "0.8rem", marginTop: "0.4rem", fontWeight: 600 },
  recompBtn: {
    background: "transparent",
    color: "#e94560",
    border: "1px solid #e94560",
    borderRadius: "6px",
    padding: "0.4rem 0.9rem",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  section: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  sectionTitle: {
    color: "#c0c0d0",
    fontWeight: 700,
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  driversGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
  },
  driverCard: {
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.8rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  driverLabel: { color: "#a0a0b0", fontSize: "0.75rem" },
  driverVal: { fontWeight: 800, fontSize: "1.4rem", lineHeight: 1 },
  driverBar: {
    height: "4px",
    background: "#2a2a4a",
    borderRadius: "2px",
    overflow: "hidden",
  },
  driverFill: { height: "100%", borderRadius: "2px", transition: "width 0.6s" },
  driverDesc: { color: "#606080", fontSize: "0.7rem" },
  evidBtn: {
    background: "transparent",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    cursor: "pointer",
    fontSize: "0.75rem",
  },
  contextGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "0.6rem",
  },
  ctxCard: {
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.6rem",
  },
  ctxLabel: { color: "#606080", fontSize: "0.65rem", marginBottom: "0.2rem" },
  ctxVal: { color: "#fff", fontWeight: 700, fontSize: "0.9rem" },
};

export default RiskScoreCard;
