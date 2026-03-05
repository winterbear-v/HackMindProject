import { Link } from "react-router-dom";

const Home = () => (
  <div style={styles.container}>
    <div style={styles.hero}>
      <h1 style={styles.title}>MERN Stack Starter</h1>
      <p style={styles.subtitle}>MongoDB · Express · React · Node.js</p>
      <p style={styles.desc}>
        A full-stack boilerplate with JWT authentication, protected routes, and
        a clean project structure.
      </p>
      <div style={styles.btnGroup}>
        <Link to="/register" style={styles.primaryBtn}>
          Get Started →
        </Link>
        <Link to="/login" style={styles.secondaryBtn}>
          Login
        </Link>
      </div>
    </div>

    <div style={styles.cards}>
      {[
        {
          icon: "🍃",
          title: "MongoDB",
          desc: "NoSQL database with Mongoose ODM & schema validation",
        },
        {
          icon: "⚡",
          title: "Express.js",
          desc: "Fast REST API with controllers, routes & middleware",
        },
        {
          icon: "⚛️",
          title: "React",
          desc: "Component-based UI with Context API & React Router",
        },
        {
          icon: "🟢",
          title: "Node.js",
          desc: "Server-side JavaScript with JWT auth & bcrypt",
        },
      ].map((card) => (
        <div key={card.title} style={styles.card}>
          <div style={styles.cardIcon}>{card.icon}</div>
          <h3 style={styles.cardTitle}>{card.title}</h3>
          <p style={styles.cardDesc}>{card.desc}</p>
        </div>
      ))}
    </div>
  </div>
);

const styles = {
  container: {
    minHeight: "90vh",
    background: "#0f0f1a",
    color: "#fff",
    padding: "2rem",
  },
  hero: { textAlign: "center", padding: "5rem 1rem 3rem" },
  title: { fontSize: "3.5rem", fontWeight: 800, color: "#e94560", margin: 0 },
  subtitle: {
    fontSize: "1.2rem",
    color: "#a0a0b0",
    letterSpacing: "0.15em",
    marginTop: "0.5rem",
  },
  desc: {
    maxWidth: "540px",
    margin: "1.5rem auto",
    color: "#c0c0d0",
    lineHeight: 1.7,
  },
  btnGroup: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    marginTop: "2rem",
  },
  primaryBtn: {
    background: "#e94560",
    color: "#fff",
    padding: "0.75rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
  },
  secondaryBtn: {
    background: "transparent",
    color: "#e94560",
    padding: "0.75rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    border: "2px solid #e94560",
    fontWeight: 600,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "1.5rem",
    maxWidth: "900px",
    margin: "3rem auto 0",
  },
  card: {
    background: "#1a1a2e",
    borderRadius: "12px",
    padding: "2rem",
    textAlign: "center",
    border: "1px solid #2a2a4a",
  },
  cardIcon: { fontSize: "2.5rem", marginBottom: "1rem" },
  cardTitle: { color: "#e94560", margin: "0 0 0.5rem" },
  cardDesc: {
    color: "#a0a0b0",
    fontSize: "0.9rem",
    lineHeight: 1.6,
    margin: 0,
  },
};

export default Home;
