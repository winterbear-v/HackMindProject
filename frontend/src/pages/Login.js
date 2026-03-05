import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(formData.email, formData.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message || "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.sub}>Sign in to your account</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>Email</label>
        <input
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          style={styles.input}
          placeholder="you@example.com"
          required
        />

        <label style={styles.label}>Password</label>
        <input
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          style={styles.input}
          placeholder="••••••••"
          required
        />

        <button type="submit" style={styles.btn} disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p style={styles.footer}>
          Don't have an account?{" "}
          <Link to="/register" style={styles.link}>
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "90vh",
    background: "#0f0f1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  form: {
    background: "#1a1a2e",
    padding: "2.5rem",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "420px",
    border: "1px solid #2a2a4a",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  title: { color: "#e94560", margin: 0, fontSize: "1.8rem" },
  sub: { color: "#a0a0b0", margin: "0 0 0.5rem" },
  error: {
    background: "#3d0c1a",
    color: "#ff6b6b",
    padding: "0.75rem",
    borderRadius: "6px",
    fontSize: "0.9rem",
  },
  label: { color: "#c0c0d0", fontSize: "0.9rem" },
  input: {
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    border: "1px solid #2a2a4a",
    background: "#0f0f1a",
    color: "#fff",
    fontSize: "1rem",
    outline: "none",
  },
  btn: {
    marginTop: "0.5rem",
    background: "#e94560",
    color: "#fff",
    border: "none",
    padding: "0.85rem",
    borderRadius: "8px",
    fontSize: "1rem",
    cursor: "pointer",
    fontWeight: 600,
  },
  footer: { textAlign: "center", color: "#a0a0b0", fontSize: "0.9rem" },
  link: { color: "#e94560" },
};

export default Login;
