// pages/MembershipPlans.jsx
import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck,
  FaIdCard, FaTag, FaCalendarAlt, FaUserPlus
} from "react-icons/fa";

// ─── Helpers ───────────────────────────────────────────────────────────────────
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
  width: "100%", transition: "border-color 0.15s", fontFamily: "var(--font-body)"
};

const DURATION_LABELS = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };
const DURATION_DAYS   = { monthly: 30, quarterly: 90, yearly: 365 };

const EMPTY_PLAN = {
  name: "", duration_type: "monthly", price: "",
  description: "", features: "", status: "active"
};

const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// Duration badge colours
const durColor = { monthly: ["var(--blue)", "rgba(96,165,250,0.1)"], quarterly: ["var(--yellow)", "rgba(251,191,36,0.1)"], yearly: ["var(--green)", "rgba(74,222,128,0.1)"] };

const DurBadge = ({ type }) => {
  const [c, bg] = durColor[type] || ["var(--text-muted)", "rgba(80,80,80,0.12)"];
  return (
    <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "99px", background: bg, color: c, textTransform: "capitalize" }}>
      {DURATION_LABELS[type] || type}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const active = status === "active";
  return (
    <span style={{
      fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "99px",
      background: active ? "var(--green-bg)" : "rgba(80,80,80,0.12)",
      color: active ? "var(--green)" : "var(--text-muted)", textTransform: "capitalize"
    }}>{status}</span>
  );
};

// ─── Plan Card ─────────────────────────────────────────────────────────────────
const PlanCard = ({ plan, onEdit, onDelete, onAssign }) => {
  const featureList = plan.features ? plan.features.split(",").map(f => f.trim()).filter(Boolean) : [];

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-xl)", padding: "24px", display: "flex",
      flexDirection: "column", gap: "16px", transition: "border-color 0.2s",
      position: "relative", overflow: "hidden"
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-default)"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-subtle)"}
    >
      {/* Top accent strip */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: plan.duration_type === "yearly" ? "var(--green)" :
                    plan.duration_type === "quarterly" ? "var(--yellow)" : "var(--blue)"
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "4px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "16px", color: "var(--text-primary)", marginBottom: "6px" }}>
            {plan.name}
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <DurBadge type={plan.duration_type} />
            <StatusBadge status={plan.status} />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "22px", color: "var(--text-primary)" }}>
            {fmt(plan.price)}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
            {plan.duration_days} days
          </div>
        </div>
      </div>

      {/* Description */}
      {plan.description && (
        <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, lineHeight: 1.55 }}>
          {plan.description}
        </p>
      )}

      {/* Features */}
      {featureList.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" }}>
          {featureList.map((f, i) => (
            <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-secondary)" }}>
              <FaCheck style={{ fontSize: "10px", color: "var(--green)", flexShrink: 0 }} />
              {f}
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", marginTop: "auto", paddingTop: "4px" }}>
        <button
          onClick={() => onAssign(plan)}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: "var(--radius-sm)",
            background: "var(--bg-active)", border: "1px solid var(--border-strong)",
            color: "var(--text-primary)", cursor: "pointer", fontSize: "12px",
            fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            transition: "opacity 0.15s"
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <FaUserPlus style={{ fontSize: "11px" }} /> Assign
        </button>
        <button
          onClick={() => onEdit(plan)}
          style={{
            padding: "8px 12px", borderRadius: "var(--radius-sm)",
            background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
            color: "var(--text-muted)", cursor: "pointer", fontSize: "12px", transition: "color 0.15s"
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <FaEdit />
        </button>
        <button
          onClick={() => onDelete(plan)}
          style={{
            padding: "8px 12px", borderRadius: "var(--radius-sm)",
            background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
            color: "var(--text-muted)", cursor: "pointer", fontSize: "12px", transition: "color 0.15s"
          }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
        >
          <FaTrash />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MembershipPlans({ onLogout }) {
  const [plans,      setPlans]      = useState([]);
  const [members,    setMembers]    = useState([]);
  const [stats,      setStats]      = useState({});
  const [filter,     setFilter]     = useState("all");   // all | monthly | quarterly | yearly
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [editingId,  setEditingId]  = useState(null);
  const [form,       setForm]       = useState(EMPTY_PLAN);
  const [formError,  setFormError]  = useState("");
  const [saving,     setSaving]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [assignModal,  setAssignModal]  = useState(null); // plan object
  const [assignMember, setAssignMember] = useState("");
  const [assignMsg,    setAssignMsg]    = useState("");
  const [assigning,    setAssigning]    = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, mRes] = await Promise.all([
        api.get("/membership-plans"),
        api.get("/membership-plans/stats"),
        api.get("/members?limit=1000"),
      ]);
      setPlans(pRes.data.data || []);
      setStats(sRes.data.data || {});
      setMembers(mRes.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = filter === "all" ? plans : plans.filter(p => p.duration_type === filter);

  // ── Plan Modal ──
  const openAdd  = () => { setForm(EMPTY_PLAN); setEditingId(null); setFormError(""); setShowModal(true); };
  const openEdit = (p) => {
    setForm({
      name: p.name, duration_type: p.duration_type, price: p.price,
      description: p.description || "", features: p.features || "", status: p.status
    });
    setEditingId(p.id); setFormError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.name || !form.price) { setFormError("Name and price are required."); return; }
    setSaving(true);
    try {
      const payload = { ...form, duration_days: DURATION_DAYS[form.duration_type] };
      if (editingId) await api.put(`/membership-plans/${editingId}`, payload);
      else           await api.post("/membership-plans", payload);
      setShowModal(false);
      fetchAll();
    } catch (e) { setFormError(e.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  // ── Delete ──
  const handleDelete = async () => {
    try {
      await api.delete(`/membership-plans/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchAll();
    } catch (e) {
      alert(e.response?.data?.message || "Failed to delete.");
      setDeleteTarget(null);
    }
  };

  // ── Assign ──
  const openAssign = (plan) => { setAssignModal(plan); setAssignMember(""); setAssignMsg(""); };
  const handleAssign = async () => {
    if (!assignMember) { setAssignMsg("Please select a member."); return; }
    setAssigning(true);
    try {
      const res = await api.post("/membership-plans/assign", {
        member_id: assignMember, plan_id: assignModal.id
      });
      setAssignMsg(`✅ ${res.data.plan_name} assigned! Valid till ${res.data.membership_end}`);
      fetchAll();
    } catch (e) { setAssignMsg("❌ " + (e.response?.data?.message || "Failed to assign.")); }
    finally { setAssigning(false); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Stat cards ──
  const statCards = [
    { label: "Total Plans",          value: stats.total_plans     || 0, icon: FaIdCard },
    { label: "Active Plans",         value: stats.total_active    || 0, icon: FaCheck  },
    { label: "Members on a Plan",    value: stats.members_with_plan || 0, icon: FaUserPlus },
    { label: "Price Range",
      value: stats.min_price ? `${fmt(stats.min_price)} – ${fmt(stats.max_price)}` : "—",
      icon: FaTag, wide: true },
  ];

  // ── Render ──
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
              Membership Plans
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              Define plans, set pricing, and assign to members
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
            <FaPlus style={{ fontSize: "11px" }} /> NEW PLAN
          </button>
        </div>

        {/* Stat Cards */}
        <div className="fade-up stagger-1" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "14px", marginBottom: "28px" }}>
          {statCards.map(({ label, value, icon: Icon }) => (
            <div key={label} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)", padding: "18px 20px",
              display: "flex", flexDirection: "column", gap: "10px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
                <div style={{ width: "28px", height: "28px", borderRadius: "var(--radius-sm)", background: "var(--bg-active)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon style={{ fontSize: "12px", color: "var(--text-primary)" }} />
                </div>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "20px", color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="fade-up stagger-2" style={{ display: "flex", gap: "6px", marginBottom: "22px", flexWrap: "wrap" }}>
          {["all", "monthly", "quarterly", "yearly"].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              padding: "7px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer",
              background: filter === t ? "var(--bg-active)" : "var(--bg-elevated)",
              border: filter === t ? "1px solid var(--border-strong)" : "1px solid var(--border-default)",
              color: filter === t ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: "13px", fontWeight: filter === t ? 600 : 400,
              textTransform: "capitalize", transition: "all 0.15s"
            }}>
              {t === "all" ? "All Plans" : DURATION_LABELS[t]}
            </button>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>
            {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Plans Grid */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)", fontSize: "14px" }}>
            Loading plans...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <FaCalendarAlt style={{ fontSize: "32px", color: "var(--text-muted)", marginBottom: "12px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No plans found. Create your first plan!</p>
          </div>
        ) : (
          <div className="fade-up stagger-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: "16px" }}>
            {filtered.map(plan => (
              <PlanCard
                key={plan.id} plan={plan}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                onAssign={openAssign}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Plan Add/Edit Modal ── */}
      {showModal && (
        <div
          className="fade-in"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", padding: "28px", width: "100%", maxWidth: "520px",
            boxShadow: "var(--shadow-lg)", maxHeight: "90vh", overflowY: "auto"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  {editingId ? "Edit Plan" : "New Membership Plan"}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                  {editingId ? "Update plan details" : "Create a new plan with pricing"}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes style={{ fontSize: "12px" }} />
              </button>
            </div>

            <div style={{ height: "1px", background: "var(--border-subtle)", marginBottom: "22px" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Plan Name *">
                  <input style={inputStyle} value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Premium Monthly"
                    onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
                </Field>
              </div>

              <Field label="Duration Type *">
                <select style={inputStyle} value={form.duration_type} onChange={e => setF("duration_type", e.target.value)}>
                  <option value="monthly">Monthly (30 days)</option>
                  <option value="quarterly">Quarterly (90 days)</option>
                  <option value="yearly">Yearly (365 days)</option>
                </select>
              </Field>

              <Field label="Price (₹) *">
                <input style={inputStyle} type="number" value={form.price} onChange={e => setF("price", e.target.value)} placeholder="1499"
                  onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
              </Field>

              <Field label="Status">
                <select style={inputStyle} value={form.status} onChange={e => setF("status", e.target.value)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Description">
                  <input style={inputStyle} value={form.description} onChange={e => setF("description", e.target.value)} placeholder="Short plan description"
                    onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
                </Field>
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Features (comma-separated)">
                  <input style={inputStyle} value={form.features} onChange={e => setF("features", e.target.value)}
                    placeholder="Gym Access, Locker Room, Personal Training"
                    onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} />
                </Field>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px" }}>
                  Separate each feature with a comma. They'll appear as checkmarks on the card.
                </p>
              </div>
            </div>

            {/* Price preview */}
            {form.price && (
              <div style={{
                marginTop: "16px", padding: "12px 16px", borderRadius: "var(--radius-sm)",
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                display: "flex", justifyContent: "space-between", alignItems: "center"
              }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Plan Preview</span>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "18px", color: "var(--text-primary)" }}>
                  {fmt(form.price)} / {DURATION_LABELS[form.duration_type]}
                </span>
              </div>
            )}

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
                fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.03em"
              }}>
                {saving ? "Saving..." : editingId ? "UPDATE" : "CREATE PLAN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Plan Modal ── */}
      {assignModal && (
        <div
          className="fade-in"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) { setAssignModal(null); setAssignMsg(""); } }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", padding: "28px", width: "100%", maxWidth: "440px",
            boxShadow: "var(--shadow-lg)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
                  Assign Plan to Member
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
                  Plan: <strong style={{ color: "var(--text-secondary)" }}>{assignModal.name}</strong> — {fmt(assignModal.price)}
                </p>
              </div>
              <button onClick={() => { setAssignModal(null); setAssignMsg(""); }} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FaTimes style={{ fontSize: "12px" }} />
              </button>
            </div>

            <div style={{ height: "1px", background: "var(--border-subtle)", marginBottom: "22px" }} />

            {/* Plan summary box */}
            <div style={{ padding: "14px 16px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Duration</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{assignModal.duration_days} days ({DURATION_LABELS[assignModal.duration_type]})</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Price</span>
                <span style={{ fontSize: "14px", color: "var(--text-primary)", fontWeight: 800, fontFamily: "var(--font-display)" }}>{fmt(assignModal.price)}</span>
              </div>
            </div>

            <Field label="Select Member *">
              <select style={inputStyle} value={assignMember} onChange={e => setAssignMember(e.target.value)}>
                <option value="">-- Choose a member --</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>
                ))}
              </select>
            </Field>

            {assignMsg && (
              <div style={{
                marginTop: "14px", padding: "11px 14px", borderRadius: "var(--radius-sm)",
                background: assignMsg.startsWith("✅") ? "var(--green-bg)" : "var(--red-bg)",
                border: assignMsg.startsWith("✅") ? "1px solid rgba(74,222,128,0.2)" : "1px solid rgba(248,113,113,0.2)",
                color: assignMsg.startsWith("✅") ? "var(--green)" : "var(--red)",
                fontSize: "13px"
              }}>{assignMsg}</div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => { setAssignModal(null); setAssignMsg(""); }} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>
                Close
              </button>
              <button onClick={handleAssign} disabled={assigning} style={{
                padding: "9px 24px", borderRadius: "var(--radius-sm)",
                background: assigning ? "var(--bg-elevated)" : "var(--text-primary)",
                color: assigning ? "var(--text-muted)" : "#0a0a0a",
                border: "none", cursor: assigning ? "not-allowed" : "pointer",
                fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.03em"
              }}>
                {assigning ? "Assigning..." : "ASSIGN PLAN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div
          className="fade-in"
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-xl)", padding: "32px", maxWidth: "380px", width: "100%",
            boxShadow: "var(--shadow-lg)", textAlign: "center"
          }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "18px", color: "var(--red)" }}>
              <FaTrash />
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
              Delete Plan?
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px", lineHeight: 1.6 }}>
              <strong style={{ color: "var(--text-secondary)" }}>{deleteTarget.name}</strong> will be permanently removed. Members assigned to this plan will be unlinked.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", flex: 1 }}>
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