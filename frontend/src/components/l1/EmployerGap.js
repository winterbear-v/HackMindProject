import { useState, useEffect } from "react";
import axios from "axios";

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

  const load = async () => {
    setLoading(true);
    try {
      const p = city ? `?city=${city}` : "";
      const res = await axios.get(`/api/l1/employer-gap${p}`);
      setData(res.data.data);
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
    <div>
      <div style={e.header}>
        <div>
          <div style={e.title}>🏢 Employer-Side View</div>
          <div style={e.sub}>
            Supply vs Demand gap — what's being hired vs what PMKVY/SWAYAM
            trains for
          </div>
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
          <div style={{ fontSize: "2rem" }}>🏢</div>
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
          {/* Summary KPIs */}
          <div style={e.kpis}>
            <div style={e.kpi}>
              <div style={e.kL}>Total Role × City pairs</div>
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

          {/* Gap cards */}
          <div style={e.grid}>
            {data.slice(0, 20).map((row, i) => {
              const col = gapColor(row.gap_score);
              return (
                <div
                  key={i}
                  style={{ ...e.card, borderTop: `3px solid ${col}` }}
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
                      <div style={e.gapLabel}>gap</div>
                    </div>
                  </div>

                  {/* Demand skills */}
                  <div style={e.skillSection}>
                    <div style={e.sLabel}>📋 Employers want</div>
                    <div style={e.chips}>
                      {row.top_demanded_skills.map((sk) => {
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

                  {/* Gap skills */}
                  {row.skill_gap.length > 0 && (
                    <div style={e.skillSection}>
                      <div style={{ ...e.sLabel, color: "#ff9900" }}>
                        ⚠️ Not trained by PMKVY/SWAYAM
                      </div>
                      <div style={e.chips}>
                        {row.skill_gap.map((sk) => (
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

                  {/* Gap bar */}
                  <div style={e.barRow}>
                    <div style={e.barTrack}>
                      <div
                        style={{
                          ...e.barFill,
                          width: `${row.gap_score}%`,
                          background: col,
                        }}
                      />
                    </div>
                    <span style={{ ...e.barPct, color: col }}>
                      {row.gap_score}%
                    </span>
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

const e = {
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
  sel: {
    background: "#0f0f1a",
    color: "#fff",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.42rem 0.75rem",
    fontSize: "0.87rem",
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
  kL: {
    color: "#606080",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "0.2rem",
  },
  kV: { color: "#fff", fontSize: "1.55rem", fontWeight: 800, lineHeight: 1 },
  grid: {
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
  cardHdr: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "0.9rem",
  },
  cardCity: { color: "#fff", fontWeight: 700, fontSize: "0.92rem" },
  cardRole: { color: "#a0a0b0", fontSize: "0.78rem", marginTop: "0.1rem" },
  gapBadge: { textAlign: "center" },
  gapVal: { fontWeight: 800, fontSize: "1.3rem", lineHeight: 1 },
  gapLabel: { color: "#606080", fontSize: "0.68rem" },
  skillSection: { marginBottom: "0.65rem" },
  sLabel: {
    color: "#606080",
    fontSize: "0.7rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.3rem" },
  chip: { borderRadius: "4px", padding: "0.18rem 0.5rem", fontSize: "0.73rem" },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.75rem",
  },
  barTrack: {
    flex: 1,
    height: "6px",
    background: "#1a1a2e",
    borderRadius: "3px",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: "3px", transition: "width 0.4s" },
  barPct: {
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
    width: "32px",
    textAlign: "right",
  },
};

export default EmployerGap;
