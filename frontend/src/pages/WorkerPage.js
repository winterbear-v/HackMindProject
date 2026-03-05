import { useState } from "react";
import ProfileForm from "../components/l2/ProfileForm";
import RiskScoreCard from "../components/l2/RiskScoreCard";
import ReskillPlan from "../components/l2/ReskillPlan";
import ChatbotModal from "../components/l2/ChatbotModal";

const STEPS = ["Profile", "Risk Score", "Reskill Plan"];

const WorkerPage = () => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  const handleProfileSubmit = (profileData) => {
    setProfile(profileData);
    setStep(1);
  };

  const handleScoreLoaded = (scoreData) => {
    setRiskData(scoreData);
  };

  return (
    <div style={w.page}>
      {/* Step indicator */}
      <div style={w.steps}>
        {STEPS.map((s, i) => (
          <div key={i} style={w.stepWrap}>
            <div
              style={{ ...w.stepDot, ...(i <= step ? w.stepDotActive : {}) }}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <div
              style={{
                ...w.stepLabel,
                ...(i === step ? w.stepLabelActive : {}),
              }}
            >
              {s}
            </div>
            {i < STEPS.length - 1 && (
              <div
                style={{ ...w.stepLine, ...(i < step ? w.stepLineActive : {}) }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0 — Profile Form */}
      {step === 0 && <ProfileForm onSubmit={handleProfileSubmit} />}

      {/* Step 1 — Risk Score */}
      {step === 1 && profile && (
        <div>
          <div style={w.profileSummary}>
            <span style={w.profileTag}>{profile.title}</span>
            <span style={w.profileTag}>{profile.city}</span>
            <span style={w.profileTag}>{profile.xp_years} yrs exp</span>
            <button style={w.editBtn} onClick={() => setStep(0)}>
               Edit Profile
            </button>
          </div>
          <RiskScoreCard
            profileId={profile.id}
            onScoreLoaded={handleScoreLoaded}
          />
          <div style={w.actionRow}>
            <button style={w.nextBtn} onClick={() => setStep(2)}>
               Show My Reskilling Plan 
            </button>
            {profile && (
              <button style={w.chatBtn} onClick={() => setChatOpen(true)}>
                 Ask AI Advisor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2 — Reskill Plan */}
      {step === 2 && profile && (
        <div>
          <div style={w.profileSummary}>
            <span style={w.profileTag}>{profile.title}</span>
            <span style={w.profileTag}>{profile.city}</span>
            {riskData && (
              <span
                style={{
                  ...w.profileTag,
                  background:
                    riskData.score >= 65
                      ? "#3d0000"
                      : riskData.score >= 35
                        ? "#3d2000"
                        : "#003d1a",
                  color:
                    riskData.score >= 65
                      ? "#ff4444"
                      : riskData.score >= 35
                        ? "#ff9900"
                        : "#4ec9b0",
                  border: `1px solid ${riskData.score >= 65 ? "#ff4444" : riskData.score >= 35 ? "#ff9900" : "#4ec9b0"}`,
                }}
              >
                Risk: {riskData.score}/100 ({riskData.level})
              </span>
            )}
            <button style={w.editBtn} onClick={() => setStep(1)}>
               Back to Score
            </button>
          </div>
          <ReskillPlan
            profileId={profile.id}
            extractedSkills={profile.extracted_skills}
          />
          <div style={w.actionRow}>
            <button style={w.chatBtn} onClick={() => setChatOpen(true)}>
            Ask AI Advisor about this plan
            </button>
            <button
              style={w.resetBtn}
              onClick={() => {
                setStep(0);
                setProfile(null);
                setRiskData(null);
              }}
            >
              New Profile
            </button>
          </div>
        </div>
      )}

      {/* Chatbot Modal */}
      {chatOpen && profile && (
        <ChatbotModal
          profileId={profile.id}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
};

const w = {
  page: { maxWidth: "800px", margin: "0 auto" },
  steps: {
    display: "flex",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "0.25rem",
  },
  stepWrap: { display: "flex", alignItems: "center", gap: "0.4rem" },
  stepDot: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "#1a1a2e",
    border: "2px solid #2a2a4a",
    color: "#606080",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  stepDotActive: {
    background: "#e94560",
    borderColor: "#e94560",
    color: "#fff",
  },
  stepLabel: { color: "#606080", fontSize: "0.82rem", whiteSpace: "nowrap" },
  stepLabelActive: { color: "#fff", fontWeight: 600 },
  stepLine: { width: "40px", height: "2px", background: "#2a2a4a" },
  stepLineActive: { background: "#e94560" },
  profileSummary: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: "1rem",
  },
  profileTag: {
    background: "#1a1a2e",
    color: "#a0a0b0",
    border: "1px solid #2a2a4a",
    borderRadius: "4px",
    padding: "0.2rem 0.6rem",
    fontSize: "0.78rem",
  },
  editBtn: {
    background: "transparent",
    color: "#606080",
    border: "none",
    cursor: "pointer",
    fontSize: "0.78rem",
    marginLeft: "auto",
  },
  actionRow: {
    display: "flex",
    gap: "0.75rem",
    marginTop: "1rem",
    flexWrap: "wrap",
  },
  nextBtn: {
    flex: 1,
    padding: "0.75rem",
    background: "#e94560",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  chatBtn: {
    padding: "0.75rem 1.25rem",
    background: "#1a1a2e",
    color: "#4ec9b0",
    border: "1px solid #4ec9b0",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
  },
  resetBtn: {
    padding: "0.75rem 1rem",
    background: "transparent",
    color: "#606080",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.88rem",
  },
};

export default WorkerPage;
