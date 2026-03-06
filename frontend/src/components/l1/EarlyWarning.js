import { useState, useEffect } from "react";
import axios from "axios";

const EarlyWarning = () => {
  const [data, setData] = useState(null);
  const [threshold, setThreshold] = useState(15);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/l1/early-warning?threshold=${threshold}`,
      );
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [threshold]);

  const severityColor = (s) =>
    s === "CRITICAL" ? "#ff4444" : s === "HIGH" ? "#ff9900" : "#f0d000";

  return (
    <div>
      <div style={w.header}>
        <div>
          <div style={w.title}>🚨 Early Warning Watchlist</div>
          <div style={w.sub}>
            Roles where hiring is declining fast — before layoffs begin
          </div>
        </div>
        <div style={w.thresholdRow}>
          <span style={w.thLabel}>Min decline:</span>
          {[10, 15, 20, 30].map((t) => (
            <button
              key={t}
              style={{ ...w.tBtn, ...(threshold === t ? w.tOn : {}) }}
              onClick={() => setThreshold(t)}
            >
              {t}%
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={w.center}>
          <div style={w.spin} />
        </div>
      )}

      {!loading && data && data.warnings.length === 0 && (
        <div style={w.empty}>
          <div style={{ fontSize: "2rem" }}>✅</div>
          <div
            style={{
              color: "#4ec9b0",
              fontWeight: 600,
              margin: "0.5rem 0 0.25rem",
            }}
          >
            No critical warnings
          </div>
          <div style={{ color: "#606080", fontSize: "0.85rem" }}>
            No city×role combination has declined more than {threshold}% this
            week
          </div>
        </div>
      )}

      {!loading && data && data.warnings.length > 0 && (
        <>
          <div style={w.kpis}>
            {["CRITICAL", "HIGH", "WATCH"].map((sev) => {
              const count = data.warnings.filter(
                (w) => w.severity === sev,
              ).length;
              return (
                <div
                  key={sev}
                  style={{ ...w.kpi, borderColor: severityColor(sev) + "66" }}
                >
                  <div style={{ ...w.kpiLabel, color: severityColor(sev) }}>
                    {sev}
                  </div>
                  <div style={{ ...w.kpiVal, color: severityColor(sev) }}>
                    {count}
                  </div>
                  <div style={w.kpiSub}>
                    {sev === "CRITICAL"
                      ? "≥30% decline"
                      : sev === "HIGH"
                        ? "≥20% decline"
                        : "≥threshold"}
                  </div>
                </div>
              );
            })}
            <div style={w.kpi}>
              <div style={w.kpiLabel}>Total Flagged</div>
              <div style={{ ...w.kpiVal, color: "#fff" }}>
                {data.warnings.length}
              </div>
              <div style={w.kpiSub}>city × role pairs</div>
            </div>
          </div>

          <div style={w.cards}>
            {data.warnings.map((warn, i) => {
              const col = severityColor(warn.severity);
              return (
                <div
                  key={i}
                  style={{ ...w.card, borderLeft: `4px solid ${col}` }}
                >
                  <div style={w.cardTop}>
                    <div>
                      <div style={w.cardCity}>{warn.city}</div>
                      <div style={w.cardRole}>{warn.role}</div>
                    </div>
                    <div
                      style={{
                        ...w.badge,
                        background: col + "22",
                        color: col,
                        border: `1px solid ${col}44`,
                      }}
                    >
                      {warn.severity}
                    </div>
                  </div>
                  <div style={w.stats}>
                    <div style={w.stat}>
                      <div style={{ ...w.statVal, color: "#ff6b6b" }}>
                        ▼ {warn.decline_pct}%
                      </div>
                      <div style={w.statLabel}>weekly decline</div>
                    </div>
                    <div style={w.stat}>
                      <div style={w.statVal}>{warn.curr_postings}</div>
                      <div style={w.statLabel}>current postings</div>
                    </div>
                    <div style={w.stat}>
                      <div style={w.statVal}>{warn.prev_postings}</div>
                      <div style={w.statLabel}>last week</div>
                    </div>
                    <div style={w.stat}>
                      <div
                        style={{
                          ...w.statVal,
                          color: warn.ai_rate > 20 ? "#ff9900" : "#a0a0b0",
                        }}
                      >
                        {warn.ai_rate}%
                      </div>
                      <div style={w.statLabel}>AI mention rate</div>
                    </div>
                  </div>
                  <div style={w.action}>
                    ⚡ Workers in <b style={{ color: "#fff" }}>{warn.role}</b>{" "}
                    in <b style={{ color: "#fff" }}>{warn.city}</b> should start
                    reskilling now.
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

const w = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "0.75rem",
    marginBottom: "1.25rem",
  },
  title: { color: "#fff", fontWeight: 700, fontSize: "1rem" },
  sub: { color: "#606080", fontSize: "0.78rem", marginTop: "0.2rem" },
  thresholdRow: { display: "flex", alignItems: "center", gap: "0.35rem" },
  thLabel: { color: "#606080", fontSize: "0.78rem" },
  tBtn: {
    background: "#0f0f1a",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.28rem 0.6rem",
    cursor: "pointer",
    fontSize: "0.78rem",
  },
  tOn: { background: "#e94560", color: "#fff", border: "1px solid #e94560" },
  center: { display: "flex", justifyContent: "center", padding: "3rem" },
  spin: {
    width: "20px",
    height: "20px",
    border: "2px solid #2a2a4a",
    borderTop: "2px solid #e94560",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  empty: {
    textAlign: "center",
    padding: "3rem",
    background: "#0f0f1a",
    border: "1px dashed #2a2a4a",
    borderRadius: "10px",
  },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
    gap: "0.65rem",
    marginBottom: "1.25rem",
  },
  kpi: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "10px",
    padding: "0.85rem 1rem",
  },
  kpiLabel: {
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "0.2rem",
    color: "#606080",
  },
  kpiVal: {
    fontSize: "1.6rem",
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: "0.2rem",
  },
  kpiSub: { color: "#606080", fontSize: "0.7rem" },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
    gap: "0.75rem",
  },
  card: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "10px",
    padding: "1.1rem",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.75rem",
  },
  cardCity: { color: "#fff", fontWeight: 700, fontSize: "0.95rem" },
  cardRole: { color: "#a0a0b0", fontSize: "0.8rem", marginTop: "0.1rem" },
  badge: {
    padding: "0.2rem 0.55rem",
    borderRadius: "4px",
    fontSize: "0.72rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "0.5rem",
    marginBottom: "0.75rem",
  },
  stat: { textAlign: "center" },
  statVal: { color: "#fff", fontWeight: 700, fontSize: "0.9rem" },
  statLabel: { color: "#606080", fontSize: "0.68rem", marginTop: "0.1rem" },
  action: {
    background: "#1a1a2e",
    borderRadius: "6px",
    padding: "0.5rem 0.75rem",
    color: "#a0a0b0",
    fontSize: "0.78rem",
    lineHeight: 1.5,
  },
};

export default EarlyWarning;
