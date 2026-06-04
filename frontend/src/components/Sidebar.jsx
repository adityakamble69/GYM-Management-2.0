import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FaHome, FaUsers, FaUserTie, FaClipboardCheck,
  FaMoneyBill, FaTools, FaChartBar, FaSignOutAlt, FaBolt,
  FaUserCircle, FaIdCard, FaBell, FaEnvelope
} from "react-icons/fa";
import api from "../services/api";

const NAV = [
  { icon: FaHome,           label: "Dashboard",        path: "/dashboard"        },
  { icon: FaUsers,          label: "Members",          path: "/members"          },
  { icon: FaUserTie,        label: "Trainers",         path: "/trainers"         },
  { icon: FaClipboardCheck, label: "Attendance",       path: "/attendance"       },
  { icon: FaMoneyBill,      label: "Payments",         path: "/payments"         },
  { icon: FaIdCard,         label: "Membership Plans", path: "/membership-plans" },
  { icon: FaTools,          label: "Equipment",        path: "/equipment"        },
  { icon: FaEnvelope,       label: "Inquiries",        path: "/inquiries", badge: true },
  { icon: FaBell,           label: "Notifications",    path: "/notifications"    },
  { icon: FaChartBar,       label: "Reports",          path: "/reports"          },
  { icon: FaUserCircle,     label: "Profile",          path: "/profile"          },
];

export default function Sidebar({ onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const admin    = JSON.parse(localStorage.getItem("gym_admin") || "{}");
  const initials = admin.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "A";
  const [newInquiries, setNewInquiries] = useState(0);

  useEffect(() => {
    fetchInquiryCount();
    const interval = setInterval(fetchInquiryCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchInquiryCount = async () => {
    try {
      const res = await api.get("/inquiries/stats/summary");
      setNewInquiries(res.data.data?.new_count || 0);
    } catch(e) {}
  };

  return (
    <aside style={{
      width: "220px", flexShrink: 0,
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border-subtle)",
      minHeight: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "var(--font-body)"
    }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "30px", height: "30px", background: "var(--text-primary)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FaBolt style={{ color: "#0a0a0a", fontSize: "13px" }} />
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", color: "var(--text-primary)", letterSpacing: "0.02em" }}>Workout World Gym</span>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <p style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", padding: "8px 10px 6px", marginBottom: "4px" }}>Navigation</p>

        {NAV.map(({ icon: Icon, label, path, badge }) => {
          const active    = location.pathname === path;
          const showBadge = badge && newInquiries > 0;
          return (
            <div
              key={path}
              onClick={() => navigate(path)}
              style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "9px 10px", borderRadius: "var(--radius-sm)",
                marginBottom: "2px", cursor: "pointer",
                background: active ? "var(--bg-active)" : "transparent",
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: active ? 600 : 400, fontSize: "13.5px",
                borderLeft: active ? "2px solid var(--accent)" : "2px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-secondary)"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}}
            >
              <Icon style={{ fontSize: "14px", flexShrink: 0, opacity: active ? 1 : 0.6 }} />
              <span style={{ flex: 1 }}>{label}</span>
              {showBadge && (
                <span style={{ background: "#2f81f7", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "99px", minWidth: "18px", textAlign: "center" }}>
                  {newInquiries}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "12px 10px" }}>
        <div
          onClick={() => navigate("/profile")}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", marginBottom: "8px", cursor: "pointer", border: "1px solid transparent", transition: "border-color 0.15s" }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-strong)"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}
        >
          <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: "var(--bg-active)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", flexShrink: 0 }}>{initials}</div>
          <div style={{ overflow: "hidden", flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{admin.name || "Admin"}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{admin.role?.replace("_", " ") || "admin"}</div>
          </div>
        </div>

        <div
          onClick={onLogout}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--text-muted)", fontSize: "13.5px", transition: "all 0.15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--red-bg)"; e.currentTarget.style.color = "var(--red)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
        >
          <FaSignOutAlt style={{ fontSize: "13px" }} /> Sign Out
        </div>
      </div>
    </aside>
  );
}