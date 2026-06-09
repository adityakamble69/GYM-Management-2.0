// components/ReportDrillDownModal.jsx
import { useEffect, useState } from "react";
import { FaTimes, FaChevronLeft, FaSearch, FaRupeeSign, FaExclamationTriangle } from "react-icons/fa";
import api from "../services/api";

const fmt     = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const METHOD_ICON = { cash: "💵", card: "💳", upi: "📱", bank_transfer: "🏦" };
const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ p }) {
  const isPartial = Number(p.due_amount) > 0;
  if (isPartial) return <span style={{ padding:"2px 8px", borderRadius:"99px", fontSize:"10px", fontWeight:700, background:"var(--yellow-bg)", color:"var(--yellow)" }}>Partial ⚠️</span>;
  if (p.status === "paid") return <span style={{ padding:"2px 8px", borderRadius:"99px", fontSize:"10px", fontWeight:700, background:"var(--green-bg)", color:"var(--green)" }}>Paid ✅</span>;
  return <span style={{ padding:"2px 8px", borderRadius:"99px", fontSize:"10px", fontWeight:700, background:"var(--red-bg)", color:"var(--red)" }}>Pending ❌</span>;
}

// ── Summary Strip ─────────────────────────────────────────────────────────────
function SummaryStrip({ payments }) {
  const collected = payments.filter(p => p.status==="paid").reduce((s,p) => s+Number(p.amount),0);
  const pending   = payments.reduce((s,p) => s+Number(p.due_amount||0),0);
  const partial   = payments.filter(p => Number(p.due_amount)>0).length;
  const members   = new Set(payments.map(p => p.member_id)).size;
  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", borderBottom:"1px solid var(--border-subtle)" }}>
      {[
        { icon:"✅", label:"Collected",   value:fmt(collected), color:"var(--green)"  },
        { icon:"⚠️", label:"Pending/Due", value:fmt(pending),   color:"var(--yellow)" },
        { icon:"👥", label:"Members",     value:members,        color:"var(--blue)"   },
        { icon:"⏳", label:"Partial",     value:partial,        color:"var(--yellow)" },
      ].map(c => (
        <div key={c.label} style={{ padding:"14px 18px", textAlign:"center", borderRight:"1px solid var(--border-subtle)", background:"var(--bg-elevated)" }}>
          <div style={{ fontSize:"18px", marginBottom:"4px" }}>{c.icon}</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"17px", fontWeight:800, color:c.color }}>{c.value}</div>
          <div style={{ fontSize:"10px", color:"var(--text-muted)", marginTop:"2px", textTransform:"uppercase", letterSpacing:"0.06em" }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Payments Table ────────────────────────────────────────────────────────────
function PaymentsTable({ payments, search, filter }) {
  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.full_name?.toLowerCase().includes(q) || p.phone?.includes(search);
    const matchFilter = filter==="all" ? true : filter==="partial" ? Number(p.due_amount)>0 : p.status===filter;
    return matchSearch && matchFilter;
  });

  if (filtered.length === 0)
    return <div style={{ padding:"48px", textAlign:"center", color:"var(--text-muted)", fontSize:"13px" }}>No payments found</div>;

  const grandTotal = filtered.reduce((s,p) => s+Number(p.amount),0);

  return (
    <>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"12px" }}>
        <thead>
          <tr style={{ background:"var(--bg-elevated)", position:"sticky", top:0, zIndex:1 }}>
            {["#","Member","Plan / For","Amount","Paid","Due","Method","Date","Status"].map(h => (
              <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:"10px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid var(--border-subtle)", whiteSpace:"nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((p, idx) => (
            <tr key={p.id} style={{ borderBottom:"1px solid var(--border-subtle)", transition:"background 0.1s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <td style={{ padding:"11px 14px", color:"var(--text-muted)", fontSize:"11px" }}>{idx+1}</td>
              <td style={{ padding:"11px 14px" }}>
                <div style={{ fontWeight:600, color:"var(--text-primary)" }}>{p.full_name}</div>
                <div style={{ fontSize:"10px", color:"var(--text-muted)", marginTop:"1px" }}>{p.phone}</div>
              </td>
              <td style={{ padding:"11px 14px", color:"var(--text-secondary)", fontSize:"11px" }}>
                <div style={{ fontWeight:600 }}>{p.plan_name || "—"}</div>
                <div style={{ color:"var(--text-muted)", textTransform:"capitalize" }}>{p.payment_for?.replace(/_/g," ")}</div>
              </td>
              <td style={{ padding:"11px 14px", fontFamily:"var(--font-display)", fontWeight:800, color:"var(--text-primary)", whiteSpace:"nowrap" }}>{fmt(p.amount)}</td>
              <td style={{ padding:"11px 14px", fontFamily:"var(--font-display)", fontWeight:700, color:"var(--green)", whiteSpace:"nowrap" }}>{fmt(p.paid_amount||p.amount)}</td>
              <td style={{ padding:"11px 14px", whiteSpace:"nowrap" }}>
                {Number(p.due_amount)>0
                  ? <span style={{ color:"var(--yellow)", fontWeight:700, display:"flex", alignItems:"center", gap:"4px" }}><FaExclamationTriangle style={{ fontSize:"9px" }}/>{fmt(p.due_amount)}</span>
                  : <span style={{ color:"var(--text-muted)" }}>—</span>}
              </td>
              <td style={{ padding:"11px 14px", color:"var(--text-secondary)", whiteSpace:"nowrap" }}>{METHOD_ICON[p.payment_method]||"💵"} {p.payment_method?.replace(/_/g," ")}</td>
              <td style={{ padding:"11px 14px", color:"var(--text-muted)", whiteSpace:"nowrap", fontSize:"11px" }}>{fmtDate(p.payment_date)}</td>
              <td style={{ padding:"11px 14px" }}><StatusBadge p={p}/></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding:"12px 20px", borderTop:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:"11px", color:"var(--text-muted)" }}>Showing {filtered.length} of {payments.length} records</span>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>Grand Total:</span>
          <span style={{ fontFamily:"var(--font-display)", fontSize:"16px", fontWeight:800, color:"var(--green)" }}>{fmt(grandTotal)}</span>
        </div>
      </div>
    </>
  );
}

// ── Year Months List ──────────────────────────────────────────────────────────
function YearMonthsList({ year, onMonthClick, onBack, title }) {
  const [months,  setMonths]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/reports/drilldown/year/${year}`)
      .then(r => setMonths(r.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  const totalRevenue = months.reduce((s,m) => s+Number(m.total),0);

  return (
    <>
      <div style={{ padding:"14px 24px", borderBottom:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--bg-elevated)" }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:"15px", fontWeight:800, color:"var(--text-primary)" }}>{title} — {year}</div>
          <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>Total: {fmt(totalRevenue)}</div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {loading ? (
          <div style={{ padding:"48px", textAlign:"center", color:"var(--text-muted)" }}>Loading...</div>
        ) : months.length === 0 ? (
          <div style={{ padding:"48px", textAlign:"center", color:"var(--text-muted)" }}>No payments for {year}</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
            <thead>
              <tr style={{ background:"var(--bg-elevated)" }}>
                {["Month","Revenue","Transactions","Avg/Transaction",""].map(h => (
                  <th key={h} style={{ padding:"10px 20px", textAlign:"left", fontSize:"10px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid var(--border-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTH_NAMES.slice(1).map((mName, idx) => {
                const m = months.find(r => r.month === idx+1);
                const total = m?.total || 0;
                const count = m?.count || 0;
                return (
                  <tr key={mName}
                    onClick={() => count>0 && onMonthClick(idx+1)}
                    style={{ borderBottom:"1px solid var(--border-subtle)", cursor:count>0?"pointer":"default", transition:"background 0.1s" }}
                    onMouseEnter={e => { if(count>0) e.currentTarget.style.background="var(--bg-elevated)"; }}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}
                  >
                    <td style={{ padding:"12px 20px", fontWeight:500, color:count>0?"var(--text-primary)":"var(--text-muted)" }}>
                      {mName}
                      {count>0 && <span style={{ marginLeft:"8px", fontSize:"10px", color:"var(--blue)", opacity:0.7 }}>→ details</span>}
                    </td>
                    <td style={{ padding:"12px 20px", color:total>0?"#34d399":"var(--text-muted)", fontWeight:600 }}>{fmt(total)}</td>
                    <td style={{ padding:"12px 20px", color:"var(--text-secondary)" }}>{count}</td>
                    <td style={{ padding:"12px 20px", color:"var(--text-secondary)" }}>{count>0?fmt(total/count):"—"}</td>
                    <td style={{ padding:"12px 20px", color:"var(--blue)", fontSize:"11px" }}>{count>0?"Click to view →":""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ── All Time: Years List ──────────────────────────────────────────────────────
function AllYearsList({ onYearClick }) {
  const [years, setYears] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/reports/drilldown/all-years")
      .then(r => setYears(r.data.data||[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div style={{ padding:"14px 24px", borderBottom:"1px solid var(--border-subtle)", background:"var(--bg-elevated)" }}>
        <div style={{ fontFamily:"var(--font-display)", fontSize:"15px", fontWeight:800, color:"var(--text-primary)" }}>All Time — Revenue by Year</div>
        <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>Click a year to see monthly breakdown</div>
      </div>
      <div style={{ flex:1, overflowY:"auto" }}>
        {loading ? (
          <div style={{ padding:"48px", textAlign:"center", color:"var(--text-muted)" }}>Loading...</div>
        ) : (
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"13px" }}>
            <thead>
              <tr style={{ background:"var(--bg-elevated)" }}>
                {["Year","Total Revenue","Transactions",""].map(h => (
                  <th key={h} style={{ padding:"10px 20px", textAlign:"left", fontSize:"10px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid var(--border-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map(y => (
                <tr key={y.year}
                  onClick={() => onYearClick(y.year)}
                  style={{ borderBottom:"1px solid var(--border-subtle)", cursor:"pointer", transition:"background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background="var(--bg-elevated)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <td style={{ padding:"14px 20px", fontWeight:700, color:"var(--text-primary)", fontSize:"15px" }}>{y.year}</td>
                  <td style={{ padding:"14px 20px", color:"#34d399", fontWeight:700, fontFamily:"var(--font-display)", fontSize:"15px" }}>{fmt(y.total)}</td>
                  <td style={{ padding:"14px 20px", color:"var(--text-secondary)" }}>{y.count}</td>
                  <td style={{ padding:"14px 20px", color:"var(--blue)", fontSize:"11px" }}>Click to view months →</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function ReportDrillDownModal({ mode, month, year, onClose }) {
  // mode: "month" | "this-month" | "last-year" | "all-time" | "method"
  // Breadcrumb stack: [{label, view, params}]
  const [stack,   setStack]   = useState([]);
  const [payments,setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");

  const open = !!mode;

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key==="Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  // Init stack when modal opens
  useEffect(() => {
    if (!open) { setStack([]); setPayments([]); return; }
    setSearch(""); setFilter("all");

    if (mode === "month") {
      setStack([{ view:"payments", label:`${MONTH_NAMES[month]} ${year}`, year, month }]);
    } else if (mode === "this-month") {
      setStack([{ view:"this-month-payments", label:"This Month" }]);
    } else if (mode === "last-year") {
      const ly = new Date().getFullYear() - 1;
      setStack([{ view:"year-months", label:`Last Year — ${ly}`, year:ly }]);
    } else if (mode === "all-time") {
      setStack([{ view:"all-years", label:"All Time" }]);
    } else if (mode === "method") {
      setStack([{ view:"method-payments", label:`${(month||"").toUpperCase()} Payments`, method:month, year }]);
    }
  }, [mode, month, year, open]);

  // Fetch payments when needed
  useEffect(() => {
    const top = stack[stack.length-1];
    if (!top) return;
    if (top.view==="payments") {
      setLoading(true); setPayments([]);
      api.get(`/reports/drilldown/members/${top.year}/${top.month}`)
        .then(r => setPayments(r.data.data||[]))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (top.view==="this-month-payments") {
      setLoading(true); setPayments([]);
      api.get("/reports/drilldown/this-month")
        .then(r => setPayments(r.data.data||[]))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (top.view==="method-payments") {
      setLoading(true); setPayments([]);
      api.get(`/reports/drilldown/method/${top.method}`, { params:{ year:top.year } })
        .then(r => setPayments(r.data.data||[]))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [stack]);

  if (!open) return null;

  const top = stack[stack.length-1];

  const goBack = () => {
    if (stack.length <= 1) { onClose(); return; }
    setStack(s => s.slice(0,-1));
    setSearch(""); setFilter("all");
  };

  const pushMonthsOfYear = (yr) => {
    setStack(s => [...s, { view:"year-months", label:`${yr}`, year:yr }]);
  };

  const pushPaymentsOfMonth = (yr, mo) => {
    setStack(s => [...s, { view:"payments", label:`${MONTH_NAMES[mo]} ${yr}`, year:yr, month:mo }]);
  };

  const inp = { padding:"8px 12px 8px 30px", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", borderRadius:"var(--radius-sm)", color:"var(--text-primary)", fontSize:"12px", outline:"none", width:"100%", boxSizing:"border-box" };

  const showSearchFilter = ["payments","this-month-payments","method-payments"].includes(top?.view);

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.78)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1400, padding:"20px", backdropFilter:"blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"var(--bg-surface)", borderRadius:"var(--radius-lg)", border:"1px solid var(--border-default)", width:"min(960px,96vw)", maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 32px 80px rgba(0,0,0,0.7)", animation:"reportModalIn 0.2s cubic-bezier(0.16,1,0.3,1)" }}>

        {/* Header */}
        <div style={{ padding:"16px 24px", borderBottom:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--bg-elevated)", borderRadius:"var(--radius-lg) var(--radius-lg) 0 0", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <button onClick={goBack} style={{ display:"flex", alignItems:"center", gap:"6px", padding:"6px 10px", borderRadius:"var(--radius-sm)", background:"var(--bg-surface)", border:"1px solid var(--border-default)", color:"var(--text-muted)", cursor:"pointer", fontSize:"12px" }}>
              <FaChevronLeft style={{ fontSize:"10px" }}/> {stack.length<=1?"Close":"Back"}
            </button>
            {/* Breadcrumb */}
            <div style={{ display:"flex", alignItems:"center", gap:"6px", fontSize:"13px" }}>
              {stack.map((s,i) => (
                <span key={i} style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                  {i>0 && <span style={{ color:"var(--text-muted)" }}>›</span>}
                  <span style={{ color: i===stack.length-1?"var(--text-primary)":"var(--text-muted)", fontWeight:i===stack.length-1?700:400 }}>{s.label}</span>
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"var(--bg-surface)", border:"1px solid var(--border-default)", color:"var(--text-muted)", cursor:"pointer", borderRadius:"var(--radius-sm)", width:"32px", height:"32px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <FaTimes style={{ fontSize:"12px" }}/>
          </button>
        </div>

        {/* Summary Strip (for payment views) */}
        {!loading && payments.length>0 && showSearchFilter && <SummaryStrip payments={payments}/>}

        {/* Search + Filter (for payment views) */}
        {showSearchFilter && (
          <div style={{ padding:"12px 20px", borderBottom:"1px solid var(--border-subtle)", display:"flex", gap:"10px", alignItems:"center", flexWrap:"wrap", flexShrink:0 }}>
            <div style={{ position:"relative", flex:1, minWidth:"180px" }}>
              <FaSearch style={{ position:"absolute", left:"10px", top:"50%", transform:"translateY(-50%)", color:"var(--text-muted)", fontSize:"11px" }}/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search member name or phone..." style={inp}/>
            </div>
            <div style={{ display:"flex", gap:"6px" }}>
              {["all","paid","partial","pending"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{ padding:"6px 14px", borderRadius:"99px", fontSize:"11px", fontWeight:600, cursor:"pointer", textTransform:"capitalize", transition:"all 0.15s", background:filter===f?"var(--text-primary)":"var(--bg-elevated)", color:filter===f?"#0a0a0a":"var(--text-muted)", border:filter===f?"none":"1px solid var(--border-default)" }}>{f}</button>
              ))}
            </div>
          </div>
        )}

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto" }}>
          {loading ? (
            <div style={{ padding:"48px", textAlign:"center", color:"var(--text-muted)", fontSize:"13px" }}>Loading...</div>
          ) : (
            <>
              {/* Payments table */}
              {showSearchFilter && (
                <PaymentsTable payments={payments} search={search} filter={filter}/>
              )}

              {/* Year → Months list */}
              {top?.view==="year-months" && (
                <YearMonthsList
                  year={top.year}
                  title={top.label}
                  onMonthClick={(mo) => pushPaymentsOfMonth(top.year, mo)}
                  onBack={goBack}
                />
              )}

              {/* All Years list */}
              {top?.view==="all-years" && (
                <AllYearsList onYearClick={(yr) => pushMonthsOfYear(yr)}/>
              )}
            </>
          )}
        </div>
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