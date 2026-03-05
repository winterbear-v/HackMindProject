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

  const fetch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 10 });
      if (city) params.append("city", city);
      if (role) params.append("role", role);
      const res = await axios.get(`/api/l1/skills?${params}`);
      setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, [city, role]);

  const maxDelta = data
    ? Math.max(
        ...[...data.rising, ...data.declining].map((s) => Math.abs(s.delta)),
        1,
      )
    : 1;

  const SkillRow = ({ skill, isRising }) => {
    const pct = skill.pct_change;
    const barW = Math.round((Math.abs(skill.delta) / maxDelta) * 100);
    const color = isRising ? "#4ec9b0" : "#ff6b6b";
    return (
      <div style={sr.row}>
        <div style={sr.skillName}>{skill.skill}</div>
        <div style={sr.barTrack}>
          <div
            style={{ ...sr.barFill, width: `${barW}%`, background: color }}
          />
        </div>
        <div style={{ ...sr.pct, color }}>
          {pct > 0 ? "+" : ""}
          {pct}%
        </div>
        <div style={sr.counts}>
          {skill.last_week} → {skill.this_week}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={sr.filters}>
        <select
          style={sr.select}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">All Cities</option>
          {CITIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          style={sr.select}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </div>

      {loading && <p style={sr.loading}>Loading skill trends…</p>}

      {data && (
        <div style={sr.grid}>
          <div style={sr.panel}>
            <h3 style={{ ...sr.panelTitle, color: "#4ec9b0" }}>
              Rising Skills
            </h3>
            {data.rising.length === 0 ? (
              <p style={sr.empty}>No data yet</p>
            ) : (
              data.rising.map((sk) => (
                <SkillRow key={sk.skill} skill={sk} isRising={true} />
              ))
            )}
          </div>
          <div style={sr.panel}>
            <h3 style={{ ...sr.panelTitle, color: "#ff6b6b" }}>
             Declining Skills
            </h3>
            {data.declining.length === 0 ? (
              <p style={sr.empty}>No data yet</p>
            ) : (
              data.declining.map((sk) => (
                <SkillRow key={sk.skill} skill={sk} isRising={false} />
              ))
            )}
          </div>
        </div>
      )}

      {data && (
        <p style={sr.note}>
          Week-over-week change based on skill mentions in job descriptions
          scraped from Naukri & LinkedIn.
        </p>
      )}
    </div>
  );
};

const sr = {
  filters: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
    marginBottom: "1.5rem",
  },
  select: {
    background: "#0f0f1a",
    color: "#fff",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.4rem 0.8rem",
    fontSize: "0.9rem",
  },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" },
  panel: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "10px",
    padding: "1.25rem",
  },
  panelTitle: { margin: "0 0 1rem", fontSize: "1rem" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    marginBottom: "0.6rem",
  },
  skillName: {
    width: "120px",
    fontSize: "0.82rem",
    color: "#c0c0d0",
    flexShrink: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  barTrack: {
    flex: 1,
    height: "8px",
    background: "#1a1a2e",
    borderRadius: "4px",
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: "4px", transition: "width 0.4s" },
  pct: {
    width: "50px",
    fontSize: "0.8rem",
    fontWeight: 600,
    textAlign: "right",
    flexShrink: 0,
  },
  counts: {
    width: "60px",
    fontSize: "0.72rem",
    color: "#606080",
    textAlign: "right",
    flexShrink: 0,
  },
  loading: { color: "#a0a0b0", textAlign: "center", padding: "2rem" },
  empty: { color: "#606080", fontStyle: "italic", fontSize: "0.85rem" },
  note: {
    color: "#606080",
    fontSize: "0.78rem",
    marginTop: "1.5rem",
    textAlign: "center",
  },
};

export default SkillsTab;
