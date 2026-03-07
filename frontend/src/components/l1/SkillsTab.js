import { useEffect, useRef, useState } from "react";
import api from "../../api";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E13",
  surface: "#141821",
  card: "#1C2130",
  border: "#2A3144",
  accent: "#F97316",
  accentDim: "rgba(249, 115, 22, 0.15)",
  teal: "#10B981",
  tealDim: "rgba(16, 185, 129, 0.15)",
  amber: "#F97316",
  amberDim: "rgba(249, 115, 22, 0.15)",
  violet: "#3B82F6",
  violetDim: "rgba(59, 130, 246, 0.15)",
  yellow: "#F97316",
  text: "#E5E7EB",
  textMuted: "#9CA3AF",
  muted: "#9CA3AF",
  grid: "#1C2130",
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

// ── Skill gap: PMKVY/SWAYAM trains for these ─────────────────────────────────
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

// ── Micro bar ─────────────────────────────────────────────────────────────────
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
            width: 16,
            fontSize: 9,
            color: C.muted,
            fontFamily: "monospace",
            flexShrink: 0,
          }}
        >
          {rank}
        </span>
      )}
      <span
        style={{
          width: 90,
          fontSize: 11,
          color: C.text,
          flexShrink: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {skill}
      </span>
      <MiniBar pct={barPct} color={color} />
      {pct != null && (
        <span
          style={{
            width: 34,
            fontSize: 9,
            fontWeight: 700,
            textAlign: "right",
            flexShrink: 0,
            color: pct > 0 ? C.teal : C.accent,
            fontFamily: "monospace",
          }}
        >
          {pct > 0 ? "+" : ""}
          {pct}%
        </span>
      )}
      <span
        style={{
          width: 34,
          fontSize: 9,
          fontWeight: 700,
          textAlign: "right",
          flexShrink: 0,
          color,
          fontFamily: "monospace",
        }}
      >
        {count}
      </span>
      {govtTrained != null && (
        <span
          style={{
            fontSize: 8,
            padding: "1px 5px",
            borderRadius: 3,
            background: govtTrained ? C.tealDim : C.accentDim,
            color: govtTrained ? C.teal : C.accent,
            border: `1px solid ${govtTrained ? C.teal : C.accent}`,
            flexShrink: 0,
          }}
        >
          {govtTrained ? "✓" : "gap"}
        </span>
      )}
    </div>
  );
}

// ── Skill gap map ─────────────────────────────────────────────────────────────
function SkillGapMap({ skills, maxVal }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {skills.map((sk, i) => {
        const trained = GOVT_TRAINED.includes(
          String(sk.skill || "").toLowerCase(),
        );
        const val = sk.this_week || 0;
        return (
          <div
            key={sk.skill}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              style={{
                width: 80,
                fontSize: 10,
                color: C.text,
                flexShrink: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {sk.skill}
            </span>
            <div
              style={{
                flex: 1,
                height: 6,
                background: C.grid,
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${maxVal > 0 ? (val / maxVal) * 100 : 0}%`,
                  height: "100%",
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
    color: "#F97316",
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
    color: "#3B82F6",
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
      const res = await api.get(`/api/l1/skills?${p}`);
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
  const maxGap = Math.max(...topDemand.map((s) => s.this_week || 0), 1);

  const selStyle = {
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        background: C.bg,
        padding: 20,
        borderRadius: 16,
        fontFamily: "'Inter',sans-serif",
        color: C.text,
      }}
    >
      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          style={selStyle}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          style={selStyle}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <button onClick={load} style={{ ...selStyle, marginLeft: "auto" }}>
          ↻ Refresh
        </button>
      </div>

      {/* KPI row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 10,
          marginBottom: 12,
          flexShrink: 0,
        }}
      >
        {[
          {
            label: "Total Skills",
            value: allSkills.length,
            sub: "tracked",
            color: C.text,
          },
          {
            label: "Rising",
            value: rising.length,
            sub: "demand up",
            color: C.teal,
          },
          {
            label: "Declining",
            value: declining.length,
            sub: "demand down",
            color: C.accent,
          },
          {
            label: "Skill Gap",
            value: `${gapPct}%`,
            sub: "not govt-trained",
            color: "#F97316",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {kpi.label}
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 700,
                color: kpi.color,
              }}
            >
              {kpi.value}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div
          style={{ textAlign: "center", padding: "32px 16px", color: C.muted }}
        >
          Loading skills…
        </div>
      )}

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
          <div style={{ fontSize: 36 }}>📊</div>
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
              ℹ️ Only one scraper run found — week-over-week change isn't
              available yet.
            </div>
          )}

          {/* Row 1: Rising | Declining | Skill Gap Map */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              alignItems: "stretch",
              marginBottom: 12,
            }}
          >
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
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {rising.map((sk, i) => (
                    <SkillRow
                      key={sk.skill}
                      rank={i + 1}
                      skill={sk.skill}
                      count={sk.this_week || 0}
                      maxCount={maxR}
                      pct={noWeeklyChange ? null : sk.delta}
                      color={C.teal}
                      showRank={true}
                    />
                  ))}
                </div>
              </div>
            )}

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
                    {noWeeklyChange ? "Bottom Skills" : "Declining Skills"}
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {city || "All Cities"} · {role || "All Roles"}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
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
                      pct={noWeeklyChange ? null : sk.delta}
                      color={C.accent}
                      showRank={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {showRight && (
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "14px 14px 12px",
                  display: "flex",
                  flexDirection: "column",
                  borderTop: `2px solid #F97316`,
                }}
              >
                <div style={{ marginBottom: 10, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                    Skill Gap Map
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {gapPct}% of top skills not covered by PMKVY/SWAYAM
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <SkillGapMap skills={topDemand} maxVal={maxGap} />
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Categories */}
          {showRight && (
            <div
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: "14px 16px",
                borderTop: `2px solid #3B82F6`,
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
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontSize: 10, color: C.text }}>
                              {sk.skill}
                            </span>
                            <span
                              style={{
                                fontSize: 9,
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
        </>
      )}
    </div>
  );
}
