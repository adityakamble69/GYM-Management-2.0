import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes,
  FaChevronLeft, FaChevronRight, FaUsers, FaFilter
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
  gender: "", date_of_birth: "", membership_type: "basic",
  membership_start: "", membership_end: "", status: "active"
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const MembershipBadge = ({ type }) => {
  const map = { premium: ["var(--yellow)", "rgba(251,191,36,0.1)"], standard: ["var(--blue)", "rgba(96,165,250,0.1)"], basic: ["var(--text-muted)", "rgba(80,80,80,0.12)"] };
  const [color, bg] = map[type] || map.basic;
  return <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "99px", background: bg, color, textTransform: "capitalize" }}>{type}</span>;
};

const StatusBadge = ({ status }) => {
  const map = { active: ["var(--green)", "var(--green-bg)"], expired: ["var(--red)", "var(--red-bg)"], inactive: ["var(--text-muted)", "rgba(80,80,80,0.12)"] };
  const [color, bg] = map[status] || map.inactive;
  return <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "99px", background: bg, color, textTransform: "capitalize" }}>{status}</span>;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Members({ onLogout }) {
  const [members, setMembers]       = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [formError, setFormError]   = useState("");
  const [saving, setSaving]         = useState(false);
  const [deleteId, setDeleteId]     = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const searchTimer                 = useRef(null);

  useEffect(() => { fetchMembers(1, ""); }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchMembers(1, search), 380);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchMembers = async (page = 1, q = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/members?page=${page}&limit=10&search=${encodeURIComponent(q)}`);
      setMembers(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setForm(EMPTY); setEditingId(null); setFormError(""); setShowModal(true); };

  const openEdit = (m) => {
    setForm({
      full_name: m.full_name || "", email: m.email || "", phone: m.phone || "",
      address: m.address || "", gender: m.gender || "",
      date_of_birth: m.date_of_birth?.split("T")[0] || "",
      membership_type: m.membership_type || "basic",
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
      else await api.post("/members", form);
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

  const setF = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // ── Render ──
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

        {/* Table Card */}
        <div className="fade-up stagger-1" style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", overflow: "hidden"
        }}>
          {/* Search Bar */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)"
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)", padding: "8px 14px", flex: 1
            }}>
              <FaSearch style={{ color: "var(--text-muted)", fontSize: "12px", flexShrink: 0 }} />
              <input
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "13.5px", width: "100%", fontFamily: "var(--font-body)" }}
                placeholder="Search by name, email, phone, membership type..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && <FaTimes style={{ color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, fontSize: "12px" }} onClick={() => setSearch("")} />}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["#", "Member", "Phone", "Membership", "Start", "End", "Status", ""].map((h, i) => (
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
                  <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Loading members...</td></tr>
                ) : members.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                    <FaUsers style={{ fontSize: "28px", display: "block", margin: "0 auto 10px", opacity: 0.3 }} />
                    {search ? "No members match your search" : "No members yet — add your first one"}
                  </td></tr>
                ) : members.map((m, i) => (
                  <tr key={m.id}
                    style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "13px 16px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>
                      {(pagination.page - 1) * pagination.limit + i + 1}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: "var(--bg-active)", border: "1px solid var(--border-default)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0
                        }}>{m.full_name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>{m.full_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>{m.phone}</td>
                    <td style={{ padding: "13px 16px" }}><MembershipBadge type={m.membership_type} /></td>
                    <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>{fmt(m.membership_start)}</td>
                    <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>{fmt(m.membership_end)}</td>
                    <td style={{ padding: "13px 16px" }}><StatusBadge status={m.status} /></td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          onClick={() => openEdit(m)}
                          style={{
                            padding: "6px 8px", borderRadius: "var(--radius-sm)",
                            background: "var(--bg-active)", border: "1px solid var(--border-default)",
                            color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        ><FaEdit style={{ fontSize: "12px" }} /></button>

                        <button
                          onClick={() => { setDeleteId(m.id); setDeleteName(m.full_name); }}
                          style={{
                            padding: "6px 8px", borderRadius: "var(--radius-sm)",
                            background: "var(--bg-active)", border: "1px solid var(--border-default)",
                            color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        ><FaTrash style={{ fontSize: "12px" }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "8px"
            }}>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {[...Array(pagination.totalPages)].map((_, idx) => {
                  const p = idx + 1;
                  const active = p === pagination.page;
                  return (
                    <button key={p} onClick={() => fetchMembers(p, search)} style={{
                      width: "30px", height: "30px", borderRadius: "var(--radius-sm)",
                      background: active ? "var(--text-primary)" : "var(--bg-elevated)",
                      border: `1px solid ${active ? "var(--text-primary)" : "var(--border-default)"}`,
                      color: active ? "#0a0a0a" : "var(--text-secondary)",
                      cursor: "pointer", fontSize: "12px", fontWeight: active ? 700 : 400
                    }}>{p}</button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchMembers(pagination.page - 1, search)}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "6px 12px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    color: pagination.page <= 1 ? "var(--text-disabled)" : "var(--text-secondary)",
                    cursor: pagination.page <= 1 ? "not-allowed" : "pointer", fontSize: "12px"
                  }}
                ><FaChevronLeft style={{ fontSize: "10px" }} /> Prev</button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchMembers(pagination.page + 1, search)}
                  style={{
                    display: "flex", alignItems: "center", gap: "5px",
                    padding: "6px 12px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    color: pagination.page >= pagination.totalPages ? "var(--text-disabled)" : "var(--text-secondary)",
                    cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer", fontSize: "12px"
                  }}
                >Next <FaChevronRight style={{ fontSize: "10px" }} /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div
          className="fade-in"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)"
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "580px",
            maxHeight: "90vh", overflowY: "auto", padding: "28px",
            boxShadow: "var(--shadow-lg)"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {editingId ? "Edit Member" : "Add New Member"}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>
                  {editingId ? "Update member information" : "Fill in the details below"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes style={{ fontSize: "12px" }} />
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "var(--border-subtle)", marginBottom: "22px" }} />

            {/* Form */}
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
              <Field label="Membership Type">
                <select style={inputStyle} value={form.membership_type} onChange={e => setF("membership_type", e.target.value)}>
                  <option value="basic">Basic</option>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </Field>
              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={e => setF("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </Field>
              <Field label="Membership Start">
                <input style={inputStyle} type="date" value={form.membership_start} onChange={e => setF("membership_start", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>
              <Field label="Membership End">
                <input style={inputStyle} type="date" value={form.membership_end} onChange={e => setF("membership_end", e.target.value)}
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>
            </div>

            {formError && (
              <div style={{
                marginTop: "16px", padding: "11px 14px", borderRadius: "var(--radius-sm)",
                background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)",
                color: "var(--red)", fontSize: "13px"
              }}>{formError}</div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "9px 20px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px"
                }}
              >Cancel</button>
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  padding: "9px 24px", borderRadius: "var(--radius-sm)",
                  background: saving ? "var(--bg-elevated)" : "var(--text-primary)",
                  color: saving ? "var(--text-muted)" : "#0a0a0a",
                  border: "none", cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "13px", fontWeight: 700,
                  fontFamily: "var(--font-display)", letterSpacing: "0.03em"
                }}
              >{saving ? "Saving..." : editingId ? "UPDATE" : "ADD MEMBER"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ── */}
      {deleteId && (
        <div
          className="fade-in"
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(4px)"
          }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "380px", width: "100%",
            boxShadow: "var(--shadow-lg)", textAlign: "center"
          }}>
            <div style={{
              width: "48px", height: "48px", borderRadius: "50%",
              background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: "18px", color: "var(--red)"
            }}>
              <FaTrash />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
              Delete Member?
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-secondary)" }}>{deleteName}</strong> will be permanently removed. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                onClick={() => setDeleteId(null)}
                style={{
                  padding: "9px 20px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", flex: 1
                }}
              >Cancel</button>
              <button
                onClick={handleDelete}
                style={{
                  padding: "9px 20px", borderRadius: "var(--radius-sm)",
                  background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.3)",
                  color: "var(--red)", cursor: "pointer", fontSize: "13px",
                  fontWeight: 700, flex: 1
                }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}