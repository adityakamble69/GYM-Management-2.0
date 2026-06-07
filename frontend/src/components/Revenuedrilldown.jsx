// components/RevenueDrillDown.jsx
// Drop into Dashboard.jsx — replaces stats cards
// Usage:
//   import RevenueDrillDown from "../components/RevenueDrillDown";
//   <RevenueDrillDown stats={stats} /> // stats = data from /api/dashboard/stats

import { useState, useEffect, useCallback } from "react";
import {
  FaTimes, FaRupeeSign, FaCalendarAlt, FaChevronRight,
  FaChevronLeft, FaUser, FaClock, FaCheckCircle,
  FaExclamationCircle, FaMobileAlt, FaCreditCard,
  FaMoneyBillWave, FaUniversity, FaArrowUp, FaArrowDown,
  FaSearch
} from "react-icons/fa";
import api from "../services/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const rupee  = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmt    = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const METHOD_ICON = { cash: FaMoneyBillWave, upi: FaMobileAlt, card: FaCreditCard, bank: FaUniversity, online: FaMobileAlt };

// ── Overlay Modal Shell ───────────────────────────────────────────────────────
function Modal({ title, onClose, children, width = "600px" }) {
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, zIndex: 1400,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)"
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", zIndex: 1401,
        transform: "translate(-50%,-50%)",
        width: `min(${width}, 95vw)`, maxHeight: "88vh",
        background: "var(--bg-surface)", border: "1px solid var(--border-default)",
        borderRadius: "16px", display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
        animation: "modalPop .2s ease"
      }}>
        <style>{`
          @keyframes modalPop {
            from { transform:translate(-50%,-48%); opacity:0; scale:.97 }
            to   { transform:translate(-50%,-50%); opacity:1; scale:1 }
          }
          .drill-row:hover { background: var(--bg-elevated) !important; }
          .drill-card:hover { border-color: var(--blue) !important; }
        `}</style>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border-default)", flexShrink: 0
        }}>
          <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>{title}</span>
          <button onClick={onClose} style={{
            background: "var(--bg-elevated)", border: "none", borderRadius: "8px",
            width: "30px", height: "30px", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center", color: "var(--text-muted)"
          }}><FaTimes style={{ fontSize: "12px" }} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px" }}>
          {children}
        </div>
      </div>
    </>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
      <div style={{
        width: "28px", height: "28px", borderRadius: "50%",
        border: "3px solid var(--border-default)",
        borderTopColor: "var(--blue)", animation: "spin .7s linear infinite"
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function Empty({ msg = "No data found" }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)", fontSize: "13px" }}>
      {msg}
    </div>
  );
}

// ── Method Badge ──────────────────────────────────────────────────────────────
function MethodBadge({ method }) {
  const colors = { cash: "#22c55e", upi: "#3b82f6", card: "#a855f7", bank: "#f59e0b", online: "#06b6d4" };
  const Icon = METHOD_ICON[method?.toLowerCase()] || FaMoneyBillWave;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "2px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.05em",
      background: (colors[method?.toLowerCase()] || "#888") + "22",
      color: colors[method?.toLowerCase()] || "#888"
    }}>
      <Icon style={{ fontSize: "9px" }} /> {method || "—"}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. TOTAL REVENUE DRILL DOWN  (Year → Month → Members)
// ══════════════════════════════════════════════════════════════════════════════
function TotalRevenueDrill({ onClose }) {
  const [view,    setView]    = useState("years");   // years | months | members
  const [years,   setYears]   = useState([]);
  const [months,  setMonths]  = useState([]);
  const [members, setMembers] = useState([]);
  const [selYear, setSelYear] = useState(null);
  const [selMon,  setSelMon]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  // Load years on mount
  useEffect(() => {
    api.get("/payments?limit=9999&status=paid").then(res => {
      const rows = res.data.data || [];
      const byYear = {};
      rows.forEach(p => {
        const yr = new Date(p.payment_date).getFullYear();
        if (!byYear[yr]) byYear[yr] = 0;
        byYear[yr] += Number(p.amount);
      });
      const sorted = Object.entries(byYear).sort((a,b) => b[0]-a[0])
        .map(([year, total]) => ({ year: Number(year), total }));
      setYears(sorted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const drillYear = async (yr) => {
    setSelYear(yr); setLoading(true);
    const res = await api.get(`/payments?limit=9999&status=paid`);
    const rows = (res.data.data || []).filter(p => new Date(p.payment_date).getFullYear() === yr);
    const byMonth = {};
    rows.forEach(p => {
      const mo = new Date(p.payment_date).getMonth();
      if (!byMonth[mo]) byMonth[mo] = 0;
      byMonth[mo] += Number(p.amount);
    });
    const result = Object.entries(byMonth).sort((a,b)=>b[0]-a[0])
      .map(([mo, total]) => ({ mo: Number(mo), label: MONTHS[Number(mo)], total }));
    setMonths(result); setView("months"); setLoading(false);
  };

  const drillMonth = async (mo) => {
    setSelMon(mo); setLoading(true);
    const res = await api.get(`/payments?limit=9999&status=paid`);
    const rows = (res.data.data || []).filter(p => {
      const d = new Date(p.payment_date);
      return d.getFullYear() === selYear && d.getMonth() === mo;
    });
    setMembers(rows); setView("members"); setLoading(false);
  };

  const back = () => {
    if (view === "members") { setView("months"); setSearch(""); }
    else if (view === "months") { setView("years"); }
  };

  const title = view === "years"   ? "Total Revenue — Year Wise"
              : view === "months"  ? `${selYear} — Month Wise`
              : `${MONTHS[selMon]} ${selYear} — Member Payments`;

  const filteredMembers = members.filter(m =>
    !search || m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal title={title} onClose={onClose} width="620px">
      {view !== "years" && (
        <button onClick={back} style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
          borderRadius: "8px", padding: "6px 12px", cursor: "pointer",
          color: "var(--text-secondary)", fontSize: "12px", marginBottom: "16px"
        }}>
          <FaChevronLeft style={{ fontSize: "10px" }} /> Back
        </button>
      )}

      {loading ? <Spinner /> : (
        <>
          {/* YEARS */}
          {view === "years" && (
            years.length === 0 ? <Empty /> :
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {years.map(y => (
                <div key={y.year} className="drill-row" onClick={() => drillYear(y.year)}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    transition: "all .15s"
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "38px", height: "38px", borderRadius: "10px",
                      background: "var(--blue-bg)", display: "flex", alignItems: "center",
                      justifyContent: "center"
                    }}>
                      <FaCalendarAlt style={{ color: "var(--blue)", fontSize: "14px" }} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: "16px", color: "var(--text-primary)" }}>{y.year}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--green)" }}>{rupee(y.total)}</span>
                    <FaChevronRight style={{ fontSize: "11px", color: "var(--text-muted)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MONTHS */}
          {view === "months" && (
            months.length === 0 ? <Empty /> :
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {months.map(m => (
                <div key={m.mo} className="drill-card" onClick={() => drillMonth(m.mo)}
                  style={{
                    padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    transition: "all .15s"
                  }}>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>{m.label} {selYear}</div>
                  <div style={{ fontWeight: 700, fontSize: "18px", color: "var(--green)" }}>{rupee(m.total)}</div>
                  <div style={{ fontSize: "11px", color: "var(--blue)", marginTop: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                    View details <FaChevronRight style={{ fontSize: "9px" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MEMBERS */}
          {view === "members" && (
            <>
              <div style={{ position: "relative", marginBottom: "14px" }}>
                <FaSearch style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "var(--text-muted)" }} />
                <input
                  placeholder="Search member..." value={search}
                />
              </div>
              {/* Summary */}
              <div style={{
                display: "flex", gap: "10px", marginBottom: "14px"
              }}>
                {[
                  { label: "Total", val: rupee(filteredMembers.reduce((s,p)=>s+Number(p.amount),0)), color: "var(--green)" },
                  { label: "Transactions", val: filteredMembers.length, color: "var(--blue)" },
                ].map(x => (
                  <div key={x.label} style={{
                    flex: 1, padding: "10px 14px", borderRadius: "8px",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)"
                  }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>{x.label}</div>
                    <div style={{ fontWeight: 700, color: x.color, fontSize: "15px" }}>{x.val}</div>
                  </div>
                ))}
              </div>

              {filteredMembers.length === 0 ? <Empty /> :
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {filteredMembers.map(p => (
                    <div key={p.id} className="drill-row" style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "11px 14px", borderRadius: "9px",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                      transition: "all .15s"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "50%",
                          background: "var(--blue-bg)", display: "flex", alignItems: "center",
                          justifyContent: "center", flexShrink: 0
                        }}>
                          <FaUser style={{ fontSize: "11px", color: "var(--blue)" }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.full_name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmt(p.payment_date)}</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                        <MethodBadge method={p.payment_method} />
                        <span style={{ fontWeight: 700, color: "var(--green)", fontSize: "14px" }}>{rupee(p.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </>
          )}
        </>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. TODAY'S REVENUE POPUP
// ══════════════════════════════════════════════════════════════════════════════
function TodayRevenue({ onClose }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    api.get(`/payments?limit=9999&status=paid`).then(res => {
      const rows = (res.data.data || []).filter(p => {
        const d = p.payment_date?.split("T")[0] || p.payment_date;
        return d === today;
      });
      setData(rows); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const total = data.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <Modal title="Today's Payments" onClose={onClose} width="580px">
      {loading ? <Spinner /> : (
        <>
          {/* Today summary */}
          <div style={{
            display: "flex", gap: "10px", marginBottom: "16px"
          }}>
            {[
              { label: "Today's Revenue", val: rupee(total), color: "var(--green)" },
              { label: "Transactions", val: data.length, color: "var(--blue)" },
            ].map(x => (
              <div key={x.label} style={{
                flex: 1, padding: "12px 16px", borderRadius: "10px",
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)"
              }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "3px", textTransform: "uppercase", letterSpacing: "0.08em" }}>{x.label}</div>
                <div style={{ fontWeight: 700, color: x.color, fontSize: "20px" }}>{x.val}</div>
              </div>
            ))}
          </div>

          {/* Method breakdown */}
          {data.length > 0 && (() => {
            const byMethod = {};
            data.forEach(p => {
              const m = p.payment_method || "cash";
              if (!byMethod[m]) byMethod[m] = 0;
              byMethod[m] += Number(p.amount);
            });
            return (
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                {Object.entries(byMethod).map(([m, amt]) => (
                  <div key={m} style={{
                    padding: "6px 12px", borderRadius: "8px",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    display: "flex", gap: "6px", alignItems: "center"
                  }}>
                    <MethodBadge method={m} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{rupee(amt)}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {data.length === 0 ? <Empty msg="No payments received today" /> :
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.map(p => (
                <div key={p.id} className="drill-row" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 14px", borderRadius: "9px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                  transition: "all .15s"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "50%",
                      background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <FaUser style={{ fontSize: "12px", color: "var(--green)" }} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{p.full_name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.payment_for || "membership"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <MethodBadge method={p.payment_method} />
                    <span style={{ fontWeight: 700, color: "var(--green)", fontSize: "14px" }}>{rupee(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. THIS MONTH REVENUE POPUP
// ══════════════════════════════════════════════════════════════════════════════
function ThisMonthRevenue({ onClose }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    const now = new Date();
    api.get(`/payments?limit=9999&status=paid`).then(res => {
      const rows = (res.data.data || []).filter(p => {
        const d = new Date(p.payment_date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
      setData(rows); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = data.filter(p => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()));
  const total = filtered.reduce((s, p) => s + Number(p.amount), 0);
  const monthName = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <Modal title={`${monthName} — Payments`} onClose={onClose} width="620px">
      {loading ? <Spinner /> : (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            {[
              { label: "This Month Total", val: rupee(total), color: "var(--green)" },
              { label: "Members", val: new Set(data.map(p => p.member_id)).size, color: "var(--blue)" },
              { label: "Transactions", val: data.length, color: "var(--text-secondary)" },
            ].map(x => (
              <div key={x.label} style={{
                flex: 1, padding: "10px 14px", borderRadius: "10px",
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)"
              }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>{x.label}</div>
                <div style={{ fontWeight: 700, color: x.color, fontSize: "16px" }}>{x.val}</div>
              </div>
            ))}
          </div>

          <div style={{ position: "relative", marginBottom: "14px" }}>
            <FaSearch style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "var(--text-muted)" }} />
            <input
              placeholder="Search member..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px 9px 32px", borderRadius: "8px",
                border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
                color: "var(--text-primary)", fontSize: "13px", boxSizing: "border-box", outline: "none"
              }}
            />
          </div>

          {filtered.length === 0 ? <Empty msg="No payments found" /> :
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {filtered.map(p => (
                <div key={p.id} className="drill-row" style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "11px 14px", borderRadius: "9px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                  transition: "all .15s"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                    <div style={{
                      width: "32px", height: "32px", borderRadius: "50%",
                      background: "var(--blue-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <FaUser style={{ fontSize: "11px", color: "var(--blue)" }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.full_name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmt(p.payment_date)} · {p.payment_for || "membership"}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    <MethodBadge method={p.payment_method} />
                    <span style={{ fontWeight: 700, color: "var(--green)", fontSize: "14px" }}>{rupee(p.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          }
        </>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. PENDING PAYMENTS COUNT POPUP
// ══════════════════════════════════════════════════════════════════════════════
function PendingPaymentsCount({ onClose }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    api.get("/payments?limit=9999&status=pending").then(res => {
      setData(res.data.data || []); setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = data.filter(p => !search || p.full_name?.toLowerCase().includes(search.toLowerCase()));

  // Group by member
  const byMember = filtered.reduce((acc, p) => {
    const key = p.member_id;
    if (!acc[key]) acc[key] = { full_name: p.full_name, email: p.email, payments: [] };
    acc[key].payments.push(p);
    return acc;
  }, {});
  const memberList = Object.values(byMember);

  return (
    <Modal title="Pending Payments" onClose={onClose} width="620px">
      {loading ? <Spinner /> : (
        <>
          <div style={{ display: "flex", gap: "10px", marginBottom: "14px" }}>
            {[
              { label: "Pending Transactions", val: data.length, color: "var(--red)" },
              { label: "Members", val: memberList.length, color: "var(--orange, #f59e0b)" },
              { label: "Total Pending", val: rupee(data.reduce((s,p)=>s+Number(p.due_amount||p.amount),0)), color: "var(--text-secondary)" },
            ].map(x => (
              <div key={x.label} style={{
                flex: 1, padding: "10px 14px", borderRadius: "10px",
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)"
              }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>{x.label}</div>
                <div style={{ fontWeight: 700, color: x.color, fontSize: "16px" }}>{x.val}</div>
              </div>
            ))}
          </div>

          <div style={{ position: "relative", marginBottom: "14px" }}>
            <FaSearch style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "var(--text-muted)" }} />
            <input
              placeholder="Search member..." value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px 9px 32px", borderRadius: "8px",
                border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
                color: "var(--text-primary)", fontSize: "13px", boxSizing: "border-box", outline: "none"
              }}
            />
          </div>

          {memberList.length === 0 ? <Empty msg="No pending payments! 🎉" /> :
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {memberList.map(m => (
                <div key={m.full_name} style={{
                  borderRadius: "10px", background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)", overflow: "hidden"
                }}>
                  {/* Member header */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", borderBottom: "1px solid var(--border-subtle)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "30px", height: "30px", borderRadius: "50%",
                        background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <FaUser style={{ fontSize: "11px", color: "var(--red)" }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{m.full_name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.payments.length} pending</div>
                      </div>
                    </div>
                    <span style={{
                      fontWeight: 700, color: "var(--red)", fontSize: "14px"
                    }}>
                      {rupee(m.payments.reduce((s,p)=>s+Number(p.due_amount||p.amount),0))}
                    </span>
                  </div>

                  {/* Payments list */}
                  {m.payments.map(p => (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 14px 8px 52px", borderBottom: "1px solid var(--border-subtle)"
                    }}>
                      <div>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{p.payment_for || "membership"}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmt(p.payment_date)}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "line-through" }}>{rupee(p.amount)}</div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--red)" }}>Due: {rupee(p.due_amount || p.amount)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          }
        </>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. PENDING AMOUNT DETAIL POPUP
// ══════════════════════════════════════════════════════════════════════════════
function PendingAmountDetail({ onClose }) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [sort,    setSort]    = useState("desc"); // desc = highest first

  useEffect(() => {
    api.get("/payments/due/list").then(res => {
      setData(res.data.data || []); setLoading(false);
    }).catch(() => {
      // Fallback to pending filter
      api.get("/payments?limit=9999&status=pending").then(res => {
        setData(res.data.data || []); setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, []);

  // Aggregate by member
  const byMember = data.reduce((acc, p) => {
    const key = p.member_id;
    if (!acc[key]) acc[key] = { member_id: key, full_name: p.full_name, phone: p.phone, email: p.email, totalDue: 0, entries: [] };
    acc[key].totalDue += Number(p.due_amount || p.amount || 0);
    acc[key].entries.push(p);
    return acc;
  }, {});

  let memberList = Object.values(byMember)
    .filter(m => !search || m.full_name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === "desc" ? b.totalDue - a.totalDue : a.totalDue - b.totalDue);

  const grandTotal = memberList.reduce((s, m) => s + m.totalDue, 0);

  return (
    <Modal title="Pending Amount — Member Wise" onClose={onClose} width="640px">
      {loading ? <Spinner /> : (
        <>
          {/* Grand total banner */}
          <div style={{
            padding: "14px 18px", borderRadius: "10px", marginBottom: "14px",
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: "2px" }}>Total Pending Amount</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--red)" }}>{rupee(grandTotal)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Members</div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text-primary)" }}>{memberList.length}</div>
            </div>
          </div>

          {/* Search + Sort */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <div style={{ flex: 1, position: "relative" }}>
              <FaSearch style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", fontSize: "11px", color: "var(--text-muted)" }} />
              <input
                placeholder="Search member..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "9px 12px 9px 32px", borderRadius: "8px",
                  border: "1px solid var(--border-default)", background: "var(--bg-elevated)",
                  color: "var(--text-primary)", fontSize: "13px", boxSizing: "border-box", outline: "none"
                }}
              />
            </div>
            <button onClick={() => setSort(s => s === "desc" ? "asc" : "desc")} style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 14px", borderRadius: "8px",
              background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
              cursor: "pointer", color: "var(--text-secondary)", fontSize: "12px"
            }}>
              {sort === "desc" ? <FaArrowDown style={{ fontSize: "10px" }} /> : <FaArrowUp style={{ fontSize: "10px" }} />}
              {sort === "desc" ? "Highest First" : "Lowest First"}
            </button>
          </div>

          {memberList.length === 0 ? <Empty msg="No pending amount! 🎉" /> :
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {memberList.map((m, idx) => (
                <div key={m.member_id} style={{
                  borderRadius: "10px", background: "var(--bg-elevated)",
                  border: "1px solid var(--border-default)", overflow: "hidden"
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 14px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {/* Rank badge */}
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                        background: idx === 0 ? "rgba(239,68,68,0.15)" : "var(--bg-elevated2, var(--bg-surface))",
                        border: `1px solid ${idx === 0 ? "rgba(239,68,68,0.4)" : "var(--border-subtle)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: 700,
                        color: idx === 0 ? "var(--red)" : "var(--text-muted)"
                      }}>
                        {idx + 1}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{m.full_name}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.phone || m.email || "—"}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: "16px", color: "var(--red)" }}>{rupee(m.totalDue)}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.entries.length} entry</div>
                    </div>
                  </div>

                  {/* Due entries */}
                  {m.entries.map(p => (
                    <div key={p.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "7px 14px 7px 52px",
                      borderTop: "1px solid var(--border-subtle)",
                      background: "rgba(0,0,0,0.04)"
                    }}>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                        {p.payment_for || "membership"} · {fmt(p.payment_date)}
                      </div>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "line-through" }}>{rupee(p.amount)}</span>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--red)" }}>Due: {rupee(p.due_amount || p.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          }
        </>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — Revenue Stats Cards (Drop-in replacement)
// ══════════════════════════════════════════════════════════════════════════════
const MASK = "••••••";
const MASKED_KEYS = new Set(["total", "today", "month"]);

export default function RevenueDrillDown({ stats = {} }) {
  const [modal, setModal] = useState(null);
  const [revealed, setRevealed] = useState({});
  // modal: null | "total" | "today" | "month" | "pendingCount" | "pendingAmt"

  const toggleReveal = (e, key) => {
    e.stopPropagation();
    setRevealed(r => ({ ...r, [key]: !r[key] }));
  };

  const cards = [
    {
      key:     "total",
      label:   "Total Revenue",
      value:   rupee(stats.totalRevenue || 0),
      sub:     `${stats.totalCount || "—"} payments`,
      color:   "var(--green)",
      bg:      "var(--green-bg)",
      icon:    FaRupeeSign,
      modal:   "total",
      tip:     "Drill by Year / Month"
    },
    {
      key:     "today",
      label:   "Today's Revenue",
      value:   rupee(stats.todayRevenue || 0),
      sub:     new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short"}),
      color:   "var(--blue)",
      bg:      "var(--blue-bg)",
      icon:    FaCalendarAlt,
      modal:   "today",
      tip:     "View today's payments"
    },
    {
      key:     "month",
      label:   "This Month",
      value:   rupee(stats.thisMonthRev || 0),
      sub:     new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"}),
      color:   "var(--purple, #a855f7)",
      bg:      "rgba(168,85,247,0.1)",
      icon:    FaCalendarAlt,
      modal:   "month",
      tip:     "All payments this month"
    },
    {
      key:     "pendingCount",
      label:   "Pending Payments",
      value:   stats.pendingPayments || 0,
      sub:     "transactions",
      color:   "var(--red)",
      bg:      "rgba(239,68,68,0.1)",
      icon:    FaExclamationCircle,
      modal:   "pendingCount",
      tip:     "View pending list"
    },
    {
      key:     "pendingAmt",
      label:   "Pending Amount",
      value:   rupee(stats.pendingAmount || 0),
      sub:     "due amount",
      color:   "#f59e0b",
      bg:      "rgba(245,158,11,0.1)",
      icon:    FaClock,
      modal:   "pendingAmt",
      tip:     "View member-wise dues"
    },
  ];

  return (
    <>
      <style>{`
        .rev-card { transition: transform .15s, box-shadow .15s, border-color .15s !important; }
        .rev-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.25) !important; }
      `}</style>

      {/* Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        {cards.map(c => {
          const Icon = c.icon;
          const isMaskable = MASKED_KEYS.has(c.key);
          const isHidden = isMaskable && !revealed[c.key];
          return (
            <div key={c.key} className="rev-card" onClick={() => setModal(c.modal)}
              style={{
                padding: "16px 18px", borderRadius: "12px", cursor: "pointer",
                background: "var(--bg-surface)", border: "1px solid var(--border-default)",
                position: "relative", overflow: "hidden"
              }}>
              {/* Accent icon top right */}
              <div style={{
                position: "absolute", top: "12px", right: "12px",
                width: "32px", height: "32px", borderRadius: "8px",
                background: c.bg, display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Icon style={{ fontSize: "13px", color: c.color }} />
              </div>

              <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                {c.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ fontSize: isHidden ? "18px" : "22px", fontWeight: 800, color: isHidden ? "var(--text-muted)" : c.color, lineHeight: 1, letterSpacing: isHidden ? "0.12em" : "normal", userSelect: isHidden ? "none" : "auto" }}>
                  {isHidden ? MASK : c.value}
                </div>
                {isMaskable && (
                  <button
                    onClick={(e) => toggleReveal(e, c.key)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "12px", padding: "2px", opacity: 0.6, display: "flex", alignItems: "center", flexShrink: 0 }}
                    title={isHidden ? "Show value" : "Hide value"}
                  >
                    {isHidden
                      ? <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/></svg>
                      : <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="currentColor" viewBox="0 0 16 16"><path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/><path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/><path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/></svg>
                    }
                  </button>
                )}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                {c.sub}
              </div>
              <div style={{ fontSize: "10px", color: c.color, marginTop: "8px", opacity: 0.7, display: "flex", alignItems: "center", gap: "3px" }}>
                🔍 {c.tip}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {modal === "total"        && <TotalRevenueDrill   onClose={() => setModal(null)} />}
      {modal === "today"        && <TodayRevenue         onClose={() => setModal(null)} />}
      {modal === "month"        && <ThisMonthRevenue     onClose={() => setModal(null)} />}
      {modal === "pendingCount" && <PendingPaymentsCount onClose={() => setModal(null)} />}
      {modal === "pendingAmt"   && <PendingAmountDetail  onClose={() => setModal(null)} />}
    </>
  );
}