import { useState, useEffect, useRef } from "react";
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

const AdminPanel = () => {
  const [status, setStatus] = useState(null);
  const [selCities, setSelCities] = useState([]);
  const [selRoles, setSelRoles] = useState([]);
  const [log, setLog] = useState([]);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef(null);

  const fetchStatus = async () => {
    try {
      const res = await axios.get("/api/l1/status");
      setStatus(res.data.data);
      return res.data.data;
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const startScraper = async () => {
    const params = new URLSearchParams();
    if (selCities.length) params.append("cities", selCities.join(","));
    if (selRoles.length) params.append("roles", selRoles.join(","));
    try {
      const res = await axios.post(`/api/l1/scrape?${params}`);
      addLog(
        `${res.data.message} — ${res.data.cities.length} cities x ${res.data.roles.length} roles`,
      );
      startPolling();
    } catch (e) {
      addLog(`${e.response?.data?.message || e.message}`);
    }
  };

  const addLog = (msg) => {
    const ts = new Date().toLocaleTimeString();
    setLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  };

  const startPolling = () => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      const st = await fetchStatus();
      if (st && !st.running) {
        clearInterval(pollRef.current);
        setPolling(false);
        addLog(
          `Scraper done. ${st.last_result?.new_posts ?? 0} new posts, ${st.last_result?.existing_posts ?? 0} existing.`,
        );
        if (st.last_result?.errors?.length) {
          addLog(`Errors: ${st.last_result.errors.slice(0, 3).join(" | ")}`);
        }
      }
    }, 3000);
  };

  useEffect(() => () => clearInterval(pollRef.current), []);

  const toggle = (arr, setArr, val) =>
    setArr((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
    );

  return (
    <div>
      {/* Status bar */}
      <div style={a.statusBar}>
        <div style={a.statusDot(status?.running)} />
        <span
          style={{
            color: status?.running ? "#4ec9b0" : "#a0a0b0",
            fontSize: "0.9rem",
          }}
        >
          {status?.running ? "Scraper Running…" : "Scraper Idle"}
        </span>
        {status && (
          <>
            <span style={a.stat}>
              {status.total_job_posts.toLocaleString()} job posts
            </span>
            <span style={a.stat}>
              {status.total_aggregates.toLocaleString()} aggregates
            </span>
            {status.last_run && (
              <span style={a.stat}>
                Last run: {new Date(status.last_run).toLocaleString()}
              </span>
            )}
          </>
        )}
        <button style={a.refreshBtn} onClick={fetchStatus}>
          Refresh
        </button>
      </div>

      <div style={a.grid}>
        {/* City selector */}
        <div style={a.panel}>
          <div style={a.panelTitle}>
            Cities <span style={a.hint}>(empty = all {CITIES.length})</span>
          </div>
          <div style={a.chips}>
            {CITIES.map((c) => (
              <button
                key={c}
                style={{
                  ...a.chip,
                  ...(selCities.includes(c) ? a.chipActive : {}),
                }}
                onClick={() => toggle(CITIES, setSelCities, c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button style={a.clearBtn} onClick={() => setSelCities([])}>
            Clear selection
          </button>
        </div>

        {/* Role selector */}
        <div style={a.panel}>
          <div style={a.panelTitle}>
            Roles <span style={a.hint}>(empty = all {ROLES.length})</span>
          </div>
          <div style={a.chips}>
            {ROLES.map((r) => (
              <button
                key={r}
                style={{
                  ...a.chip,
                  ...(selRoles.includes(r) ? a.chipActive : {}),
                }}
                onClick={() => toggle(ROLES, setSelRoles, r)}
              >
                {r}
              </button>
            ))}
          </div>
          <button style={a.clearBtn} onClick={() => setSelRoles([])}>
            Clear selection
          </button>
        </div>
      </div>

      {/* Launch button */}
      <button
        style={{ ...a.launch, ...(status?.running ? a.launchDisabled : {}) }}
        disabled={status?.running || polling}
        onClick={startScraper}
      >
        {status?.running ? "Scraping in progress…" : "Start Scraper"}
      </button>

      {/* Log output */}
      <div style={a.logBox}>
        <div style={a.logTitle}> Activity Log</div>
        {log.length === 0 ? (
          <p style={a.logEmpty}>No activity yet. Start the scraper above.</p>
        ) : (
          log.map((l, i) => (
            <div key={i} style={a.logLine}>
              {l}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const a = {
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap",
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    marginBottom: "1.25rem",
    fontSize: "0.85rem",
  },
  statusDot: (running) => ({
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: running ? "#4ec9b0" : "#555",
    flexShrink: 0,
    boxShadow: running ? "0 0 6px #4ec9b0" : "none",
  }),
  stat: {
    color: "#606080",
    padding: "0 0.5rem",
    borderLeft: "1px solid #2a2a4a",
  },
  refreshBtn: {
    marginLeft: "auto",
    background: "transparent",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1rem",
  },
  panel: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "1rem",
  },
  panelTitle: {
    color: "#c0c0d0",
    fontWeight: 600,
    marginBottom: "0.75rem",
    fontSize: "0.9rem",
  },
  hint: { color: "#606080", fontWeight: 400, fontSize: "0.78rem" },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    marginBottom: "0.6rem",
  },
  chip: {
    background: "#1a1a2e",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.25rem 0.6rem",
    cursor: "pointer",
    fontSize: "0.78rem",
  },
  chipActive: {
    background: "#e9456033",
    color: "#e94560",
    border: "1px solid #e94560",
  },
  clearBtn: {
    background: "transparent",
    color: "#606080",
    border: "none",
    cursor: "pointer",
    fontSize: "0.75rem",
    padding: 0,
  },
  launch: {
    width: "100%",
    padding: "0.85rem",
    background: "#e94560",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "1.25rem",
    letterSpacing: "0.03em",
  },
  launchDisabled: { background: "#555", cursor: "not-allowed" },
  logBox: {
    background: "#0a0a12",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "1rem",
    maxHeight: "220px",
    overflowY: "auto",
    fontFamily: "monospace",
  },
  logTitle: { color: "#606080", fontSize: "0.78rem", marginBottom: "0.5rem" },
  logLine: {
    color: "#c0c0d0",
    fontSize: "0.8rem",
    marginBottom: "0.2rem",
    lineHeight: 1.5,
  },
  logEmpty: {
    color: "#606080",
    fontSize: "0.82rem",
    fontStyle: "italic",
    margin: 0,
  },
};

export default AdminPanel;
