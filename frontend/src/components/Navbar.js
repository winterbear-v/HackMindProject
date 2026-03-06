import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav style={n.nav}>
      <Link to="/" style={n.brand}>
        <span style={n.brandIcon}></span> CareerCraft AI
      </Link>
      <div style={n.links}>
        {user ? (
          <>
            <Link to="/dashboard" style={n.link}>
              Dashboard
            </Link>
            <span style={n.divider}>|</span>
            <span style={n.userName}>Hi, {user.name}</span>
            <button onClick={handleLogout} style={n.btn}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={n.link}>
              Login
            </Link>
            <Link to="/register" style={n.registerBtn}>
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

const n = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.9rem 2rem",
    background: "#0f0f1a",
    borderBottom: "1px solid #1a1a2e",
    color: "#fff",
  },
  brand: {
    color: "#fff",
    fontWeight: 800,
    fontSize: "1.3rem",
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    letterSpacing: "-0.01em",
  },
  brandIcon: { color: "#e94560", fontSize: "1.4rem" },
  links: { display: "flex", gap: "1rem", alignItems: "center" },
  link: { color: "#a0a0b0", textDecoration: "none", fontSize: "0.9rem" },
  divider: { color: "#2a2a4a" },
  userName: { color: "#606080", fontSize: "0.85rem" },
  btn: {
    background: "transparent",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    padding: "0.35rem 0.9rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
  registerBtn: {
    background: "#e94560",
    color: "#fff",
    padding: "0.4rem 1rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "0.88rem",
    fontWeight: 600,
  },
};

export default Navbar;
