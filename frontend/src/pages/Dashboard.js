import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import TrendsTab from "../components/l1/TrendsTab";
import SkillsTab from "../components/l1/SkillsTab";
import VulnerabilityTab from "../components/l1/VulnerabilityTab";
import AdminPanel from "../components/l1/AdminPanel";
import WorkerPage from "./WorkerPage";

const TABS = [
  { id: "trends", label: "Hiring Trends" },
  { id: "skills", label: "Skill Trends" },
  { id: "vuln", label: "Vulnerability" },
  { id: "worker", label: "My Risk & Plan" },
  { id: "admin", label: "Admin / Scraper" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("trends");

  return (
    <div style={d.page}>
      <div style={d.container}>
        <div style={d.header}>
          <div>
            <h1 style={d.title}>
              SkillsMirage <span style={d.l1Tag}>Dashboard</span>
            </h1>
            <p style={d.sub}>
              Live Indian job market intelligence + AI displacement risk
              analysis
            </p>
          </div>
          <div style={d.userBadge}>
            <div style={d.avatar}>{user?.name?.charAt(0).toUpperCase()}</div>
            <div>
              <div style={d.userName}>{user?.name}</div>
              <div style={d.userRole}>{user?.role}</div>
            </div>
          </div>
        </div>

        <div style={d.tabBar}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              style={{ ...d.tab, ...(activeTab === tab.id ? d.tabActive : {}) }}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={d.content}>
          {activeTab === "trends" && <TrendsTab />}
          {activeTab === "skills" && <SkillsTab />}
          {activeTab === "vuln" && <VulnerabilityTab />}
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
  container: { maxWidth: "1200px", margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  title: { margin: 0, fontSize: "1.8rem", color: "#fff" },
  l1Tag: {
    background: "#e9456022",
    color: "#e94560",
    border: "1px solid #e94560",
    borderRadius: "4px",
    fontSize: "0.7rem",
    padding: "0.15rem 0.5rem",
    verticalAlign: "middle",
    marginLeft: "0.5rem",
    letterSpacing: "0.05em",
  },
  sub: { color: "#606080", margin: "0.3rem 0 0", fontSize: "0.88rem" },
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
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#e94560",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "1rem",
    flexShrink: 0,
  },
  userName: { color: "#fff", fontSize: "0.88rem", fontWeight: 600 },
  userRole: { color: "#606080", fontSize: "0.75rem" },
  tabBar: {
    display: "flex",
    gap: "0.25rem",
    background: "#1a1a2e",
    borderRadius: "10px",
    padding: "0.3rem",
    marginBottom: "1.5rem",
    overflowX: "auto",
  },
  tab: {
    flex: 1,
    padding: "0.55rem 1rem",
    background: "transparent",
    color: "#a0a0b0",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "0.88rem",
    fontWeight: 500,
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  tabActive: { background: "#e94560", color: "#fff", fontWeight: 700 },
  content: {
    background: "#1a1a2e",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.5rem",
  },
};

export default Dashboard;
