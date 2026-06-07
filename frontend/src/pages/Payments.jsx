import { useEffect, useState, useCallback, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  FaMoneyBill, FaPlus, FaSearch, FaEdit, FaTrash,
  FaChevronLeft, FaChevronRight, FaTimes, FaCheck,
  FaClock, FaArrowUp, FaArrowDown, FaCalendarAlt,
  FaFilter, FaRupeeSign, FaHistory, FaExclamationTriangle,
  FaChevronDown, FaUsers, FaLayerGroup
} from "react-icons/fa";

const fmt     = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_COLOR = {
  paid:     { color: "var(--green)",  bg: "var(--green-bg)"  },
  pending:  { color: "var(--yellow)", bg: "var(--yellow-bg)" },
  failed:   { color: "var(--red)",    bg: "var(--red-bg)"    },
  refunded: { color: "#888",          bg: "rgba(136,136,136,0.1)" },
};
const METHOD_ICON = { cash: "💵", card: "💳", upi: "📱", bank_transfer: "🏦" };
const TYPE_LABEL  = { monthly: "Monthly Plans", quarterly: "Quarterly Plans", yearly: "Yearly Plans" };

// ─── Overlay Modal ─────────────────────────────────────────────────────────────
function OverlayModal({ open, onClose, title, subtitle, children, width = "640px" }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, padding: "20px" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", width: "100%", maxWidth: width, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 72px rgba(0,0,0,0.6)", animation: "popIn 0.18s ease" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{title}</div>
            {subtitle && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px", padding: "4px" }}><FaTimes /></button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px" }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Drill Down Modal (Total Revenue: Year→Month→Members) ──────────────────────
function DrillDownModal({ open, onClose }) {
  const [level,      setLevel]   = useState("years"); // years | months | members
  const [years,      setYears]   = useState([]);
  const [months,     setMonths]  = useState([]);
  const [members,    setMembers] = useState([]);
  const [selYear,    setSelYear] = useState(null);
  const [selMonth,   setSelMonth]= useState(null);
  const [loading,    setLoading] = useState(false);
  const [search,     setSearch]  = useState("");

  useEffect(() => {
    if (!open) return;
    setLevel("years"); setSearch("");
    setLoading(true);
    api.get("/payments/drilldown/years")
      .then(r => setYears(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open]);

  const goMonths = async (year) => {
    setSelYear(year); setLoading(true); setSearch("");
    try { const r = await api.get(`/payments/drilldown/months/${year}`); setMonths(r.data.data); setLevel("months"); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const goMembers = async (month) => {
    setSelMonth(month); setLoading(true); setSearch("");
    try { const r = await api.get(`/payments/drilldown/members/${selYear}/${month}`); setMembers(r.data.data); setLevel("members"); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  const filteredMembers = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.payment_method?.includes(search.toLowerCase())
  );

  return (
    <OverlayModal open={open} onClose={onClose} width="680px"
      title={level === "years" ? "💰 Revenue Drill-Down" : level === "months" ? `📅 ${selYear} — Monthly Breakdown` : `👥 ${monthNames[selMonth]} ${selYear} — Members`}
      subtitle={level === "years" ? "Click a year to see monthly breakdown" : level === "months" ? "Click a month to see member-wise payments" : `${filteredMembers.length} payments`}
    >
      {/* Back Button */}
      {level !== "years" && (
        <button onClick={() => { setLevel(level === "members" ? "months" : "years"); setSearch(""); }}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "12px", marginBottom: "16px" }}>
          <FaChevronLeft style={{ fontSize: "10px" }} /> Back
        </button>
      )}

      {/* Search (members level) */}
      {level === "members" && (
        <div style={{ position: "relative", marginBottom: "14px" }}>
          <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "11px" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member..."
            style={{ width: "100%", padding: "8px 12px 8px 30px", boxSizing: "border-box", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12px", outline: "none" }} />
        </div>
      )}

      {loading ? (
        <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
      ) : level === "years" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {years.length === 0 ? <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px" }}>No data</div> :
          years.map(y => (
            <div key={y.year} onClick={() => goMonths(y.year)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--bg-active)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
            >
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)" }}>{y.year}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{y.count} payments</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--green)" }}>{fmt(y.total)}</span>
                <FaChevronRight style={{ fontSize: "11px", color: "var(--text-muted)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : level === "months" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {months.length === 0 ? <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px" }}>No data</div> :
          months.map(m => (
            <div key={m.month} onClick={() => goMembers(m.month)}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.background = "var(--bg-active)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-elevated)"; }}
            >
              <div>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{m.month_name} {selYear}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.count} payments</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 800, color: "var(--green)" }}>{fmt(m.total)}</span>
                <FaChevronRight style={{ fontSize: "10px", color: "var(--text-muted)" }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {filteredMembers.length === 0 ? <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px" }}>No results</div> :
            filteredMembers.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {METHOD_ICON[p.payment_method]} {p.payment_method} · {fmtDate(p.payment_date)}
                    {p.plan_name && ` · ${p.plan_name}`}
                  </div>
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 800, color: "var(--green)" }}>{fmt(p.amount)}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total — {filteredMembers.length} payments</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 800, color: "var(--green)" }}>
              {fmt(filteredMembers.reduce((s, p) => s + Number(p.amount), 0))}
            </span>
          </div>
        </>
      )}
    </OverlayModal>
  );
}

// ─── Today / ThisMonth Modal ───────────────────────────────────────────────────
function PaymentListModal({ open, onClose, endpoint, title }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch(""); setLoading(true);
    api.get(endpoint).then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, [open, endpoint]);

  const filtered = data.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()));
  const total    = filtered.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <OverlayModal open={open} onClose={onClose} title={title} subtitle={`${filtered.length} payments`}>
      <div style={{ position: "relative", marginBottom: "14px" }}>
        <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "11px" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member..."
          style={{ width: "100%", padding: "8px 12px 8px 30px", boxSizing: "border-box", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12px", outline: "none" }} />
      </div>
      {loading ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div> :
      filtered.length === 0 ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>No payments found</div> : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["Member", "Amount", "Method", "Plan", "Time"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{p.phone}</div>
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--green)" }}>{fmt(p.amount)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)" }}>{METHOD_ICON[p.payment_method]} {p.payment_method}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted)", fontSize: "11px" }}>{p.plan_name || p.payment_for || "—"}</td>
                  <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{fmtDate(p.payment_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "14px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 800, color: "var(--green)" }}>{fmt(total)}</span>
          </div>
        </>
      )}
    </OverlayModal>
  );
}

// ─── Pending Count Modal ───────────────────────────────────────────────────────
function PendingCountModal({ open, onClose, onStatsRefresh }) {
  const [data,      setData]      = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState("");
  const [markingId, setMarkingId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get("/payments/pending/list").then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { if (!open) return; setSearch(""); load(); }, [open]);

  const markPaid = async (p) => {
    setMarkingId(p.id);
    try {
      await api.put(`/payments/${p.id}`, {
        ...p, status: "paid", paid_amount: p.amount, due_amount: 0,
        payment_date: new Date().toISOString().split("T")[0],
      });
      load();
      if (onStatsRefresh) onStatsRefresh();
    } catch(e) { console.error(e); }
    finally { setMarkingId(null); }
  };

  const filtered   = data.filter(p => p.full_name?.toLowerCase().includes(search.toLowerCase()));
  const totalPend  = filtered.reduce((s, p) => s + Number(p.amount || 0), 0);

  return (
    <OverlayModal open={open} onClose={onClose} title="⏳ Pending Payments" subtitle={`${filtered.length} pending records`} width="660px">
      <div style={{ position: "relative", marginBottom: "14px" }}>
        <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "11px" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member..."
          style={{ width: "100%", padding: "8px 12px 8px 30px", boxSizing: "border-box", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12px", outline: "none" }} />
      </div>
      {loading ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div> :
      filtered.length === 0 ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>No pending payments 🎉</div> : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {filtered.map(p => (
              <div key={p.id} style={{ borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid rgba(251,191,36,0.2)", borderLeft: "3px solid var(--yellow)", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                      <span style={{ textTransform: "capitalize" }}>{p.plan_name || p.payment_for?.replace(/_/g," ")}</span>
                      {" · "}Due since {fmtDate(p.payment_date)}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{p.phone}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 800, color: "var(--yellow)" }}>{fmt(p.amount)}</div>
                    {Number(p.paid_amount) > 0 && <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Paid: {fmt(p.paid_amount)}</div>}
                  </div>
                </div>
                {/* Mark Complete */}
                <div style={{ padding: "0 14px 10px" }}>
                  <button onClick={() => markPaid(p)} disabled={markingId === p.id} style={{
                    width: "100%", padding: "6px", borderRadius: "var(--radius-sm)",
                    background: markingId === p.id ? "var(--bg-surface)" : "rgba(74,222,128,0.08)",
                    border: "1px solid rgba(74,222,128,0.3)", color: markingId === p.id ? "var(--text-muted)" : "var(--green)",
                    cursor: markingId === p.id ? "not-allowed" : "pointer",
                    fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px"
                  }}>
                    <FaCheck style={{ fontSize: "9px" }} />
                    {markingId === p.id ? "Marking..." : `Mark Complete — ${fmt(p.amount)}`}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "14px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--yellow-bg)", border: "1px solid rgba(234,179,8,0.2)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "var(--yellow)" }}>Total Pending — {filtered.length} records</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 800, color: "var(--yellow)" }}>{fmt(totalPend)}</span>
          </div>
        </>
      )}
    </OverlayModal>
  );
}

// ─── Due Amount Modal (member-wise) ───────────────────────────────────────────
function DueAmountModal({ open, onClose }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    if (!open) return;
    setSearch(""); setLoading(true);
    api.get("/payments/due/list").then(r => setData(r.data.data)).catch(console.error).finally(() => setLoading(false));
  }, [open]);

  const filtered = data.filter(m => m.full_name?.toLowerCase().includes(search.toLowerCase()));
  const grandTotal = filtered.reduce((s, m) => s + Number(m.total_due), 0);

  return (
    <OverlayModal open={open} onClose={onClose} title="⚠️ Due Amounts — Member Wise" subtitle="Sorted by highest due first">
      <div style={{ position: "relative", marginBottom: "14px" }}>
        <FaSearch style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "11px" }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member..."
          style={{ width: "100%", padding: "8px 12px 8px 30px", boxSizing: "border-box", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "12px", outline: "none" }} />
      </div>
      {loading ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div> :
      filtered.length === 0 ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>No due amounts 🎉</div> : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["Member", "Total Amount", "Paid", "Balance Due"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.member_id} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{m.full_name}</div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{m.phone} · {m.payment_count} payment{m.payment_count !== 1 ? "s" : ""}</div>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--text-secondary)", fontWeight: 600 }}>{fmt(m.total_amount)}</td>
                  <td style={{ padding: "10px 12px", color: "var(--green)", fontWeight: 600 }}>{fmt(m.total_paid)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 800, color: "var(--red)" }}>{fmt(m.total_due)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "14px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", color: "var(--red)" }}>Grand Total Due</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 800, color: "var(--red)" }}>{fmt(grandTotal)}</span>
          </div>
        </>
      )}
    </OverlayModal>
  );
}

// ─── Chart Month Detail Modal ──────────────────────────────────────────────────
function ChartMonthModal({ open, onClose, year, month, label }) {
  const [data,       setData]      = useState([]);
  const [loading,    setLoading]   = useState(false);
  const [tab,        setTab]       = useState("paid");   // "paid" | "pending" | "plans"
  const [markingId,  setMarkingId] = useState(null);

  useEffect(() => {
    if (!open || !year || !month) return;
    setTab("paid"); setLoading(true);
    api.get(`/payments/chart-month/${year}/${month}`)
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [open, year, month]);

  const paid     = data.filter(p => p.status === "paid");
  const pending  = data.filter(p => p.status === "pending");

  // Plan summary for "plans" tab — group by plan_name
  const planGroups = data.reduce((acc, p) => {
    const key = p.plan_name || p.payment_for || "Other";
    if (!acc[key]) acc[key] = { plan: key, members: [], total: 0, pendingAmt: 0 };
    acc[key].members.push(p);
    if (p.status === "paid") acc[key].total += Number(p.amount);
    if (p.status === "pending") acc[key].pendingAmt += Number(p.due_amount || p.amount);
    return acc;
  }, {});

  const markPaid = async (p) => {
    setMarkingId(p.id);
    try {
      await api.put(`/payments/${p.id}`, {
        ...p, status: "paid", paid_amount: p.amount, due_amount: 0,
        payment_date: new Date().toISOString().split("T")[0],
      });
      // refresh
      const r = await api.get(`/payments/chart-month/${year}/${month}`);
      setData(r.data.data);
    } catch(e) { console.error(e); }
    finally { setMarkingId(null); }
  };

  const displayed = tab === "paid" ? paid : tab === "pending" ? pending : [];

  return (
    <OverlayModal open={open} onClose={onClose} width="700px"
      title={`📊 ${label} — Detail`}
      subtitle={`${paid.length} paid · ${pending.length} pending · ${Object.keys(planGroups).length} plans`}
    >
      {/* 3-Tab Toggle */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {[
          { key: "paid",    label: `✅ Paid (${paid.length})`,         color: "var(--green)",  bg: "var(--green-bg)",  border: "rgba(74,222,128,0.3)" },
          { key: "pending", label: `⏳ Pending (${pending.length})`,   color: "var(--yellow)", bg: "var(--yellow-bg)", border: "rgba(234,179,8,0.3)" },
          { key: "plans",   label: `📋 Plans (${Object.keys(planGroups).length})`, color: "var(--blue)", bg: "var(--blue-bg)", border: "rgba(96,165,250,0.3)" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "6px 14px", borderRadius: "99px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
            background: tab === t.key ? t.bg : "var(--bg-elevated)",
            color: tab === t.key ? t.color : "var(--text-muted)",
            border: `1px solid ${tab === t.key ? t.border : "var(--border-default)"}`,
            transition: "all 0.15s"
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div> : (

        // ── Plans Tab ──
        tab === "plans" ? (
          Object.values(planGroups).length === 0
            ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>No data</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {Object.values(planGroups).map(g => (
                  <div key={g.plan} style={{ borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
                    {/* Plan header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>{g.plan}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{g.members.length} member{g.members.length !== 1 ? "s" : ""}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        {g.total > 0 && <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)" }}>{fmt(g.total)} paid</div>}
                        {g.pendingAmt > 0 && <div style={{ fontSize: "11px", color: "var(--yellow)", marginTop: "2px" }}>⏳ {fmt(g.pendingAmt)} pending</div>}
                      </div>
                    </div>
                    {/* Member list */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                      {g.members.map(p => (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 16px", borderBottom: "1px solid var(--border-subtle)", borderLeft: `3px solid ${p.status === "paid" ? "var(--green)" : "var(--yellow)"}` }}>
                          <div>
                            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                              {METHOD_ICON[p.payment_method]} {p.payment_method} · {fmtDate(p.payment_date)}
                              {p.status === "pending" && Number(p.due_amount) > 0 && ` · Due: ${fmt(p.due_amount)}`}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700, color: p.status === "paid" ? "var(--green)" : "var(--yellow)" }}>{fmt(p.amount)}</span>
                            <span style={{ fontSize: "9px", padding: "2px 6px", borderRadius: "99px", background: p.status === "paid" ? "var(--green-bg)" : "var(--yellow-bg)", color: p.status === "paid" ? "var(--green)" : "var(--yellow)", fontWeight: 600 }}>{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

        // ── Paid / Pending Tab ──
        ) : displayed.length === 0
          ? <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>No {tab} payments</div>
          : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {displayed.map(p => (
                  <div key={p.id} style={{ borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: `1px solid ${tab === "pending" ? "rgba(251,191,36,0.2)" : "var(--border-subtle)"}`, borderLeft: `3px solid ${tab === "pending" ? "var(--yellow)" : "var(--green)"}`, overflow: "hidden" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 14px" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          <span style={{ textTransform: "capitalize" }}>{p.plan_name || p.payment_for?.replace(/_/g," ")}</span>
                          {" · "}{METHOD_ICON[p.payment_method]} {p.payment_method}
                          {" · "}{fmtDate(p.payment_date)}
                        </div>
                        {tab === "pending" && Number(p.due_amount) > 0 && (
                          <div style={{ fontSize: "10px", color: "var(--yellow)", marginTop: "3px" }}>
                            Paid: {fmt(p.paid_amount)} · Due: {fmt(p.due_amount)}
                          </div>
                        )}
                      </div>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 800, color: tab === "pending" ? "var(--yellow)" : "var(--green)", flexShrink: 0, marginLeft: "12px" }}>
                        {fmt(tab === "pending" ? (p.due_amount || p.amount) : p.amount)}
                      </span>
                    </div>
                    {/* Mark Complete button for pending */}
                    {tab === "pending" && (
                      <div style={{ padding: "0 14px 10px" }}>
                        <button onClick={() => markPaid(p)} disabled={markingId === p.id} style={{
                          width: "100%", padding: "6px", borderRadius: "var(--radius-sm)",
                          background: markingId === p.id ? "var(--bg-surface)" : "rgba(74,222,128,0.08)",
                          border: "1px solid rgba(74,222,128,0.3)", color: markingId === p.id ? "var(--text-muted)" : "var(--green)",
                          cursor: markingId === p.id ? "not-allowed" : "pointer",
                          fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px"
                        }}>
                          <FaCheck style={{ fontSize: "9px" }} />
                          {markingId === p.id ? "Marking..." : `Mark Complete — ${fmt(p.due_amount || p.amount)}`}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "14px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-strong)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total {tab === "pending" ? "Pending" : "Paid"} — {displayed.length} records</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 800, color: tab === "pending" ? "var(--yellow)" : "var(--green)" }}>
                  {fmt(displayed.reduce((s, p) => s + Number(tab === "pending" ? (p.due_amount || p.amount) : p.amount), 0))}
                </span>
              </div>
            </>
          )
      )}
    </OverlayModal>
  );
}

// ─── Clickable Stat Card ───────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, sub, trend, onClick }) => (
  <div onClick={onClick} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px", position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default", transition: "all 0.15s" }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
    onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; } }}
  >
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color, opacity: 0.5 }} />
    {onClick && <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "9px", color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: "4px" }}>Click to view</div>}
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
      <p style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "2px" }}>Click bar for details</p>
    </div>
  );
};

function PlanSelect({ value, onChange, plans, style, includeOther = true }) {
  const byType = plans.reduce((acc, p) => {
    const t = p.duration_type; if (!acc[t]) acc[t] = []; acc[t].push(p); return acc;
  }, {});
  return (
    <select value={value} onChange={onChange} style={style}>
      <option value="">— Select Plan —</option>
      {Object.entries(byType).map(([type, list]) => (
        <optgroup key={type} label={TYPE_LABEL[type] || type}>
          {list.map(p => <option key={p.id} value={p.name}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")}</option>)}
        </optgroup>
      ))}
      {includeOther && <optgroup label="Other"><option value="registration">Registration Fee</option><option value="other">Other</option></optgroup>}
    </select>
  );
}

// ─── Payment Add/Edit Modal ────────────────────────────────────────────────────
function PaymentModal({ isOpen, onClose, onSave, editData, members, plans }) {
  const today = new Date().toISOString().split("T")[0];
  const empty = { member_id: "", amount: "", paid_amount: "", payment_date: today, payment_method: "cash", payment_for: "", status: "paid", months_covered: 1, notes: "", plan_start: "", plan_end: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editData) {
      setForm({ member_id: editData.member_id || "", amount: editData.amount || "", paid_amount: editData.paid_amount || "", payment_date: editData.payment_date?.split("T")[0] || today, payment_method: editData.payment_method || "cash", payment_for: editData.plan_name || editData.payment_for || "", status: editData.status || "paid", months_covered: editData.months_covered || 1, notes: editData.notes || "", plan_start: editData.plan_start?.split("T")[0] || "", plan_end: editData.plan_end?.split("T")[0] || "" });
    } else { setForm(empty); }
    setError("");
  }, [editData, isOpen]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePlanSelect = (planName) => {
    set("payment_for", planName);
    const plan = plans.find(p => p.name === planName);
    if (plan) {
      set("amount", plan.price);
      const monthsMap = { monthly: 1, quarterly: 3, yearly: 12 };
      set("months_covered", monthsMap[plan.duration_type] || 1);
      const start = new Date(), end = new Date();
      end.setDate(end.getDate() + plan.duration_days);
      set("plan_start", start.toISOString().split("T")[0]);
      set("plan_end",   end.toISOString().split("T")[0]);
    } else { set("plan_start", ""); set("plan_end", ""); }
  };

  const handleSubmit = async () => {
    if (!form.member_id || !form.amount || !form.payment_date) { setError("Member, amount and date are required"); return; }
    setSaving(true); setError("");
    try {
      const selectedPlan = plans.find(p => p.name === form.payment_for);
      const payload = { ...form, paid_amount: form.paid_amount || form.amount, payment_for: selectedPlan ? selectedPlan.duration_type : (form.payment_for || "other"), plan_name: selectedPlan ? selectedPlan.name : null, plan_start: form.plan_start || null, plan_end: form.plan_end || null };
      await onSave(payload); onClose();
    } catch (e) { setError(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  if (!isOpen) return null;
  const inp = { width: "100%", padding: "9px 12px", boxSizing: "border-box", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", outline: "none" };
  const lbl = { display: "block", marginBottom: "5px", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" };
  const selectedPlan = plans.find(p => p.name === form.payment_for);
  const dueAmount = form.amount && form.paid_amount ? Math.max(0, Number(form.amount) - Number(form.paid_amount)) : 0;
  const isPartial = dueAmount > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-default)", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><h3 style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{editData ? "Edit Payment" : "Record Payment"}</h3><p style={{ color: "var(--text-muted)", fontSize: "12px", margin: "3px 0 0" }}>{editData ? "Update payment details" : "Add a new payment record"}</p></div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px" }}><FaTimes /></button>
        </div>
        <div style={{ padding: "24px" }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px", marginBottom: "16px" }}>{error}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Member *</label><select value={form.member_id} onChange={e => set("member_id", e.target.value)} style={inp}><option value="">— Select Member —</option>{members.map(m => <option key={m.id} value={m.id}>{m.full_name} ({m.phone})</option>)}</select></div>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={lbl}>Payment For (Plan)</label>
              <PlanSelect value={form.payment_for} onChange={e => handlePlanSelect(e.target.value)} plans={plans} style={inp} includeOther={true} />
              {selectedPlan && <div style={{ marginTop: "8px", padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", display: "flex", gap: "20px", alignItems: "center" }}><span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Duration: <strong style={{ color: "var(--text-secondary)" }}>{selectedPlan.duration_days} days</strong></span><span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Price: <strong style={{ color: "var(--green)" }}>₹{Number(selectedPlan.price).toLocaleString("en-IN")}</strong></span><span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>Amount auto-filled ✓</span></div>}
            </div>
            <div><label style={lbl}>Total Amount (₹) *</label><input type="number" value={form.amount} onChange={e => set("amount", e.target.value)} placeholder="999" style={inp} /></div>
            <div><label style={lbl}>Paid Amount (₹)</label><input type="number" value={form.paid_amount} onChange={e => set("paid_amount", e.target.value)} placeholder="Leave blank = full paid" style={{ ...inp, borderColor: isPartial ? "rgba(234,179,8,0.5)" : "var(--border-default)" }} /></div>
            {isPartial && <div style={{ gridColumn: "1/-1" }}><div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--yellow-bg)", border: "1px solid rgba(234,179,8,0.3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: "8px" }}><FaExclamationTriangle style={{ color: "var(--yellow)", fontSize: "13px" }} /><span style={{ fontSize: "13px", color: "var(--yellow)", fontWeight: 600 }}>Partial Payment</span></div><div style={{ textAlign: "right" }}><div style={{ fontSize: "14px", fontWeight: 700, color: "var(--yellow)" }}>Due: {fmt(dueAmount)}</div><div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Status → Pending</div></div></div></div>}
            <div><label style={lbl}>Payment Date *</label><input type="date" value={form.payment_date} onChange={e => set("payment_date", e.target.value)} style={inp} /></div>
            <div><label style={lbl}>Method</label><select value={form.payment_method} onChange={e => set("payment_method", e.target.value)} style={inp}><option value="cash">💵 Cash</option><option value="card">💳 Card</option><option value="upi">📱 UPI</option><option value="bank_transfer">🏦 Bank Transfer</option></select></div>
            <div><label style={lbl}>Status</label><select value={isPartial ? "pending" : form.status} onChange={e => set("status", e.target.value)} style={inp} disabled={isPartial}><option value="paid">✅ Paid</option><option value="pending">⏳ Pending</option><option value="failed">❌ Failed</option><option value="refunded">↩️ Refunded</option></select></div>
            <div><label style={lbl}>Months Covered</label><input type="number" min="1" max="12" value={form.months_covered} onChange={e => set("months_covered", e.target.value)} style={inp} /></div>
            {selectedPlan && <><div><label style={lbl}>Plan Start</label><input type="date" value={form.plan_start} onChange={e => set("plan_start", e.target.value)} style={inp} /></div><div><label style={lbl}>Plan End</label><input type="date" value={form.plan_end} onChange={e => set("plan_end", e.target.value)} style={inp} /></div></>}
            <div style={{ gridColumn: "1/-1" }}><label style={lbl}>Notes</label><textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes..." rows={2} style={{ ...inp, resize: "vertical", fontFamily: "var(--font-body)" }} /></div>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: saving ? "var(--bg-elevated)" : "var(--text-primary)", color: saving ? "var(--text-muted)" : "#0a0a0a", border: "none", cursor: saving ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)" }}>
            {saving ? "Saving..." : editData ? "Update" : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Payments({ onLogout }) {
  const [payments, setPayments]   = useState([]);
  const [members,  setMembers]    = useState([]);
  const [plans,    setPlans]      = useState([]);
  const [stats,    setStats]      = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [search,   setSearch]     = useState("");
  const [statusFilter, setStatus] = useState("");
  const [methodFilter, setMethod] = useState("");
  const [page,     setPage]       = useState(1);
  const [totalPages, setTotal]    = useState(1);
  const [totalCount, setCount]    = useState(0);
  const [showModal,  setModal]    = useState(false);
  const [editData,   setEditData] = useState(null);
  const [deleting,   setDeleting] = useState(null);

  // Drill-down modal states
  const [showDrillDown,   setDrillDown]   = useState(false);
  const [showToday,       setShowToday]   = useState(false);
  const [showThisMonth,   setShowMonth]   = useState(false);
  const [showPending,     setShowPending] = useState(false);
  const [showDue,         setShowDue]     = useState(false);
  const [chartMonth,      setChartMonth]  = useState(null); // { year, month, label }

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

  const trend     = stats ? (Number(stats.thisMonth) - Number(stats.lastMonth)) : undefined;
  const chartData = stats?.monthly6 || [];

  // Chart click handler
  const handleBarClick = (data) => {
    if (!data?.activePayload?.length) return;
    const bar  = data.activePayload[0].payload;
    const date = new Date(`${bar.label} 1`);
    setChartMonth({ year: date.getFullYear(), month: date.getMonth() + 1, label: bar.label });
  };

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
          <button onClick={() => { setEditData(null); setModal(true); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "var(--radius-md)", background: "var(--text-primary)", color: "#0a0a0a", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)" }}>
            <FaPlus style={{ fontSize: "11px" }} /> Record Payment
          </button>
        </div>

        {/* ── Stats Cards (Clickable) ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(175px,1fr))", gap: "14px", marginBottom: "24px" }}>
          <StatCard icon={FaRupeeSign}          color="var(--green)"  bg="var(--green-bg)"        label="Total Revenue"    value={fmt(stats?.totalRevenue)} onClick={() => setDrillDown(true)} />
          <StatCard icon={FaCalendarAlt}         color="var(--blue)"   bg="var(--blue-bg)"         label="Today's Revenue"  value={fmt(stats?.todayRevenue)} onClick={() => setShowToday(true)} />
          <StatCard icon={FaArrowUp}             color="var(--accent)" bg="rgba(255,255,255,0.06)" label="This Month"       value={fmt(stats?.thisMonth)} trend={trend} onClick={() => setShowMonth(true)} />
          <StatCard icon={FaClock}               color="var(--yellow)" bg="var(--yellow-bg)"       label="Pending Count"    value={stats?.pendingCount || 0} sub="payments" onClick={() => setShowPending(true)} />
          <StatCard icon={FaExclamationTriangle} color="var(--red)"    bg="var(--red-bg)"          label="Pending Amount"   value={fmt(stats?.pendingAmount)} onClick={() => setShowDue(true)} />
        </div>

        {/* ── Chart ── */}
        {chartData.length > 0 && (
          <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "22px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Monthly Revenue</h3>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-elevated)", padding: "3px 8px", borderRadius: "4px" }}>Click bar for details</span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "16px" }}>Last 6 months</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }} onClick={handleBarClick} style={{ cursor: "pointer" }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => "₹" + (v/1000).toFixed(0) + "k"} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={i === chartData.length - 1 ? "#f0f0f0" : "#333333"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Filters ── */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 18px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginBottom: "16px" }}>
          <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
            <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "12px" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member name, email, phone..."
              style={{ width: "100%", padding: "9px 12px 9px 34px", boxSizing: "border-box", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-primary)", fontSize: "13px", outline: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <FaFilter style={{ color: "var(--text-muted)", fontSize: "11px" }} />
            <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ padding: "9px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", outline: "none", cursor: "pointer" }}>
              <option value="">All Status</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
            </select>
          </div>
          <select value={methodFilter} onChange={e => setMethod(e.target.value)} style={{ padding: "9px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)", color: "var(--text-secondary)", fontSize: "13px", outline: "none", cursor: "pointer" }}>
            <option value="">All Methods</option><option value="cash">💵 Cash</option><option value="card">💳 Card</option><option value="upi">📱 UPI</option><option value="bank_transfer">🏦 Bank Transfer</option>
          </select>
        </div>

        {/* ── Table ── */}
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Member", "Amount / Due", "Date", "Method", "For", "Months", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => <tr key={i}>{[...Array(8)].map((_, j) => <td key={j} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}><div style={{ height: "12px", borderRadius: "4px", background: "var(--bg-elevated)", width: j === 0 ? "140px" : "70px" }} /></td>)}</tr>)
                ) : payments.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}><FaMoneyBill style={{ fontSize: "32px", opacity: 0.3, display: "block", margin: "0 auto 12px" }} />No payments found</td></tr>
                ) : (
                  payments.map(p => {
                    const sc     = STATUS_COLOR[p.status] || STATUS_COLOR.paid;
                    const hasDue = p.due_amount > 0;
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{p.email}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--text-primary)", fontSize: "14px" }}>{fmt(p.amount)}</span>
                          {hasDue && <div style={{ marginTop: "5px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: "var(--yellow-bg)", color: "var(--yellow)", border: "1px solid rgba(234,179,8,0.3)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                              <FaExclamationTriangle style={{ fontSize: "8px" }} />Due: {fmt(p.due_amount)}
                            </span>
                            <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>Paid: {fmt(p.paid_amount)}</div>
                          </div>}
                        </td>
                        <td style={{ padding: "14px 16px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmtDate(p.payment_date)}</td>
                        <td style={{ padding: "14px 16px" }}><span style={{ display: "flex", alignItems: "center", gap: "5px", color: "var(--text-secondary)" }}>{METHOD_ICON[p.payment_method]} {p.payment_method?.replace("_"," ")}</span></td>
                        <td style={{ padding: "14px 16px" }}><span style={{ padding: "3px 8px", borderRadius: "99px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", fontSize: "11px", color: "var(--text-secondary)", textTransform: "capitalize", whiteSpace: "nowrap" }}>{p.plan_name || p.payment_for?.replace("_"," ")}</span></td>
                        <td style={{ padding: "14px 16px", color: "var(--text-secondary)", textAlign: "center" }}>{p.months_covered}</td>
                        <td style={{ padding: "14px 16px" }}><span style={{ padding: "4px 10px", borderRadius: "99px", background: sc.bg, color: sc.color, fontSize: "11px", fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap" }}>{p.status}</span></td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button onClick={() => { setEditData(p); setModal(true); }} style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                              <FaEdit /> Edit
                            </button>
                            {admin.role === "super_admin" && (
                              <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id} style={{ padding: "5px 10px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
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
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: page===1?"var(--text-muted)":"var(--text-secondary)", cursor: page===1?"not-allowed":"pointer" }}><FaChevronLeft /></button>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: page===totalPages?"var(--text-muted)":"var(--text-secondary)", cursor: page===totalPages?"not-allowed":"pointer" }}><FaChevronRight /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── All Modals ── */}
      <PaymentModal isOpen={showModal} onClose={() => setModal(false)} onSave={handleSave} editData={editData} members={members} plans={plans} />
      <DrillDownModal open={showDrillDown} onClose={() => setDrillDown(false)} />
      <PaymentListModal open={showToday} onClose={() => setShowToday(false)} endpoint="/payments/today/list" title="📅 Today's Payments" />
      <PaymentListModal open={showThisMonth} onClose={() => setShowMonth(false)} endpoint="/payments/thismonth/list" title="📆 This Month's Payments" />
      <PendingCountModal open={showPending} onClose={() => setShowPending(false)} onStatsRefresh={fetchStats} />
      <DueAmountModal open={showDue} onClose={() => setShowDue(false)} />
      <ChartMonthModal open={!!chartMonth} onClose={() => setChartMonth(null)} year={chartMonth?.year} month={chartMonth?.month} label={chartMonth?.label} />

      <style>{`@keyframes popIn { from { transform: scale(0.96); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}