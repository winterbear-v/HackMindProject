import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.welcome}>
          <div style={styles.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
          <div>
            <h1 style={styles.title}>Welcome, {user?.name}!</h1>
            <p style={styles.sub}>
              {user?.email} · <span style={styles.badge}>{user?.role}</span>
            </p>
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Profile Info</h3>
            <p>
              <span style={styles.key}>User ID:</span> {user?._id}
            </p>
            <p>
              <span style={styles.key}>Name:</span> {user?.name}
            </p>
            <p>
              <span style={styles.key}>Email:</span> {user?.email}
            </p>
            <p>
              <span style={styles.key}>Role:</span> {user?.role}
            </p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Quick Start</h3>
            <p style={styles.tip}>JWT Auth is working</p>
            <p style={styles.tip}>Protected routes active</p>
            <p style={styles.tip}>MongoDB connected</p>
            <p style={styles.tip}>Add your features below!</p>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>API Endpoints</h3>
            <code style={styles.code}>POST /api/auth/register</code>
            <code style={styles.code}>POST /api/auth/login</code>
            <code style={styles.code}>GET /api/auth/me</code>
            <code style={styles.code}>GET /api/users</code>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Next Steps</h3>
            <p style={styles.tip}>Add new Mongoose models</p>
            <p style={styles.tip}>Create new API routes</p>
            <p style={styles.tip}>Build React pages/components</p>
            <p style={styles.tip}>Deploy to Vercel + Render</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "90vh",
    background: "#0f0f1a",
    color: "#fff",
    padding: "2rem",
  },
  container: { maxWidth: "1000px", margin: "0 auto" },
  welcome: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    marginBottom: "2.5rem",
    padding: "2rem",
    background: "#1a1a2e",
    borderRadius: "12px",
    border: "1px solid #2a2a4a",
  },
  avatar: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    background: "#e94560",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: "1.8rem" },
  sub: { color: "#a0a0b0", margin: "0.3rem 0 0" },
  badge: {
    background: "#e94560",
    color: "#fff",
    padding: "0.1rem 0.5rem",
    borderRadius: "4px",
    fontSize: "0.8rem",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  cardTitle: { color: "#e94560", margin: "0 0 0.75rem", fontSize: "1rem" },
  key: { color: "#a0a0b0", marginRight: "0.4rem", fontSize: "0.85rem" },
  tip: { color: "#c0c0d0", margin: 0, fontSize: "0.9rem" },
  code: {
    display: "block",
    background: "#0f0f1a",
    padding: "0.4rem 0.6rem",
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "0.8rem",
    color: "#4ec9b0",
  },
};

export default Dashboard;
