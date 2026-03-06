import { useEffect, useRef, useState } from "react";
import axios from "axios";

// ── Design tokens (aligned with HiringTrends) ─────────────────────────────────
const C = {
  bg: "#0d0f1a",
  surface: "#13162a",
  card: "#181c30",
  border: "#252a42",
  accent: "#f43f72",
  accentDim: "rgba(244,63,114,0.18)",
  teal: "#00d4b1",
  tealDim: "rgba(0,212,177,0.15)",
  amber: "#f0a500",
  amberDim: "rgba(240,165,0,0.15)",
  violet: "#a78bfa",
  violetDim: "rgba(167,139,250,0.15)",
  text: "#e2e8f0",
  muted: "#6b7280",
  grid: "#1f2640",
};

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

// ── Skill gap: PMKVY/SWAYAM trains for these ────────────────────────────────
const GOVT_TRAINED = [
  "excel",
  "tally",
  "accounting",
  "data entry",
  "typing",
  "ms office",
  "sap",
  "communication",
  "customer service",
  "digital marketing",
  "content writing",
  "hr",
  "sales",
  "seo",
  "crm",
];

// ── Micro bar (inline sparkline) ──────────────────────────────────────────────
function MiniBar({ pct, color, height = 6 }) {
  const w = useRef(null);
  useEffect(() => {
    if (!w.current) return;
    w.current.style.width = "0%";
    requestAnimationFrame(() => {
      if (!w.current) return;
      w.current.style.transition = "width 0.55s cubic-bezier(.4,0,.2,1)";
      w.current.style.width = Math.max(pct, 2) + "%";
    });
  }, [pct]);
  return (
    <div
      style={{
        flex: 1,
        height,
        background: C.grid,
        borderRadius: height / 2,
        overflow: "hidden",
      }}
    >
      <div
        ref={w}
        style={{ height: "100%", background: color, borderRadius: height / 2 }}
      />
    </div>
  );
}

// ── Skill row ─────────────────────────────────────────────────────────────────
function SkillRow({
  rank,
  skill,
  count,
  maxCount,
  pct,
  color,
  showRank,
  govtTrained,
}) {
  const [hov, setHov] = useState(false);
  const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        borderRadius: 6,
        background: hov ? C.surface : "transparent",
        transition: "background 0.15s",
      }}
    >
      {showRank && (
        <span
          style={{
            width: 22,
            color: C.muted,
            fontSize: 10,
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          #{rank}
        </span>
      )}
      <span
        style={{
          width: 120,
          fontSize: 11,
          color: C.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
        title={skill}
      >
        {skill}
      </span>
      {govtTrained !== undefined && (
        <span
          style={{
            fontSize: 9,
            padding: "1px 5px",
            borderRadius: 3,
            flexShrink: 0,
            background: govtTrained ? C.tealDim : C.accentDim,
            color: govtTrained ? C.teal : C.accent,
            border: `1px solid ${
              govtTrained ? C.teal + "44" : C.accent + "44"
            }`,
          }}
        >
          {govtTrained ? "GOV" : "GAP"}
        </span>
      )}
      <MiniBar pct={barPct} color={color} />
      <span
        style={{
          width: 44,
          textAlign: "right",
          fontSize: 11,
          fontWeight: 700,
          color,
          fontFamily: "monospace",
          flexShrink: 0,
        }}
      >
        {count}
      </span>
      {pct !== undefined && (
        <span
          style={{
            width: 50,
            textAlign: "right",
            fontSize: 10,
            fontWeight: 600,
            color,
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          {pct > 0 ? "+" : ""}
          {pct}%
        </span>
      )}
    </div>
  );
}

// ── Gap Map card ──────────────────────────────────────────────────────────────
function GapMap({ skills }) {
  const top = [...skills]
    .sort((a, b) => (b.this_week || 0) - (a.this_week || 0))
    .slice(0, 14);
  const maxC = Math.max(...top.map((s) => s.this_week || 0), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {top.map((sk) => {
        const trained = GOVT_TRAINED.includes(
          String(sk.skill || "").toLowerCase(),
        );
        const pct = ((sk.this_week || 0) / maxC) * 100;
        return (
          <div
            key={sk.skill}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                width: 110,
                fontSize: 10,
                color: C.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
              title={sk.skill}
            >
              {sk.skill}
            </span>
            <div
              style={{
                flex: 1,
                height: 14,
                background: C.grid,
                borderRadius: 3,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: 3,
                  width: pct + "%",
                  background: trained
                    ? `linear-gradient(90deg, ${C.teal}, ${C.teal}88)`
                    : `linear-gradient(90deg, ${C.accent}, ${C.accent}88)`,
                  transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
                }}
              />
            </div>
            <span
              style={{
                width: 34,
                fontSize: 9,
                fontWeight: 700,
                textAlign: "right",
                flexShrink: 0,
                color: trained ? C.teal : C.accent,
                fontFamily: "monospace",
              }}
            >
              {sk.this_week || 0}
            </span>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: C.teal,
            }}
          />
          <span style={{ fontSize: 9, color: C.muted }}>
            PMKVY/SWAYAM trains
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: C.accent,
            }}
          />
          <span style={{ fontSize: 9, color: C.muted }}>
            Market demands — not trained
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Category chips ────────────────────────────────────────────────────────────
const CATS = [
  {
    label: "Tech",
    color: C.teal,
    keys: [
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
      "cloud",
      "kubernetes",
      "git",
    ],
  },
  {
    label: "Office",
    color: C.amber,
    keys: [
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
    label: "Soft",
    color: C.violet,
    keys: [
      "communication",
      "customer service",
      "data entry",
      "typing",
      "sales",
      "digital marketing",
      "content writing",
      "hr",
      "seo",
    ],
  },
];

export default function SkillsTab() {
  const [city, setCity] = useState("");
  const [role, setRole] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: 20 });
      if (city) p.append("city", city);
      if (role) p.append("role", role);
      const res = await axios.get(`/api/l1/skills?${p}`);
      setData(res.data?.data || null);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, role]);

  const risingRaw = data?.rising || [];
  const decliningRaw = data?.declining || [];
  const allSkills = [
    ...new Map(
      [...risingRaw, ...decliningRaw].map((s) => [s.skill, s]),
    ).values(),
  ];
  const noWeeklyChange =
    allSkills.length > 0 && allSkills.every((s) => (s.delta || 0) === 0);

  const topSkills = [...allSkills].sort(
    (a, b) => (b.this_week || 0) - (a.this_week || 0),
  );
  const bottomSkills = [...allSkills]
    .slice()
    .sort((a, b) => (a.this_week || 0) - (b.this_week || 0));

  const rising = noWeeklyChange
    ? topSkills.slice(0, 12)
    : risingRaw.slice(0, 12);
  const declining = noWeeklyChange
    ? bottomSkills.slice(0, 12)
    : decliningRaw.slice(0, 12);

  const showRising = rising.length > 0;
  const showDeclining = declining.length > 0;
  const showRight = allSkills.length > 0;

  const maxR = Math.max(...rising.map((s) => s.this_week || 0), 1);
  const maxD = Math.max(
    ...declining.map((s) => (noWeeklyChange ? s.this_week : s.last_week) || 0),
    1,
  );

  const topDemand = topSkills.slice(0, 12);
  const gapSkills = topDemand.filter(
    (s) => !GOVT_TRAINED.includes(String(s.skill || "").toLowerCase()),
  );
  const trainedSkills = topDemand.filter((s) =>
    GOVT_TRAINED.includes(String(s.skill || "").toLowerCase()),
  );
  const gapPct = topDemand.length
    ? Math.round((gapSkills.length / topDemand.length) * 100)
    : 0;

  const selectStyle = {
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    outline: "none",
    fontFamily: "inherit",
  };
  const btnStyle = {
    background: "transparent",
    color: C.muted,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    transition: "color 0.15s, border-color 0.15s",
  };

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* ── Filters bar ── */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            color: C.muted,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginRight: 4,
          }}
        >
          Skills Intel
        </div>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={selectStyle}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button onClick={load} style={btnStyle}>
          ↻ Refresh
        </button>
        {loading && (
          <span
            style={{
              color: C.accent,
              fontFamily: "monospace",
              fontSize: 10,
            }}
          >
            ● syncing…
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Skill Gap
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 700,
                color: C.accent,
              }}
            >
              {gapPct}%
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Skills Tracked
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 700,
                color: C.teal,
              }}
            >
              {allSkills.length}
            </div>
          </div>
        </div>
      </div>

      {/* Empty state (keeps layout tight) */}
      {!loading && allSkills.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            background: C.card,
            border: `1px dashed ${C.border}`,
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 36 }}></div>
          <div style={{ color: C.text, fontWeight: 700, marginTop: 8 }}>
            No skill data yet
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
            Run the scraper from Admin tab first
          </div>
        </div>
      )}

      {allSkills.length > 0 && (
        <>
          {noWeeklyChange && (
            <div
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: "8px 10px",
                color: C.muted,
                fontSize: 11,
                marginBottom: 12,
              }}
            >
              ℹ️ Only one scraper run found — week-over-week change isn’t
              available yet.
            </div>
          )}

          {/* ── Row 1: Rising | Declining | Skill Gap Map — equal width, stretch to tallest ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              alignItems: "stretch",
              marginBottom: 12,
            }}
          >
            {/* Rising */}
            {showRising && (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px 14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  borderTop: `2px solid ${C.teal}`,
                }}
              >
                <div style={{ marginBottom: 10, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    {noWeeklyChange ? "Top Skills" : "Rising Skills"}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {city || "All Cities"} · {role || "All Roles"}
                    {noWeeklyChange
                      ? " · ranked by count"
                      : " · week-over-week"}
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 1 }}
                >
                  {rising.map((sk, i) => (
                    <SkillRow
                      key={sk.skill}
                      rank={i + 1}
                      skill={sk.skill}
                      count={sk.this_week || 0}
                      maxCount={maxR}
                      pct={noWeeklyChange ? undefined : sk.pct_change}
                      color={C.teal}
                      showRank
                      govtTrained={GOVT_TRAINED.includes(
                        String(sk.skill || "").toLowerCase(),
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Declining */}
            {showDeclining && (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px 14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  borderTop: `2px solid ${C.accent}`,
                }}
              >
                <div style={{ marginBottom: 10, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    {noWeeklyChange ? "Lower Frequency" : "📉 Declining Skills"}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {city || "All Cities"} · {role || "All Roles"}
                    {noWeeklyChange
                      ? " · ranked by count"
                      : " · week-over-week"}
                  </div>
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 1 }}
                >
                  {declining.map((sk, i) => (
                    <SkillRow
                      key={sk.skill}
                      rank={i + 1}
                      skill={sk.skill}
                      count={
                        (noWeeklyChange ? sk.this_week : sk.last_week) || 0
                      }
                      maxCount={maxD}
                      pct={noWeeklyChange ? undefined : sk.pct_change}
                      color={C.accent}
                      showRank
                      govtTrained={GOVT_TRAINED.includes(
                        String(sk.skill || "").toLowerCase(),
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Skill Gap Map */}
            {showRight && (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  borderTop: `2px solid ${C.amber}`,
                }}
              >
                {/* Header + stat pills */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    flexShrink: 0,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: C.text }}
                    >
                      🎓 Skill Gap Map
                    </div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                      Hired by market vs trained by PMKVY / SWAYAM
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <div
                      style={{
                        background: C.tealDim,
                        border: `1px solid ${C.teal}33`,
                        borderRadius: 7,
                        padding: "5px 10px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Govt Covered
                      </div>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: C.teal,
                          fontFamily: "monospace",
                          lineHeight: 1.2,
                        }}
                      >
                        {trainedSkills.length}
                      </div>
                      <div style={{ fontSize: 9, color: C.muted }}>
                        of top demand
                      </div>
                    </div>
                    <div
                      style={{
                        background: C.accentDim,
                        border: `1px solid ${C.accent}33`,
                        borderRadius: 7,
                        padding: "5px 10px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: C.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Market Gap
                      </div>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          color: C.accent,
                          fontFamily: "monospace",
                          lineHeight: 1.2,
                        }}
                      >
                        {gapPct}%
                      </div>
                      <div style={{ fontSize: 9, color: C.muted }}>
                        not govt-trained
                      </div>
                    </div>
                  </div>
                </div>
                {/* Bar list */}
                <GapMap skills={allSkills} />
              </div>
            )}
          </div>

          {/* ── Row 2: Skill Categories — full width, 3 equal columns ── */}
          {showRight && (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                borderTop: `2px solid ${C.violet}`,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.text,
                  marginBottom: 12,
                }}
              >
                Skill Categories
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                  alignItems: "stretch",
                }}
              >
                {CATS.map((cat) => {
                  const present = allSkills
                    .filter((sk) =>
                      cat.keys.includes(String(sk.skill || "").toLowerCase()),
                    )
                    .sort((a, b) => (b.this_week || 0) - (a.this_week || 0))
                    .slice(0, 6);
                  if (!present.length) return null;
                  return (
                    <div
                      key={cat.label}
                      style={{
                        background: C.surface,
                        borderRadius: 8,
                        padding: "10px 12px",
                        border: `1px solid ${cat.color}33`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: cat.color,
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        {cat.label}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 5,
                        }}
                      >
                        {present.map((sk) => (
                          <div
                            key={sk.skill}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "3px 8px",
                              borderRadius: 4,
                              background: cat.color + "12",
                              border: `1px solid ${cat.color}22`,
                            }}
                          >
                            <span style={{ fontSize: 10, color: C.text }}>
                              {sk.skill}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: cat.color,
                                fontFamily: "monospace",
                                fontWeight: 700,
                              }}
                            >
                              {sk.this_week || 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Footer ── */}
          <div
            style={{
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: C.teal,
                borderRadius: "50%",
                display: "inline-block",
              }}
            />
            <span style={{ color: C.muted, fontSize: 10 }}>
              Source: Naukri scrape · PMKVY/SWAYAM catalog · Refreshes on filter
              change ·{" "}
              {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
              IST
            </span>
          </div>
        </>
      )}

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      `}</style>
    </div>
  );
}
