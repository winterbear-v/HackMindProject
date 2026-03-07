import { useState, useEffect } from "react";
import api from "../../api";
import {
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  Line,
  Cell,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ============================================================================
// Color palette – clean, muted, professional (Stripe / Bloomberg inspired)
// ============================================================================
const C = {
  bg: "#0b0e14",
  surface: "#131720",
  card: "#1a1f2a",
  border: "#2a2f3a",
  accent: "#f43f72",
  teal: "#00b8a9",
  amber: "#f7b731",
  violet: "#a78bfa",
  text: "#edf2f7",
  textMuted: "#8f9bb3",
  grid: "#252a35",
};

const PIE_COLORS = [
  "#f43f72",
  "#00b8a9",
  "#f7b731",
  "#a78bfa",
  "#38bdf8",
  "#34d399",
  "#fb923c",
  "#e879f9",
  "#facc15",
  "#94a3b8",
];
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

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n));
const sign = (n) => (n > 0 ? "+" : "") + n + "%";
const trendColor = (n) => (n > 0 ? C.teal : n < 0 ? C.accent : C.textMuted);

// ============================================================================
// Static skill suggestions by role
// ============================================================================
const SKILLS_BY_ROLE = {
  "software engineer": ["Python", "Machine Learning", "Prompt Engineering"],
  "data analyst": ["SQL", "Python", "Data Visualization", "Excel"],
  "data entry": [
    "Typing Speed",
    "Excel",
    "Data Management",
    "Attention to Detail",
  ],
  bpo: ["Communication", "CRM Tools", "Problem Solving", "Adaptability"],
  "customer support": [
    "Communication",
    "Empathy",
    "CRM",
    "Conflict Resolution",
  ],
  "content writer": ["SEO", "Copywriting", "Content Strategy", "Editing"],
  "hr executive": ["Recruiting", "HRMS", "Employee Relations", "Communication"],
  accountant: ["Tally", "GST", "Excel", "Financial Reporting"],
  "sales executive": [
    "Sales Techniques",
    "CRM",
    "Negotiation",
    "Communication",
  ],
  "digital marketing": [
    "SEO",
    "Social Media",
    "Google Analytics",
    "Content Marketing",
  ],
};
const DEFAULT_SKILLS = [
  "Critical Thinking",
  "Adaptability",
  "AI Literacy",
  "Communication",
];

// ============================================================================
// Helper: derive role / city data + insights
// ============================================================================
function deriveAll(series) {
  const roleMap = {},
    cityMap = {};
  for (const [label, pts] of Object.entries(series || {})) {
    const [city, role] = label.split(" — ").map((s) => s?.trim() || "");
    if (!city || !role) continue;
    const total = pts.reduce((a, p) => a + p.count, 0);
    const aiAvg = pts.length
      ? pts.reduce((a, p) => a + (p.ai_rate || 0), 0) / pts.length
      : 0;
    const mid = Math.floor(pts.length / 2);
    const prev = pts.slice(0, mid).reduce((a, p) => a + p.count, 0);
    const curr = pts.slice(mid).reduce((a, p) => a + p.count, 0);
    const change = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    if (!roleMap[role])
      roleMap[role] = {
        postings: 0,
        aiSum: 0,
        aiCount: 0,
        prevSum: 0,
        currSum: 0,
      };
    roleMap[role].postings += total;
    roleMap[role].aiSum += aiAvg * (pts.length || 1);
    roleMap[role].aiCount += pts.length || 1;
    roleMap[role].prevSum += prev;
    roleMap[role].currSum += curr;
    if (!cityMap[city]) cityMap[city] = { postings: 0, prevSum: 0, currSum: 0 };
    cityMap[city].postings += total;
    cityMap[city].prevSum += prev;
    cityMap[city].currSum += curr;
  }

  const roleComp = Object.entries(roleMap)
    .map(([role, r]) => ({
      role: role.length > 14 ? role.slice(0, 13) + "…" : role,
      fullRole: role,
      postings: Math.round(r.postings),
      aiRate: parseFloat((r.aiCount ? r.aiSum / r.aiCount : 0).toFixed(3)),
      change: parseFloat(
        (r.prevSum > 0
          ? ((r.currSum - r.prevSum) / r.prevSum) * 100
          : 0
        ).toFixed(1),
      ),
    }))
    .sort((a, b) => b.postings - a.postings);

  const cityData = Object.entries(cityMap)
    .map(([city, r]) => ({
      city: city.length > 9 ? city.slice(0, 8) + "…" : city,
      fullCity: city,
      postings: Math.round(r.postings),
      change: parseFloat(
        (r.prevSum > 0
          ? ((r.currSum - r.prevSum) / r.prevSum) * 100
          : 0
        ).toFixed(1),
      ),
    }))
    .sort((a, b) => b.postings - a.postings);

  const declining = roleComp
    .filter((r) => r.change < 0)
    .sort((a, b) => a.change - b.change);
  const growing = roleComp
    .filter((r) => r.change > 0)
    .sort((a, b) => b.change - a.change);
  const highAI = roleComp.sort((a, b) => b.aiRate - a.aiRate).slice(0, 3);
  const insights = [];
  if (declining[0])
    insights.push({
      type: "warning",
      msg: `${declining[0].fullRole} postings fell ${Math.abs(declining[0].change).toFixed(1)}% — highest AI exposure`,
    });
  if (growing[0])
    insights.push({
      type: "positive",
      msg: `${growing[0].fullRole} grew ${growing[0].change.toFixed(1)}% — consider upskilling here`,
    });
  if (highAI[0])
    insights.push({
      type: "info",
      msg: `${highAI[0].fullRole} has highest AI tool mention rate (${(highAI[0].aiRate * 100).toFixed(1)}%)`,
    });

  return { roleComp, cityData, insights };
}

// ============================================================================
// Tooltip helpers
// ============================================================================
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: 12,
      }}
    >
      <div style={{ color: C.textMuted, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          <strong>{p.name}:</strong>{" "}
          {typeof p.value === "number" && p.name?.toLowerCase().includes("rate")
            ? (p.value * 100).toFixed(1) + "%"
            : p.value}
        </div>
      ))}
    </div>
  );
};

const DonutLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}) => {
  if (percent < 0.07) return null;
  const RAD = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={9}
      fontWeight={600}
    >
      {(percent * 100).toFixed(0)}%
    </text>
  );
};

// ============================================================================
// Main Component
// ============================================================================
export default function TrendsTab() {
  const [city, setCity] = useState("");
  const [role, setRole] = useState("");
  const [win, setWin] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ window: win });
    if (city) p.append("city", city);
    if (role) p.append("role", role);
    api
      .get(`/api/l1/trends?${p}`)
      .then((r) => {
        if (r.data?.data) setData(r.data.data);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [city, role, win]);

  if (!data) {
    return (
      <div
        style={{
          background: C.bg,
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
        }}
      >
        <div
          style={{
            color: C.accent,
            fontFamily: "monospace",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: C.card,
            padding: "20px 32px",
            borderRadius: 40,
            border: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              border: `2px solid ${C.border}`,
              borderTopColor: C.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          {loading ? "Loading signals …" : "No data — Start Scraper in Admin"}
        </div>
      </div>
    );
  }

  const { roleComp, cityData, insights } = deriveAll(data.series);

  // Aggregate time series for area charts
  const dateMap = {};
  for (const pts of Object.values(data.series || {})) {
    for (const p of pts) {
      if (!dateMap[p.date])
        dateMap[p.date] = { date: p.date, count: 0, ai_rate: 0, n: 0 };
      dateMap[p.date].count += p.count;
      dateMap[p.date].ai_rate += p.ai_rate || 0;
      dateMap[p.date].n += 1;
    }
  }
  const timeSeries = Object.values(dateMap)
    .map((x) => ({
      date: x.date,
      count: x.count,
      ai_pct: parseFloat((x.n ? x.ai_rate / x.n : 0).toFixed(3)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const selectedRoleKey = role.toLowerCase();
  const suggestedSkills = SKILLS_BY_ROLE[selectedRoleKey] || DEFAULT_SKILLS;

  const selStyle = {
    background: C.surface,
    color: C.text,
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer",
  };
  const btnStyle = (active) => ({
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? C.accent : C.border}`,
    background: active ? C.accent + "22" : "transparent",
    color: active ? C.accent : C.textMuted,
  });

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
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {WINDOWS.map((w) => (
            <button
              key={w}
              style={btnStyle(win === w)}
              onClick={() => setWin(w)}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {/* Insight pills */}
      {insights.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          {insights.map((ins, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 20,
                border: `1px solid ${ins.type === "warning" ? C.accent : ins.type === "positive" ? C.teal : C.violet}`,
                color:
                  ins.type === "warning"
                    ? C.accent
                    : ins.type === "positive"
                      ? C.teal
                      : C.violet,
                background:
                  ins.type === "warning"
                    ? C.accent + "11"
                    : ins.type === "positive"
                      ? C.teal + "11"
                      : C.violet + "11",
              }}
            >
              {ins.type === "warning"
                ? "⚠️"
                : ins.type === "positive"
                  ? "📈"
                  : "ℹ️"}{" "}
              {ins.msg}
            </div>
          ))}
        </div>
      )}

      {/* Row 1: Area charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Job postings over time */}
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
            Job Postings Over Time
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="gCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.teal} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: C.textMuted }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: C.textMuted }}
                tickLine={false}
                axisLine={false}
                tickFormatter={fmt}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Postings"
                stroke={C.teal}
                fill="url(#gCount)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* AI mention rate */}
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
            AI Tool Mention Rate
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="gAI" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: C.textMuted }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: C.textMuted }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v * 100).toFixed(0) + "%"}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="ai_pct"
                name="AI Rate"
                stroke={C.accent}
                fill="url(#gAI)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Role comparison bar + city donut + skills */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {/* Role comparison */}
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
            Postings by Role + % Change
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart
              data={roleComp}
              layout="vertical"
              margin={{ left: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={C.grid}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 9, fill: C.textMuted }}
                tickLine={false}
                tickFormatter={fmt}
              />
              <YAxis
                type="category"
                dataKey="role"
                tick={{ fontSize: 9, fill: C.textMuted }}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="postings" name="Postings" radius={[0, 4, 4, 0]}>
                {roleComp.map((r, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="change"
                name="Change%"
                stroke={C.amber}
                strokeWidth={2}
                dot={{ fill: C.amber, r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* City donut */}
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
            Postings by City
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie
                data={cityData.slice(0, 8)}
                dataKey="postings"
                nameKey="city"
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                paddingAngle={2}
                labelLine={false}
                label={<DonutLabel />}
              >
                {cityData.slice(0, 8).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [fmt(v), n]} />
            </PieChart>
          </ResponsiveContainer>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}
          >
            {cityData.slice(0, 6).map((c, i) => (
              <span
                key={c.city}
                style={{
                  fontSize: 9,
                  color: PIE_COLORS[i % PIE_COLORS.length],
                }}
              >
                ● {c.city}
              </span>
            ))}
          </div>
        </div>

        {/* Suggested skills */}
        <div
          style={{
            background: C.card,
            borderRadius: 12,
            padding: 16,
            border: `1px solid ${C.border}`,
          }}
        >
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
            {role ? `Skills to Learn — ${role}` : "Suggested Skills"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {suggestedSkills.map((sk, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                }}
              >
                <span style={{ color: C.teal, fontWeight: 700 }}>{i + 1}.</span>
                <span style={{ color: C.text }}>{sk}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: C.textMuted }}>
            Based on current job market demand
          </div>
        </div>
      </div>

      {/* Row 3: City bar chart */}
      <div
        style={{
          background: C.card,
          borderRadius: 12,
          padding: 16,
          border: `1px solid ${C.border}`,
        }}
      >
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>
          City Breakdown — Postings & Change
        </div>
        <ResponsiveContainer width="100%" height={140}>
          <ComposedChart data={cityData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis
              dataKey="city"
              tick={{ fontSize: 9, fill: C.textMuted }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: C.textMuted }}
              tickLine={false}
              axisLine={false}
              tickFormatter={fmt}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 9, fill: C.textMuted }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v + "%"}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              yAxisId="left"
              dataKey="postings"
              name="Postings"
              radius={[4, 4, 0, 0]}
            >
              {cityData.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="change"
              name="Change%"
              stroke={C.amber}
              strokeWidth={2}
              dot={{ fill: C.amber, r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
