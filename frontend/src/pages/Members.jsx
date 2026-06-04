import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes,
  FaChevronLeft, FaChevronRight, FaUsers, FaFilter,
  FaHistory, FaRupeeSign, FaCheckCircle, FaClock
} from "react-icons/fa";

// ─── Reusable Input ────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{
      fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
      textTransform: "uppercase", letterSpacing: "0.08em"
    }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  padding: "9px 12px", borderRadius: "var(--radius-sm)",
  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
  color: "var(--text-primary)", fontSize: "13.5px", outline: "none",
  width: "100%", transition: "border-color 0.15s",
  fontFamily: "var(--font-body)"
};

const EMPTY = {
  full_name: "", email: "", phone: "", address: "",
  gender: "", date_of_birth: "", membership_type: "",
  membership_start: "", membership_end: "", status: "active"
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtPrice = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

// ─── Duration type → badge colours ────────────────────────────────────────────
const DUR_COLOR = {
  monthly:   ["var(--blue)",        "rgba(96,165,250,0.1)"],
  quarterly: ["var(--yellow)",      "rgba(251,191,36,0.1)"],
  yearly:    ["var(--green)",       "rgba(74,222,128,0.1)"],
};

const MembershipBadge = ({ type, plans }) => {
  // Try to match against a real plan name
  const plan = plans.find(p => p.name === type || p.duration_type === type);
  const durType = plan?.duration_type || type;
  const [color, bg] = DUR_COLOR[durType] || ["var(--text-muted)", "rgba(80,80,80,0.12)"];
  return (
    <span style={{
      fontSize: "11px", fontWeight: 600, padding: "2px 10px",
      borderRadius: "99px", background: bg, color,
      textTransform: "capitalize", whiteSpace: "nowrap"
    }}>
      {type || "—"}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = {
    active:   ["var(--green)",      "var(--green-bg)"],
    expired:  ["var(--red)",        "var(--red-bg)"],
    inactive: ["var(--text-muted)", "rgba(80,80,80,0.12)"]
  };
  const [color, bg] = map[status] || map.inactive;
  return (
    <span style={{
      fontSize: "11px", fontWeight: 600, padding: "2px 10px",
      borderRadius: "99px", background: bg, color, textTransform: "capitalize"
    }}>{status}</span>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Members({ onLogout }) {
  const [members,    setMembers]    = useState([]);
  const [plans,      setPlans]      = useState([]);   // ← membership plans from DB
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(EMPTY);
  const [formError,  setFormError]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [deleteId,   setDeleteId]   = useState(null);
  const [deleteName, setDeleteName] = useState("");
  // ── Payment History state ─────────────────────────────────────────────────
  const [historyMember,  setHistoryMember]  = useState(null); // {id, full_name}
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const searchTimer                 = useRef(null);

  // ── On mount: fetch members + plans ──────────────────────────────────────────
  useEffect(() => {
    fetchMembers(1, "");
    fetchPlans();
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchMembers(1, search), 380);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchPlans = async () => {
    try {
      const res = await api.get("/membership-plans?status=active");
      setPlans(res.data.data || []);
    } catch (e) { console.error("Plans fetch error:", e); }
  };

  const fetchMembers = async (page = 1, q = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/members?page=${page}&limit=10&search=${encodeURIComponent(q)}`);
      setMembers(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── When plan selected → auto-fill membership dates ───────────────────────
  const handlePlanSelect = (planName) => {
    setF("membership_type", planName);
    const plan = plans.find(p => p.name === planName);
    if (plan) {
      const start = new Date();
      const end   = new Date();
      end.setDate(end.getDate() + plan.duration_days);
      setF("membership_start", start.toISOString().split("T")[0]);
      setF("membership_end",   end.toISOString().split("T")[0]);
    }
  };

  const openAdd = () => {
    setForm(EMPTY);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (m) => {
    setForm({
      full_name: m.full_name || "", email: m.email || "", phone: m.phone || "",
      address: m.address || "", gender: m.gender || "",
      date_of_birth: m.date_of_birth?.split("T")[0] || "",
      membership_type: m.membership_type || "",
      membership_start: m.membership_start?.split("T")[0] || "",
      membership_end: m.membership_end?.split("T")[0] || "",
      status: m.status || "active"
    });
    setEditingId(m.id); setFormError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.full_name || !form.email || !form.phone) {
      setFormError("Name, email, and phone are required."); return;
    }
    setSaving(true);
    try {
      if (editingId) await api.put(`/members/${editingId}`, form);
      else           await api.post("/members", form);
      setShowModal(false);
      fetchMembers(pagination.page, search);
    } catch (e) { setFormError(e.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/members/${deleteId}`);
      setDeleteId(null);
      fetchMembers(pagination.page, search);
    } catch (e) { console.error(e); }
  };

  // ── Payment History ───────────────────────────────────────────────────────
  const openHistory = async (member) => {
    setHistoryMember(member);
    setHistoryRecords([]);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/payments/member/${member.id}`);
      setHistoryRecords(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  };

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // ── Group plans by duration_type for optgroups ────────────────────────────
  const plansByType = plans.reduce((acc, p) => {
    const t = p.duration_type;
    if (!acc[t]) acc[t] = [];
    acc[t].push(p);
    return acc;
  }, {});
  const TYPE_LABEL = { monthly: "Monthly Plans", quarterly: "Quarterly Plans", yearly: "Yearly Plans" };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
        {/* Header */}
        <div className="fade-up" style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px"
        }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>Members</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              {pagination.total} total member{pagination.total !== 1 ? "s" : ""} registered
            </p>
          </div>
          <button
            onClick={openAdd}
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
            <FaPlus style={{ fontSize: "11px" }} /> ADD MEMBER
          </button>
        </div>

        {/* Search + Table Card */}
        <div className="fade-up stagger-1" style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-xl)", overflow: "hidden"
        }}>
          {/* Search bar */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "12px" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, phone…"
                style={{ ...inputStyle, paddingLeft: "34px", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            {search && (
              <button onClick={() => setSearch("")} style={{ padding: "8px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <FaTimes style={{ fontSize: "12px" }} />
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Name", "Contact", "Membership Plan", "Period", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                          <div style={{ height: "12px", borderRadius: "4px", background: "var(--bg-elevated)", width: j === 0 ? "140px" : "80px" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                      <FaUsers style={{ fontSize: "32px", opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
                      {search ? `No members match "${search}"` : "No members yet. Add your first one!"}
                    </td>
                  </tr>
                ) : (
                  members.map(m => (
                    <tr key={m.id}
                      style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.full_name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{m.gender || "—"}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ color: "var(--text-secondary)" }}>{m.email}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{m.phone}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <MembershipBadge type={m.membership_type} plans={plans} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmt(m.membership_start)}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>→ {fmt(m.membership_end)}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <StatusBadge status={m.status} />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => openHistory(m)}
                            style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--blue)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", transition: "color 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--blue)"}
                            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-default)"}
                            title="Payment History"
                          >
                            <FaHistory style={{ fontSize: "10px" }} /> History
                          </button>
                          <button
                            onClick={() => openEdit(m)}
                            style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", transition: "color 0.15s" }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                          >
                            <FaEdit style={{ fontSize: "10px" }} /> Edit
                          </button>
                          <button
                            onClick={() => { setDeleteId(m.id); setDeleteName(m.full_name); }}
                            style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <FaTrash style={{ fontSize: "10px" }} /> Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} members
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => fetchMembers(pagination.page - 1, search)}
                  disabled={pagination.page === 1}
                  style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: pagination.page === 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: pagination.page === 1 ? "not-allowed" : "pointer" }}
                >
                  <FaChevronLeft />
                </button>
                <button
                  onClick={() => fetchMembers(pagination.page + 1, search)}
                  disabled={pagination.page === pagination.totalPages}
                  style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: pagination.page === pagination.totalPages ? "var(--text-muted)" : "var(--text-secondary)", cursor: pagination.page === pagination.totalPages ? "not-allowed" : "pointer" }}
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div
          className="fade-in"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", padding: "28px", width: "100%", maxWidth: "580px",
            boxShadow: "var(--shadow-lg)", maxHeight: "92vh", overflowY: "auto"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {editingId ? "Edit Member" : "Add Member"}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                  {editingId ? "Update member details" : "Register a new gym member"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes style={{ fontSize: "12px" }} />
              </button>
            </div>

            <div style={{ height: "1px", background: "var(--border-subtle)", marginBottom: "22px" }} />

            {/* Form Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Full Name *">
                  <input style={inputStyle} value={form.full_name} onChange={e => setF("full_name", e.target.value)} placeholder="Enter full name"
                    onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
                </Field>
              </div>

              <Field label="Email Address *">
                <input style={inputStyle} type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="email@example.com"
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>

              <Field label="Phone Number *">
                <input style={inputStyle} value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="9876543210"
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>

              <Field label="Gender">
                <select style={inputStyle} value={form.gender} onChange={e => setF("gender", e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Date of Birth">
                <input style={inputStyle} type="date" value={form.date_of_birth} onChange={e => setF("date_of_birth", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Address">
                  <input style={inputStyle} value={form.address} onChange={e => setF("address", e.target.value)} placeholder="Enter address"
                    onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
                </Field>
              </div>

              {/* ── MEMBERSHIP PLAN — dynamic from DB ── */}
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Membership Plan">
                  <select
                    style={inputStyle}
                    value={form.membership_type}
                    onChange={e => handlePlanSelect(e.target.value)}
                  >
                    <option value="">— Select a Plan —</option>
                    {Object.entries(plansByType).map(([type, typePlans]) => (
                      <optgroup key={type} label={TYPE_LABEL[type] || type}>
                        {typePlans.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} — ₹{Number(p.price).toLocaleString("en-IN")} / {p.duration_days} days
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                {/* Show selected plan details */}
                {form.membership_type && (() => {
                  const selectedPlan = plans.find(p => p.name === form.membership_type);
                  if (!selectedPlan) return null;
                  return (
                    <div style={{
                      marginTop: "8px", padding: "10px 14px", borderRadius: "var(--radius-sm)",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                      display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap"
                    }}>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Duration: <strong style={{ color: "var(--text-secondary)" }}>{selectedPlan.duration_days} days</strong>
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        Price: <strong style={{ color: "var(--green)" }}>₹{Number(selectedPlan.price).toLocaleString("en-IN")}</strong>
                      </span>
                      {selectedPlan.description && (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{selectedPlan.description}</span>
                      )}
                    </div>
                  );
                })()}
              </div>

              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={e => setF("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </Field>

              <div /> {/* spacer */}

              <Field label="Membership Start">
                <input style={inputStyle} type="date" value={form.membership_start} onChange={e => setF("membership_start", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>

              <Field label="Membership End">
                <input style={inputStyle} type="date" value={form.membership_end} onChange={e => setF("membership_end", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                  💡 Plan select karne par start/end dates automatically set ho jaati hain.
                </p>
              </div>
            </div>

            {formError && (
              <div style={{ marginTop: "16px", padding: "11px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px" }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: "9px 24px", borderRadius: "var(--radius-sm)",
                background: saving ? "var(--bg-elevated)" : "var(--text-primary)",
                color: saving ? "var(--text-muted)" : "#0a0a0a",
                border: "none", cursor: saving ? "not-allowed" : "pointer",
                fontSize: "13px", fontWeight: 700,
                fontFamily: "var(--font-display)", letterSpacing: "0.03em"
              }}>
                {saving ? "Saving..." : editingId ? "UPDATE" : "ADD MEMBER"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment History Modal ── */}
      {historyMember && (
        <div
          className="fade-in"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setHistoryMember(null); }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", padding: "28px", width: "100%", maxWidth: "680px",
            boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Payment History
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                  {historyMember.full_name} — all payment records
                </p>
              </div>
              <button onClick={() => setHistoryMember(null)} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes style={{ fontSize: "12px" }} />
              </button>
            </div>

            <div style={{ height: "1px", background: "var(--border-subtle)", margin: "16px 0" }} />

            {/* Summary Stats */}
            {!historyLoading && historyRecords.length > 0 && (() => {
              const totalPaid = historyRecords.reduce((s, r) => s + parseFloat(r.paid_amount || r.amount || 0), 0);
              const totalDue  = historyRecords.reduce((s, r) => s + parseFloat(r.due_amount || 0), 0);
              return (
                <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
                  {[
                    { label: "Total Paid",    val: `₹${Number(totalPaid).toLocaleString("en-IN")}`, color: "var(--green)",  bg: "var(--green-bg)"  },
                    { label: "Total Due",     val: `₹${Number(totalDue).toLocaleString("en-IN")}`,  color: "var(--red)",    bg: "var(--red-bg)"    },
                    { label: "Transactions",  val: historyRecords.length,                            color: "var(--blue)",   bg: "var(--blue-bg)"   },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: "var(--radius-sm)", padding: "10px 16px", flex: "1 1 120px" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Records */}
            {historyLoading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
            ) : historyRecords.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                <FaHistory style={{ fontSize: "28px", opacity: 0.25, display: "block", margin: "0 auto 10px" }} />
                No payment records found for this member
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {historyRecords.map((r, i) => {
                  const isPaid    = parseFloat(r.due_amount || 0) === 0;
                  const paidAmt   = parseFloat(r.paid_amount || r.amount || 0);
                  const dueAmt    = parseFloat(r.due_amount  || 0);
                  const totalAmt  = parseFloat(r.amount || 0);
                  return (
                    <div key={r.id} style={{
                      background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                      borderRadius: "var(--radius-md)", padding: "16px 18px",
                      borderLeft: `3px solid ${isPaid ? "var(--green)" : "var(--yellow)"}`
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                        {/* Left — Plan + Date */}
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "14px", marginBottom: "4px" }}>
                            {r.plan_name || r.payment_for || "Payment"}
                          </div>
                          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                              📅 {fmt(r.payment_date)}
                            </span>
                            {r.months_covered > 0 && (
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                🗓 {r.months_covered} month{r.months_covered > 1 ? "s" : ""}
                              </span>
                            )}
                            {r.plan_start && r.plan_end && (
                              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                                {fmt(r.plan_start)} → {fmt(r.plan_end)}
                              </span>
                            )}
                          </div>
                          {r.notes && (
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", fontStyle: "italic" }}>
                              💬 {r.notes}
                            </div>
                          )}
                        </div>

                        {/* Right — Amount + Status */}
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>
                            ₹{Number(totalAmt).toLocaleString("en-IN")}
                          </div>
                          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", color: "var(--green)" }}>
                              Paid: ₹{Number(paidAmt).toLocaleString("en-IN")}
                            </span>
                            {dueAmt > 0 && (
                              <span style={{ fontSize: "11px", color: "var(--red)" }}>
                                Due: ₹{Number(dueAmt).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end", marginTop: "6px" }}>
                            {/* Method badge */}
                            <span style={{
                              fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", textTransform: "uppercase",
                              background: "rgba(80,80,80,0.15)", color: "var(--text-muted)"
                            }}>{r.payment_method || "cash"}</span>
                            {/* Status badge */}
                            <span style={{
                              fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px",
                              background: isPaid ? "var(--green-bg)" : "var(--yellow-bg)",
                              color: isPaid ? "var(--green)" : "var(--yellow)"
                            }}>
                              {isPaid ? "✓ Paid" : "⏳ Partial"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--border-subtle)", textAlign: "right" }}>
              <button onClick={() => setHistoryMember(null)} style={{ padding: "9px 24px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteId && (
        <div
          className="fade-in"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "380px", width: "100%",
            boxShadow: "var(--shadow-lg)", textAlign: "center"
          }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "18px", color: "var(--red)" }}>
              <FaTrash />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Delete Member?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-secondary)" }}>{deleteName}</strong> will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", flex: 1 }}>
                Cancel
              </button>
              <button onClick={handleDelete} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.3)", color: "var(--red)", cursor: "pointer", fontSize: "13px", fontWeight: 700, flex: 1 }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}