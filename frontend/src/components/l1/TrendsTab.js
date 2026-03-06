import { useState, useEffect } from "react";
import axios from "axios";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  Legend,
} from "recharts";

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0f1a",
  surface: "#13162a",
  card: "#181c30",
  border: "#252a42",
  accent: "#f43f72",
  accentDim: "rgba(244,63,114,0.15)",
  teal: "#00d4b1",
  tealDim: "rgba(0,212,177,0.15)",
  amber: "#f0a500",
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
  "Indore",
  "Nagpur",
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

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
const sign = (n) => (n > 0 ? "+" : "") + n + "%";
const trendColor = (n) => (n > 0 ? C.teal : n < 0 ? C.accent : C.muted);

// Derive roleComp, cityData, radarData from API series + optional skills
function deriveCharts(series, skillsData) {
  const roleMap = {};
  const cityMap = {};

  for (const [label, pts] of Object.entries(series || {})) {
    const [city, role] = label.split(" — ").map((s) => s?.trim() || "");
    if (!city || !role) continue;

    const total = pts.reduce((a, p) => a + p.count, 0);
    const aiAvg =
      pts.length > 0
        ? pts.reduce((a, p) => a + (p.ai_rate || 0), 0) / pts.length
        : 0;
    const mid = Math.floor(pts.length / 2);
    const firstHalf = pts.slice(0, mid);
    const secondHalf = pts.slice(mid);
    const prevSum = firstHalf.reduce((a, p) => a + p.count, 0);
    const currSum = secondHalf.reduce((a, p) => a + p.count, 0);
    const decline =
      prevSum > 0 ? Math.max(0, ((prevSum - currSum) / prevSum) * 100) : 0;
    const change = prevSum > 0 ? ((currSum - prevSum) / prevSum) * 100 : 0;
    const vuln = Math.round(
      Math.min(
        100,
        0.6 * Math.min(decline, 100) + 0.4 * Math.min(aiAvg * 200, 100),
      ),
    );

    if (!roleMap[role]) {
      roleMap[role] = {
        postings: 0,
        aiSum: 0,
        aiCount: 0,
        vulnSum: 0,
        vulnCount: 0,
      };
    }
    roleMap[role].postings += total;
    roleMap[role].aiSum += aiAvg * (pts.length || 1);
    roleMap[role].aiCount += pts.length || 1;
    roleMap[role].vulnSum += vuln;
    roleMap[role].vulnCount += 1;

    if (!cityMap[city]) {
      cityMap[city] = { postings: 0, prevSum: 0, currSum: 0 };
    }
    cityMap[city].postings += total;
    cityMap[city].prevSum += prevSum;
    cityMap[city].currSum += currSum;
  }

  const roleComp = Object.entries(roleMap).map(([role, r]) => ({
    role: role.length > 14 ? role.slice(0, 13) + "…" : role,
    postings: Math.round(r.postings),
    aiRate: parseFloat((r.aiCount ? r.aiSum / r.aiCount : 0).toFixed(2)),
    vulnerability: Math.round(r.vulnCount ? r.vulnSum / r.vulnCount : 0),
  }));

  const cityData = Object.entries(cityMap).map(([city, c]) => ({
    city,
    postings: Math.round(c.postings),
    change: parseFloat(
      (c.prevSum > 0 ? ((c.currSum - c.prevSum) / c.prevSum) * 100 : 0).toFixed(
        1,
      ),
    ),
  }));

  let radarData = [];
  if (skillsData?.rising?.length) {
    radarData = skillsData.rising.slice(0, 6).map((s) => ({
      skill: s.skill?.length > 10 ? s.skill.slice(0, 9) + "…" : s.skill || "",
      demand: s.this_week ?? 0,
      supply: s.last_week ?? 0,
    }));
  }

  return { roleComp, cityData, radarData };
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "12px 16px",
        flex: 1,
        minWidth: 0,
        borderLeft: `3px solid ${accent || C.border}`,
      }}
    >
      <div
        style={{
          color: C.muted,
          fontSize: 10,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: C.text,
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 11,
        color: C.text,
      }}
    >
      <div style={{ color: C.muted, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}:{" "}
          <strong>
            {typeof p.value === "number" && p.value < 1
              ? (p.value * 100).toFixed(1) + "%"
              : p.value}
          </strong>
        </div>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function TrendsTab() {
  const [city, setCity] = useState("");
  const [role, setRole] = useState("");
  const [window, setWindow] = useState(30);
  const [data, setData] = useState(null);
  const [skillsData, setSkillsData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ window });
    if (city) params.append("city", city);
    if (role) params.append("role", role);

    const trendsPromise = axios.get(`/api/l1/trends?${params}`);
    const skillsPromise =
      city || role
        ? axios
            .get(
              `/api/l1/skills?${new URLSearchParams({
                ...(city && { city }),
                ...(role && { role }),
                limit: 10,
              })}`,
            )
            .then((r) => r.data?.data || null)
            .catch(() => null)
        : Promise.resolve(null);

    trendsPromise
      .then((r) => {
        const d = r.data?.data;
        if (d) setData(d);
      })
      .catch((e) => {
        console.error(e);
        setData(null);
      })
      .finally(() => setLoading(false));

    skillsPromise.then(setSkillsData);
  }, [city, role, window]);

  if (!data)
    return (
      <div
        style={{
          background: C.bg,
          minHeight: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: C.accent,
            fontFamily: "monospace",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: `2px solid ${C.border}`,
              borderTopColor: C.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          {loading ? "Loading signals…" : "No data — Start Scraper in Admin"}
        </div>
      </div>
    );

  const { roleComp, cityData, radarData } = deriveCharts(
    data.series,
    skillsData,
  );

  // Aggregate all series into one time series by date (for area charts)
  const allPts = Object.values(data.series || {}).flat();
  const dateMap = {};
  for (const p of allPts) {
    const d = p.date;
    if (!dateMap[d]) dateMap[d] = { date: d, count: 0, ai_rate: 0, n: 0 };
    dateMap[d].count += p.count;
    dateMap[d].ai_rate += p.ai_rate || 0;
    dateMap[d].n += 1;
  }
  const series = Object.values(dateMap)
    .map((x) => ({
      date: x.date,
      count: x.count,
      ai_rate: x.n ? x.ai_rate / x.n : 0,
    }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const aiSeries = series.map((p) => ({
    ...p,
    ai_pct: parseFloat(((p.ai_rate || 0) * 100).toFixed(1)),
  }));
  const avgAiRate =
    series.length > 0
      ? (
          (series.reduce((a, b) => a + (b.ai_rate || 0), 0) / series.length) *
          100
        ).toFixed(1)
      : "0";
  const showSkillCard = Boolean(city || role);

  const selectStyle = {
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: "6px 12px",
    fontSize: 12,
    cursor: "pointer",
    outline: "none",
  };
  const btnBase = {
    padding: "6px 12px",
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "all 0.15s",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.04em",
  };

  return (
    <div
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        padding: "16px",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />

      {/* ── Header + Filters (compact) ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              color: C.muted,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            Layer 1 · Job Market Intelligence
          </div>
          <h2
            style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}
          >
            Hiring Trends
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
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
          <div style={{ display: "flex", gap: 4 }}>
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setWindow(w)}
                style={{
                  ...btnBase,
                  background: window === w ? C.accent : C.card,
                  color: window === w ? "#fff" : C.muted,
                  border: `1px solid ${window === w ? C.accent : C.border}`,
                }}
              >
                {w === 365 ? "1yr" : `${w}d`}
              </button>
            ))}
          </div>
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
        </div>
      </div>

      {/* ── Stat Row (compact) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <StatCard
          label="Current Postings"
          value={fmt(data.current_total)}
          sub={`Last ${window} days`}
          accent={C.teal}
        />
        <StatCard
          label="Previous Period"
          value={fmt(data.previous_total)}
          sub={`Prior ${window} days`}
          accent={C.border}
        />
        <StatCard
          label="Period Change"
          value={sign(data.pct_change)}
          sub={
            data.pct_change > 0
              ? "▲ Demand rising"
              : data.pct_change < 0
                ? "▼ Demand falling"
                : "Stable"
          }
          accent={trendColor(data.pct_change)}
        />
        <StatCard
          label="Avg AI Mention Rate"
          value={avgAiRate + "%"}
          sub="of JDs mention AI tools"
          accent={C.amber}
        />
      </div>

      {/* ── Chart Grid (compact, fit in viewport) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Posting Volume Area */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 16px 8px",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              {city || "All"} — {role || "All"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              Posting volume over time
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={series}>
              <defs>
                <linearGradient id="gPostTrends" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: C.muted }}
                tickFormatter={(d) => (d ? d.slice(5) : "")}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 9, fill: C.muted }} width={28} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Postings"
                stroke={C.accent}
                fill="url(#gPostTrends)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI Mention Rate */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 16px 8px",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              AI Mention Rate Trend
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              % of JDs referencing AI/automation tools
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <AreaChart data={aiSeries}>
              <defs>
                <linearGradient id="gAITrends" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.amber} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: C.muted }}
                tickFormatter={(d) => (d ? d.slice(5) : "")}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: C.muted }}
                width={30}
                tickFormatter={(v) => v + "%"}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="ai_pct"
                name="AI Rate %"
                stroke={C.amber}
                fill="url(#gAITrends)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Role Comparison Bar */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 16px 8px",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              Role Comparison — {city || "All"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              Postings vs AI exposure across roles
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={roleComp} barGap={3}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.grid}
                vertical={false}
              />
              <XAxis dataKey="role" tick={{ fontSize: 8, fill: C.muted }} />
              <YAxis
                yAxisId="l"
                tick={{ fontSize: 9, fill: C.muted }}
                width={26}
              />
              <YAxis
                yAxisId="r"
                orientation="right"
                tick={{ fontSize: 9, fill: C.muted }}
                width={30}
                tickFormatter={(v) => (v * 100).toFixed(0) + "%"}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                yAxisId="l"
                dataKey="postings"
                name="Postings"
                fill={C.teal}
                radius={[3, 3, 0, 0]}
                fillOpacity={0.85}
              />
              <Bar
                yAxisId="r"
                dataKey="aiRate"
                name="AI Rate"
                fill={C.amber}
                radius={[3, 3, 0, 0]}
                fillOpacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* City Postings Bar */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 16px 8px",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              City-wise Postings — {role || "All"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              Volume & period change by city
            </div>
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={cityData} layout="vertical" barSize={8}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.grid}
                horizontal={false}
              />
              <XAxis type="number" tick={{ fontSize: 9, fill: C.muted }} />
              <YAxis
                dataKey="city"
                type="category"
                tick={{ fontSize: 9, fill: C.muted }}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="postings" name="Postings" radius={[0, 4, 4, 0]}>
                {cityData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.change >= 0 ? C.teal : C.accent}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Row: Radar + Vulnerability Table (compact) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showSkillCard ? "1fr 1.5fr" : "1fr",
          gap: 12,
        }}
      >
        {/* Skill Demand vs Supply Radar */}
        {showSkillCard && (
          <div
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "14px 16px 8px",
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                Skill Demand vs Supply
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                For {role || "All"} in {city || "All"}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              {radarData.length > 0 ? (
                <RadarChart
                  data={radarData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                >
                  <PolarGrid stroke={C.grid} />
                  <PolarAngleAxis
                    dataKey="skill"
                    tick={{ fontSize: 9, fill: C.muted }}
                  />
                  <PolarRadiusAxis tick={false} axisLine={false} />
                  <Radar
                    name="Demand"
                    dataKey="demand"
                    stroke={C.accent}
                    fill={C.accent}
                    fillOpacity={0.2}
                  />
                  <Radar
                    name="Supply"
                    dataKey="supply"
                    stroke={C.teal}
                    fill={C.teal}
                    fillOpacity={0.15}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, color: C.muted }} />
                </RadarChart>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: C.muted,
                    fontSize: 11,
                  }}
                >
                  No skill data for this selection
                </div>
              )}
            </ResponsiveContainer>
          </div>
        )}

        {/* Vulnerability mini-table */}
        <div
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: "14px 16px",
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
              Vulnerability Snapshot — {city || "All"}
            </div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
              Risk signals across active roles this period
            </div>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 150, overflowY: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 11,
              }}
            >
              <thead style={{ position: "sticky", top: 0, background: C.card }}>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Role", "Postings", "AI Rate", "Vuln", "Signal"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: "5px 8px",
                          textAlign: "left",
                          color: C.muted,
                          fontWeight: 500,
                          fontSize: 9,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {roleComp.map((r, i) => {
                  const score = r.vulnerability;
                  const level =
                    score >= 70
                      ? { label: "CRITICAL", color: C.accent }
                      : score >= 45
                        ? { label: "HIGH", color: C.amber }
                        : { label: "SAFE", color: C.teal };
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: `1px solid ${C.grid}`,
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = C.surface)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <td style={{ padding: "6px 8px", color: C.text }}>
                        {r.role}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          color: C.teal,
                          fontFamily: "monospace",
                        }}
                      >
                        {r.postings}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          color: C.amber,
                          fontFamily: "monospace",
                        }}
                      >
                        {(r.aiRate * 100).toFixed(0)}%
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            minWidth: 60,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 3,
                              background: C.grid,
                              borderRadius: 2,
                            }}
                          >
                            <div
                              style={{
                                width: score + "%",
                                height: "100%",
                                background: level.color,
                                borderRadius: 2,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              color: level.color,
                              fontFamily: "monospace",
                              fontSize: 10,
                            }}
                          >
                            {score}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        <span
                          style={{
                            background: `${level.color}22`,
                            color: level.color,
                            border: `1px solid ${level.color}44`,
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontSize: 9,
                            fontWeight: 600,
                            letterSpacing: "0.05em",
                          }}
                        >
                          {level.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            background: C.teal,
            borderRadius: "50%",
            display: "inline-block",
          }}
        />
        <span style={{ color: C.muted, fontSize: 10 }}>
          Data: Naukri scrape + PLFS microdata · Refreshed live ·{" "}
          {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
        </span>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
