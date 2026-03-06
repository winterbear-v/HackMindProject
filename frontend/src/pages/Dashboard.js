import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import TrendsTab from "../components/l1/TrendsTab";
import SkillsTab from "../components/l1/SkillsTab";
import VulnerabilityTab from "../components/l1/VulnerabilityTab";
import EarlyWarning from "../components/l1/EarlyWarning";
import EmployerGap from "../components/l1/EmployerGap";
import AdminPanel from "../components/l1/AdminPanel";
import WorkerPage from "./WorkerPage";

const TABS = [
  { id: "trends", label: "Hiring Trends", group: "L1" },
  { id: "skills", label: "Skills Intel", group: "L1" },
  { id: "vuln", label: "Vulnerability Index", group: "L1" },
  { id: "warning", label: "Early Warning", group: "L1", bonus: true },
  { id: "employer", label: "Employer Gap", group: "L1", bonus: true },
  { id: "worker", label: "My Risk & Plan", group: "L2" },
  { id: "admin", label: "Scraper", group: "admin" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("trends");

  return (
    <div style={d.page}>
      <div style={d.container}>
        {/* Header */}
        <div style={d.header}>
          <div>
            <div style={d.titleRow}>
              <h1 style={d.title}>SkillsMirage</h1>
              <span style={d.l1Tag}>Live Intelligence</span>
            </div>
            <p style={d.sub}>
              India's open workforce intelligence system · 20 cities · L1
              signals feed L2 risk scores live
            </p>
          </div>
          <div style={d.userBadge}>
            <div style={d.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <div style={d.userName}>{user?.name}</div>
              <div style={d.userRole}>Logged in</div>
            </div>
          </div>
        </div>

        {/* Layer labels + tabs */}
        <div style={d.tabSection}>
          <div style={d.layerRow}>
            <div style={d.layerLabel}>
              <span style={d.l1Dot} />
              Layer 1 — Job Market Dashboard
            </div>
            <div style={d.layerLabel}>
              <span style={d.l2Dot} />
              Layer 2
            </div>
          </div>
          <div style={d.tabBar}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                style={{
                  ...d.tab,
                  ...(activeTab === tab.id
                    ? tab.group === "L2"
                      ? d.tabActiveL2
                      : d.tabActive
                    : {}),
                  ...(tab.bonus ? d.tabBonus : {}),
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.bonus && <span style={d.bonusBadge}>BONUS</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={d.content}>
          {activeTab === "trends" && <TrendsTab />}
          {activeTab === "skills" && <SkillsTab />}
          {activeTab === "vuln" && <VulnerabilityTab />}
          {activeTab === "warning" && <EarlyWarning />}
          {activeTab === "employer" && <EmployerGap />}
          {activeTab === "worker" && <WorkerPage />}
          {activeTab === "admin" && <AdminPanel />}
        </div>
      </div>
    </div>
  );
};

const d = {
  page: {
    minHeight: "90vh",
    background: "#0f0f1a",
    color: "#fff",
    padding: "2rem",
  },
  container: { maxWidth: "1300px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginBottom: "0.25rem",
  },
  title: { margin: 0, fontSize: "1.75rem", fontWeight: 800, color: "#fff" },
  l1Tag: {
    background: "#e9456022",
    color: "#e94560",
    border: "1px solid #e9456066",
    borderRadius: "4px",
    fontSize: "0.68rem",
    padding: "0.15rem 0.5rem",
    letterSpacing: "0.06em",
    fontWeight: 600,
    textTransform: "uppercase",
  },
  sub: { color: "#606080", margin: 0, fontSize: "0.82rem" },
  userBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.6rem 1rem",
  },
  avatar: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#e94560",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "0.95rem",
    flexShrink: 0,
  },
  userName: { color: "#fff", fontSize: "0.85rem", fontWeight: 600 },
  userRole: { color: "#606080", fontSize: "0.72rem" },
  tabSection: { marginBottom: "1.25rem" },
  layerRow: { display: "flex", gap: "2rem", marginBottom: "0.4rem" },
  layerLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    color: "#606080",
    fontSize: "0.72rem",
    fontWeight: 600,
  },
  l1Dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#e94560",
    display: "inline-block",
  },
  l2Dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#4ec9b0",
    display: "inline-block",
  },
  tabBar: {
    display: "flex",
    gap: "0.2rem",
    background: "#1a1a2e",
    borderRadius: "10px",
    padding: "0.3rem",
    overflowX: "auto",
    flexWrap: "wrap",
  },
  tab: {
    padding: "0.5rem 0.85rem",
    background: "transparent",
    color: "#a0a0b0",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "0.82rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.18s",
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
  },
  tabActive: { background: "#e94560", color: "#fff", fontWeight: 700 },
  tabActiveL2: { background: "#4ec9b0", color: "#0a1a14", fontWeight: 700 },
  tabBonus: { color: "#a0a0b0" },
  bonusBadge: {
    background: "#f0a50033",
    color: "#f0a500",
    border: "1px solid #f0a50044",
    borderRadius: "3px",
    fontSize: "0.58rem",
    padding: "0.05rem 0.3rem",
    fontWeight: 700,
    letterSpacing: "0.04em",
  },
  content: {
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.5rem",
    minHeight: "400px",
  },
  integNote: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.75rem",
    color: "#606080",
    fontSize: "0.75rem",
    padding: "0.5rem 0.75rem",
    background: "#1a1a2e",
    borderRadius: "6px",
    border: "1px solid #2a2a4a",
  },
  integIcon: { fontSize: "1rem", flexShrink: 0 },
};

export default Dashboard;
