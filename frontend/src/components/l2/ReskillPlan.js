import { useState, useEffect } from "react";
import axios from "axios";

const ReskillPlan = ({ profileId, extractedSkills }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.post(`/api/l2/profile/${profileId}/reskill`);
        setData(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [profileId]);

  if (loading)
    return (
      <div style={p.loading}>
         Generating your personalised reskilling path…
      </div>
    );
  if (!data) return <div style={p.loading}>Could not generate plan.</div>;

  const target = data.target_roles?.[activeRole];

  return (
    <div style={p.wrap}>
      {/* Skills section */}
      <div style={p.skillsRow}>
        <div style={p.skillBlock}>
          <div style={p.blockTitle}>Skills You Have</div>
          <div style={p.chips}>
            {(data.extracted_skills || []).map((s) => (
              <span
                key={s}
                style={{
                  ...p.chip,
                  background: "#1a3a2a",
                  color: "#4ec9b0",
                  border: "1px solid #2a4a3a",
                }}
              >
                {s}
              </span>
            ))}
            {!data.extracted_skills?.length && (
              <span style={p.empty}>None detected</span>
            )}
          </div>
        </div>
        <div style={p.skillBlock}>
          <div style={p.blockTitle}>Skill Gaps to Fill</div>
          <div style={p.chips}>
            {(data.skill_gaps || []).map((s) => (
              <span
                key={s}
                style={{
                  ...p.chip,
                  background: "#3a1a1a",
                  color: "#ff9900",
                  border: "1px solid #4a2a1a",
                }}
              >
                {s}
              </span>
            ))}
            {!data.skill_gaps?.length && (
              <span style={p.empty}>No major gaps!</span>
            )}
          </div>
        </div>
      </div>

      {/* Target role selector */}
      {data.target_roles?.length > 1 && (
        <div style={p.roleSelector}>
          {data.target_roles.map((tr, i) => (
            <button
              key={i}
              style={{
                ...p.roleBtn,
                ...(activeRole === i ? p.roleBtnActive : {}),
              }}
              onClick={() => setActiveRole(i)}
            >
              <span style={p.roleName}>{tr.role}</span>
              <span style={p.roleConf}>{tr.confidence}% match</span>
            </button>
          ))}
        </div>
      )}

      {/* Active role plan */}
      {target && (
        <div style={p.planWrap}>
          <div style={p.planHeader}>
            <div>
              <div style={p.planTitle}>{target.role}</div>
              <div style={p.planMeta}>
                {target.total_weeks} weeks &nbsp;·&nbsp;
                {target.postings_in_city} postings in your city &nbsp;·&nbsp;
                Vuln. score: {target.vulnerability_score}/100
              </div>
            </div>
            <div style={p.confBadge}>{target.confidence}% confidence</div>
          </div>

          {/* Timeline */}
          <div style={p.timeline}>
            {target.weeks?.map((w, i) => (
              <div key={i} style={p.timelineItem}>
                <div style={p.timelineDot} />
                {i < target.weeks.length - 1 && <div style={p.timelineLine} />}
                <div style={p.timelineContent}>
                  <div style={p.weekLabel}>{w.week}</div>
                  <div style={p.weekAction}>{w.action}</div>
                  <div style={p.weekMeta}>
                    <span style={p.weekHours}>
                       {w.hours_per_week} hrs/week
                    </span>
                    <a
                      href={w.resource_link}
                      target="_blank"
                      rel="noreferrer"
                      style={p.weekLink}
                    >
                       {w.resource} 
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const p = {
  wrap: {
    background: "#0f0f1a",
    border: "1px solid #2a2a4a",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  loading: { color: "#a0a0b0", textAlign: "center", padding: "2rem" },
  skillsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "1rem",
    marginBottom: "1.25rem",
  },
  skillBlock: {
    background: "#111122",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.9rem",
  },
  blockTitle: {
    color: "#a0a0b0",
    fontSize: "0.78rem",
    fontWeight: 600,
    marginBottom: "0.5rem",
  },
  chips: { display: "flex", flexWrap: "wrap", gap: "0.35rem" },
  chip: { borderRadius: "4px", padding: "0.2rem 0.55rem", fontSize: "0.74rem" },
  empty: { color: "#606080", fontSize: "0.78rem", fontStyle: "italic" },
  roleSelector: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
  },
  roleBtn: {
    flex: 1,
    background: "#111122",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
  },
  roleBtnActive: { border: "1px solid #e94560", background: "#2a0a14" },
  roleName: { color: "#fff", fontSize: "0.88rem", fontWeight: 600 },
  roleConf: { color: "#606080", fontSize: "0.75rem" },
  planWrap: {
    background: "#111122",
    border: "1px solid #2a2a4a",
    borderRadius: "10px",
    padding: "1.25rem",
  },
  planHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.25rem",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
  planTitle: {
    color: "#fff",
    fontWeight: 700,
    fontSize: "1rem",
    marginBottom: "0.25rem",
  },
  planMeta: { color: "#606080", fontSize: "0.78rem" },
  confBadge: {
    background: "#e9456022",
    color: "#e94560",
    border: "1px solid #e94560",
    borderRadius: "4px",
    padding: "0.25rem 0.6rem",
    fontSize: "0.78rem",
    fontWeight: 700,
    flexShrink: 0,
  },
  timeline: { position: "relative" },
  timelineItem: {
    display: "flex",
    gap: "0.75rem",
    marginBottom: "1.25rem",
    position: "relative",
  },
  timelineDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#e94560",
    flexShrink: 0,
    marginTop: "4px",
  },
  timelineLine: {
    position: "absolute",
    left: "5px",
    top: "18px",
    width: "2px",
    height: "calc(100% + 6px)",
    background: "#2a2a4a",
  },
  timelineContent: { flex: 1 },
  weekLabel: {
    color: "#e94560",
    fontSize: "0.75rem",
    fontWeight: 700,
    marginBottom: "0.2rem",
  },
  weekAction: {
    color: "#c0c0d0",
    fontSize: "0.88rem",
    marginBottom: "0.4rem",
    lineHeight: 1.4,
  },
  weekMeta: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
    alignItems: "center",
  },
  weekHours: { color: "#606080", fontSize: "0.75rem" },
  weekLink: {
    color: "#4ec9b0",
    fontSize: "0.75rem",
    textDecoration: "none",
    wordBreak: "break-all",
  },
};

export default ReskillPlan;
