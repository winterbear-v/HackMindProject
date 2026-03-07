import { useState, useEffect } from "react";
import api from "../../api";

const CITIES = [
  "Bangalore",
  "Mumbai",
  "Delhi",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Jaipur",
  "Ahmedabad",
  "Noida",
  "Indore",
  "Nagpur",
];

const EmployerGap = () => {
  const [data, setData] = useState([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(new Set());

  const toggleExpand = (i) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const load = async () => {
    setLoading(true);
    try {
      const p = city ? `?city=${city}` : "";
      const res = await api.get(`/api/l1/employer-gap${p}`);
      // Sort data by highest gap score first to ensure the top 8 are the most critical
      const sortedData = res.data.data.sort(
        (a, b) => b.gap_score - a.gap_score,
      );
      setData(sortedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [city]);

  const gapColor = (g) =>
    g >= 60 ? "#ff4444" : g >= 40 ? "#ff9900" : g >= 20 ? "#f0d000" : "#4ec9b0";

  return (
    <div style={e.container}>
      {/* Header */}
      <div style={e.header}>
        <div>
          <div style={e.title}>Employer-Side View</div>
          <div style={e.sub}>Supply vs Demand gap — Top Critical Shortages</div>
        </div>
        <select
          style={e.sel}
          value={city}
          onChange={(ev) => setCity(ev.target.value)}
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={e.center}>
          <div style={e.spin} />
        </div>
      )}

      {!loading && data.length === 0 && (
        <div style={e.empty}>
          <div style={{ fontSize: "2rem" }}></div>
          <div
            style={{
              color: "#fff",
              fontWeight: 600,
              margin: "0.5rem 0 0.25rem",
            }}
          >
            No employer data yet
          </div>
          <div style={{ color: "#606080", fontSize: "0.85rem" }}>
            Run the scraper first
          </div>
        </div>
      )}

      {!loading && data.length > 0 && (
        <>
          {/* Summary KPIs - Compacted */}
          <div style={e.kpis}>
            <div style={e.kpi}>
              <div style={e.kL}>Total Roles Reviewed</div>
              <div style={e.kV}>{data.length}</div>
            </div>
            <div style={e.kpi}>
              <div style={e.kL}>Avg Skill Gap</div>
              <div style={{ ...e.kV, color: "#ff9900" }}>
                {Math.round(
                  data.reduce((s, d) => s + d.gap_score, 0) / data.length,
                )}
                %
              </div>
            </div>
            <div style={e.kpi}>
              <div style={e.kL}>Critical Gaps (≥60%)</div>
              <div style={{ ...e.kV, color: "#ff4444" }}>
                {data.filter((d) => d.gap_score >= 60).length}
              </div>
            </div>
            <div style={e.kpi}>
              <div style={e.kL}>Well Covered (≤20%)</div>
              <div style={{ ...e.kV, color: "#4ec9b0" }}>
                {data.filter((d) => d.gap_score <= 20).length}
              </div>
            </div>
          </div>

          {/* Gap cards - Limited to Top 8 for single-page view */}
          <div style={e.grid}>
            {data.slice(0, 8).map((row, i) => {
              const col = gapColor(row.gap_score);
              const isExpanded = expanded.has(i);
              return (
                <div
                  key={i}
                  style={{
                    ...e.card,
                    borderTop: `3px solid ${col}`,
                    cursor: "pointer",
                  }}
                  onClick={() => toggleExpand(i)}
                >
                  <div style={e.cardHdr}>
                    <div>
                      <div style={e.cardCity}>{row.city}</div>
                      <div style={e.cardRole}>{row.role}</div>
                    </div>
                    <div style={e.gapBadge}>
                      <div style={{ ...e.gapVal, color: col }}>
                        {row.gap_score}%
                      </div>
                      <div style={e.gapLabel}>GAP</div>
                    </div>
                  </div>

                  <div style={e.skillSection}>
                    <div
                      style={{
                        ...e.sLabel,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>Employers want</span>
                      {row.top_demanded_skills.length > 4 && (
                        <span
                          style={{
                            color: "#606080",
                            fontSize: "0.6rem",
                            fontWeight: 600,
                          }}
                        >
                          {isExpanded
                            ? "▲ less"
                            : `+${row.top_demanded_skills.length - 4} more ▼`}
                        </span>
                      )}
                    </div>
                    <div style={e.chips}>
                      {(isExpanded
                        ? row.top_demanded_skills
                        : row.top_demanded_skills.slice(0, 4)
                      ).map((sk) => {
                        const covered = row.pmkvy_covered.includes(sk);
                        return (
                          <span
                            key={sk}
                            style={{
                              ...e.chip,
                              background: covered ? "#1a3a2a" : "#3a1a1a",
                              color: covered ? "#4ec9b0" : "#ff9900",
                              border: `1px solid ${covered ? "#2a4a3a" : "#4a2a1a"}`,
                            }}
                          >
                            {covered ? "✓ " : ""}
                            {sk}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {row.skill_gap.length > 0 && (
                    <div style={e.skillSection}>
                      <div
                        style={{
                          ...e.sLabel,
                          color: "#ff9900",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>⚠️ Missing in Training</span>
                        {row.skill_gap.length > 3 && (
                          <span
                            style={{
                              color: "#606080",
                              fontSize: "0.6rem",
                              fontWeight: 600,
                            }}
                          >
                            {isExpanded
                              ? ""
                              : `+${row.skill_gap.length - 3} more`}
                          </span>
                        )}
                      </div>
                      <div style={e.chips}>
                        {(isExpanded
                          ? row.skill_gap
                          : row.skill_gap.slice(0, 3)
                        ).map((sk) => (
                          <span
                            key={sk}
                            style={{
                              ...e.chip,
                              background: "#1a1a2e",
                              color: "#a0a0b0",
                              border: "1px solid #2a2a4a",
                            }}
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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

// Optimized CSS Object
const e = {
  container: { height: "100%", display: "flex", flexDirection: "column" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    flexShrink: 0,
  },
  title: { color: "#fff", fontWeight: 700, fontSize: "1.1rem" },
  sub: { color: "#606080", fontSize: "0.8rem", marginTop: "0.1rem" },
  sel: {
    background: "#0f0f1a",
    color: "#fff",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.4rem 0.75rem",
    fontSize: "0.85rem",
  },
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
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "0.75rem",
    marginBottom: "1rem",
    flexShrink: 0,
  },
  kpi: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.6rem 0.8rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  kL: {
    color: "#606080",
    fontSize: "0.65rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "0.2rem",
  },
  kV: { color: "#fff", fontSize: "1.3rem", fontWeight: 800, lineHeight: 1 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "0.75rem",
    overflowY: "auto",
    alignItems: "start",
  },
  card: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.8rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  cardHdr: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardCity: { color: "#fff", fontWeight: 700, fontSize: "0.9rem" },
  cardRole: { color: "#a0a0b0", fontSize: "0.75rem", marginTop: "0.1rem" },
  gapBadge: { textAlign: "right" },
  gapVal: { fontWeight: 800, fontSize: "1.2rem", lineHeight: 1 },
  gapLabel: {
    color: "#606080",
    fontSize: "0.6rem",
    textTransform: "uppercase",
    marginTop: "2px",
  },
  skillSection: { display: "flex", flexDirection: "column", gap: "0.25rem" },
  sLabel: { color: "#606080", fontSize: "0.65rem", fontWeight: 600 },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.25rem" },
  chip: {
    borderRadius: "4px",
    padding: "0.15rem 0.4rem",
    fontSize: "0.7rem",
    whiteSpace: "nowrap",
  },
};

export default EmployerGap;
