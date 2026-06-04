import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell
} from "recharts";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  FaMoneyBill, FaPlus, FaSearch, FaEdit, FaTrash,
  FaChevronLeft, FaChevronRight, FaTimes, FaCheck,
  FaClock, FaArrowUp, FaArrowDown, FaCalendarAlt,
  FaFilter, FaRupeeSign, FaHistory
} from "react-icons/fa";

const fmt     = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_COLOR = {
  paid:     { color: "var(--green)",  bg: "var(--green-bg)" },
  pending:  { color: "var(--yellow)", bg: "var(--yellow-bg)" },
  failed:   { color: "var(--red)",    bg: "var(--red-bg)" },
  refunded: { color: "#888",          bg: "rgba(136,136,136,0.1)" },
};
const METHOD_ICON = { cash: "💵", card: "💳", upi: "📱", bank_transfer: "🏦" };

// ─── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, sub, trend }) => (
  <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color, opacity: 0.5 }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color }}>
        <Icon style={{ fontSize: "15px" }} />
      </div>
    </div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, marginBottom: "5px" }}>{value}</div>
    <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", fontSize: "11px", color: trend >= 0 ? "var(--green)" : "var(--red)" }}>
        {trend >= 0 ? <FaArrowUp /> : <FaArrowDown />}
        {trend >= 0 ? "+" : ""}{fmt(trend)} vs last month
      </div>
    )}
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "10px 14px" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "4px" }}>{label}</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}>₹{Number(payload[0].value).toLocaleString("en-IN")}</p>
    </div>
  );
};

// ─── Helper: group plans by duration_type ──────────────────────────────────────
const TYPE_LABEL = { monthly: "Monthly Plans", quarterly: "Quarterly Plans", yearly: "Yearly Plans" };

function PlanSelect({ value, onChange, plans, style, includeOther = true }) {
  const byType = plans.reduce((acc, p) => {
    const t = p.duration_type;
    if (!acc[t]) acc[t] = [];
    acc[t].push(p);
    return acc;
  }, {});

  return (
    <select value={value} onChange={onChange} style={style}>
      <option value="">— Select Plan —</option>
      {Object.entries(byType).map(([type, list]) => (
        <optgroup key={type} label={TYPE_LABEL[type] || type}>
          {list.map(p => (
            <option key={p.id} value={p.name}>
              {p.name} — ₹{Number(p.price).toLocaleString("en-IN")}
            </option>
          ))}
        </optgroup>
      ))}
      {includeOther && (
        <optgroup label="Other">
          <option value="registration">Registration Fee</option>
          <option value="other">Other</option>
        </optgroup>
      )}
    </select>
  );
}

// ─── Payment Add/Edit Modal ────────────────────────────────────────────────────
function PaymentModal({ isOpen, onClose, onSave, editData, members, plans }) {
  const today = new Date().toISOString().split("T")[0];
  const empty = {
    member_id: "", amount: "", payment_date: today,
    payment_method: "cash", payment_for: "", status: "paid",
    months_covered: 1, notes: ""
  };
  const [form,   setForm]   = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  useEffect(() => {
    if (editData) {
      setForm({
        member_id:      editData.member_id      || "",
        amount:         editData.amount         || "",
        payment_date:   editData.payment_date?.split("T")[0] || today,
        payment_method: editData.payment_method || "cash",
        payment_for:    editData.payment_for    || "",
        status:         editData.status         || "paid",
        months_covered: editData.months_covered || 1,
        notes:          editData.notes          || ""
      });
    } else { setForm(empty); }
    setError("");
  }, [editData, isOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // When plan selected → auto-fill amount
  const handlePlanSelect = (planName) => {
    set("payment_for", planName);
    const plan = plans.find(p => p.name === planName);
    if (plan) {
      set("amount", plan.price);
      // auto months_covered from duration_type
      const monthsMap = { monthly: 1, quarterly: 3, yearly: 12 };
      set("months_covered", monthsMap[plan.duration_type] || 1);
    }
  };

  const handleSubmit = async () => {
    if (!form.member_id || !form.amount || !form.payment_date) {
      setError("Member, amount and date are required"); return;
    }
    setSaving(true); setError("");
    try { await onSave(form); onClose(); }
    catch (e) { setError(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;

  const inp = {
    width: "100%", padding: "9px 12px", boxSizing: "border-box",
    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
    fontSize: "13px", outline: "none"
  };
  const lbl = {
    display: "block", marginBottom: "5px", fontSize: "11px",
    fontWeight: 600, color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.08em"
  };

  // Find selected plan for preview
  const selectedPlan = plans.find(p => p.name === form.payment_for);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              {editData ? "Edit Payment" : "Record Payment"}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "3px 0 0" }}>
              {editData ? "Update payment details" : "Add a new payment record"}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px" }}>
            <FaTimes />
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            {/* Member */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Member *</label>
              <select value={form.member_id} onChange={e => set("member_id", e.target.value)} style={inp}>
                <option value="">— Select Member —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>
                ))}
              </select>
            </div>

            {/* Payment For — dynamic plans ── */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Payment For (Plan)</label>
              <PlanSelect
                value={form.payment_for}
                onChange={e => handlePlanSelect(e.target.value)}
                plans={plans}
                style={inp}
                includeOther={true}
              />
              {/* Plan preview */}
              {selectedPlan && (
                <div style={{ marginTop: "8px", padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Duration: <strong style={{ color: "var(--text-secondary)" }}>{selectedPlan.duration_days} days</strong>
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Price: <strong style={{ color: "var(--green)" }}>₹{Number(selectedPlan.price).toLocaleString("en-IN")}</strong>
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    Amount auto-filled ✓
                  </span>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label style={lbl}>Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="999" style={inp} />
            </div>

            {/* Payment Date */}
            <div>
              <label style={lbl}>Payment Date *</label>
              <input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} style={inp} />
            </div>

            {/* Method */}
            <div>
              <label style={lbl}>Method</label>
              <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} style={inp}>
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="upi">📱 UPI</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={lbl}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={inp}>
                <option value="paid">✅ Paid</option>
                <option value="pending">⏳ Pending</option>
                <option value="failed">❌ Failed</option>
                <option value="refunded">↩️ Refunded</option>
              </select>
            </div>

            {/* Months Covered */}
            <div>
              <label style={lbl}>Months Covered</label>
              <input type="number" min="1" max="12" value={form.months_covered} onChange={e => set("months_covered", e.target.value)} style={inp} />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Notes</label>
              <textarea
                value={form.notes}
                onChange={e => set("notes", e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                style={{ ...inp, resize: "vertical", fontFamily: "var(--font-body)" }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: saving ? "var(--bg-elevated)" : "var(--text-primary)", color: saving ? "var(--text-muted)" : "#0a0a0a", border: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)" }}>
            {saving ? "Saving..." : editData ? "Update" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan History Modal ────────────────────────────────────────────────────────
function PlanHistoryModal({ member, onClose, plans }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRow, setEditRow] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState("");
  const admin = JSON.parse(localStorage.getItem("gym_admin") || "{}");

  const emptyForm = { plan_name: "", plan_start: "", plan_end: "", amount_paid: "", notes: "" };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { if (member) fetchHistory(); }, [member]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/members/${member.member_id}/plan-history`);
      setHistory(res.data.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // When plan selected in Add form → auto-fill amount + end date
  const handleAddPlanSelect = (planName) => {
    setForm(f => {
      const plan = plans.find(p => p.name === planName);
      const updated = { ...f, plan_name: planName };
      if (plan) {
        updated.amount_paid = plan.price;
        if (f.plan_start) {
          const end = new Date(f.plan_start);
          end.setDate(end.getDate() + plan.duration_days);
          updated.plan_end = end.toISOString().split("T")[0];
        }
      }
      return updated;
    });
  };

  // When start date changes → recalc end date if plan is selected
  const handleStartDateChange = (dateVal) => {
    setForm(f => {
      const plan = plans.find(p => p.name === f.plan_name);
      const updated = { ...f, plan_start: dateVal };
      if (plan && dateVal) {
        const end = new Date(dateVal);
        end.setDate(end.getDate() + plan.duration_days);
        updated.plan_end = end.toISOString().split("T")[0];
      }
      return updated;
    });
  };

  const handleAdd = async () => {
    if (!form.plan_name || !form.plan_start) { setMsg("Plan name and start date required"); return; }
    setSaving(true);
    try {
      await api.post(`/members/${member.member_id}/plan-history`, form);
      setMsg("✅ Plan added!");
      setShowAdd(false);
      setForm(emptyForm);
      fetchHistory();
    } catch (e) { setMsg("❌ " + (e.response?.data?.message || "Failed")); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/members/${member.member_id}/plan-history/${editRow.id}`, editRow);
      setMsg("✅ Updated!");
      setEditRow(null);
      fetchHistory();
    } catch (e) { setMsg("❌ Failed"); }
    setSaving(false);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleDelete = async (hid) => {
    if (!window.confirm("Delete this plan record?")) return;
    try {
      await api.delete(`/members/${member.member_id}/plan-history/${hid}`);
      fetchHistory();
    } catch (e) { setMsg("❌ Delete failed"); }
  };

  if (!member) return null;

  const inp = {
    width: "100%", padding: "8px 10px", boxSizing: "border-box",
    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
    fontSize: "12px", outline: "none"
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", width: "100%", maxWidth: "740px", maxHeight: "88vh", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              📋 Plan History — {member.full_name}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "3px 0 0" }}>All membership plans (past & current)</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={() => { setShowAdd(true); setEditRow(null); }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", borderRadius: "var(--radius-sm)", background: "var(--text-primary)", color: "#0a0a0a", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}
            >
              <FaPlus style={{ fontSize: "10px" }} /> Add Plan
            </button>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "18px" }}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Add Form */}
        {showAdd && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>➕ New Plan Entry</p>
            {msg && (
              <div style={{ padding: "8px 12px", borderRadius: "6px", background: msg.startsWith("✅") ? "var(--green-bg)" : "var(--red-bg)", color: msg.startsWith("✅") ? "var(--green)" : "var(--red)", fontSize: "12px", marginBottom: "10px" }}>
                {msg}
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              {/* Plan Name — dynamic */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Plan *</label>
                <PlanSelect
                  value={form.plan_name}
                  onChange={e => handleAddPlanSelect(e.target.value)}
                  plans={plans}
                  style={inp}
                  includeOther={false}
                />
                {/* Plan selected preview */}
                {form.plan_name && (() => {
                  const p = plans.find(pl => pl.name === form.plan_name);
                  if (!p) return null;
                  return (
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-muted)" }}>
                      {p.duration_days} days &nbsp;·&nbsp; ₹{Number(p.price).toLocaleString("en-IN")} &nbsp;·&nbsp; {p.description}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Start Date *</label>
                <input type="date" value={form.plan_start} onChange={e => handleStartDateChange(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>End Date</label>
                <input type="date" value={form.plan_end} onChange={e => setForm(f => ({ ...f, plan_end: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Amount Paid (₹)</label>
                <input type="number" placeholder="0" value={form.amount_paid} onChange={e => setForm(f => ({ ...f, amount_paid: e.target.value }))} style={inp} />
              </div>
              <div style={{ gridColumn: "2/-1" }}>
                <label style={{ display: "block", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Notes</label>
                <input placeholder="Optional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={handleAdd} disabled={saving} style={{ padding: "7px 16px", borderRadius: "var(--radius-sm)", background: "var(--text-primary)", color: "#0a0a0a", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
                {saving ? "Saving..." : "Save Plan"}
              </button>
              <button onClick={() => { setShowAdd(false); setMsg(""); }} style={{ padding: "7px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "12px" }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Message */}
        {msg && !showAdd && (
          <div style={{ padding: "8px 24px", background: msg.startsWith("✅") ? "var(--green-bg)" : "var(--red-bg)", color: msg.startsWith("✅") ? "var(--green)" : "var(--red)", fontSize: "12px" }}>
            {msg}
          </div>
        )}

        {/* History Table */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading plan history...</div>
          ) : history.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
              <FaHistory style={{ fontSize: "32px", marginBottom: "10px", opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
              No plan history found. Click "Add Plan" to start tracking.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Plan", "Start", "End", "Duration", "Amount", "Notes", "Changed By", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((h, idx) => {
                  const isLatest  = idx === 0;
                  const isEditing = editRow?.id === h.id;
                  const daysTotal = h.plan_end ? Math.ceil((new Date(h.plan_end) - new Date(h.plan_start)) / (1000 * 60 * 60 * 24)) : null;

                  if (isEditing) {
                    return (
                      <tr key={h.id} style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "8px 12px" }}>
                          <PlanSelect
                            value={editRow.plan_name}
                            onChange={e => setEditRow(r => ({ ...r, plan_name: e.target.value }))}
                            plans={plans}
                            style={{ ...inp, fontSize: "12px" }}
                            includeOther={false}
                          />
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <input type="date" value={editRow.plan_start?.split("T")[0]} onChange={e => setEditRow(r => ({ ...r, plan_start: e.target.value }))} style={{ ...inp, fontSize: "12px" }} />
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <input type="date" value={editRow.plan_end?.split("T")[0] || ""} onChange={e => setEditRow(r => ({ ...r, plan_end: e.target.value }))} style={{ ...inp, fontSize: "12px" }} />
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "12px" }}>—</td>
                        <td style={{ padding: "8px 12px" }}>
                          <input type="number" value={editRow.amount_paid} onChange={e => setEditRow(r => ({ ...r, amount_paid: e.target.value }))} style={{ ...inp, fontSize: "12px", width: "90px" }} />
                        </td>
                        <td style={{ padding: "8px 12px" }}>
                          <input value={editRow.notes || ""} onChange={e => setEditRow(r => ({ ...r, notes: e.target.value }))} style={{ ...inp, fontSize: "12px" }} />
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "11px" }}>—</td>
                        <td style={{ padding: "8px 12px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={handleEdit} disabled={saving} style={{ padding: "4px 10px", borderRadius: "4px", background: "var(--text-primary)", color: "#0a0a0a", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 700 }}>
                              {saving ? "..." : <><FaCheck style={{ fontSize: "9px" }} /> Save</>}
                            </button>
                            <button onClick={() => setEditRow(null)} style={{ padding: "4px 10px", borderRadius: "4px", background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px" }}>
                              <FaTimes style={{ fontSize: "9px" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={h.id}
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ padding: "3px 10px", borderRadius: "99px", background: isLatest ? "rgba(96,165,250,0.12)" : "var(--bg-elevated)", color: isLatest ? "#60a5fa" : "var(--text-secondary)", fontSize: "11px", fontWeight: 700, textTransform: "capitalize", border: isLatest ? "1px solid rgba(96,165,250,0.25)" : "1px solid var(--border-subtle)" }}>
                            {h.plan_name}
                          </span>
                          {isLatest && <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "99px", background: "rgba(52,211,153,0.12)", color: "var(--green)", border: "1px solid rgba(52,211,153,0.25)", fontWeight: 600 }}>CURRENT</span>}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>{fmtDate(h.plan_start)}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }}>{h.plan_end ? fmtDate(h.plan_end) : <span style={{ color: "var(--text-muted)" }}>Ongoing</span>}</td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px" }}>{daysTotal ? `${daysTotal} days` : "—"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: h.amount_paid > 0 ? "var(--green)" : "var(--text-muted)", fontSize: "13px" }}>
                          {h.amount_paid > 0 ? fmt(h.amount_paid) : "—"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "12px", maxWidth: "140px" }}>
                        <span title={h.notes}>{h.notes ? (h.notes.length > 30 ? h.notes.slice(0, 28) + "..." : h.notes) : "—"}</span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "11px" }}>{h.changed_by_name || "System"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            onClick={() => { setEditRow({ ...h, plan_start: h.plan_start?.split("T")[0], plan_end: h.plan_end?.split("T")[0] || "" }); setShowAdd(false); }}
                            style={{ padding: "4px 10px", borderRadius: "4px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <FaEdit style={{ fontSize: "9px" }} /> Edit
                          </button>
                          {admin.role === "super_admin" && (
                            <button
                              onClick={() => handleDelete(h.id)}
                              style={{ padding: "4px 10px", borderRadius: "4px", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <FaTrash style={{ fontSize: "9px" }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{history.length} plan record{history.length !== 1 ? "s" : ""} total</span>
          <button onClick={onClose} style={{ padding: "7px 18px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Payments({ onLogout }) {
  const [payments, setPayments]   = useState([]);
  const [members,  setMembers]    = useState([]);
  const [plans,    setPlans]      = useState([]);   // ← membership plans from DB
  const [stats,    setStats]      = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState("");
  const [statusFilter, setStatus] = useState("");
  const [methodFilter, setMethod] = useState("");
  const [page,     setPage]       = useState(1);
  const [totalPages, setTotal]    = useState(1);
  const [totalCount, setCount]    = useState(0);
  const [showModal, setModal]     = useState(false);
  const [editData,  setEditData]  = useState(null);
  const [deleting,  setDeleting]  = useState(null);
  const [planHistoryMember, setPlanHistoryMember] = useState(null);
  const admin = JSON.parse(localStorage.getItem("gym_admin") || "{}");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments", { params: { page, limit: 10, search, status: statusFilter, method: methodFilter } });
      setPayments(res.data.data);
      setTotal(res.data.pagination.totalPages);
      setCount(res.data.pagination.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, methodFilter]);

  const fetchStats   = async () => { try { const r = await api.get("/payments/stats/summary"); setStats(r.data.data); } catch (e) {} };
  const fetchMembers = async () => { try { const r = await api.get("/members", { params: { limit: 500 } }); setMembers(r.data.data); } catch (e) {} };
  // ← Fetch active membership plans
  const fetchPlans   = async () => { try { const r = await api.get("/membership-plans?status=active"); setPlans(r.data.data || []); } catch (e) {} };

  useEffect(() => { fetchStats(); fetchMembers(); fetchPlans(); }, []);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(1); }, [search, statusFilter, methodFilter]);

  const handleSave = async (form) => {
    if (editData) await api.put(`/payments/${editData.id}`, form);
    else          await api.post("/payments", form);
    fetchPayments(); fetchStats();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    setDeleting(id);
    try { await api.delete(`/payments/${id}`); fetchPayments(); fetchStats(); }
    catch (e) { alert(e.response?.data?.message || "Delete failed"); }
    finally { setDeleting(null); }
  };

  const trend    = stats ? (Number(stats.thisMonth) - Number(stats.lastMonth)) : undefined;
  const chartData = stats?.monthly6 || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>Payments</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>Billing & revenue tracking — {totalCount} records</p>
          </div>
          <button
            onClick={() => { setEditData(null); setModal(true); }}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "var(--radius-md)", background: "var(--text-primary)", color: "#0a0a0a", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)" }}
          >
            <FaPlus style={{ fontSize: "11px" }} /> Record Payment
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "14px", marginBottom: "24px" }}>
          <StatCard icon={FaRupeeSign}    color="var(--green)"  bg="var(--green-bg)"                    label="Total Revenue"    value={fmt(stats?.totalRevenue)} />
          <StatCard icon={FaCalendarAlt}  color="var(--blue)"   bg="var(--blue-bg)"                     label="This Month"       value={fmt(stats?.thisMonth)} trend={trend} />
          <StatCard icon={FaClock}        color="var(--yellow)" bg="var(--yellow-bg)"                   label="Pending Amount"   value={fmt(stats?.pendingAmount)} sub={`${stats?.pendingCount || 0} records`} />
          <StatCard icon={FaCheck}        color="var(--accent)" bg="rgba(255,255,255,0.05)"              label="Today's Revenue"  value={fmt(stats?.todayRevenue)} />
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px", marginBottom: "20px" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>Monthly Revenue</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "16px" }}>Last 6 months</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={i === chartData.length - 1 ? "#f0f0f0" : "#333333"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 18px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "12px" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search member name, email, phone..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", boxSizing: "border-box", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FaFilter style={{ color: "var(--text-muted)", fontSize: "11px" }} />
            <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ padding: "9px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", outline: "none", cursor: "pointer" }}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          <select value={methodFilter} onChange={e => setMethod(e.target.value)} style={{ padding: "9px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", outline: "none", cursor: "pointer" }}>
            <option value="">All Methods</option>
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="upi">📱 UPI</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Member", "Amount", "Date", "Method", "For", "Months", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(8)].map((_, j) => (
                        <td key={j} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
                          <div style={{ height: "12px", borderRadius: "4px", background: "var(--bg-elevated)", width: j === 0 ? "140px" : "70px" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                      <FaMoneyBill style={{ fontSize: "32px", marginBottom: "12px", opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
                      No payments found
                    </td>
                  </tr>
                ) : (
                  payments.map(p => {
                    const sc = STATUS_COLOR[p.status] || STATUS_COLOR.paid;
                    return (
                      <tr key={p.id}
                        style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{p.email}</div>
                          <button
                            onClick={() => setPlanHistoryMember(p)}
                            style={{ marginTop: "4px", fontSize: "10px", padding: "2px 8px", borderRadius: "99px", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", color: "#60a5fa", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <FaCalendarAlt style={{ fontSize: "8px" }} /> Plan History
                          </button>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", fontSize: "14px" }}>{fmt(p.amount)}</span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(p.payment_date)}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-secondary)" }}>
                            {METHOD_ICON[p.payment_method]} {p.payment_method?.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "3px 8px", borderRadius: "99px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", fontSize: "11px", color: "var(--text-secondary)", textTransform: "capitalize", whiteSpace: "nowrap" }}>
                            {p.payment_for?.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-secondary)", textAlign: "center" }}>{p.months_covered}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ padding: "4px 10px", borderRadius: "99px", background: sc.bg, color: sc.color, fontSize: "11px", fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                            {p.status}
                          </span>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => { setEditData(p); setModal(true); }}
                              style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                            >
                              <FaEdit /> Edit
                            </button>
                            {admin.role === "super_admin" && (
                              <button
                                onClick={() => handleDelete(p.id)}
                                disabled={deleting === p.id}
                                style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}
                              >
                                <FaTrash />{deleting === p.id ? "..." : "Del"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Page {page} of {totalPages} — {totalCount} total</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: page === 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: page === 1 ? "not-allowed" : "pointer" }}>
                  <FaChevronLeft />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: page === totalPages ? "var(--text-muted)" : "var(--text-secondary)", cursor: page === totalPages ? "not-allowed" : "pointer" }}>
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Payment Modal — plans prop pass kiya ── */}
      <PaymentModal
        isOpen={showModal}
        onClose={() => setModal(false)}
        onSave={handleSave}
        editData={editData}
        members={members}
        plans={plans}
      />

      {/* ── Plan History Modal — plans prop pass kiya ── */}
      <PlanHistoryModal
        member={planHistoryMember}
        onClose={() => setPlanHistoryMember(null)}
        plans={plans}
      />
    </div>
  );
}