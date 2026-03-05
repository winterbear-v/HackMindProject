import { useState } from "react";
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
    if (!form.title || !form.city || !form.xp_years || !form.writeup) {
      return setError("All fields are required.");
    }
    if (wordCount < 30) return setError("Writeup must be at least 30 words.");
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/l2/profile", {
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
        <h2 style={f.title}>👤 Worker Profile</h2>
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
          <label style={f.label}>Current Job Title</label>
          <input
            style={f.input}
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="e.g. BPO Executive, Data Entry Operator"
          />
        </div>
        <div style={f.field}>
          <label style={f.label}>City</label>
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
          <label style={f.label}>Years of Experience</label>
          <input
            style={f.input}
            name="xp_years"
            type="number"
            min="0"
            max="50"
            value={form.xp_years}
            onChange={handleChange}
            placeholder="e.g. 3"
          />
        </div>
      </div>

      <div style={f.field}>
        <label style={f.label}>
          Work Description
          <span
            style={{
              ...f.wordCount,
              color: wordCount < 30 ? "#ff6b6b" : "#4ec9b0",
            }}
          >
            {wordCount} words {wordCount < 30 ? "(min 30)" : "✓"}
          </span>
        </label>
        <textarea
          style={f.textarea}
          name="writeup"
          value={form.writeup}
          onChange={handleChange}
          rows={6}
          placeholder="Describe your current job, daily tasks, tools you use, and skills you have. Mention any concerns about automation. (100–200 words)"
        />
      </div>

      <button
        style={{ ...f.btn, ...(loading ? f.btnDisabled : {}) }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Analysing…" : "Analyse My Risk"}
      </button>
    </div>
  );
};

const f = {
  wrap: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.5rem",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  title: { margin: 0, color: "#fff", fontSize: "1.2rem" },
  sampleBtn: {
    background: "#1a1a2e",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.35rem 0.8rem",
    cursor: "pointer",
    fontSize: "0.82rem",
  },
  sub: { color: "#606080", fontSize: "0.85rem", margin: "0 0 1.25rem" },
  error: {
    background: "#3d0c1a",
    color: "#ff6b6b",
    padding: "0.65rem 1rem",
    borderRadius: "6px",
    marginBottom: "1rem",
    fontSize: "0.88rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "1rem",
    marginBottom: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    marginBottom: "0.75rem",
  },
  label: {
    color: "#a0a0b0",
    fontSize: "0.83rem",
    fontWeight: 600,
    display: "flex",
    justifyContent: "space-between",
  },
  wordCount: { fontSize: "0.75rem", fontWeight: 400 },
  input: {
    background: "#0f0f1a",
    color: "#fff",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.55rem 0.8rem",
    fontSize: "0.9rem",
  },
  textarea: {
    background: "#0f0f1a",
    color: "#fff",
    border: "1px solid #2a2a4a",
    borderRadius: "6px",
    padding: "0.65rem 0.8rem",
    fontSize: "0.88rem",
    resize: "vertical",
    lineHeight: 1.6,
  },
  btn: {
    width: "100%",
    padding: "0.85rem",
    background: "#e94560",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  btnDisabled: { background: "#555", cursor: "not-allowed" },
};

export default ProfileForm;
