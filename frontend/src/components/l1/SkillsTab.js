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

const SkillsTab = () => {
  const [city, setCity] = useState("");
  const [role, setRole] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: 12 });
      if (city) p.append("city", city);
      if (role) p.append("role", role);
      const res = await axios.get(`/api/l1/skills?${p}`);
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [city, role]);

  // When there's only 1 data point, rising = all skills sorted desc, declining = all sorted asc
  const rising = data?.rising || [];
  const declining = data?.declining || [];
  const allSkills = [
    ...new Map([...rising, ...declining].map((s) => [s.skill, s])).values(),
  ];
  const noWeeklyChange = allSkills.every((s) => s.delta === 0);

  const maxVal = Math.max(
    ...allSkills.map((s) => Math.max(s.this_week, s.last_week, 1)),
    1,
  );

  return (
    <div>
      {/* Filters */}
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
        <button style={s.refresh} onClick={load}>
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div style={s.center}>
          <div style={s.spin} />
          <span style={{ color: "#a0a0b0", marginLeft: "0.75rem" }}>
            Loading skills…
          </span>
        </div>
      )}

      {!loading && allSkills.length === 0 && (
        <div style={s.empty}>
          <div style={{ fontSize: "2.5rem" }}>🛠️</div>
          <div
            style={{
              color: "#fff",
              fontWeight: 600,
              margin: "0.5rem 0 0.25rem",
            }}
          >
            No skill data yet
          </div>
          <div style={{ color: "#606080", fontSize: "0.85rem" }}>
            Run the scraper from ⚙️ Admin tab first
          </div>
        </div>
      )}

      {!loading && allSkills.length > 0 && (
        <>
          {/* Single-run notice */}
          {noWeeklyChange && (
            <div style={s.notice}>
              ℹ️ Only one scraper run found — showing current skill frequency
              ranked by count. Run the scraper again tomorrow to see
              week-over-week changes.
            </div>
          )}

          {/* ── All Skills Ranked (single point) ── */}
          {noWeeklyChange && (
            <div style={s.card}>
              <div style={s.cardTitle}>🛠️ Top Skills in Job Descriptions</div>
              <div style={s.subTitle}>
                Ranked by frequency across all scraped postings
              </div>
              <div style={s.skillGrid}>
                {[...allSkills]
                  .sort((a, b) => b.this_week - a.this_week)
                  .map((sk, i) => {
                    const pct = Math.max((sk.this_week / maxVal) * 100, 2);
                    const hue =
                      i < 4 ? "#e94560" : i < 8 ? "#f0a500" : "#4ec9b0";
                    return (
                      <div
                        key={sk.skill}
                        style={s.skillRow}
                        onMouseEnter={(e) =>
                          setTooltip({ x: e.clientX, y: e.clientY, sk })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div style={s.rank}>#{i + 1}</div>
                        <div style={s.skillName}>{sk.skill}</div>
                        <div style={s.track}>
                          <div
                            style={{
                              ...s.fill,
                              width: `${pct}%`,
                              background: hue,
                            }}
                          />
                        </div>
                        <div style={{ ...s.val, color: hue }}>
                          {sk.this_week}
                        </div>
                        {i < 3 && (
                          <div style={{ ...s.crown, color: hue }}>
                            {["🥇", "🥈", "🥉"][i]}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ── Week-over-week (multiple runs) ── */}
          {!noWeeklyChange && (
            <div style={s.panels}>
              {/* Rising */}
              <div style={s.card}>
                <div style={s.cardTitle}>📈 Rising Skills</div>
                <div style={s.subTitle}>Growing week-over-week</div>
                <div style={s.skillGrid}>
                  {rising.map((sk, i) => {
                    const pct = Math.max((sk.this_week / maxVal) * 100, 2);
                    return (
                      <div
                        key={sk.skill}
                        style={s.skillRow}
                        onMouseEnter={(e) =>
                          setTooltip({ x: e.clientX, y: e.clientY, sk })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div style={s.skillName}>{sk.skill}</div>
                        <div style={s.track}>
                          <div
                            style={{
                              ...s.fill,
                              width: `${pct}%`,
                              background: "#4ec9b0",
                            }}
                          />
                        </div>
                        <div style={{ ...s.val, color: "#4ec9b0" }}>
                          {sk.this_week}
                        </div>
                        <div style={{ ...s.delta, color: "#4ec9b0" }}>
                          +{sk.pct_change}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Declining */}
              <div style={s.card}>
                <div style={s.cardTitle}>📉 Declining Skills</div>
                <div style={s.subTitle}>Shrinking week-over-week</div>
                <div style={s.skillGrid}>
                  {declining.map((sk, i) => {
                    const pct = Math.max((sk.last_week / maxVal) * 100, 2);
                    return (
                      <div
                        key={sk.skill}
                        style={s.skillRow}
                        onMouseEnter={(e) =>
                          setTooltip({ x: e.clientX, y: e.clientY, sk })
                        }
                        onMouseLeave={() => setTooltip(null)}
                      >
                        <div style={s.skillName}>{sk.skill}</div>
                        <div style={s.track}>
                          <div
                            style={{
                              ...s.fill,
                              width: `${pct}%`,
                              background: "#ff6b6b",
                            }}
                          />
                        </div>
                        <div style={{ ...s.val, color: "#ff6b6b" }}>
                          {sk.last_week}
                        </div>
                        <div style={{ ...s.delta, color: "#ff6b6b" }}>
                          {sk.pct_change}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Skill category breakdown ── */}
          <div style={s.categories}>
            {[
              {
                label: "💻 Tech",
                color: "#4ec9b0",
                skills: [
                  "python",
                  "sql",
                  "java",
                  "javascript",
                  "react",
                  "aws",
                  "azure",
                  "power bi",
                  "tableau",
                  "machine learning",
                  "deep learning",
                  "nlp",
                ],
              },
              {
                label: "📋 Office",
                color: "#f0a500",
                skills: [
                  "excel",
                  "ms office",
                  "tally",
                  "sap",
                  "crm",
                  "salesforce",
                  "accounting",
                ],
              },
              {
                label: "🗣️ Soft",
                color: "#a78bfa",
                skills: [
                  "communication",
                  "customer service",
                  "data entry",
                  "typing",
                  "sales",
                  "digital marketing",
                  "content writing",
                  "hr",
                ],
              },
            ].map((cat) => {
              const present = allSkills.filter((sk) =>
                cat.skills.includes(sk.skill.toLowerCase()),
              );
              if (!present.length) return null;
              return (
                <div key={cat.label} style={s.catCard}>
                  <div style={{ ...s.catTitle, color: cat.color }}>
                    {cat.label}
                  </div>
                  <div style={s.chips}>
                    {present
                      .sort((a, b) => b.this_week - a.this_week)
                      .map((sk) => (
                        <div
                          key={sk.skill}
                          style={{
                            ...s.chip,
                            borderColor: cat.color + "44",
                            color: cat.color,
                          }}
                        >
                          {sk.skill}
                          <span style={s.chipCount}>{sk.this_week}</span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div style={{ ...s.tt, left: tooltip.x + 14, top: tooltip.y - 10 }}>
          <div style={s.ttHdr}>{tooltip.sk.skill}</div>
          <div style={s.ttRow}>
            <span style={s.ttK}>This week</span>
            <b style={{ color: "#4ec9b0" }}>{tooltip.sk.this_week}</b>
          </div>
          <div style={s.ttRow}>
            <span style={s.ttK}>Last week</span>
            <span>{tooltip.sk.last_week}</span>
          </div>
          {tooltip.sk.delta !== 0 && (
            <div style={s.ttRow}>
              <span style={s.ttK}>Change</span>
              <span
                style={{ color: tooltip.sk.delta > 0 ? "#4ec9b0" : "#ff6b6b" }}
              >
                {tooltip.sk.delta > 0 ? "+" : ""}
                {tooltip.sk.delta}
              </span>
            </div>
          )}
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
  refresh: {
    background: "transparent",
    color: "#606080",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.32rem 0.7rem",
    cursor: "pointer",
    fontSize: "0.82rem",
    marginLeft: "auto",
  },
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
  notice: {
    background: "#1a1a2e",
    border: "1px solid #2a4a6a",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#a0c0e0",
    fontSize: "0.82rem",
    marginBottom: "1rem",
  },
  card: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.25rem",
    marginBottom: "1rem",
  },
  cardTitle: {
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.95rem",
    marginBottom: "0.25rem",
  },
  subTitle: { color: "#606080", fontSize: "0.75rem", marginBottom: "1rem" },
  panels: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1rem",
  },
  skillGrid: { display: "flex", flexDirection: "column", gap: "0.5rem" },
  skillRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.25rem 0.4rem",
    borderRadius: "6px",
    cursor: "default",
    transition: "background 0.15s",
  },
  rank: {
    width: "28px",
    color: "#606080",
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  skillName: {
    width: "130px",
    color: "#c0c0d0",
    fontSize: "0.83rem",
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  track: {
    flex: 1,
    height: "10px",
    background: "#1a1a2e",
    borderRadius: "5px",
    overflow: "hidden",
  },
  fill: { height: "100%", borderRadius: "5px", transition: "width 0.4s" },
  val: {
    width: "40px",
    fontWeight: 700,
    fontSize: "0.82rem",
    textAlign: "right",
    flexShrink: 0,
  },
  delta: {
    width: "52px",
    fontWeight: 600,
    fontSize: "0.75rem",
    textAlign: "right",
    flexShrink: 0,
  },
  crown: { fontSize: "1rem", flexShrink: 0 },
  categories: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: "0.75rem",
  },
  catCard: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "10px",
    padding: "1rem",
  },
  catTitle: { fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.75rem" },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.4rem" },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    background: "#1a1a2e",
    border: "1px solid",
    borderRadius: "4px",
    padding: "0.2rem 0.5rem",
    fontSize: "0.75rem",
  },
  chipCount: {
    background: "#0a0a12",
    borderRadius: "3px",
    padding: "0.05rem 0.3rem",
    fontSize: "0.68rem",
    color: "#a0a0b0",
  },
  tt: {
    position: "fixed",
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    zIndex: 9999,
    pointerEvents: "none",
    minWidth: "160px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
  },
  ttHdr: {
    color: "#e94560",
    fontWeight: 700,
    fontSize: "0.8rem",
    marginBottom: "0.4rem",
    paddingBottom: "0.3rem",
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

export default SkillsTab;
