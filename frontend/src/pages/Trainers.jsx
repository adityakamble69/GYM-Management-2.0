import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  FaPlus, FaSearch, FaEdit, FaTrash, FaTimes,
  FaChevronLeft, FaChevronRight, FaUserTie,
  FaDumbbell, FaStar, FaRupeeSign
} from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const SPECIALIZATIONS = [
  "Weight Training", "Yoga & Flexibility", "CrossFit & HIIT",
  "Zumba & Cardio", "Nutrition & Diet", "Swimming",
  "Martial Arts", "Pilates", "Functional Training", "Other"
];

const EMPTY = {
  full_name: "", email: "", phone: "", address: "",
  gender: "", date_of_birth: "", specialization: "",
  experience_years: "", salary: "", joining_date: "", status: "active"
};

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, span, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px", gridColumn: span ? "1 / -1" : undefined }}>
    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
    {children}
  </div>
);

const inp = {
  padding: "9px 12px", borderRadius: "var(--radius-sm)",
  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
  color: "var(--text-primary)", fontSize: "13.5px", outline: "none",
  width: "100%", fontFamily: "var(--font-body)", transition: "border-color 0.15s"
};

const focus = e => e.target.style.borderColor = "var(--border-strong)";
const blur  = e => e.target.style.borderColor = "var(--border-default)";

// ─── Stat Strip ───────────────────────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, val, color, bg }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: "10px",
    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)", padding: "12px 18px", flex: "1 1 140px"
  }}>
    <div style={{ width: "32px", height: "32px", borderRadius: "7px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color }}>
      <Icon style={{ fontSize: "14px" }} />
    </div>
    <div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{label}</div>
    </div>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Trainers({ onLogout }) {
  const { can, isSuper } = useAuth();
  const [trainers, setTrainers]     = useState([]);
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
  const [stats, setStats]           = useState({ total: 0, active: 0, inactive: 0 });
  const timer = useRef(null);

  useEffect(() => { fetchTrainers(1, ""); fetchStats(); }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchTrainers(1, search), 380);
    return () => clearTimeout(timer.current);
  }, [search]);

  const fetchTrainers = async (page = 1, q = "") => {
    setLoading(true);
    try {
      const res = await api.get(`/trainers?page=${page}&limit=10&search=${encodeURIComponent(q)}`);
      setTrainers(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/trainers/stats/summary");
      setStats(res.data.data || {});
    } catch (e) { console.error(e); }
  };

  const openAdd = () => { setForm(EMPTY); setEditingId(null); setFormError(""); setShowModal(true); };

  const openEdit = (t) => {
    setForm({
      full_name:        t.full_name       || "",
      email:            t.email           || "",
      phone:            t.phone           || "",
      address:          t.address         || "",
      gender:           t.gender          || "",
      date_of_birth:    t.date_of_birth   ? t.date_of_birth.split("T")[0]  : "",
      specialization:   t.specialization  || "",
      experience_years: t.experience_years ?? "",
      salary:           t.salary          ?? "",
      joining_date:     t.joining_date    ? t.joining_date.split("T")[0]   : "",
      status:           t.status          || "active",
    });
    setEditingId(t.id); setFormError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.full_name || !form.email || !form.phone) {
      setFormError("Name, email and phone are required."); return;
    }
    setSaving(true);
    try {
      if (editingId) await api.put(`/trainers/${editingId}`, form);
      else           await api.post("/trainers", form);
      setShowModal(false);
      fetchTrainers(pagination.page, search);
      fetchStats();
    } catch (e) { setFormError(e.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/trainers/${deleteId}`);
      setDeleteId(null);
      fetchTrainers(pagination.page, search);
      fetchStats();
    } catch (e) { console.error(e); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "14px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>Trainers</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              {pagination.total} trainer{pagination.total !== 1 ? "s" : ""} registered
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
            <FaPlus style={{ fontSize: "11px" }} /> ADD TRAINER
          </button>
        </div>

        {/* Stats Strip */}
        <div className="fade-up stagger-1" style={{ display: "flex", gap: "12px", marginBottom: "22px", flexWrap: "wrap" }}>
          <MiniStat icon={FaUserTie}   label="Total Trainers"  val={stats.total    || 0} color="var(--blue)"   bg="var(--blue-bg)"   />
          <MiniStat icon={FaStar}      label="Active"          val={stats.active   || 0} color="var(--green)"  bg="var(--green-bg)"  />
          <MiniStat icon={FaDumbbell}  label="Inactive"        val={stats.inactive || 0} color="var(--red)"    bg="var(--red-bg)"    />
        </div>

        {/* Table Card */}
        <div className="fade-up stagger-2" style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", overflow: "hidden"
        }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-sm)", padding: "8px 14px", flex: 1
            }}>
              <FaSearch style={{ color: "var(--text-muted)", fontSize: "12px", flexShrink: 0 }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, phone, specialization..."
                style={{ background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: "13.5px", width: "100%", fontFamily: "var(--font-body)" }}
              />
              {search && <FaTimes style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }} onClick={() => setSearch("")} />}
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "12px", whiteSpace: "nowrap" }}>
              {pagination.total} result{pagination.total !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["#", "Trainer", "Phone", "Specialization", "Experience", "Salary", "Joined", "Status", ""].map((h, i) => (
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
                  <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</td></tr>
                ) : trainers.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                    <FaUserTie style={{ fontSize: "28px", display: "block", margin: "0 auto 10px", opacity: 0.25 }} />
                    {search ? "No trainers match your search" : "No trainers yet — add your first one!"}
                  </td></tr>
                ) : trainers.map((t, i) => (
                  <tr key={t.id}
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
                          width: "34px", height: "34px", borderRadius: "50%",
                          background: "var(--bg-active)", border: "1px solid var(--border-default)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)", flexShrink: 0
                        }}>{t.full_name?.charAt(0)?.toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "13px" }}>{t.full_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>{t.phone}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FaDumbbell style={{ color: "var(--text-muted)", fontSize: "11px" }} />
                        <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{t.specialization || "—"}</span>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>
                        {t.experience_years ?? "—"}
                        <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: "11px" }}> yrs</span>
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>
                        <FaRupeeSign style={{ fontSize: "10px", color: "var(--text-muted)" }} />
                        {t.salary ? Number(t.salary).toLocaleString("en-IN") : "—"}
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", color: "var(--text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>
                      {fmt(t.joining_date)}
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        fontSize: "11px", fontWeight: 600, padding: "2px 10px",
                        borderRadius: "99px", textTransform: "capitalize",
                        background: t.status === "active" ? "var(--green-bg)" : "rgba(80,80,80,0.12)",
                        color: t.status === "active" ? "var(--green)" : "var(--text-muted)"
                      }}>{t.status}</span>
                    </td>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <button
                          onClick={() => openEdit(t)}
                          style={{ padding: "6px 8px", borderRadius: "var(--radius-sm)", background: "var(--bg-active)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--blue)"; e.currentTarget.style.color = "var(--blue)"; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                        ><FaEdit style={{ fontSize: "12px" }} /></button>

                        {isSuper && (
                          <button
                            onClick={() => { setDeleteId(t.id); setDeleteName(t.full_name); }}
                            style={{ padding: "6px 8px", borderRadius: "var(--radius-sm)", background: "var(--bg-active)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                          ><FaTrash style={{ fontSize: "12px" }} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  disabled={pagination.page <= 1} onClick={() => fetchTrainers(pagination.page - 1, search)}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: pagination.page <= 1 ? "var(--text-disabled)" : "var(--text-secondary)", cursor: pagination.page <= 1 ? "not-allowed" : "pointer", fontSize: "12px" }}
                ><FaChevronLeft style={{ fontSize: "10px" }} /> Prev</button>
                <button
                  disabled={pagination.page >= pagination.totalPages} onClick={() => fetchTrainers(pagination.page + 1, search)}
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: pagination.page >= pagination.totalPages ? "var(--text-disabled)" : "var(--text-secondary)", cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer", fontSize: "12px" }}
                >Next <FaChevronRight style={{ fontSize: "10px" }} /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Add / Edit Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", padding: "28px", boxShadow: "var(--shadow-lg)" }}>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {editingId ? "Edit Trainer" : "Add New Trainer"}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>
                  {editingId ? "Update trainer information" : "Fill in the details below"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes style={{ fontSize: "12px" }} />
              </button>
            </div>

            <div style={{ height: "1px", background: "var(--border-subtle)", margin: "18px 0" }} />

            {/* Form Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

              <Field label="Full Name *" span>
                <input style={inp} value={form.full_name} onChange={e => setF("full_name", e.target.value)} placeholder="Enter full name" onFocus={focus} onBlur={blur} />
              </Field>

              <Field label="Email *">
                <input style={inp} type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="trainer@gym.com" onFocus={focus} onBlur={blur} />
              </Field>

              <Field label="Phone *">
                <input style={inp} value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="9876543210" onFocus={focus} onBlur={blur} />
              </Field>

              <Field label="Gender">
                <select style={inp} value={form.gender} onChange={e => setF("gender", e.target.value)}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>

              <Field label="Date of Birth">
                <input style={inp} type="date" value={form.date_of_birth} onChange={e => setF("date_of_birth", e.target.value)} onFocus={focus} onBlur={blur} />
              </Field>

              <Field label="Specialization" span>
                <select style={inp} value={form.specialization} onChange={e => setF("specialization", e.target.value)}>
                  <option value="">Select specialization</option>
                  {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Experience (Years)">
                <input style={inp} type="number" min="0" max="50" value={form.experience_years} onChange={e => setF("experience_years", e.target.value)} placeholder="e.g. 5" onFocus={focus} onBlur={blur} />
              </Field>

              <Field label="Monthly Salary (₹)">
                <input style={inp} type="number" min="0" value={form.salary} onChange={e => setF("salary", e.target.value)} placeholder="e.g. 35000" onFocus={focus} onBlur={blur} />
              </Field>

              <Field label="Joining Date">
                <input style={inp} type="date" value={form.joining_date} onChange={e => setF("joining_date", e.target.value)} onFocus={focus} onBlur={blur} />
              </Field>

              <Field label="Status">
                <select style={inp} value={form.status} onChange={e => setF("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>

              <Field label="Address" span>
                <input style={inp} value={form.address} onChange={e => setF("address", e.target.value)} placeholder="Enter address" onFocus={focus} onBlur={blur} />
              </Field>
            </div>

            {formError && (
              <div style={{ marginTop: "14px", padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px" }}>
                {formError}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "22px", paddingTop: "18px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>
                Cancel
              </button>
              <button
                onClick={handleSave} disabled={saving}
                style={{
                  padding: "9px 24px", borderRadius: "var(--radius-sm)",
                  background: saving ? "var(--bg-elevated)" : "var(--text-primary)",
                  color: saving ? "var(--text-muted)" : "#0a0a0a",
                  border: "none", cursor: saving ? "not-allowed" : "pointer",
                  fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.03em"
                }}
              >{saving ? "Saving..." : editingId ? "UPDATE" : "ADD TRAINER"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ──────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteId(null); }}>
          <div className="fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "360px", width: "100%", textAlign: "center" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "var(--red)" }}>
              <FaTrash style={{ fontSize: "16px" }} />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>Delete Trainer?</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "22px", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-secondary)" }}>{deleteName}</strong> will be permanently removed.
            </p>
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