import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import TrendsTab from "../components/l1/TrendsTab";
import SkillsTab from "../components/l1/SkillsTab";
import VulnerabilityTab from "../components/l1/VulnerabilityTab";
import EarlyWarning from "../components/l1/EarlyWarning";
import EmployerGap from "../components/l1/EmployerGap";
import AdminPanel from "../components/l1/AdminPanel";
import WorkerPage from "./WorkerPage";

// Color palette
const C = {
  bg: "#0B0E13",
  surface: "#141821",
  card: "#1C2130",
  border: "#2A3144",
  accent: "#F97316",
  teal: "#10B981", // injected standard emerald for positive charts
  amber: "#F97316", // mapped from Orange
  violet: "#3B82F6", // mapped from Blue
  text: "#E5E7EB",
  textMuted: "#9CA3AF",
};

// Particle background
function ParticleField() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const mouse = { x: -9999, y: -9999 };
    const onMouse = e => { mouse.x = e.clientX; mouse.y = e.clientY; };
    window.addEventListener("mousemove", onMouse);
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const NODES = 80;
    const nodes = Array.from({ length: NODES }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      r: 1.5 + Math.random() * 2,
      teal: Math.random() > 0.8,
    }));

    const CONNECT_DIST = 130;
    const MOUSE_DIST = 110;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      nodes.forEach(n => {
        const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.sqrt(dx*dx+dy*dy);
        if (d < MOUSE_DIST) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,184,169,${0.15*(1-d/MOUSE_DIST)})`;
          ctx.lineWidth = 0.8;
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      });
      for (let i=0;i<NODES;i++) for (let j=i+1;j<NODES;j++) {
        const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y, dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<CONNECT_DIST) {
          const a = 0.08*(1-dist/CONNECT_DIST);
          ctx.beginPath();
          ctx.strokeStyle = nodes[i].teal||nodes[j].teal
            ? `rgba(0,184,169,${a})` : `rgba(244,63,114,${a})`;
          ctx.lineWidth = 0.4;
          ctx.moveTo(nodes[i].x,nodes[i].y); ctx.lineTo(nodes[j].x,nodes[j].y);
          ctx.stroke();
        }
      }
      nodes.forEach(n => {
        const col = n.teal ? "0,184,169" : "244,63,114";
        const g = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*4);
        g.addColorStop(0,`rgba(${col},0.2)`);
        g.addColorStop(1,`rgba(${col},0)`);
        ctx.beginPath(); ctx.arc(n.x,n.y,n.r*4,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(${col},0.35)`; ctx.fill();
        n.x+=n.vx; n.y+=n.vy;
        if(n.x<0||n.x>canvas.width) n.vx*=-1;
        if(n.y<0||n.y>canvas.height) n.vy*=-1;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize",resize);
      window.removeEventListener("mousemove",onMouse);
    };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed", inset:0, zIndex:0, pointerEvents:"none" }} />;
}

const TABS = [
  { id: "trends",   label: "Hiring Trends",      group: "L1" },
  { id: "skills",   label: "Skills Intel",        group: "L1" },
  { id: "vuln",     label: "Vulnerability Index", group: "L1" },
  { id: "warning",  label: "Early Warning",       group: "L1" },
  { id: "employer", label: "Employer Gap",        group: "L1" },
  { id: "worker",   label: "My Risk & Plan",      group: "L2" },
  { id: "admin",    label: "Scraper",             group: "admin" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("trends");
  const activeTabGroup = TABS.find(t => t.id === activeTab)?.group;

  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      color: C.text,
      padding: "24px 24px 32px",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <ParticleField />

      {/* Soft gradient orbs */}
      <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -300, left: -300, width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(244,63,114,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: -200, right: -200, width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,184,169,0.05) 0%, transparent 70%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1300, margin: "0 auto" }}>

        {/* Header Panel */}
        <div style={{
          background: `${C.surface}CC`,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: "20px 24px 16px",
          marginBottom: 20,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.text }}>Dashboard</h1>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal, display: "inline-block", boxShadow: `0 0 8px ${C.teal}` }} />
                <span style={{ color: C.teal, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Live</span>
              </div>
              <p style={{ margin: 0, color: C.textMuted, fontSize: 13 }}>
                20 cities · 10 roles · L1 signals feed L2 risk scores in real time
              </p>
            </div>

            {/* User badge */}
            {user && (
              <div style={{ display: "flex", alignItems: "center", gap: 12, background: `${C.card}80`, border: `1px solid ${C.border}`, borderRadius: 40, padding: "6px 16px 6px 8px" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.accent}, #e11d48)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 16, color: "#fff",
                }}>
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Logged in</div>
                </div>
              </div>
            )}
          </div>

          {/* Layer indicator */}
          <div style={{ display: "flex", gap: 24, margin: "20px 0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent }} />
              <span style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Layer 1 — Job Market Dashboard</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.teal }} />
              <span style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Layer 2 — Worker Intelligence</span>
            </div>
          </div>

          {/* ===== NEW: Market Insight Banner ===== */}
          <div style={{
            background: `linear-gradient(90deg, ${C.card} 0%, rgba(167,139,250,0.08) 100%)`,
            border: `1px solid ${C.border}`,
            borderLeft: `4px solid ${C.violet}`,
            borderRadius: 12,
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}>
            <div style={{ 
              width: 36, 
              height: 36, 
              borderRadius: "50%", 
              background: "rgba(167,139,250,0.15)", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              fontSize: 18, 
              flexShrink: 0 
            }}>
              💡
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: C.violet, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Live Market Insight
              </h3>
              <p style={{ margin: 0, color: C.textMuted, fontSize: 13, lineHeight: 1.6 }}>
                <strong style={{ color: C.text, fontWeight: 600 }}>AI adoption in job descriptions has increased by 23% this month.</strong> This suggests employers are prioritizing AI-assisted workflows. Candidates without AI-related skills may face increased competition.
              </p>
            </div>
          </div>
          {/* ===================================== */}

          {/* Tabs */}
          <div style={{
            display: "flex",
            gap: 4,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 4,
            overflowX: "auto",
          }}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const isL2 = tab.group === "L2";
              const isAdmin = tab.group === "admin";
              let background = "transparent";
              let color = C.textMuted;
              if (isActive) {
                if (isL2) background = C.teal;
                else if (isAdmin) background = C.amber;
                else background = C.accent;
                color = "#fff";
              }
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "8px 16px",
                    background,
                    color,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 500,
                    whiteSpace: "nowrap",
                    transition: "all 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {tab.label}
                  {tab.bonus && (
                    <span style={{
                      background: `${C.amber}30`,
                      color: C.amber,
                      fontSize: 9,
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 700,
                    }}>
                      BONUS
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content panel */}
        <div style={{
          background: `${C.card}E6`,
          backdropFilter: "blur(8px)",
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 24,
          borderTop: `3px solid ${
            activeTabGroup === "L2" ? C.teal
            : activeTabGroup === "admin" ? C.amber
            : C.accent
          }`,
          boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
        }}>
          {activeTab === "trends"   && <TrendsTab />}
          {activeTab === "skills"   && <SkillsTab />}
          {activeTab === "vuln"     && <VulnerabilityTab />}
          {activeTab === "warning"  && <EarlyWarning />}
          {activeTab === "employer" && <EmployerGap />}
          {activeTab === "worker"   && <WorkerPage />}
          {activeTab === "admin"    && <AdminPanel />}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
};

export default Dashboard;