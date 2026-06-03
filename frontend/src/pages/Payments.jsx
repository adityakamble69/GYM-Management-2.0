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
  FaFilter, FaRupeeSign
} from "react-icons/fa";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_COLOR = {
  paid:     { color: "var(--green)",  bg: "var(--green-bg)"  },
  pending:  { color: "var(--yellow)", bg: "var(--yellow-bg)" },
  failed:   { color: "var(--red)",    bg: "var(--red-bg)"    },
  refunded: { color: "#888",          bg: "rgba(136,136,136,0.1)" },
};
const METHOD_ICON = { cash: "💵", card: "💳", upi: "📱", bank_transfer: "🏦" };

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, sub, trend }) => (
  <div style={{
    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)", padding: "22px", position: "relative", overflow: "hidden"
  }}>
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

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "10px 14px" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "4px" }}>{label}</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}>₹{Number(payload[0].value).toLocaleString("en-IN")}</p>
    </div>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function PaymentModal({ isOpen, onClose, onSave, editData, members }) {
  const empty = {
    member_id: "", amount: "", payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash", payment_for: "monthly", status: "paid",
    months_covered: 1, notes: ""
  };
  const [form, setForm]   = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    if (editData) {
      setForm({
        member_id:      editData.member_id      || "",
        amount:         editData.amount          || "",
        payment_date:   editData.payment_date?.split("T")[0] || new Date().toISOString().split("T")[0],
        payment_method: editData.payment_method  || "cash",
        payment_for:    editData.payment_for     || "monthly",
        status:         editData.status          || "paid",
        months_covered: editData.months_covered  || 1,
        notes:          editData.notes           || ""
      });
    } else {
      setForm(empty);
    }
    setError("");
  }, [editData, isOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.member_id || !form.amount || !form.payment_date) {
      setError("Member, amount and date are required"); return;
    }
    setSaving(true); setError("");
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Save failed");
    } finally { setSaving(false); }
  };

  if (!isOpen) return null;

  const inputStyle = {
    width: "100%", padding: "9px 12px", boxSizing: "border-box",
    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-sm)", color: "var(--text-primary)",
    fontSize: "13px", outline: "none"
  };
  const labelStyle = {
    display: "block", marginBottom: "5px", fontSize: "11px",
    fontWeight: 600, color: "var(--text-secondary)",
    textTransform: "uppercase", letterSpacing: "0.08em"
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "20px"
    }}>
      <div style={{
        background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)", width: "100%", maxWidth: "560px",
        maxHeight: "90vh", overflowY: "auto"
      }}>
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

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>

            {/* Member */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Member *</label>
              <select value={form.member_id} onChange={e => set("member_id", e.target.value)} style={inputStyle}>
                <option value="">— Select Member —</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label style={labelStyle}>Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="999" style={inputStyle} />
            </div>

            {/* Date */}
            <div>
              <label style={labelStyle}>Payment Date *</label>
              <input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} style={inputStyle} />
            </div>

            {/* Method */}
            <div>
              <label style={labelStyle}>Payment Method</label>
              <select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} style={inputStyle}>
                <option value="cash">💵 Cash</option>
                <option value="card">💳 Card</option>
                <option value="upi">📱 UPI</option>
                <option value="bank_transfer">🏦 Bank Transfer</option>
              </select>
            </div>

            {/* Payment For */}
            <div>
              <label style={labelStyle}>Payment For</label>
              <select value={form.payment_for} onChange={e => set("payment_for", e.target.value)} style={inputStyle}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="half_yearly">Half Yearly</option>
                <option value="yearly">Yearly</option>
                <option value="registration">Registration</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} style={inputStyle}>
                <option value="paid">✅ Paid</option>
                <option value="pending">⏳ Pending</option>
                <option value="failed">❌ Failed</option>
                <option value="refunded">↩️ Refunded</option>
              </select>
            </div>

            {/* Months Covered */}
            <div>
              <label style={labelStyle}>Months Covered</label>
              <input type="number" min="1" max="12" value={form.months_covered} onChange={e => set("months_covered", e.target.value)} style={inputStyle} />
            </div>

            {/* Notes */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={form.notes} onChange={e => set("notes", e.target.value)}
                placeholder="Optional notes..."
                rows={2}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-body)" }}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "9px 18px", borderRadius: "var(--radius-sm)",
            background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
            color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px"
          }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding: "9px 20px", borderRadius: "var(--radius-sm)",
            background: saving ? "var(--bg-elevated)" : "var(--text-primary)",
            color: saving ? "var(--text-muted)" : "#0a0a0a",
            border: "none", cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)"
          }}>
            {saving ? "Saving..." : editData ? "Update" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Payments({ onLogout }) {
  const [payments, setPayments]   = useState([]);
  const [members, setMembers]     = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [methodFilter, setMethod] = useState("");
  const [page, setPage]           = useState(1);
  const [totalPages, setTotal]    = useState(1);
  const [totalCount, setCount]    = useState(0);
  const [showModal, setModal]     = useState(false);
  const [editData, setEditData]   = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const admin = JSON.parse(localStorage.getItem("gym_admin") || "{}");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments", {
        params: { page, limit: 10, search, status: statusFilter, method: methodFilter }
      });
      setPayments(res.data.data);
      setTotal(res.data.pagination.totalPages);
      setCount(res.data.pagination.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, methodFilter]);

  const fetchStats = async () => {
    try {
      const res = await api.get("/payments/stats/summary");
      setStats(res.data.data);
    } catch (e) { console.error(e); }
  };

  const fetchMembers = async () => {
    try {
      const res = await api.get("/members", { params: { limit: 200 } });
      setMembers(res.data.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchStats(); fetchMembers(); }, []);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { setPage(1); }, [search, statusFilter, methodFilter]);

  const handleSave = async (form) => {
    if (editData) {
      await api.put(`/payments/${editData.id}`, form);
    } else {
      await api.post("/payments", form);
    }
    fetchPayments(); fetchStats();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    setDeleting(id);
    try { await api.delete(`/payments/${id}`); fetchPayments(); fetchStats(); }
    catch (e) { alert(e.response?.data?.message || "Delete failed"); }
    finally { setDeleting(null); }
  };

  const openAdd  = () => { setEditData(null); setModal(true); };
  const openEdit = (p)  => { setEditData(p);  setModal(true); };

  const trend = stats ? (Number(stats.thisMonth) - Number(stats.lastMonth)) : undefined;
  const chartData = stats?.monthly6 || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
              Payments
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
              Billing & revenue tracking — {totalCount} records
            </p>
          </div>
          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "10px 18px", borderRadius: "var(--radius-md)",
            background: "var(--text-primary)", color: "#0a0a0a",
            border: "none", cursor: "pointer", fontWeight: 700,
            fontSize: "13px", fontFamily: "var(--font-display)"
          }}>
            <FaPlus style={{ fontSize: "11px" }} /> Record Payment
          </button>
        </div>

        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "14px", marginBottom: "24px" }}>
          <StatCard icon={FaRupeeSign}    label="Total Revenue"   value={fmt(stats?.totalRevenue)}   color="var(--green)"  bg="var(--green-bg)"  />
          <StatCard icon={FaCalendarAlt}  label="This Month"      value={fmt(stats?.thisMonth)}      color="var(--blue)"   bg="var(--blue-bg)"   trend={trend} />
          <StatCard icon={FaClock}        label="Pending Amount"  value={fmt(stats?.pendingAmount)}  color="var(--yellow)" bg="var(--yellow-bg)" sub={`${stats?.pendingCount || 0} records`} />
          <StatCard icon={FaCheck}        label="Today's Revenue" value={fmt(stats?.todayRevenue)}   color="var(--accent)" bg="rgba(255,255,255,0.05)" />
        </div>

        {/* Revenue Chart */}
        {chartData.length > 0 && (
          <div className="fade-up" style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "22px", marginBottom: "20px"
          }}>
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Monthly Revenue</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Last 6 months</p>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + (v/1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[4,4,0,0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === chartData.length - 1 ? "#f0f0f0" : "#333333"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Filters */}
        <div className="fade-up" style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", padding: "16px 20px",
          display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px"
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "12px" }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search member name, email, phone..."
              style={{
                width: "100%", padding: "9px 12px 9px 34px", boxSizing: "border-box",
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", outline: "none"
              }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FaFilter style={{ color: "var(--text-muted)", fontSize: "11px" }} />
            <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{
              padding: "9px 12px", background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
              color: "var(--text-secondary)", fontSize: "13px", outline: "none", cursor: "pointer"
            }}>
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Method Filter */}
          <select value={methodFilter} onChange={e => setMethod(e.target.value)} style={{
            padding: "9px 12px", background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)", fontSize: "13px", outline: "none", cursor: "pointer"
          }}>
            <option value="">All Methods</option>
            <option value="cash">💵 Cash</option>
            <option value="card">💳 Card</option>
            <option value="upi">📱 UPI</option>
            <option value="bank_transfer">🏦 Bank Transfer</option>
          </select>
        </div>

        {/* Table */}
        <div className="fade-up" style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", overflow: "hidden"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Member", "Amount", "Date", "Method", "For", "Months", "Status", "Actions"].map(h => (
                    <th key={h} style={{
                      padding: "11px 16px", textAlign: "left",
                      fontSize: "11px", fontWeight: 600, color: "var(--text-muted)",
                      textTransform: "uppercase", letterSpacing: "0.08em",
                      borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap"
                    }}>{h}</th>
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
                  payments.map((p, i) => {
                    const sc = STATUS_COLOR[p.status] || STATUS_COLOR.paid;
                    return (
                      <tr key={p.id} style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        transition: "background 0.1s"
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        {/* Member */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{p.email}</div>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", fontSize: "14px" }}>
                            {fmt(p.amount)}
                          </span>
                        </td>

                        {/* Date */}
                        <td style={{ padding: "14px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {fmtDate(p.payment_date)}
                        </td>

                        {/* Method */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-secondary)" }}>
                            {METHOD_ICON[p.payment_method]} {p.payment_method?.replace("_", " ")}
                          </span>
                        </td>

                        {/* For */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            padding: "3px 8px", borderRadius: "99px",
                            background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                            fontSize: "11px", color: "var(--text-secondary)", textTransform: "capitalize"
                          }}>
                            {p.payment_for?.replace("_", " ")}
                          </span>
                        </td>

                        {/* Months */}
                        <td style={{ padding: "14px 16px", color: "var(--text-secondary)", textAlign: "center" }}>
                          {p.months_covered}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{
                            padding: "4px 10px", borderRadius: "99px",
                            background: sc.bg, color: sc.color,
                            fontSize: "11px", fontWeight: 600, textTransform: "capitalize",
                            whiteSpace: "nowrap"
                          }}>
                            {p.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => openEdit(p)} style={{
                              padding: "5px 10px", borderRadius: "var(--radius-sm)",
                              background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                              color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px",
                              display: "flex", alignItems: "center", gap: "4px"
                            }}>
                              <FaEdit /> Edit
                            </button>
                            {admin.role === "super_admin" && (
                              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{
                                padding: "5px 10px", borderRadius: "var(--radius-sm)",
                                background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)",
                                color: "var(--red)", cursor: "pointer", fontSize: "11px",
                                display: "flex", alignItems: "center", gap: "4px"
                              }}>
                                <FaTrash /> {deleting === p.id ? "..." : "Del"}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              padding: "14px 20px", borderTop: "1px solid var(--border-subtle)",
              display: "flex", justifyContent: "space-between", alignItems: "center"
            }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Page {page} of {totalPages} — {totalCount} total
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={{
                  padding: "6px 10px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  color: page === 1 ? "var(--text-muted)" : "var(--text-secondary)",
                  cursor: page === 1 ? "not-allowed" : "pointer"
                }}><FaChevronLeft /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages} style={{
                  padding: "6px 10px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  color: page === totalPages ? "var(--text-muted)" : "var(--text-secondary)",
                  cursor: page === totalPages ? "not-allowed" : "pointer"
                }}><FaChevronRight /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      <PaymentModal
        isOpen={showModal}
        onClose={() => setModal(false)}
        onSave={handleSave}
        editData={editData}
        members={members}
      />
    </div>
  );
}