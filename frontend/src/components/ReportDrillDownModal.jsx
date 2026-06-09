// components/ReportDrillDownModal.jsx
// ── Click any month row in Reports → see who paid that month ─────────────────
import { useEffect, useState } from "react";
import {
  FaTimes, FaChevronLeft, FaSearch,
  FaRupeeSign, FaExclamationTriangle, FaCheck
} from "react-icons/fa";
import api from "../services/api";

const fmt     = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const METHOD_ICON = { cash: "💵", card: "💳", upi: "📱", bank_transfer: "🏦" };

const MONTH_NAMES = [
  "", "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ p }) {
  const isPartial = Number(p.due_amount) > 0;
  if (isPartial)
    return <span style={{ padding: "2px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: 700, background: "var(--yellow-bg)", color: "var(--yellow)" }}>Partial ⚠️</span>;
  if (p.status === "paid")
    return <span style={{ padding: "2px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: 700, background: "var(--green-bg)", color: "var(--green)" }}>Paid ✅</span>;
  return <span style={{ padding: "2px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: 700, background: "var(--red-bg)", color: "var(--red)" }}>Pending ❌</span>;
}

// ── Summary strip ─────────────────────────────────────────────────────────────
function SummaryStrip({ payments }) {
  const collected = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const pending   = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.due_amount || p.amount), 0);
  const partial   = payments.filter(p => Number(p.due_amount) > 0).length;
  const members   = new Set(payments.map(p => p.member_id)).size;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", borderBottom: "1px solid var(--border-subtle)" }}>
      {[
        { icon: "✅", label: "Collected",       value: fmt(collected), color: "var(--green)"  },
        { icon: "⚠️", label: "Pending/Due",     value: fmt(pending),   color: "var(--yellow)" },
        { icon: "👥", label: "Members",         value: members,        color: "var(--blue)"   },
        { icon: "⏳", label: "Partial",         value: partial,        color: "var(--yellow)" },
      ].map(c => (
        <div key={c.label} style={{ padding: "14px 18px", textAlign: "center", borderRight: "1px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
          <div style={{ fontSize: "18px", marginBottom: "4px" }}>{c.icon}</div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: "17px", fontWeight: 800, color: c.color }}>{c.value}</div>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function ReportDrillDownModal({ month, year, onClose }) {
  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all"); // all | paid | partial | pending

  const open = !!month && !!year;

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  // Fetch payments for this month
  useEffect(() => {
    if (!open) return;
    setSearch(""); setFilter("all"); setLoading(true);
    api.get("/payments/drilldown/members/" + year + "/" + month)
      .then(r => setPayments(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year, open]);

  if (!open) return null;

  // Filter logic
  const filtered = payments.filter(p => {
    const matchSearch = !search ||
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search);
    const matchFilter =
      filter === "all"     ? true :
      filter === "partial" ? Number(p.due_amount) > 0 :
      p.status === filter;
    return matchSearch && matchFilter;
  });

  const grandTotal = filtered.reduce((s, p) => s + Number(p.amount), 0);

  const inp = {
    padding: "8px 12px 8px 30px", background: "var(--bg-elevated)",
    border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
    color: "var(--text-primary)", fontSize: "12px", outline: "none",
    width: "100%", boxSizing: "border-box"
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1400, padding: "20px", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--bg-surface)", borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          width: "min(920px, 96vw)", maxHeight: "90vh",
          display: "flex", flexDirection: "column",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          animation: "reportModalIn 0.2s cubic-bezier(0.16,1,0.3,1)"
        }}
      >
        {/* ── Header ── */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-elevated)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}>
              <FaChevronLeft style={{ fontSize: "10px" }} /> Back
            </button>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>
                📅 {MONTH_NAMES[month]} {year} — Payments
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                {payments.length} total records
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FaTimes style={{ fontSize: "12px" }} />
          </button>
        </div>

        {/* ── Summary Strip ── */}
        {!loading && payments.length > 0 && <SummaryStrip payments={payments} />}

        {/* ── Search + Filter ── */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
          <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
            <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "11px" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member name or phone..." style={inp} />
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {["all", "paid", "partial", "pending"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 14px", borderRadius: "99px", fontSize: "11px", fontWeight: 600,
                cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
                background: filter === f ? "var(--text-primary)" : "var(--bg-elevated)",
                color:      filter === f ? "#0a0a0a"             : "var(--text-muted)",
                border:     filter === f ? "none"                : "1px solid var(--border-default)"
              }}>{f}</button>
            ))}
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
              Loading payments...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px", textAlign: "center" }}>
              <FaRupeeSign style={{ fontSize: "32px", color: "var(--text-muted)", opacity: 0.2, display: "block", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No payments found</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)", position: "sticky", top: 0, zIndex: 1 }}>
                  {["#", "Member", "Plan / For", "Amount", "Paid", "Due", "Method", "Date", "Status"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, idx) => (
                  <tr key={p.id}
                    style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* # */}
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)", fontSize: "11px" }}>{idx + 1}</td>

                    {/* Member */}
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>{p.phone}</div>
                    </td>

                    {/* Plan / For */}
                    <td style={{ padding: "11px 14px", color: "var(--text-secondary)", fontSize: "11px", maxWidth: "140px" }}>
                      <div style={{ fontWeight: 600 }}>{p.plan_name || "—"}</div>
                      <div style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>
                        {p.payment_for?.replace(/_/g, " ")}
                      </div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "11px 14px", fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                      {fmt(p.amount)}
                    </td>

                    {/* Paid */}
                    <td style={{ padding: "11px 14px", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--green)", whiteSpace: "nowrap" }}>
                      {fmt(p.paid_amount || p.amount)}
                    </td>

                    {/* Due */}
                    <td style={{ padding: "11px 14px", whiteSpace: "nowrap" }}>
                      {Number(p.due_amount) > 0 ? (
                        <span style={{ color: "var(--yellow)", fontWeight: 700, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", gap: "4px" }}>
                          <FaExclamationTriangle style={{ fontSize: "9px" }} />
                          {fmt(p.due_amount)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)" }}>—</span>
                      )}
                    </td>

                    {/* Method */}
                    <td style={{ padding: "11px 14px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                      {METHOD_ICON[p.payment_method] || "💵"} {p.payment_method?.replace(/_/g, " ")}
                    </td>

                    {/* Date */}
                    <td style={{ padding: "11px 14px", color: "var(--text-muted)", whiteSpace: "nowrap", fontSize: "11px" }}>
                      {fmtDate(p.payment_date)}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "11px 14px" }}>
                      <StatusBadge p={p} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Showing {filtered.length} of {payments.length} records
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Grand Total:</span>
              <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 800, color: "var(--green)" }}>
                {fmt(grandTotal)}
              </span>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes reportModalIn {
          from { transform: translateY(16px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}