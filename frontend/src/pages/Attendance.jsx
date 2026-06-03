import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  FaSearch, FaUserCheck, FaUserClock, FaCalendarAlt,
  FaTimes, FaTrash, FaChevronLeft, FaChevronRight,
  FaClipboardCheck, FaClock
} from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (dt) => {
  if (!dt) return "—";
  return new Date(dt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};
const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const duration = (cin, cout) => {
  if (!cin || !cout) return "—";
  const diff = (new Date(cout) - new Date(cin)) / 60000;
  const h = Math.floor(diff / 60), m = Math.round(diff % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const todayStr = () => new Date().toISOString().split("T")[0];

// ─── Reusable badge ───────────────────────────────────────────────────────────
const Badge = ({ label, color, bg }) => (
  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "99px", background: bg, color, textTransform: "capitalize" }}>
    {label}
  </span>
);

// ─── Check-in Modal ───────────────────────────────────────────────────────────
function CheckInModal({ onClose, onSuccess }) {
  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/members?search=${encodeURIComponent(query)}&limit=6`);
        setResults(res.data.data || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  }, [query]);

  const handleCheckIn = async () => {
    if (!selected) { setError("Please select a member first."); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/attendance/checkin", { member_id: selected.id });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Check-in failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fade-in" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)"
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fade-up" style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "480px",
        padding: "28px", boxShadow: "var(--shadow-lg)"
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Mark Attendance</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Search and select a member to check in</p>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FaTimes style={{ fontSize: "12px" }} />
          </button>
        </div>

        {/* Search */}
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)", padding: "10px 14px", marginBottom: "12px"
        }}>
          <FaSearch style={{ color: "var(--text-muted)", fontSize: "13px", flexShrink: 0 }} />
          <input
            autoFocus
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null); }}
            placeholder="Search by name, email or phone..."
            style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "14px", width: "100%", fontFamily: "var(--font-body)" }}
          />
          {query && <FaTimes style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }} onClick={() => { setQuery(""); setSelected(null); }} />}
        </div>

        {/* Results */}
        {results.length > 0 && !selected && (
          <div style={{
            background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-sm)", overflow: "hidden", marginBottom: "16px"
          }}>
            {results.map((m, i) => (
              <div
                key={m.id}
                onClick={() => { setSelected(m); setQuery(m.full_name); setResults([]); }}
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 14px", cursor: "pointer", transition: "background 0.12s",
                  borderBottom: i < results.length - 1 ? "1px solid var(--border-subtle)" : "none"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg-active)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "var(--bg-active)", border: "1px solid var(--border-strong)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0
                }}>{m.full_name?.charAt(0)?.toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{m.full_name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.email} · {m.phone}</div>
                </div>
                <Badge label={m.membership_type}
                  color={m.membership_type === "premium" ? "var(--yellow)" : m.membership_type === "standard" ? "var(--blue)" : "var(--text-muted)"}
                  bg={m.membership_type === "premium" ? "rgba(251,191,36,0.1)" : m.membership_type === "standard" ? "rgba(96,165,250,0.1)" : "rgba(80,80,80,0.12)"}
                />
              </div>
            ))}
          </div>
        )}

        {/* Selected Member Card */}
        {selected && (
          <div style={{
            background: "var(--green-bg)", border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: "var(--radius-sm)", padding: "14px 16px", marginBottom: "16px",
            display: "flex", alignItems: "center", gap: "12px"
          }}>
            <div style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: 700, color: "var(--green)", flexShrink: 0
            }}>{selected.full_name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{selected.full_name}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selected.email} · {selected.membership_type}</div>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>
            Cancel
          </button>
          <button
            onClick={handleCheckIn} disabled={loading || !selected}
            style={{
              padding: "9px 24px", borderRadius: "var(--radius-sm)",
              background: (!selected || loading) ? "var(--bg-elevated)" : "var(--text-primary)",
              color: (!selected || loading) ? "var(--text-muted)" : "#0a0a0a",
              border: "none", cursor: (!selected || loading) ? "not-allowed" : "pointer",
              fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.03em"
            }}
          >
            {loading ? "Checking in..." : "✓ CHECK IN"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Attendance Page ──────────────────────────────────────────────────────
export default function Attendance({ onLogout }) {
  const { can, isSuper } = useAuth();
  const [records, setRecords]       = useState([]);
  const [date, setDate]             = useState(todayStr());
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [search, setSearch]         = useState("");

  useEffect(() => { fetchAttendance(); }, [date]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/date/${date}`);
      setRecords(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCheckout = async (id) => {
    try {
      await api.put(`/attendance/checkout/${id}`);
      fetchAttendance();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/attendance/${deleteId}`);
      setDeleteId(null);
      fetchAttendance();
    } catch (e) { console.error(e); }
  };

  const prevDay = () => {
    const d = new Date(date); d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1);
    if (d <= new Date()) setDate(d.toISOString().split("T")[0]);
  };

  const isToday    = date === todayStr();
  const filtered   = records.filter(r =>
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.email?.toLowerCase().includes(search.toLowerCase())
  );
  const presentCount  = records.filter(r => r.status === "present").length;
  const checkedOut    = records.filter(r => r.check_out).length;
  const stillIn       = presentCount - checkedOut;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        {/* Header */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>Attendance</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              {isToday ? "Today — " : ""}{fmtDate(date)} · {presentCount} check-in{presentCount !== 1 ? "s" : ""}
            </p>
          </div>
          {can("mark_attendance") && (
            <button
              onClick={() => setShowModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "10px 18px", borderRadius: "var(--radius-sm)",
                background: "var(--text-primary)", color: "#0a0a0a",
                border: "none", cursor: "pointer", fontSize: "13px",
                fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.03em",
                transition: "opacity 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <FaUserCheck style={{ fontSize: "13px" }} /> MARK CHECK-IN
            </button>
          )}
        </div>

        {/* Mini stat strip */}
        <div className="fade-up stagger-1" style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
          {[
            { icon: FaClipboardCheck, label: "Present",     val: presentCount, color: "var(--green)",  bg: "var(--green-bg)"  },
            { icon: FaUserCheck,      label: "Checked Out", val: checkedOut,   color: "var(--blue)",   bg: "var(--blue-bg)"   },
            { icon: FaUserClock,      label: "Still Inside",val: stillIn,      color: "var(--yellow)", bg: "var(--yellow-bg)" },
          ].map(s => (
            <div key={s.label} style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)", padding: "12px 18px", flex: "1 1 140px"
            }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                <s.icon style={{ fontSize: "14px" }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="fade-up stagger-2" style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", overflow: "hidden"
        }}>
          {/* Controls row */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
            {/* Date navigator */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button onClick={prevDay} style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer" }}>
                <FaChevronLeft style={{ fontSize: "11px" }} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
                <FaCalendarAlt style={{ color: "var(--text-muted)", fontSize: "12px" }} />
                <input
                  type="date" value={date} max={todayStr()}
                  onChange={e => setDate(e.target.value)}
                  style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "13px", fontFamily: "var(--font-body)", cursor: "pointer" }}
                />
              </div>
              <button onClick={nextDay} disabled={isToday} style={{ padding: "7px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: isToday ? "var(--text-disabled)" : "var(--text-secondary)", cursor: isToday ? "not-allowed" : "pointer" }}>
                <FaChevronRight style={{ fontSize: "11px" }} />
              </button>
              {!isToday && (
                <button onClick={() => setDate(todayStr())} style={{ padding: "7px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "12px" }}>
                  Today
                </button>
              )}
            </div>

            {/* Search */}
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)", padding: "7px 12px", flex: 1, minWidth: "180px"
            }}>
              <FaSearch style={{ color: "var(--text-muted)", fontSize: "12px", flexShrink: 0 }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Filter by name or email..."
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "13px", width: "100%", fontFamily: "var(--font-body)" }}
              />
              {search && <FaTimes style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "11px" }} onClick={() => setSearch("")} />}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["#", "Member", "Membership", "Check In", "Check Out", "Duration", "Status", ""].map((h, i) => (
                    <th key={i} style={{
                      padding: "10px 16px", textAlign: h === "" ? "center" : "left",
                      fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap"
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                    <FaClipboardCheck style={{ fontSize: "28px", display: "block", margin: "0 auto 10px", opacity: 0.25 }} />
                    {search ? "No records match your search" : isToday ? "No check-ins yet today — mark the first one!" : "No attendance records for this date"}
                  </td></tr>
                ) : filtered.map((r, i) => (
                  <tr key={r.id}
                    style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "13px 16px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: "var(--bg-active)", border: "1px solid var(--border-default)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0
                        }}>{r.full_name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>{r.full_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <Badge label={r.membership_type}
                        color={r.membership_type === "premium" ? "var(--yellow)" : r.membership_type === "standard" ? "var(--blue)" : "var(--text-muted)"}
                        bg={r.membership_type === "premium" ? "rgba(251,191,36,0.1)" : r.membership_type === "standard" ? "rgba(96,165,250,0.1)" : "rgba(80,80,80,0.12)"}
                      />
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--green)", fontSize: "13px" }}>
                        <FaClock style={{ fontSize: "11px" }} /> {fmtTime(r.check_in)}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {r.check_out ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-secondary)", fontSize: "13px" }}>
                          <FaClock style={{ fontSize: "11px" }} /> {fmtTime(r.check_out)}
                        </div>
                      ) : (
                        isToday && can("mark_attendance") ? (
                          <button
                            onClick={() => handleCheckout(r.id)}
                            style={{
                              padding: "4px 12px", borderRadius: "var(--radius-sm)",
                              background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
                              color: "var(--yellow)", cursor: "pointer", fontSize: "11px", fontWeight: 600
                            }}
                          >Check Out</button>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>Still inside</span>
                        )
                      )}
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>
                      {duration(r.check_in, r.check_out)}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <Badge
                        label={r.check_out ? "completed" : "active"}
                        color={r.check_out ? "var(--text-muted)" : "var(--green)"}
                        bg={r.check_out ? "rgba(80,80,80,0.12)" : "var(--green-bg)"}
                      />
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      {isSuper && (
                        <button
                          onClick={() => setDeleteId(r.id)}
                          style={{
                            padding: "6px 8px", borderRadius: "var(--radius-sm)",
                            background: "var(--bg-active)", border: "1px solid var(--border-default)",
                            color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        ><FaTrash style={{ fontSize: "12px" }} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Check-in Modal */}
      {showModal && <CheckInModal onClose={() => setShowModal(false)} onSuccess={fetchAttendance} />}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--red)" }}>
              <FaTrash style={{ fontSize: "16px" }} />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Delete Record?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "22px" }}>This attendance record will be permanently deleted.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", flex: 1 }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--red)", cursor: "pointer", fontSize: "13px", fontWeight: 700, flex: 1 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}