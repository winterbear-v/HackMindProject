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
];
const ROLES = [
  "Data Entry",
  "BPO",
  "Data Analyst",
  "Software Engineer",
  "Customer Support",
  "Content Writer",
  "HR Executive",
  "Accountant",
  "Sales Executive",
  "Digital Marketing",
];
const WINDOWS = [7, 30, 90, 365];
const COLORS = [
  "#e94560",
  "#4ec9b0",
  "#f0a500",
  "#a78bfa",
  "#34d399",
  "#f87171",
  "#60a5fa",
  "#fb923c",
  "#e879f9",
  "#94a3b8",
];

const TrendsTab = () => {
  const [city, setCity] = useState("");
  const [role, setRole] = useState("");
  const [win, setWin] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [view, setView] = useState("bar"); // 'bar' | 'table'

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ window: win });
      if (city) p.append("city", city);
      if (role) p.append("role", role);
      const res = await axios.get(`/api/l1/trends?${p}`);
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [city, role, win]);

  const pctColor = (v) => (v < 0 ? "#ff6b6b" : v > 0 ? "#4ec9b0" : "#a0a0b0");

  // Derive sorted series — each entry = { label, total, latest, aiRate, pts }
  const allSeries = data
    ? Object.entries(data.series)
        .map(([label, pts], i) => ({
          label,
          pts,
          color: COLORS[i % COLORS.length],
          total: pts.reduce((s, p) => s + p.count, 0),
          latest: pts[pts.length - 1]?.count ?? 0,
          aiRate: pts.length
            ? (
                (pts.reduce((s, p) => s + p.ai_rate, 0) / pts.length) *
                100
              ).toFixed(1)
            : 0,
        }))
        .sort((a, b) => b.total - a.total)
    : [];

  const maxTotal = allSeries.length ? allSeries[0].total : 1;

  return (
    <div>
      {/* ── Filters bar ── */}
      <div style={s.row}>
        <select
          style={s.sel}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          style={s.sel}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <div style={s.winRow}>
          {WINDOWS.map((w) => (
            <button
              key={w}
              style={{ ...s.wBtn, ...(win === w ? s.wOn : {}) }}
              onClick={() => setWin(w)}
            >
              {w}d
            </button>
          ))}
        </div>
        <div style={{ ...s.winRow, marginLeft: "auto" }}>
          <button
            style={{ ...s.wBtn, ...(view === "bar" ? s.wOn : {}) }}
            onClick={() => setView("bar")}
          >
            📊 Chart
          </button>
          <button
            style={{ ...s.wBtn, ...(view === "table" ? s.wOn : {}) }}
            onClick={() => setView("table")}
          >
            📋 Table
          </button>
        </div>
        <button style={s.refresh} onClick={load}>
          ↻
        </button>
      </div>

      {/* ── KPI cards ── */}
      {data && (
        <div style={s.kpis}>
          {[
            {
              label: "Total Postings",
              val: data.current_total.toLocaleString(),
              sub: `last ${win} days`,
            },
            {
              label: "Previous Period",
              val: data.previous_total.toLocaleString(),
              sub: `prior ${win} days`,
            },
            {
              label: "Trend",
              val: `${data.pct_change > 0 ? "▲ +" : data.pct_change < 0 ? "▼ " : ""}${data.pct_change}%`,
              sub: "vs previous period",
              color: pctColor(data.pct_change),
            },
            {
              label: "Series",
              val: allSeries.length,
              sub: "city × role pairs",
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{ ...s.kpi, ...(k.color ? { borderColor: k.color } : {}) }}
            >
              <div style={s.kpiL}>{k.label}</div>
              <div
                style={{ ...s.kpiV, ...(k.color ? { color: k.color } : {}) }}
              >
                {k.val}
              </div>
              <div style={s.kpiS}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={s.center}>
          <div style={s.spin} />
          <span style={{ color: "#a0a0b0", marginLeft: "0.75rem" }}>
            Loading…
          </span>
        </div>
      )}

      {!loading && allSeries.length === 0 && data && (
        <div style={s.empty}>
          <div style={{ fontSize: "2.5rem" }}>📡</div>
          <div
            style={{
              color: "#fff",
              fontWeight: 600,
              margin: "0.5rem 0 0.25rem",
            }}
          >
            No trend data yet
          </div>
          <div style={{ color: "#606080", fontSize: "0.85rem" }}>
            Go to ⚙️ Admin tab → Start Scraper
          </div>
        </div>
      )}

      {!loading && allSeries.length > 0 && (
        <>
          {/* ── BAR CHART VIEW ── */}
          {view === "bar" && (
            <div style={s.card}>
              <div style={s.cardHdr}>
                <span style={s.cardTitle}>📊 Job Postings by City × Role</span>
                <span style={s.cardNote}>Hover bars for details</span>
              </div>

              {/* Horizontal bar chart — one bar per series */}
              <div style={s.barChart}>
                {allSeries.map((sr, i) => {
                  const pct = Math.max((sr.total / maxTotal) * 100, 1);
                  const isH = hovered === sr.label;
                  return (
                    <div
                      key={sr.label}
                      style={s.barRow}
                      onMouseEnter={() => setHovered(sr.label)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      {/* Label */}
                      <div style={s.barLabel} title={sr.label}>
                        <span style={{ ...s.dot, background: sr.color }} />
                        <span
                          style={{
                            color: isH ? "#fff" : "#c0c0d0",
                            transition: "color 0.15s",
                          }}
                        >
                          {sr.label}
                        </span>
                      </div>
                      {/* Bar track */}
                      <div style={s.track}>
                        <div
                          style={{
                            ...s.fill,
                            width: `${pct}%`,
                            background: isH ? sr.color : sr.color + "99",
                            boxShadow: isH ? `0 0 10px ${sr.color}66` : "none",
                            transition: "all 0.2s",
                          }}
                          onMouseEnter={(e) =>
                            setTooltip({ x: e.clientX, y: e.clientY, ...sr })
                          }
                          onMouseLeave={() => setTooltip(null)}
                        >
                          {/* AI rate marker */}
                          {parseFloat(sr.aiRate) > 10 && (
                            <div
                              style={{
                                ...s.aiMark,
                                left: `${Math.min(parseFloat(sr.aiRate) * 3, 95)}%`,
                              }}
                              title={`AI mention rate: ${sr.aiRate}%`}
                            >
                              🤖
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Value */}
                      <div style={s.barVal}>{sr.total.toLocaleString()}</div>
                      {/* AI badge */}
                      <div
                        style={{
                          ...s.aiBadge,
                          color:
                            parseFloat(sr.aiRate) > 20 ? "#ff9900" : "#4ec9b0",
                        }}
                      >
                        {sr.aiRate}% AI
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend note */}
              <div style={s.legendNote}>
                🤖 marker on bar = AI mention rate {">"} 10% &nbsp;|&nbsp; Bar
                length = total postings in period
              </div>
            </div>
          )}

          {/* ── TABLE VIEW ── */}
          {view === "table" && (
            <div style={s.card}>
              <div style={s.cardTitle} style2={{ marginBottom: "1rem" }}>
                📋 Detailed Breakdown
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={s.tbl}>
                  <thead>
                    <tr>
                      {[
                        "",
                        "City — Role",
                        "Total Postings",
                        "Latest Count",
                        "Avg AI Rate",
                        "Trend Bar",
                      ].map((h) => (
                        <th key={h} style={s.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allSeries.map((sr, i) => (
                      <tr
                        key={sr.label}
                        style={{
                          background: i % 2 === 0 ? "#0f0f1a" : "#111122",
                          opacity: hovered && hovered !== sr.label ? 0.4 : 1,
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={() => setHovered(sr.label)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <td style={s.td}>
                          <div style={{ ...s.dot, background: sr.color }} />
                        </td>
                        <td style={{ ...s.td, color: "#fff", fontWeight: 500 }}>
                          {sr.label}
                        </td>
                        <td style={{ ...s.td, fontWeight: 700, color: "#fff" }}>
                          {sr.total.toLocaleString()}
                        </td>
                        <td style={s.td}>{sr.latest}</td>
                        <td
                          style={{
                            ...s.td,
                            color:
                              parseFloat(sr.aiRate) > 20
                                ? "#ff9900"
                                : "#4ec9b0",
                          }}
                        >
                          {sr.aiRate}%
                        </td>
                        <td style={s.td}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              minWidth: "120px",
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: "6px",
                                background: "#1a1a2e",
                                borderRadius: "3px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  width: `${Math.round((sr.total / maxTotal) * 100)}%`,
                                  background: sr.color,
                                  borderRadius: "3px",
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Top 5 insight cards ── */}
          <div style={s.insightRow}>
            <div style={s.insight}>
              <div style={s.insightTitle}>🏆 Most Postings</div>
              {allSeries.slice(0, 3).map((sr, i) => (
                <div key={sr.label} style={s.insightItem}>
                  <span style={{ color: "#606080", fontSize: "0.72rem" }}>
                    {i + 1}.
                  </span>
                  <span
                    style={{ color: "#c0c0d0", fontSize: "0.8rem", flex: 1 }}
                  >
                    {sr.label}
                  </span>
                  <span
                    style={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    {sr.total}
                  </span>
                </div>
              ))}
            </div>
            <div style={s.insight}>
              <div style={s.insightTitle}>🤖 Highest AI Rate</div>
              {[...allSeries]
                .sort((a, b) => parseFloat(b.aiRate) - parseFloat(a.aiRate))
                .slice(0, 3)
                .map((sr, i) => (
                  <div key={sr.label} style={s.insightItem}>
                    <span style={{ color: "#606080", fontSize: "0.72rem" }}>
                      {i + 1}.
                    </span>
                    <span
                      style={{ color: "#c0c0d0", fontSize: "0.8rem", flex: 1 }}
                    >
                      {sr.label}
                    </span>
                    <span
                      style={{
                        color:
                          parseFloat(sr.aiRate) > 20 ? "#ff9900" : "#4ec9b0",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                      }}
                    >
                      {sr.aiRate}%
                    </span>
                  </div>
                ))}
            </div>
            <div style={s.insight}>
              <div style={s.insightTitle}>📉 Fewest Postings</div>
              {[...allSeries]
                .slice(-3)
                .reverse()
                .map((sr, i) => (
                  <div key={sr.label} style={s.insightItem}>
                    <span style={{ color: "#606080", fontSize: "0.72rem" }}>
                      {i + 1}.
                    </span>
                    <span
                      style={{ color: "#c0c0d0", fontSize: "0.8rem", flex: 1 }}
                    >
                      {sr.label}
                    </span>
                    <span
                      style={{
                        color: "#ff6b6b",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                      }}
                    >
                      {sr.total}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{ ...s.tt, left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div style={s.ttHdr}>{tooltip.label}</div>
          <div style={s.ttRow}>
            <span style={s.ttK}>Total postings</span>
            <b style={{ color: "#e94560" }}>{tooltip.total}</b>
          </div>
          <div style={s.ttRow}>
            <span style={s.ttK}>Latest count</span>
            <span>{tooltip.latest}</span>
          </div>
          <div style={s.ttRow}>
            <span style={s.ttK}>Avg AI rate</span>
            <span
              style={{
                color: parseFloat(tooltip.aiRate) > 20 ? "#ff9900" : "#4ec9b0",
              }}
            >
              {tooltip.aiRate}%
            </span>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

const s = {
  row: {
    display: "flex",
    gap: "0.6rem",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "1rem",
  },
  sel: {
    background: "#0f0f1a",
    color: "#fff",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.42rem 0.75rem",
    fontSize: "0.87rem",
  },
  winRow: { display: "flex", gap: "0.2rem" },
  wBtn: {
    background: "#0f0f1a",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.32rem 0.65rem",
    cursor: "pointer",
    fontSize: "0.82rem",
  },
  wOn: { background: "#e94560", color: "#fff", border: "1px solid #e94560" },
  refresh: {
    background: "transparent",
    color: "#606080",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.32rem 0.65rem",
    cursor: "pointer",
    fontSize: "0.9rem",
  },
  kpis: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
    gap: "0.65rem",
    marginBottom: "1rem",
  },
  kpi: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "10px",
    padding: "0.9rem 1.1rem",
  },
  kpiL: {
    color: "#606080",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "0.25rem",
  },
  kpiV: {
    color: "#fff",
    fontSize: "1.65rem",
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: "0.2rem",
  },
  kpiS: { color: "#606080", fontSize: "0.7rem" },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "3rem",
  },
  spin: {
    width: "18px",
    height: "18px",
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
  card: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.25rem",
    marginBottom: "1rem",
  },
  cardHdr: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.25rem",
  },
  cardTitle: { color: "#fff", fontWeight: 700, fontSize: "0.95rem" },
  cardNote: { color: "#606080", fontSize: "0.72rem" },
  barChart: { display: "flex", flexDirection: "column", gap: "0.55rem" },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.25rem 0",
    cursor: "default",
  },
  barLabel: {
    width: "200px",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    flexShrink: 0,
    overflow: "hidden",
  },
  dot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  track: {
    flex: 1,
    height: "28px",
    background: "#1a1a2e",
    borderRadius: "6px",
    overflow: "visible",
    position: "relative",
  },
  fill: {
    height: "100%",
    borderRadius: "6px",
    position: "relative",
    minWidth: "4px",
    transition: "all 0.3s",
  },
  aiMark: {
    position: "absolute",
    top: "-2px",
    fontSize: "12px",
    transform: "translateX(-50%)",
    pointerEvents: "none",
  },
  barVal: {
    width: "56px",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.85rem",
    textAlign: "right",
    flexShrink: 0,
  },
  aiBadge: {
    width: "64px",
    fontSize: "0.72rem",
    fontWeight: 600,
    textAlign: "right",
    flexShrink: 0,
  },
  legendNote: {
    color: "#606080",
    fontSize: "0.72rem",
    marginTop: "1rem",
    paddingTop: "0.75rem",
    borderTop: "1px solid #1a1a2e",
  },
  tbl: { width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" },
  th: {
    background: "#1a1a2e",
    color: "#606080",
    padding: "0.55rem 0.75rem",
    textAlign: "left",
    fontWeight: 600,
    fontSize: "0.72rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
    borderBottom: "1px solid #2a2a4a",
  },
  td: {
    padding: "0.5rem 0.75rem",
    color: "#c0c0d0",
    borderBottom: "1px solid #1a1a2e",
    verticalAlign: "middle",
  },
  insightRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "0.75rem",
  },
  insight: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "10px",
    padding: "1rem",
  },
  insightTitle: {
    color: "#a0a0b0",
    fontSize: "0.75rem",
    fontWeight: 600,
    marginBottom: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  insightItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginBottom: "0.45rem",
  },
  tt: {
    position: "fixed",
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    zIndex: 9999,
    pointerEvents: "none",
    minWidth: "180px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  ttHdr: {
    color: "#e94560",
    fontWeight: 700,
    fontSize: "0.78rem",
    marginBottom: "0.5rem",
    paddingBottom: "0.4rem",
    borderBottom: "1px solid #2a2a4a",
  },
  ttRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    fontSize: "0.78rem",
    color: "#c0c0d0",
    marginBottom: "0.2rem",
  },
  ttK: { color: "#606080" },
};

export default TrendsTab;
