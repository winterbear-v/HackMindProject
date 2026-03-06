import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { user } = useAuth();

  return (
    <div style={s.page}>
      {/* Hero */}
      <div style={s.hero}>
        <div style={s.tag}>Made for Indian Workers</div>
        <h1 style={s.title}>SkillsMirage</h1>
        <p style={s.tagline}>
          Know your AI displacement risk. Get a personalised reskilling plan.
        </p>
        <p style={s.desc}>
          We scrape live job postings from Naukri & LinkedIn, compute your risk
          score using real hiring data, and generate a week-by-week reskilling
          path with free NPTEL, SWAYAM & PMKVY courses.
        </p>
        <div style={s.btnGroup}>
          {user ? (
            <Link to="/dashboard" style={s.primaryBtn}>
              Go to Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/register" style={s.primaryBtn}>
                Get Started Free →
              </Link>
              <Link to="/login" style={s.secondaryBtn}>
                Login
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Feature cards */}
      <div style={s.cards}>
        {[
          {
            title: "Live Job Scraping",
            desc: "Scrapes Naukri & LinkedIn daily across 10 cities and 10 roles to track real hiring trends.",
          },
          {
            title: "AI Risk Score",
            desc: "Computes your 0–100 displacement risk based on hiring decline, AI tool mentions, and skill gaps.",
          },
          {
            title: "Reskilling Path",
            desc: "Week-by-week plan with free NPTEL, SWAYAM & PMKVY courses matched to your skill gaps.",
          },
          {
            title: "AI Career Advisor",
            desc: "Bilingual chatbot (English & Hindi) powered by AI that answers questions using live market data.",
          },
        ].map((c) => (
          <div key={c.title} style={s.card}>
            <div style={s.cardIcon}>{c.icon}</div>
            <h3 style={s.cardTitle}>{c.title}</h3>
            <p style={s.cardDesc}>{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Cities strip */}
      <div style={s.strip}>
        <div style={s.stripLabel}>Tracking jobs in</div>
        <div style={s.stripCities}>
          {[
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
          ].map((c) => (
            <span key={c} style={s.cityChip}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const s = {
  page: {
    minHeight: "90vh",
    background: "#0f0f1a",
    color: "#fff",
    padding: "0",
  },
  hero: {
    textAlign: "center",
    padding: "5rem 2rem 3rem",
    maxWidth: "720px",
    margin: "0 auto",
  },
  tag: {
    display: "inline-block",
    background: "#e9456022",
    color: "#e94560",
    border: "1px solid #e94560",
    borderRadius: "20px",
    padding: "0.3rem 1rem",
    fontSize: "0.82rem",
    marginBottom: "1.25rem",
  },
  title: {
    fontSize: "3.5rem",
    fontWeight: 800,
    color: "#fff",
    margin: "0 0 0.5rem",
    letterSpacing: "-0.02em",
  },
  tagline: {
    fontSize: "1.2rem",
    color: "#e94560",
    fontWeight: 600,
    margin: "0 0 1rem",
  },
  desc: {
    color: "#a0a0b0",
    lineHeight: 1.7,
    fontSize: "0.95rem",
    margin: "0 0 2rem",
  },
  btnGroup: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryBtn: {
    background: "#e94560",
    color: "#fff",
    padding: "0.8rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 700,
    fontSize: "1rem",
  },
  secondaryBtn: {
    background: "transparent",
    color: "#e94560",
    padding: "0.8rem 2rem",
    borderRadius: "8px",
    textDecoration: "none",
    border: "2px solid #e94560",
    fontWeight: 600,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "1.25rem",
    maxWidth: "960px",
    margin: "0 auto",
    padding: "0 2rem 3rem",
  },
  card: {
    background: "#1a1a2e",
    borderRadius: "12px",
    padding: "1.75rem",
    border: "1px solid #2a2a4a",
  },
  cardIcon: { fontSize: "2rem", marginBottom: "0.75rem" },
  cardTitle: {
    color: "#fff",
    fontWeight: 700,
    margin: "0 0 0.5rem",
    fontSize: "1rem",
  },
  cardDesc: {
    color: "#a0a0b0",
    fontSize: "0.85rem",
    lineHeight: 1.6,
    margin: 0,
  },
  strip: {
    background: "#1a1a2e",
    borderTop: "1px solid #2a2a4a",
    padding: "1.25rem 2rem",
    textAlign: "center",
  },
  stripLabel: { color: "#606080", fontSize: "0.78rem", marginBottom: "0.6rem" },
  stripCities: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    justifyContent: "center",
  },
  cityChip: {
    background: "#0f0f1a",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    fontSize: "0.78rem",
  },
};

export default Home;
