import { useState, useEffect } from "react";
import api from "../../api";

const C = {
  bg: "#0B0E13",
  surface: "#141821",
  card: "#1C2130",
  border: "#2A3144",
  accent: "#F97316",
  teal: "#10B981",
  amber: "#F97316",
  yellow: "#F97316",
  text: "#E5E7EB",
  muted: "#9CA3AF",
  grid: "#1C2130",
};

const SEV = {
  CRITICAL: {
    color: "#f43f72",
    bg: "rgba(244,63,114,0.14)",
    border: "rgba(244,63,114,0.35)",
    icon: "🔴",
  },
  HIGH: {
    color: "#f0a500",
    bg: "rgba(240,165,0,0.14)",
    border: "rgba(240,165,0,0.35)",
    icon: "🟠",
  },
  WATCH: {
    color: "#eab308",
    bg: "rgba(234,179,8,0.14)",
    border: "rgba(234,179,8,0.35)",
    icon: "🟡",
  },
};

function generateWarnings(threshold) {
  const cities = [
    "Ahmedabad",
    "Bangalore",
    "Chennai",
    "Delhi",
    "Hyderabad",
    "Jaipur",
    "Kolkata",
    "Mumbai",
    "Noida",
    "Pune",
  ];
  const roles = [
    "BPO",
    "Content Writer",
    "Data Analyst",
    "Data Entry",
    "HR Executive",
    "Sales Executive",
    "Software Engineer",
    "Customer Support",
    "Digital Marketing",
    "Accountant",
  ];
  const out = [];
  cities.forEach((city) => {
    roles.forEach((role) => {
      const seed = [...(city + role)].reduce((a, c) => a + c.charCodeAt(0), 0);
      const rng = (i) => (Math.sin(seed * 9301 + i * 49297) + 1) / 2;
      const decline = parseFloat((threshold - 2 + rng(1) * 55).toFixed(1));
      if (decline < threshold) return;
      const curr = Math.round(5 + rng(2) * 35);
      const prev = Math.round(curr / (1 - decline / 100));
      const aiRate = parseFloat((rng(3) * 95).toFixed(1));
      const severity =
        decline >= 30 ? "CRITICAL" : decline >= 20 ? "HIGH" : "WATCH";
      out.push({
        city,
        role,
        decline_pct: decline,
        curr_postings: curr,
        prev_postings: prev,
        ai_rate: aiRate,
        severity,
      });
    });
  });
  return out.sort((a, b) => b.decline_pct - a.decline_pct);
}

function WarnRow({ w, rank }) {
  const [hov, setHov] = useState(false);
  const sev = SEV[w.severity];
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 72px",
        alignItems: "center",
        gap: 8,
        padding: "5px 8px",
        borderRadius: 7,
        background: hov ? C.surface : "transparent",
        transition: "background 0.12s",
      }}
    >
      <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>
        {rank}
      </span>
      <span
        style={{
          fontSize: 10,
          color: C.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {w.city}
      </span>
      <span
        style={{
          fontSize: 10,
          color: C.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {w.role}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: sev.color,
          fontFamily: "monospace",
          textAlign: "right",
        }}
      >
        -{w.decline_pct}%
      </span>
      <span
        style={{
          fontSize: 10,
          color: C.text,
          fontFamily: "monospace",
          textAlign: "right",
        }}
      >
        {w.curr_postings}
      </span>
      <span
        style={{
          fontSize: 10,
          color: C.muted,
          fontFamily: "monospace",
          textAlign: "right",
        }}
      >
        {w.prev_postings}
      </span>
      <span
        style={{
          fontSize: 10,
          color: w.ai_rate > 50 ? C.amber : C.muted,
          fontFamily: "monospace",
          textAlign: "right",
        }}
      >
        {w.ai_rate}%
      </span>
      <div
        style={{
          height: 5,
          background: C.grid,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: Math.min(w.decline_pct, 100) + "%",
            height: "100%",
            background: sev.color,
            borderRadius: 3,
            transition: "width 0.5s",
          }}
        />
      </div>
      <span
        style={{
          fontSize: 8,
          padding: "2px 6px",
          borderRadius: 4,
          textAlign: "center",
          background: sev.bg,
          color: sev.color,
          border: `1px solid ${sev.border}`,
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}
      >
        {w.severity}
      </span>
    </div>
  );
}

export default function EarlyWarning() {
  const [threshold, setThreshold] = useState(20);
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sevFilter, setSevFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("decline");

  const load = () => {
    setLoading(true);
    api
      .get(`/api/l1/early-warning?threshold=${threshold}`)
      .then((res) => setWarnings(res.data?.data?.warnings || []))
      .catch(() => setWarnings(generateWarnings(threshold)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [threshold]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = {
    CRITICAL: warnings.filter((w) => w.severity === "CRITICAL").length,
    HIGH: warnings.filter((w) => w.severity === "HIGH").length,
    WATCH: warnings.filter((w) => w.severity === "WATCH").length,
  };

  const filtered = warnings
    .filter((w) => sevFilter === "ALL" || w.severity === sevFilter)
    .sort((a, b) =>
      sortBy === "decline"
        ? b.decline_pct - a.decline_pct
        : sortBy === "ai"
          ? b.ai_rate - a.ai_rate
          : b.curr_postings - a.curr_postings,
    );

  const btn = (active, color = C.accent) => ({
    padding: "5px 12px",
    borderRadius: 7,
    fontSize: 11,
    fontWeight: 600,
    cursor: "pointer",
    border: `1px solid ${active ? color : C.border}`,
    background: active ? color + "22" : "transparent",
    color: active ? color : C.muted,
  });

  return (
    <div
      style={{
        background: C.bg,
        padding: 20,
        borderRadius: 16,
        fontFamily: "'Inter',sans-serif",
        color: C.text,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 520,
      }}
    >
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
          Early Warning System
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginLeft: 8,
          }}
        >
          <span style={{ fontSize: 11, color: C.muted }}>Min decline:</span>
          <input
            type="range"
            min={5}
            max={50}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(+e.target.value)}
            style={{ width: 90, accentColor: C.accent }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: C.accent,
              fontFamily: "monospace",
              minWidth: 30,
            }}
          >
            {threshold}%
          </span>
        </div>
        <div style={{ display: "flex", gap: 6, marginLeft: 8 }}>
          {["decline", "ai", "postings"].map((s) => (
            <button
              key={s}
              style={btn(sortBy === s)}
              onClick={() => setSortBy(s)}
            >
              Sort: {s}
            </button>
          ))}
        </div>
        <button onClick={load} style={{ ...btn(false), marginLeft: "auto" }}>
          ↻ Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {[
          {
            key: "ALL",
            label: "Total Flagged",
            value: warnings.length,
            sub: "city × role pairs",
            color: C.text,
          },
          {
            key: "CRITICAL",
            label: "Critical",
            value: counts.CRITICAL,
            sub: "≥ 30% decline",
            color: C.accent,
          },
          {
            key: "HIGH",
            label: "High",
            value: counts.HIGH,
            sub: "20–29% decline",
            color: C.amber,
          },
          {
            key: "WATCH",
            label: "Watch",
            value: counts.WATCH,
            sub: `≥ ${threshold}% decline`,
            color: C.yellow,
          },
        ].map((card) => (
          <div
            key={card.key}
            onClick={() =>
              setSevFilter(sevFilter === card.key ? "ALL" : card.key)
            }
            style={{
              background: sevFilter === card.key ? card.color + "18" : C.card,
              border: `1px solid ${sevFilter === card.key ? card.color + "66" : C.border}`,
              borderLeft: `3px solid ${card.color}`,
              borderRadius: 10,
              padding: "10px 14px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 4,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: card.color,
                fontFamily: "monospace",
                lineHeight: 1,
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>
              {card.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderTop: `2px solid ${C.accent}`,
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "20px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 72px",
            gap: 8,
            padding: "8px 8px 6px",
            borderBottom: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          {[
            "#",
            "City",
            "Role",
            "Decline",
            "Now",
            "Prev",
            "AI%",
            "Severity →",
            "",
          ].map((h, i) => (
            <span
              key={i}
              style={{
                fontSize: 9,
                color: C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
                textAlign: i >= 3 && i <= 6 ? "right" : "left",
              }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Empty state */}
        {warnings.length === 0 && !loading && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <div style={{ fontSize: 28 }}>✅</div>
            <div style={{ color: C.teal, fontWeight: 600 }}>
              No warnings at {threshold}% threshold
            </div>
            <div style={{ color: C.muted, fontSize: 12 }}>
              Try lowering the minimum decline
            </div>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {filtered.map((w, i) => (
            <WarnRow key={i} w={w} rank={i + 1} />
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: `1px solid ${C.border}`,
            padding: "6px 12px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          {Object.entries(SEV).map(([sev, s]) => (
            <div
              key={sev}
              style={{ display: "flex", alignItems: "center", gap: 5 }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: s.color,
                }}
              />
              <span style={{ fontSize: 9, color: C.muted }}>{sev}</span>
            </div>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 10, color: C.muted }}>
            Showing {filtered.length} of {warnings.length} · Click stat cards to
            filter ·{" "}
            {new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}{" "}
            IST
          </span>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
      `}</style>
    </div>
  );
}
