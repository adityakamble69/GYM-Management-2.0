// components/NotificationBell.jsx
// Drop this anywhere in a page header:  <NotificationBell />

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  FaBell, FaCheckDouble, FaTrash, FaChevronRight,
  FaExclamationTriangle, FaClock, FaTools, FaMoneyBill, FaInfoCircle
} from "react-icons/fa";

// ── Helpers ───────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const TYPE_META = {
  membership_expired:  { icon: FaExclamationTriangle, color: "var(--red)",    bg: "var(--red-bg)"    },
  membership_expiring: { icon: FaClock,               color: "var(--yellow)", bg: "var(--yellow-bg)" },
  equipment_maintenance:{ icon: FaTools,              color: "var(--blue)",   bg: "var(--blue-bg)"   },
  payment_pending:     { icon: FaMoneyBill,           color: "var(--green)",  bg: "var(--green-bg)"  },
  general:             { icon: FaInfoCircle,          color: "#888",          bg: "rgba(136,136,136,0.1)" },
};

export default function NotificationBell() {
  const navigate  = useNavigate();
  const [open,         setOpen]         = useState(false);
  const [notifications,setNotifs]       = useState([]);
  const [unreadCount,  setUnread]       = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const dropRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch unread count on mount + every 60 seconds
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sync notifications on mount
  useEffect(() => { syncNotifications(); }, []);

  const fetchCount = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnread(res.data.count);
    } catch (e) { console.error(e); }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications", { params: { limit: 15 } });
      setNotifs(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const syncNotifications = async () => {
    setSyncing(true);
    try {
      await api.post("/notifications/sync");
      fetchCount();
    } catch (e) { console.error(e); }
    finally { setSyncing(false); }
  };

  const handleOpen = () => {
    setOpen(o => !o);
    if (!open) fetchNotifications();
  };

  const markRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: 1 } : x));
      setUnread(u => Math.max(0, u - 1));
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/mark-all/read");
      setNotifs(n => n.map(x => ({ ...x, is_read: 1 })));
      setUnread(0);
    } catch (e) { console.error(e); }
  };

  const deleteOne = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifs(n => n.filter(x => x.id !== id));
      fetchCount();
    } catch (e) { console.error(e); }
  };

  const clearRead = async () => {
    try {
      await api.delete("/notifications/clear/read");
      setNotifs(n => n.filter(x => !x.is_read));
    } catch (e) { console.error(e); }
  };

  return (
    <div ref={dropRef} style={{ position: "relative" }}>

      {/* Bell Button */}
      <button
        onClick={handleOpen}
        style={{
          position: "relative", background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
          padding: "8px 10px", cursor: "pointer", color: "var(--text-secondary)",
          display: "flex", alignItems: "center", transition: "all 0.15s"
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
      >
        <FaBell style={{ fontSize: "14px", animation: unreadCount > 0 ? "bellRing 2s ease infinite" : "none" }} />
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: "-6px", right: "-6px",
            background: "var(--red)", color: "#fff",
            fontSize: "10px", fontWeight: 700, minWidth: "18px", height: "18px",
            borderRadius: "99px", display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 4px", border: "2px solid var(--bg-base)"
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 10px)", right: 0,
          width: "360px", background: "var(--bg-surface)",
          border: "1px solid var(--border-default)", borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)", zIndex: 999,
          overflow: "hidden"
        }}>

          {/* Header */}
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span style={{
                  marginLeft: "8px", padding: "2px 7px", borderRadius: "99px",
                  background: "var(--red-bg)", color: "var(--red)",
                  fontSize: "11px", fontWeight: 600
                }}>{unreadCount} new</span>
              )}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Mark all read" style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--text-muted)", fontSize: "12px", padding: "4px 6px",
                  borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px"
                }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                >
                  <FaCheckDouble style={{ fontSize: "11px" }} /> All read
                </button>
              )}
              <button onClick={clearRead} title="Clear read" style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: "12px", padding: "4px 6px",
                borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px"
              }}
                onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
              >
                <FaTrash style={{ fontSize: "10px" }} /> Clear
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "10px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "var(--bg-elevated)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: "11px", width: "60%", background: "var(--bg-elevated)", borderRadius: "4px", marginBottom: "6px" }} />
                    <div style={{ height: "10px", width: "85%", background: "var(--bg-elevated)", borderRadius: "4px" }} />
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div style={{ padding: "36px 16px", textAlign: "center" }}>
                <FaBell style={{ fontSize: "28px", color: "var(--text-muted)", opacity: 0.3, display: "block", margin: "0 auto 10px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>No notifications</p>
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_META[n.type] || TYPE_META.general;
                const Icon = meta.icon;
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)",
                      display: "flex", gap: "10px", alignItems: "flex-start",
                      background: n.is_read ? "transparent" : "rgba(255,255,255,0.02)",
                      transition: "background 0.15s", cursor: "default",
                      borderLeft: n.is_read ? "3px solid transparent" : `3px solid ${meta.color}`
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? "transparent" : "rgba(255,255,255,0.02)"}
                  >
                    {/* Icon */}
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "8px",
                      background: meta.bg, display: "flex", alignItems: "center",
                      justifyContent: "center", color: meta.color, flexShrink: 0
                    }}>
                      <Icon style={{ fontSize: "12px" }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                        <span style={{
                          fontSize: "12px", fontWeight: n.is_read ? 500 : 700,
                          color: n.is_read ? "var(--text-secondary)" : "var(--text-primary)",
                          lineHeight: 1.3
                        }}>{n.title}</span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "3px 0 6px", lineHeight: 1.5 }}>
                        {n.message}
                      </p>
                      <div style={{ display: "flex", gap: "8px" }}>
                        {!n.is_read && (
                          <button onClick={(e) => markRead(n.id, e)} style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--text-muted)", fontSize: "10px", padding: 0,
                            display: "flex", alignItems: "center", gap: "3px"
                          }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--green)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            <FaCheckDouble style={{ fontSize: "9px" }} /> Mark read
                          </button>
                        )}
                        <button onClick={(e) => deleteOne(n.id, e)} style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text-muted)", fontSize: "10px", padding: 0,
                          display: "flex", alignItems: "center", gap: "3px"
                        }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                        >
                          <FaTrash style={{ fontSize: "9px" }} /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "10px 16px", borderTop: "1px solid var(--border-subtle)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <button
              onClick={() => { syncNotifications(); fetchNotifications(); }}
              disabled={syncing}
              style={{
                background: "none", border: "none", cursor: syncing ? "not-allowed" : "pointer",
                color: "var(--text-muted)", fontSize: "11px",
                display: "flex", alignItems: "center", gap: "4px"
              }}
            >
              {syncing ? "Syncing..." : "🔄 Refresh alerts"}
            </button>
            <button
              onClick={() => { setOpen(false); navigate("/notifications"); }}
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: "11px",
                display: "flex", alignItems: "center", gap: "4px"
              }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            >
              View all <FaChevronRight style={{ fontSize: "9px" }} />
            </button>
          </div>
        </div>
      )}

      {/* Bell ring animation */}
      <style>{`
        @keyframes bellRing {
          0%,100% { transform: rotate(0); }
          10%,30%  { transform: rotate(-15deg); }
          20%,40%  { transform: rotate(15deg); }
          50%      { transform: rotate(0); }
        }
      `}</style>
    </div>
  );
}