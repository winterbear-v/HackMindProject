import { useState } from "react";
import api from "../../api";

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

const SAMPLE_WRITEUPS = {
  "BPO Executive":
    "I work as a BPO executive handling inbound customer calls for a telecom client. My daily tasks include resolving customer queries, updating CRM records, and escalating technical issues. I use MS Office and the company internal CRM tool. I have basic communication skills and am comfortable with typing and data entry.",
  "Data Entry Operator":
    "I do data entry work for a logistics company. I enter invoice details, shipment records, and customer data into Excel and Tally. I can type fast around 40 WPM. I have basic knowledge of MS Office. My manager told us they are evaluating automation software to replace manual data entry.",
  "Data Analyst":
    "I am a data analyst at a fintech startup. I use Python, SQL, and Tableau daily for creating dashboards and business reports. I have experience with data cleaning, EDA, and statistical analysis. I also know basic machine learning using scikit-learn.",
};

const ProfileForm = ({ onSubmit }) => {
  const [form, setForm] = useState({
    title: "",
    city: "",
    xp_years: "",
    writeup: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const wordCount = form.writeup.trim().split(/\s+/).filter(Boolean).length;

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const loadSample = () => {
    const titles = Object.keys(SAMPLE_WRITEUPS);
    const t = titles[Math.floor(Math.random() * titles.length)];
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    setForm({
      title: t,
      city,
      xp_years: String(Math.floor(Math.random() * 8) + 1),
      writeup: SAMPLE_WRITEUPS[t],
    });
  };

  const handleSubmit = async () => {
    if (!form.title || !form.city || !form.xp_years || !form.writeup)
      return setError("All fields are required.");
    if (wordCount < 30) return setError("Writeup must be at least 30 words.");
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/api/l2/profile", {
        ...form,
        xp_years: parseFloat(form.xp_years),
      });
      onSubmit(res.data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to create profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={f.wrap}>
      <div style={f.header}>
        <h2 style={f.title}>Worker Profile</h2>
        <button style={f.sampleBtn} onClick={loadSample}>
          Load Sample Profile
        </button>
      </div>
      <p style={f.sub}>
        Fill in your details to get your AI Risk Score and personalised
        reskilling plan.
      </p>

      {error && <div style={f.error}>{error}</div>}

      <div style={f.grid}>
        <div style={f.field}>
          <label style={f.label}>Job Title *</label>
          <input
            style={f.input}
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. BPO Executive, Data Analyst"
          />
        </div>
        <div style={f.field}>
          <label style={f.label}>City *</label>
          <select
            style={f.input}
            name="city"
            value={form.city}
            onChange={handleChange}
          >
            <option value="">Select city…</option>
            {CITIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div style={f.field}>
          <label style={f.label}>Years of Experience *</label>
          <input
            style={f.input}
            name="xp_years"
            type="number"
            min="0"
            max="40"
            step="0.5"
            value={form.xp_years}
            onChange={handleChange}
            placeholder="e.g. 3"
          />
        </div>
      </div>

      <div style={f.field}>
        <label style={f.label}>
          Work Description * &nbsp;
          <span
            style={{
              color: wordCount >= 30 ? "#10B981" : "#9CA3AF",
              fontWeight: 400,
            }}
          >
            ({wordCount} words
            {wordCount < 30 ? ` — need ${30 - wordCount} more` : " ✓"})
          </span>
        </label>
        <textarea
          style={{ ...f.input, height: "140px", resize: "vertical" }}
          name="writeup"
          value={form.writeup}
          onChange={handleChange}
          placeholder="Describe your daily tasks, tools you use, skills you have, and any automation concerns…"
        />
      </div>

      <button
        style={{ ...f.submitBtn, ...(loading ? f.submitDisabled : {}) }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Creating Profile…" : "Analyse My Risk →"}
      </button>
    </div>
  );
};

const f = {
  wrap: {
    background: "#141821",
    border: "1px solid #2A3144",
    borderRadius: "12px",
    padding: "1.5rem",
    fontFamily: "'Inter',sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
  },
  title: { color: "#E5E7EB", fontWeight: 700, fontSize: "1.1rem", margin: 0 },
  sampleBtn: {
    background: "transparent",
    color: "#F97316",
    border: "1px solid #F97316",
    borderRadius: "6px",
    padding: "0.35rem 0.75rem",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  sub: { color: "#9CA3AF", fontSize: "0.85rem", margin: "0 0 1.25rem" },
  error: {
    background: "rgba(239,68,68,0.12)",
    border: "1px solid rgba(239,68,68,0.4)",
    color: "#F87171",
    borderRadius: "6px",
    padding: "0.6rem 0.9rem",
    fontSize: "0.85rem",
    marginBottom: "1rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "1rem",
    marginBottom: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginBottom: "1rem",
  },
  label: { color: "#9CA3AF", fontSize: "0.78rem", fontWeight: 600 },
  input: {
    background: "#1C2130",
    border: "1px solid #2A3144",
    borderRadius: "6px",
    color: "#E5E7EB",
    padding: "0.55rem 0.75rem",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  submitBtn: {
    width: "100%",
    background: "#F97316",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.8rem",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  submitDisabled: { background: "#4B5563", cursor: "not-allowed" },
};

export default ProfileForm;
