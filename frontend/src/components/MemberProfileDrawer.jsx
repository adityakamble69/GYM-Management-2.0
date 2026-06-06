// components/MemberProfileDrawer.jsx
import { useEffect, useState, useCallback } from "react";
import {
  FaTimes, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt,
  FaBirthdayCake, FaVenusMars, FaCalendarAlt, FaHistory,
  FaEdit, FaMoneyBill, FaClipboardCheck, FaChevronDown,
  FaChevronUp, FaCrown, FaRupeeSign, FaIdCard, FaLayerGroup,
  FaWallet, FaRunning, FaCheck, FaExclamationTriangle
} from "react-icons/fa";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";
import api from "../services/api";

const fmt      = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtLong  = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long",  year: "numeric" }) : "—";
const fmtMon   = (d) => d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—";
const rupee    = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const daysLeft = (end) => end ? Math.ceil((new Date(end) - new Date()) / 86400000) : null;

const VALID_FOR = ["monthly", "quarterly", "half_yearly", "yearly", "registration", "other"];

// ── Info Row ──────────────────────────────────────────────────────────────────
const InfoRow = ({ icon: Icon, label, value, color }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid var(--border-subtle)" }}>
    <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon style={{ fontSize: "12px", color: color || "var(--text-muted)" }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value || "—"}</div>
    </div>
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color }) => (
  <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", padding: "10px 12px", border: "1px solid var(--border-subtle)" }}>
    <div style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 800, color }}>{value}</div>
    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{label}</div>
  </div>
);

// ── Tab Button ────────────────────────────────────────────────────────────────
const TabBtn = ({ icon: Icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
      padding: "8px 4px", border: "none", cursor: "pointer",
      background: "transparent",
      borderBottom: active ? "2px solid var(--text-primary)" : "2px solid transparent",
      transition: "all 0.15s",
    }}
  >
    <div style={{ position: "relative" }}>
      <Icon style={{ fontSize: "13px", color: active ? "var(--text-primary)" : "var(--text-muted)" }} />
      {badge > 0 && (
        <span style={{
          position: "absolute", top: "-5px", right: "-7px",
          background: "var(--red)", color: "#fff",
          fontSize: "8px", fontWeight: 700, borderRadius: "99px",
          padding: "1px 4px", lineHeight: 1.2
        }}>{badge}</span>
      )}
    </div>
    <span style={{ fontSize: "9px", fontWeight: active ? 700 : 500, color: active ? "var(--text-primary)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      {label}
    </span>
  </button>
);

const Skeleton   = ({ h = 44, mb = 6 }) => (
  <div style={{ height: `${h}px`, borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", marginBottom: `${mb}px`, animation: "pulse 1.4s ease-in-out infinite" }} />
);
const EmptyState = ({ text }) => (
  <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px", background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}>{text}</div>
);
const SectionLabel = ({ children }) => (
  <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "10px" }}>{children}</div>
);

// ── Tab: Profile ──────────────────────────────────────────────────────────────
function TabProfile({ member, days, progressPct }) {
  const statusColor = member.status === "active" ? "var(--green)"    : member.status === "expired" ? "var(--red)"    : "var(--text-muted)";
  const statusBg    = member.status === "active" ? "var(--green-bg)" : member.status === "expired" ? "var(--red-bg)" : "rgba(80,80,80,0.12)";

  return (
    <div style={{ padding: "20px 22px 24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <SectionLabel>Personal Info</SectionLabel>
        <InfoRow icon={FaEnvelope}     label="Email"         value={member.email} />
        <InfoRow icon={FaPhone}        label="Phone"         value={member.phone} />
        <InfoRow icon={FaVenusMars}    label="Gender"        value={member.gender} />
        <InfoRow icon={FaBirthdayCake} label="Date of Birth" value={fmtLong(member.date_of_birth)} />
        <InfoRow icon={FaMapMarkerAlt} label="Address"       value={member.address} />
        <InfoRow icon={FaCalendarAlt}  label="Joined On"     value={fmt(member.created_at)} />
      </div>

      <div>
        <SectionLabel>Membership</SectionLabel>
        <div style={{ padding: "16px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                {member.plan_name || member.membership_type || "No Active Plan"}
              </div>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                <span style={{ padding: "2px 9px", borderRadius: "99px", fontSize: "10px", fontWeight: 600, background: statusBg, color: statusColor, textTransform: "capitalize" }}>
                  {member.status}
                </span>
                {member.membership_type && (
                  <span style={{ padding: "2px 9px", borderRadius: "99px", fontSize: "10px", fontWeight: 600, background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-muted)", textTransform: "capitalize" }}>
                    {member.membership_type}
                  </span>
                )}
              </div>
            </div>
            {days !== null && (
              <span style={{
                fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "99px",
                background: days <= 0 ? "var(--red-bg)" : days <= 7 ? "var(--red-bg)" : days <= 15 ? "var(--yellow-bg)" : "var(--green-bg)",
                color:      days <= 0 ? "var(--red)"    : days <= 7 ? "var(--red)"    : days <= 15 ? "var(--yellow)"    : "var(--green)"
              }}>
                {days <= 0 ? "Expired" : `${days}d left`}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "24px", marginBottom: "12px" }}>
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>Start</div>
              <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{fmt(member.membership_start)}</div>
            </div>
            <div style={{ borderLeft: "1px dashed var(--border-default)" }} />
            <div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginBottom: "2px" }}>End</div>
              <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>{fmt(member.membership_end)}</div>
            </div>
          </div>

          {member.membership_start && member.membership_end && (
            <div>
              <div style={{ height: "6px", background: "var(--bg-surface)", borderRadius: "99px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: "99px", transition: "width 0.6s ease",
                  width: `${progressPct}%`,
                  background: progressPct >= 90 ? "var(--red)" : progressPct >= 70 ? "var(--yellow)" : "var(--green)"
                }} />
              </div>
              <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px" }}>{progressPct}% duration used</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Plan History ─────────────────────────────────────────────────────────
function TabPlanHistory({ planHistory, loading }) {
  const byMonth = planHistory.reduce((acc, ph) => {
    const key = fmtMon(ph.plan_start);
    if (!acc[key]) acc[key] = [];
    acc[key].push(ph);
    return acc;
  }, {});

  return (
    <div style={{ padding: "20px 22px 24px" }}>
      <SectionLabel>Plan Records ({planHistory.length})</SectionLabel>
      {loading ? (
        [...Array(3)].map((_, i) => <Skeleton key={i} h={70} />)
      ) : planHistory.length === 0 ? (
        <EmptyState text="No plan history found" />
      ) : (
        Object.entries(byMonth).map(([month, list]) => (
          <div key={month} style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "4px 0 8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "8px" }}>
              {month}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {list.map((ph) => {
                const isCurrentPlan = planHistory.indexOf(ph) === 0;
                return (
                  <div key={ph.id} style={{
                    padding: "13px 16px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-elevated)",
                    border: isCurrentPlan ? "1px solid rgba(74,222,128,0.3)" : "1px solid var(--border-subtle)",
                    borderLeft: `3px solid ${isCurrentPlan ? "var(--green)" : "var(--border-strong)"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {isCurrentPlan && <FaCrown style={{ fontSize: "11px", color: "var(--yellow)" }} />}
                          {ph.plan_name}
                          {isCurrentPlan && (
                            <span style={{ fontSize: "9px", fontWeight: 600, padding: "2px 7px", borderRadius: "99px", background: "var(--green-bg)", color: "var(--green)", border: "1px solid rgba(74,222,128,0.3)" }}>
                              CURRENT
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "5px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                          <span>Start: <strong style={{ color: "var(--text-secondary)" }}>{fmt(ph.plan_start)}</strong></span>
                          <span>End: <strong style={{ color: "var(--text-secondary)" }}>{ph.plan_end ? fmt(ph.plan_end) : "Ongoing"}</strong></span>
                        </div>
                        {ph.plan_start && ph.plan_end && (
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "3px" }}>
                            {Math.ceil((new Date(ph.plan_end) - new Date(ph.plan_start)) / 86400000)} days
                          </div>
                        )}
                        {ph.notes && <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", marginTop: "4px" }}>"{ph.notes}"</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 800, color: ph.amount_paid > 0 ? "var(--green)" : "var(--text-muted)" }}>
                          {ph.amount_paid > 0 ? rupee(ph.amount_paid) : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Tab: Payments ─────────────────────────────────────────────────────────────
// ── FIX: refreshFn prop se aata hai, fetchPayments nahi hai ──────────────────
function TabPayments({ payments, loading, refreshFn }) {
  const [filter,    setFilter]    = useState("all");
  const [markingId, setMarkingId] = useState(null);
  const [msg,       setMsg]       = useState("");

  const totalPaid    = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const pendingAmt   = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.due_amount || p.amount), 0);
  const pendingCount = payments.filter(p => p.status === "pending").length;
  const filtered     = filter === "all" ? payments : payments.filter(p => p.status === filter);

  const payByMonth = filtered.reduce((acc, p) => {
    const key = fmtMon(p.payment_date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  // ── Mark Complete — fixed ─────────────────────────────────────────────────
  const handleMarkComplete = async (payment) => {
    if (!window.confirm(`Mark ₹${Number(payment.due_amount || 0).toLocaleString("en-IN")} due as paid?`)) return;
    setMarkingId(payment.id);
    try {
      const paymentFor = VALID_FOR.includes(payment.payment_for) ? payment.payment_for : "other";

      await api.put(`/payments/${payment.id}`, {
        member_id:      payment.member_id,
        amount:         payment.amount,
        paid_amount:    payment.amount,
        due_amount:     0,
        payment_date:   payment.payment_date?.split("T")[0] || new Date().toISOString().split("T")[0],
        payment_method: payment.payment_method || "cash",
        payment_for:    paymentFor,
        status:         "paid",
        months_covered: payment.months_covered || 1,
        notes:          payment.notes          || null,
        plan_name:      payment.plan_name      || null,
        plan_start:     payment.plan_start ? payment.plan_start.split("T")[0] : null,
        plan_end:       payment.plan_end   ? payment.plan_end.split("T")[0]   : null,
      });

      setMsg("✅ Payment marked as complete!");
      if (refreshFn) await refreshFn();           // ← correct call
    } catch (e) {
      setMsg("❌ Failed: " + (e.response?.data?.message || e.message));
    } finally {
      setMarkingId(null);
      setTimeout(() => setMsg(""), 4000);
    }
  };

  return (
    <div style={{ padding: "20px 22px 24px" }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", background: "var(--green-bg)", border: "1px solid rgba(74,222,128,0.2)" }}>
          <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--green)" }}>{rupee(totalPaid)}</div>
          <div style={{ fontSize: "10px", color: "var(--green)", marginTop: "2px", opacity: 0.8 }}>Total Paid</div>
        </div>
        <div style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", background: pendingAmt > 0 ? "var(--red-bg)" : "var(--bg-elevated)", border: `1px solid ${pendingAmt > 0 ? "rgba(248,113,113,0.2)" : "var(--border-subtle)"}` }}>
          <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-display)", color: pendingAmt > 0 ? "var(--red)" : "var(--text-muted)" }}>{rupee(pendingAmt)}</div>
          <div style={{ fontSize: "10px", color: pendingAmt > 0 ? "var(--red)" : "var(--text-muted)", marginTop: "2px", opacity: 0.8 }}>
            Pending Due {pendingCount > 0 && `(${pendingCount} records)`}
          </div>
        </div>
      </div>

      {msg && (
        <div style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", background: msg.startsWith("✅") ? "var(--green-bg)" : "var(--red-bg)", color: msg.startsWith("✅") ? "var(--green)" : "var(--red)", fontSize: "12px", marginBottom: "12px" }}>
          {msg}
        </div>
      )}

      {/* Filter Pills */}
      <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
        {["all", "paid", "pending"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "4px 14px", borderRadius: "99px", fontSize: "10px", fontWeight: 600,
            cursor: "pointer", textTransform: "capitalize", transition: "all 0.15s",
            background: filter === f ? "var(--text-primary)" : "var(--bg-elevated)",
            color:      filter === f ? "#0a0a0a"             : "var(--text-muted)",
            border:     filter === f ? "none"                : "1px solid var(--border-default)"
          }}>
            {f} {f !== "all" && `(${payments.filter(p => p.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Month-wise List */}
      {loading ? (
        [...Array(4)].map((_, i) => <Skeleton key={i} mb={6} />)
      ) : filtered.length === 0 ? (
        <EmptyState text={`No ${filter === "all" ? "" : filter} payments found`} />
      ) : (
        Object.entries(payByMonth).map(([month, pList]) => {
          const monthPaid    = pList.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
          const monthPending = pList.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.due_amount || p.amount), 0);

          return (
            <div key={month} style={{ marginBottom: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0 8px", borderBottom: "1px solid var(--border-subtle)", marginBottom: "8px" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{month}</div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {monthPaid    > 0 && <span style={{ fontSize: "10px", color: "var(--green)", fontWeight: 600 }}>✓ {rupee(monthPaid)}</span>}
                  {monthPending > 0 && <span style={{ fontSize: "10px", color: "var(--red)",   fontWeight: 600 }}>⚠ Due {rupee(monthPending)}</span>}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {pList.map(p => {
                  const isPending = p.status === "pending";
                  const hasDue    = Number(p.due_amount) > 0;
                  const sc = isPending
                    ? { c: "var(--yellow)", bg: "var(--yellow-bg)" }
                    : p.status === "paid"
                    ? { c: "var(--green)",  bg: "var(--green-bg)"  }
                    : { c: "var(--red)",    bg: "var(--red-bg)"    };

                  return (
                    <div key={p.id} style={{
                      padding: "10px 14px", borderRadius: "var(--radius-sm)",
                      background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)",
                      borderLeft: `3px solid ${sc.c}`
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", textTransform: "capitalize" }}>
                            {p.plan_name || p.payment_for?.replace("_", " ") || "Payment"}
                          </div>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
                            {fmt(p.payment_date)} · {p.payment_method}
                          </div>
                          {hasDue && (
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px" }}>
                              <FaExclamationTriangle style={{ fontSize: "9px", color: "var(--yellow)" }} />
                              <span style={{ fontSize: "10px", color: "var(--yellow)", fontWeight: 600 }}>
                                Paid: {rupee(p.paid_amount)} · Due: {rupee(p.due_amount)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 800, color: "var(--text-primary)" }}>
                            {rupee(p.amount)}
                          </div>
                          <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 7px", borderRadius: "99px", background: sc.bg, color: sc.c, marginTop: "3px", display: "inline-block", textTransform: "capitalize" }}>
                            {p.status}
                          </span>
                          {isPending && (
                            <div style={{ marginTop: "6px" }}>
                              <button
                                onClick={() => handleMarkComplete(p)}
                                disabled={markingId === p.id}
                                style={{
                                  padding: "4px 10px", borderRadius: "99px", fontSize: "10px",
                                  fontWeight: 700, cursor: markingId === p.id ? "not-allowed" : "pointer",
                                  background: "var(--green-bg)", border: "1px solid rgba(74,222,128,0.4)",
                                  color: "var(--green)", display: "flex", alignItems: "center", gap: "4px",
                                  transition: "all 0.15s", whiteSpace: "nowrap"
                                }}
                                onMouseEnter={e => { if (markingId !== p.id) e.currentTarget.style.background = "rgba(74,222,128,0.2)"; }}
                                onMouseLeave={e => e.currentTarget.style.background = "var(--green-bg)"}
                              >
                                <FaCheck style={{ fontSize: "8px" }} />
                                {markingId === p.id ? "Updating..." : "Mark Complete"}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Tab: Attendance ───────────────────────────────────────────────────────────
function TabAttendance({ attendance, loading, attChartData, thisMonthAtt }) {
  return (
    <div style={{ padding: "20px 22px 24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "18px" }}>
        <StatCard label="Total Visits" value={attendance.length}                                        color="var(--text-primary)" />
        <StatCard label="This Month"   value={thisMonthAtt}                                             color="var(--blue)" />
        <StatCard label="Last Visit"   value={attendance.length > 0 ? fmt(attendance[0]?.date) : "—"} color="var(--text-muted)" />
      </div>

      {!loading && attendance.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <SectionLabel>Last 6 Months</SectionLabel>
          <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)", padding: "14px 10px 6px", border: "1px solid var(--border-subtle)" }}>
            <ResponsiveContainer width="100%" height={110}>
              <BarChart data={attChartData} margin={{ top: 0, right: 0, bottom: 0, left: -28 }}>
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "6px", fontSize: "11px" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {attChartData.map((_, i) => (
                    <Cell key={i} fill={i === attChartData.length - 1 ? "var(--text-primary)" : "var(--bg-active)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <SectionLabel>Records</SectionLabel>
      {loading ? (
        [...Array(5)].map((_, i) => <Skeleton key={i} h={40} mb={5} />)
      ) : attendance.length === 0 ? (
        <EmptyState text="No attendance records" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {attendance.slice(0, 20).map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "12px", color: "var(--text-primary)", fontWeight: 500 }}>{fmt(a.date)}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {a.check_in ? new Date(a.check_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                {a.check_out ? ` → ${new Date(a.check_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
              </div>
              <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px", background: "var(--green-bg)", color: "var(--green)" }}>✓ Present</span>
            </div>
          ))}
          {attendance.length > 20 && (
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", padding: "8px" }}>
              +{attendance.length - 20} more records
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function MemberProfileDrawer({ member, onClose, onEdit, onRecordPayment, onMarkAttendance }) {
  const [payments,    setPayments]    = useState([]);
  const [attendance,  setAttendance]  = useState([]);
  const [planHistory, setPlanHistory] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState("profile");

  useEffect(() => {
    if (member) { setLoading(true); setActiveTab("profile"); fetchAll(); }
  }, [member?.id]);

  const fetchAll = async () => {
    try {
      const [payRes, attendRes, planRes] = await Promise.all([
        api.get(`/payments/member/${member.id}`),
        api.get(`/attendance/member/${member.id}`),
        api.get(`/members/${member.id}/plan-history`).catch(() => ({ data: { data: [] } }))
      ]);
      setPayments(payRes.data.data     || []);
      setAttendance(attendRes.data.data || []);
      setPlanHistory(planRes.data.data  || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── refreshFn — sirf payments reload karta hai ────────────────────────────
  const refreshPayments = useCallback(async () => {
    try {
      const r = await api.get(`/payments/member/${member.id}`);
      setPayments(r.data.data || []);
    } catch (e) { console.error(e); }
  }, [member?.id]);

  if (!member) return null;

  const days         = daysLeft(member.membership_end);
  const initials     = member.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  const totalPaid    = payments.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const pendingAmt   = payments.filter(p => p.status === "pending").reduce((s, p) => s + Number(p.due_amount || p.amount), 0);
  const thisMonthAtt = attendance.filter(a => {
    const d = new Date(a.date), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  const statusColor = member.status === "active" ? "var(--green)"    : member.status === "expired" ? "var(--red)"    : "var(--text-muted)";
  const statusBg    = member.status === "active" ? "var(--green-bg)" : member.status === "expired" ? "var(--red-bg)" : "rgba(80,80,80,0.12)";

  const progressPct = (() => {
    if (!member.membership_start || !member.membership_end) return 0;
    const total   = new Date(member.membership_end) - new Date(member.membership_start);
    const elapsed = new Date() - new Date(member.membership_start);
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  })();

  const attChartData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mo = d.getMonth(), yr = d.getFullYear();
      const count = attendance.filter(a => {
        const ad = new Date(a.date);
        return ad.getMonth() === mo && ad.getFullYear() === yr;
      }).length;
      months.push({ label: d.toLocaleDateString("en-IN", { month: "short" }), count });
    }
    return months;
  })();

  const pendingPayCount = payments.filter(p => p.status === "pending").length;

  const TABS = [
    { key: "profile",  label: "Profile",  icon: FaIdCard,    badge: 0 },
    { key: "plans",    label: "Plans",    icon: FaLayerGroup, badge: 0 },
    { key: "payments", label: "Payments", icon: FaWallet,     badge: pendingPayCount },
    { key: "attend",   label: "Attend",   icon: FaRunning,    badge: 0 },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1300, backdropFilter: "blur(5px)" }} />

      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(720px, 96vw)", maxHeight: "90vh",
        background: "var(--bg-surface)", border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)", zIndex: 1301,
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 96px rgba(0,0,0,0.7)",
        animation: "modalPop 0.22s ease", overflow: "hidden"
      }}>

        {/* ── Header ── */}
        <div style={{ padding: "20px 24px 0", background: "var(--bg-elevated)", flexShrink: 0, borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "50%",
                background: "var(--bg-active)", border: "2px solid var(--border-strong)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800,
                color: "var(--text-primary)", flexShrink: 0
              }}>{initials}</div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "17px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "5px" }}>
                  {member.full_name}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <span style={{ padding: "2px 10px", borderRadius: "99px", fontSize: "10px", fontWeight: 600, background: statusBg, color: statusColor, textTransform: "capitalize" }}>
                    {member.status}
                  </span>
                  {member.membership_type && (
                    <span style={{ padding: "2px 10px", borderRadius: "99px", fontSize: "10px", fontWeight: 600, background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-muted)", textTransform: "capitalize" }}>
                      {member.membership_type}
                    </span>
                  )}
                  {days !== null && days <= 7 && days >= 0 && (
                    <span style={{ padding: "2px 10px", borderRadius: "99px", fontSize: "10px", fontWeight: 600, background: "var(--red-bg)", color: "var(--red)" }}>
                      Expiring soon!
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <FaTimes style={{ fontSize: "12px" }} />
            </button>
          </div>

          {/* Quick Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
            <StatCard label="Total Paid"  value={rupee(totalPaid)}         color="var(--green)" />
            <StatCard label="This Month"  value={`${thisMonthAtt} visits`} color="var(--blue)" />
            <StatCard label="Pending Due" value={rupee(pendingAmt)}         color={pendingAmt > 0 ? "var(--red)" : "var(--text-muted)"} />
          </div>

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button onClick={() => onEdit && onEdit(member)} style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", background: "var(--text-primary)", color: "#0a0a0a", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", fontFamily: "var(--font-display)" }}>
              <FaEdit style={{ fontSize: "10px" }} /> Edit Member
            </button>
            {onRecordPayment && (
              <button onClick={() => onRecordPayment(member)} style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", background: "var(--green-bg)", border: "1px solid rgba(74,222,128,0.3)", color: "var(--green)", cursor: "pointer", fontWeight: 600, fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                <FaRupeeSign style={{ fontSize: "10px" }} /> Record Payment
              </button>
            )}
            {onMarkAttendance && (
              <button onClick={() => onMarkAttendance(member)} style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", background: "var(--blue-bg)", border: "1px solid rgba(96,165,250,0.3)", color: "var(--blue)", cursor: "pointer", fontWeight: 600, fontSize: "11px", display: "flex", alignItems: "center", justifyContent: "center", gap: "5px" }}>
                <FaClipboardCheck style={{ fontSize: "10px" }} /> Mark Attendance
              </button>
            )}
          </div>

          {/* Tab Bar */}
          <div style={{ display: "flex", borderTop: "1px solid var(--border-subtle)" }}>
            {TABS.map(t => (
              <TabBtn key={t.key} icon={t.icon} label={t.label} active={activeTab === t.key} badge={t.badge} onClick={() => setActiveTab(t.key)} />
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeTab === "profile"  && <TabProfile      member={member} days={days} progressPct={progressPct} />}
          {activeTab === "plans"    && <TabPlanHistory   planHistory={planHistory} loading={loading} />}
          {activeTab === "payments" && <TabPayments      payments={payments} loading={loading} refreshFn={refreshPayments} />}
          {activeTab === "attend"   && <TabAttendance    attendance={attendance} loading={loading} attChartData={attChartData} thisMonthAtt={thisMonthAtt} />}
        </div>
      </div>

      <style>{`
        @keyframes modalPop {
          from { transform: translate(-50%, -48%); opacity: 0; scale: 0.97; }
          to   { transform: translate(-50%, -50%); opacity: 1; scale: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </>
  );
}