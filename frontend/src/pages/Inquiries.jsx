import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  FaSearch, FaTimes, FaTrash, FaChevronLeft, FaChevronRight,
  FaEnvelope, FaPhone, FaClock, FaCheckCircle,
  FaTimesCircle, FaExternalLinkAlt, FaSync,
  FaUserPlus, FaCheck, FaRupeeSign, FaIdCard
} from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtLong = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"long", year:"numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true }) : "";
const fmtMoney = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

const STATUS_MAP = {
  new:       { label: "New",       color: "var(--blue)",   bg: "var(--blue-bg)"   },
  contacted: { label: "Contacted", color: "var(--yellow)", bg: "var(--yellow-bg)" },
  converted: { label: "Converted", color: "var(--green)",  bg: "var(--green-bg)"  },
  rejected:  { label: "Rejected",  color: "var(--red)",    bg: "var(--red-bg)"    },
};

const INTEREST_MAP = {
  basic:    { label: "Basic",    color: "var(--text-muted)", bg: "rgba(80,80,80,0.12)" },
  standard: { label: "Standard", color: "var(--blue)",       bg: "var(--blue-bg)"      },
  premium:  { label: "Premium",  color: "var(--yellow)",     bg: "var(--yellow-bg)"    },
  not_sure: { label: "Not Sure", color: "var(--text-muted)", bg: "rgba(80,80,80,0.12)" },
};

const TIME_MAP = {
  morning:   "🌅 Morning",
  afternoon: "☀️ Afternoon",
  evening:   "🌆 Evening",
  anytime:   "Anytime",
};

const Badge = ({ label, color, bg }) => (
  <span style={{ fontSize:"11px", fontWeight:600, padding:"2px 10px", borderRadius:"99px", background:bg, color, whiteSpace:"nowrap" }}>{label}</span>
);

const inp = {
  padding:"9px 12px", borderRadius:"var(--radius-sm)",
  background:"var(--bg-elevated)", border:"1px solid var(--border-default)",
  color:"var(--text-primary)", fontSize:"13.5px", outline:"none",
  width:"100%", fontFamily:"var(--font-body)", transition:"border-color 0.15s",
  boxSizing: "border-box"
};

const Field = ({ label, children }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
    <label style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</label>
    {children}
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// Convert to Member Modal
// ═════════════════════════════════════════════════════════════════════════════
function ConvertToMemberModal({ inquiry, onClose, onConverted }) {
  const today = new Date().toISOString().split("T")[0];

  // Step: "plan" | "payment" | "done"
  const [step,       setStep]       = useState("plan");
  const [plans,      setPlans]      = useState([]);
  const [selPlan,    setSelPlan]    = useState(null);
  const [startFrom,  setStartFrom]  = useState("today");  // "today" | "custom"
  const [customDate, setCustomDate] = useState(today);
  const [paidAmt,    setPaidAmt]    = useState("");
  const [payMethod,  setPayMethod]  = useState("cash");
  const [notes,      setNotes]      = useState("");
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [result,     setResult]     = useState(null); // { member_id, member_name }
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    api.get("/membership-plans?status=active")
      .then(r => {
        const list = r.data.data || [];
        setPlans(list);
        // Auto-select first plan matching inquiry interest
        const match = list.find(p =>
          inquiry.membership_interest && p.duration_type === inquiry.membership_interest
        );
        if (match) setSelPlan(match);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Auto-fill paid amount when plan selected
  useEffect(() => {
    if (selPlan) setPaidAmt(String(selPlan.price));
  }, [selPlan?.id]);

  // Compute membership dates
  const startDate = startFrom === "today" ? today : customDate;
  const endDate   = selPlan && startDate
    ? (() => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + selPlan.duration_days);
        return d.toISOString().split("T")[0];
      })()
    : null;

  const totalAmt  = selPlan ? Number(selPlan.price) : 0;
  const paid      = Number(paidAmt) || 0;
  const dueAmt    = Math.max(0, totalAmt - paid);
  const isPartial = dueAmt > 0 && paid > 0;
  const isUnpaid  = paid === 0;

  const plansByType = plans.reduce((acc, p) => {
    if (!acc[p.duration_type]) acc[p.duration_type] = [];
    acc[p.duration_type].push(p);
    return acc;
  }, {});
  const TYPE_LABEL = { monthly:"Monthly", quarterly:"Quarterly", yearly:"Yearly" };

  const handleConvert = async () => {
    if (!selPlan)       { setError("Please select a membership plan."); return; }
    if (!startDate)     { setError("Please set a start date."); return; }
    setSaving(true); setError("");
    try {
      // 1. Add member
      const mRes = await api.post("/members", {
        full_name:        inquiry.full_name,
        email:            inquiry.email,
        phone:            inquiry.phone,
        membership_type:  selPlan.name,
        membership_start: startDate,
        membership_end:   endDate,
        status:           "active",
        address:          inquiry.address   || "",
        gender:           inquiry.gender    || "",
        date_of_birth:    inquiry.date_of_birth || "",
        photo:            inquiry.photo     || null,
      });
      const memberId = mRes.data.id;

      // 2. Record payment (if amount entered)
      if (paid > 0) {
        await api.post("/payments", {
          member_id:      memberId,
          amount:         totalAmt,
          paid_amount:    paid,
          due_amount:     dueAmt,
          payment_date:   today,
          payment_method: payMethod,
          payment_for:    selPlan.duration_type,
          plan_name:      selPlan.name,
          plan_start:     startDate,
          plan_end:       endDate,
          status:         dueAmt > 0 ? "pending" : "paid",
          months_covered: Math.round(selPlan.duration_days / 30),
          notes:          notes || `Joined via inquiry — ${selPlan.name}`,
        });
      }

      // 3. Mark inquiry as converted
      await api.put(`/inquiries/${inquiry.id}`, {
        status: "converted",
        notes:  `Converted to member on ${fmt(today)}. Plan: ${selPlan.name}. Member ID: ${memberId}.`,
      });

      setResult({ member_id: memberId, member_name: inquiry.full_name });
      setStep("done");
      onConverted && onConverted();
    } catch (e) {
      setError(e.response?.data?.message || "Conversion failed. Please try again.");
    } finally { setSaving(false); }
  };

  if (!inquiry) return null;

  return (
    <div
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1100, padding:"20px", backdropFilter:"blur(6px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background:"var(--bg-surface)", border:"1px solid var(--border-default)", borderRadius:"var(--radius-xl)", width:"100%", maxWidth:"560px", maxHeight:"92vh", overflowY:"auto", boxShadow:"0 32px 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ padding:"22px 24px 18px", borderBottom:"1px solid var(--border-subtle)", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:"18px", fontWeight:800, color:"var(--text-primary)", margin:0, display:"flex", alignItems:"center", gap:"8px" }}>
              <FaUserPlus style={{ fontSize:"15px", color:"var(--green)" }} />
              Convert to Member
            </h2>
            <p style={{ color:"var(--text-muted)", fontSize:"12px", marginTop:"4px" }}>
              {inquiry.full_name} · {inquiry.phone}
            </p>
          </div>
          <button onClick={onClose} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-muted)", cursor:"pointer", borderRadius:"var(--radius-sm)", width:"30px", height:"30px", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <FaTimes style={{ fontSize:"12px" }} />
          </button>
        </div>

        {/* Step indicator */}
        {step !== "done" && (
          <div style={{ padding:"14px 24px 0", display:"flex", gap:"8px", alignItems:"center" }}>
            {[
              { key:"plan",    label:"1. Choose Plan" },
              { key:"payment", label:"2. Payment"     },
            ].map((s, i) => {
              const active  = step === s.key;
              const done    = (s.key === "plan" && step === "payment");
              return (
                <div key={s.key} style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  {i > 0 && <div style={{ width:"24px", height:"1px", background:"var(--border-default)" }} />}
                  <div style={{ display:"flex", alignItems:"center", gap:"6px", padding:"4px 12px", borderRadius:"99px", background: active ? "var(--bg-active)" : done ? "rgba(74,222,128,0.1)" : "transparent", border: active ? "1px solid var(--border-strong)" : "1px solid transparent" }}>
                    <div style={{ width:"16px", height:"16px", borderRadius:"50%", background: active ? "var(--text-primary)" : done ? "var(--green)" : "var(--border-default)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"9px", color: active ? "#0a0a0a" : "#fff", fontWeight:800, flexShrink:0 }}>
                      {done ? "✓" : i + 1}
                    </div>
                    <span style={{ fontSize:"12px", fontWeight: active ? 700 : 400, color: active ? "var(--text-primary)" : "var(--text-muted)" }}>{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding:"20px 24px" }}>

          {/* ── DONE STATE ── */}
          {step === "done" && (
            <div style={{ textAlign:"center", padding:"20px 0" }}>
              <div style={{ width:"60px", height:"60px", borderRadius:"50%", background:"var(--green-bg)", border:"1px solid rgba(74,222,128,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:"24px", color:"var(--green)" }}>
                <FaCheck />
              </div>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:"20px", fontWeight:800, color:"var(--text-primary)", marginBottom:"8px" }}>
                Member Added! 🎉
              </h3>
              <p style={{ color:"var(--text-muted)", fontSize:"13px", lineHeight:1.7, marginBottom:"20px" }}>
                <strong style={{ color:"var(--text-secondary)" }}>{result?.member_name}</strong> has been registered as a member with <strong style={{ color:"var(--green)" }}>{selPlan?.name}</strong> plan.
                {dueAmt > 0 && <><br /><span style={{ color:"var(--yellow)" }}>Pending due: {fmtMoney(dueAmt)}</span></>}
              </p>
              <div style={{ display:"flex", gap:"10px", justifyContent:"center" }}>
                <button onClick={onClose} style={{ padding:"10px 24px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-secondary)", cursor:"pointer", fontSize:"13px" }}>
                  Close
                </button>
                <button
                  onClick={() => { onClose(); window.location.href = "/members"; }}
                  style={{ padding:"10px 24px", borderRadius:"var(--radius-sm)", background:"var(--text-primary)", color:"#0a0a0a", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:700, fontFamily:"var(--font-display)", display:"flex", alignItems:"center", gap:"7px" }}
                >
                  <FaIdCard style={{ fontSize:"12px" }} /> View in Members
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 1: PLAN ── */}
          {step === "plan" && (
            <>
              {/* Inquiry info strip */}
              <div style={{ padding:"12px 14px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", marginBottom:"18px", display:"flex", gap:"16px", flexWrap:"wrap" }}>
                <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>
                  Interest: <strong style={{ color:"var(--text-secondary)", textTransform:"capitalize" }}>{inquiry.membership_interest?.replace("_"," ") || "Not specified"}</strong>
                </span>
                <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>
                  Preferred: <strong style={{ color:"var(--text-secondary)" }}>{TIME_MAP[inquiry.preferred_time] || "Anytime"}</strong>
                </span>
              </div>

              {loading ? (
                <div style={{ padding:"32px", textAlign:"center", color:"var(--text-muted)" }}>Loading plans...</div>
              ) : (
                <>
                  <p style={{ fontSize:"12px", color:"var(--text-muted)", marginBottom:"12px", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em" }}>
                    Select Membership Plan *
                  </p>

                  {/* Plans grouped by type */}
                  {Object.entries(plansByType).map(([type, list]) => (
                    <div key={type} style={{ marginBottom:"16px" }}>
                      <p style={{ fontSize:"10px", fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:"8px" }}>
                        {TYPE_LABEL[type] || type}
                      </p>
                      <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                        {list.map(plan => {
                          const isSelected = selPlan?.id === plan.id;
                          const durColor   = type === "yearly" ? "var(--green)" : type === "quarterly" ? "var(--yellow)" : "var(--blue)";
                          return (
                            <div key={plan.id} onClick={() => setSelPlan(plan)}
                              style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 14px", borderRadius:"var(--radius-sm)", cursor:"pointer", border: isSelected ? `1px solid ${durColor}55` : "1px solid var(--border-default)", background: isSelected ? `${durColor}08` : "var(--bg-elevated)", transition:"all 0.15s" }}>
                              <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                                <div style={{ width:"18px", height:"18px", borderRadius:"50%", border: isSelected ? `2px solid ${durColor}` : "2px solid var(--border-default)", background: isSelected ? durColor : "transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                                  {isSelected && <FaCheck style={{ fontSize:"8px", color:"#fff" }} />}
                                </div>
                                <div>
                                  <div style={{ fontWeight:700, color:"var(--text-primary)", fontSize:"13px" }}>{plan.name}</div>
                                  {plan.description && <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"1px" }}>{plan.description}</div>}
                                </div>
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"15px", color:"var(--text-primary)" }}>{fmtMoney(plan.price)}</div>
                                <div style={{ fontSize:"10px", color:"var(--text-muted)" }}>{plan.duration_days} days</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Start Date */}
                  {selPlan && (
                    <div style={{ marginTop:"4px", padding:"14px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)" }}>
                      <p style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"10px" }}>Membership Start From</p>
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px", marginBottom:"10px" }}>
                        {[{ key:"today", label:"Today", sub:fmt(today) }, { key:"custom", label:"Custom Date", sub:"Pick a date" }].map(opt => (
                          <div key={opt.key} onClick={() => setStartFrom(opt.key)}
                            style={{ padding:"10px 12px", borderRadius:"var(--radius-sm)", cursor:"pointer", border: startFrom === opt.key ? "1px solid rgba(74,222,128,0.5)" : "1px solid var(--border-default)", background: startFrom === opt.key ? "rgba(74,222,128,0.07)" : "var(--bg-surface)", transition:"all 0.15s" }}>
                            <div style={{ fontWeight:700, color: startFrom === opt.key ? "var(--green)" : "var(--text-secondary)", fontSize:"13px" }}>{opt.label}</div>
                            <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{opt.sub}</div>
                          </div>
                        ))}
                      </div>
                      {startFrom === "custom" && (
                        <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} style={{ ...inp, marginBottom:"8px" }} />
                      )}
                      {/* Validity preview */}
                      {endDate && (
                        <div style={{ padding:"10px 12px", borderRadius:"var(--radius-sm)", background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.2)" }}>
                          <div style={{ fontSize:"11px", fontWeight:600, color:"var(--green)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"4px" }}>New Validity</div>
                          <div style={{ fontSize:"13px", fontWeight:700, color:"var(--text-primary)" }}>{fmtLong(startDate)} → {fmtLong(endDate)}</div>
                          <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{selPlan.duration_days} days</div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {error && <div style={{ marginTop:"14px", padding:"10px 14px", borderRadius:"var(--radius-sm)", background:"var(--red-bg)", border:"1px solid rgba(248,113,113,0.2)", color:"var(--red)", fontSize:"13px" }}>{error}</div>}

              <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", marginTop:"20px", paddingTop:"16px", borderTop:"1px solid var(--border-subtle)" }}>
                <button onClick={onClose} style={{ padding:"9px 20px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-secondary)", cursor:"pointer", fontSize:"13px" }}>Cancel</button>
                <button onClick={() => { if (!selPlan) { setError("Please select a plan"); return; } setError(""); setStep("payment"); }}
                  style={{ padding:"9px 24px", borderRadius:"var(--radius-sm)", background: selPlan ? "var(--text-primary)" : "var(--bg-elevated)", color: selPlan ? "#0a0a0a" : "var(--text-muted)", border:"none", cursor: selPlan ? "pointer" : "not-allowed", fontSize:"13px", fontWeight:700, fontFamily:"var(--font-display)" }}>
                  Next: Payment →
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: PAYMENT ── */}
          {step === "payment" && (
            <>
              {/* Plan summary */}
              <div style={{ padding:"12px 14px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", marginBottom:"18px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div>
                    <div style={{ fontWeight:700, color:"var(--text-primary)", fontSize:"13px" }}>{selPlan?.name}</div>
                    <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px" }}>{fmtLong(startDate)} → {fmtLong(endDate)}</div>
                  </div>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"18px", color:"var(--green)" }}>{fmtMoney(selPlan?.price)}</div>
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px" }}>
                <Field label="Amount Paid (₹) *">
                  <input type="number" value={paidAmt} onChange={e => setPaidAmt(e.target.value)}
                    placeholder={String(selPlan?.price || "")}
                    style={{ ...inp, borderColor: isPartial ? "rgba(234,179,8,0.5)" : "var(--border-default)" }}
                    onFocus={e => e.target.style.borderColor = "var(--border-strong)"}
                    onBlur={e => e.target.style.borderColor = isPartial ? "rgba(234,179,8,0.5)" : "var(--border-default)"}
                  />
                </Field>
                <Field label="Payment Method">
                  <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={inp}>
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="upi">📱 UPI</option>
                    <option value="bank_transfer">🏦 Bank Transfer</option>
                  </select>
                </Field>

                {/* Due amount banner */}
                {isPartial && (
                  <div style={{ gridColumn:"1/-1", padding:"10px 14px", borderRadius:"var(--radius-sm)", background:"var(--yellow-bg)", border:"1px solid rgba(234,179,8,0.3)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:"13px", color:"var(--yellow)", fontWeight:600 }}>⚠️ Partial Payment</span>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:"15px", color:"var(--yellow)" }}>Due: {fmtMoney(dueAmt)}</div>
                      <div style={{ fontSize:"10px", color:"var(--text-muted)" }}>Status → Pending</div>
                    </div>
                  </div>
                )}

                {isUnpaid && (
                  <div style={{ gridColumn:"1/-1", padding:"10px 14px", borderRadius:"var(--radius-sm)", background:"rgba(80,80,80,0.1)", border:"1px solid var(--border-default)", fontSize:"12px", color:"var(--text-muted)" }}>
                    💡 Amount 0 rakho — payment baad mein record karna ho toh
                  </div>
                )}

                <div style={{ gridColumn:"1/-1" }}>
                  <Field label="Notes (Optional)">
                    <input value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder={`Joined via inquiry — ${selPlan?.name}`}
                      style={inp}
                      onFocus={e => e.target.style.borderColor = "var(--border-strong)"}
                      onBlur={e => e.target.style.borderColor = "var(--border-default)"}
                    />
                  </Field>
                </div>
              </div>

              {/* Summary box */}
              <div style={{ marginTop:"16px", padding:"14px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)" }}>
                <p style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"10px" }}>Summary</p>
                {[
                  { label:"Member",      val: inquiry.full_name },
                  { label:"Plan",        val: selPlan?.name },
                  { label:"Validity",    val: `${fmtLong(startDate)} → ${fmtLong(endDate)}` },
                  { label:"Plan Price",  val: fmtMoney(totalAmt), color:"var(--text-primary)" },
                  { label:"Paid Now",    val: fmtMoney(paid),     color:"var(--green)"        },
                  ...(dueAmt > 0 ? [{ label:"Pending Due", val: fmtMoney(dueAmt), color:"var(--yellow)" }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:"1px solid var(--border-subtle)" }}>
                    <span style={{ fontSize:"12px", color:"var(--text-muted)" }}>{row.label}</span>
                    <span style={{ fontSize:"12px", fontWeight:600, color: row.color || "var(--text-secondary)" }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {error && <div style={{ marginTop:"12px", padding:"10px 14px", borderRadius:"var(--radius-sm)", background:"var(--red-bg)", border:"1px solid rgba(248,113,113,0.2)", color:"var(--red)", fontSize:"13px" }}>{error}</div>}

              <div style={{ display:"flex", gap:"10px", justifyContent:"space-between", marginTop:"20px", paddingTop:"16px", borderTop:"1px solid var(--border-subtle)" }}>
                <button onClick={() => { setStep("plan"); setError(""); }} style={{ padding:"9px 18px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-secondary)", cursor:"pointer", fontSize:"13px" }}>
                  ← Back
                </button>
                <button onClick={handleConvert} disabled={saving}
                  style={{ padding:"9px 28px", borderRadius:"var(--radius-sm)", background: saving ? "var(--bg-elevated)" : "var(--green)", color: saving ? "var(--text-muted)" : "#0a0a0a", border:"none", cursor: saving ? "not-allowed" : "pointer", fontSize:"13px", fontWeight:800, fontFamily:"var(--font-display)", display:"flex", alignItems:"center", gap:"8px", letterSpacing:"0.03em" }}>
                  <FaUserPlus style={{ fontSize:"12px" }} />
                  {saving ? "Converting..." : "CONFIRM & ADD MEMBER"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ inquiry, onClose, onUpdate }) {
  const [status,      setStatus]      = useState(inquiry.status);
  const [notes,       setNotes]       = useState(inquiry.notes || "");
  const [saving,      setSaving]      = useState(false);
  const [showConvert, setShowConvert] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/inquiries/${inquiry.id}`, { status, notes });
      onUpdate();
      onClose();
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  };

  const ss = STATUS_MAP[status] || STATUS_MAP.new;
  const ii = INTEREST_MAP[inquiry.membership_interest] || INTEREST_MAP.not_sure;
  const isConverted = inquiry.status === "converted" || status === "converted";

  return (
    <>
      <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"20px", backdropFilter:"blur(4px)" }}
        onClick={e => { if(e.target===e.currentTarget) onClose(); }}>
        <div className="fade-up" style={{ background:"var(--bg-surface)", border:"1px solid var(--border-default)", borderRadius:"var(--radius-xl)", width:"100%", maxWidth:"520px", maxHeight:"90vh", overflowY:"auto", padding:"28px", boxShadow:"var(--shadow-lg)" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"20px" }}>
            <div>
              <h2 style={{ fontFamily:"var(--font-display)", fontSize:"18px", fontWeight:800, color:"var(--text-primary)", margin:0 }}>Inquiry Details</h2>
              <p style={{ color:"var(--text-muted)", fontSize:"12px", marginTop:"3px" }}>
                Received {fmt(inquiry.created_at)} at {fmtTime(inquiry.created_at)}
              </p>
            </div>
            <button onClick={onClose} style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-muted)", cursor:"pointer", borderRadius:"var(--radius-sm)", width:"30px", height:"30px", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <FaTimes style={{ fontSize:"12px" }} />
            </button>
          </div>

          <div style={{ height:"1px", background:"var(--border-subtle)", marginBottom:"20px" }} />

          {/* Person Info */}
          <div style={{ display:"flex", alignItems:"center", gap:"14px", marginBottom:"20px" }}>
            <div style={{ width:"64px", height:"64px", borderRadius:"50%", background:"var(--bg-active)", border:"2px solid var(--border-strong)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:700, color:"var(--text-secondary)", flexShrink:0, overflow:"hidden" }}>
              {inquiry.photo
                ? <img src={inquiry.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : inquiry.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:"17px", fontWeight:700, color:"var(--text-primary)" }}>{inquiry.full_name}</div>
              <div style={{ display:"flex", gap:"12px", marginTop:"4px", flexWrap:"wrap" }}>
                <span style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"12px", color:"var(--text-muted)" }}>
                  <FaEnvelope style={{ fontSize:"11px" }} /> {inquiry.email}
                </span>
                <span style={{ display:"flex", alignItems:"center", gap:"5px", fontSize:"12px", color:"var(--text-muted)" }}>
                  <FaPhone style={{ fontSize:"11px" }} /> {inquiry.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Tags Row */}
          <div style={{ display:"flex", gap:"8px", flexWrap:"wrap", marginBottom:"20px" }}>
            <Badge label={ii.label} color={ii.color} bg={ii.bg} />
            <Badge label={TIME_MAP[inquiry.preferred_time] || "Anytime"} color="var(--text-secondary)" bg="rgba(80,80,80,0.12)" />
            <Badge label={ss.label} color={ss.color} bg={ss.bg} />
          </div>

          {/* Extra Info Row */}
          {(inquiry.gender || inquiry.date_of_birth || inquiry.address) && (
            <div style={{ display:"flex", flexDirection:"column", gap:"6px", padding:"12px 14px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", marginBottom:"18px" }}>
              {inquiry.gender && (
                <div style={{ display:"flex", gap:"8px", fontSize:"12px" }}>
                  <span style={{ color:"var(--text-muted)", minWidth:"90px" }}>Gender</span>
                  <span style={{ color:"var(--text-secondary)", fontWeight:600, textTransform:"capitalize" }}>{inquiry.gender}</span>
                </div>
              )}
              {inquiry.date_of_birth && (
                <div style={{ display:"flex", gap:"8px", fontSize:"12px" }}>
                  <span style={{ color:"var(--text-muted)", minWidth:"90px" }}>Date of Birth</span>
                  <span style={{ color:"var(--text-secondary)", fontWeight:600 }}>{fmt(inquiry.date_of_birth)}</span>
                </div>
              )}
              {inquiry.address && (
                <div style={{ display:"flex", gap:"8px", fontSize:"12px" }}>
                  <span style={{ color:"var(--text-muted)", minWidth:"90px" }}>Address</span>
                  <span style={{ color:"var(--text-secondary)", fontWeight:600 }}>{inquiry.address}</span>
                </div>
              )}
            </div>
          )}

          {/* ── CONVERT TO MEMBER BUTTON ── */}
          {!isConverted ? (
            <button
              onClick={() => setShowConvert(true)}
              style={{ width:"100%", padding:"12px", borderRadius:"var(--radius-sm)", background:"var(--green)", color:"#0a0a0a", border:"none", cursor:"pointer", fontSize:"13px", fontWeight:800, fontFamily:"var(--font-display)", display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginBottom:"18px", letterSpacing:"0.03em", transition:"opacity 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
            >
              <FaUserPlus style={{ fontSize:"13px" }} />
              CONVERT TO MEMBER — Choose Plan & Record Payment
            </button>
          ) : (
            <div style={{ width:"100%", padding:"12px", borderRadius:"var(--radius-sm)", background:"var(--green-bg)", border:"1px solid rgba(74,222,128,0.3)", color:"var(--green)", fontSize:"13px", fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", marginBottom:"18px" }}>
              <FaCheck /> Already Converted to Member
            </div>
          )}

          {/* Message */}
          {inquiry.message && (
            <div style={{ background:"var(--bg-elevated)", border:"1px solid var(--border-default)", borderRadius:"var(--radius-sm)", padding:"14px 16px", marginBottom:"20px" }}>
              <p style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:"8px" }}>Message</p>
              <p style={{ fontSize:"13.5px", color:"var(--text-secondary)", lineHeight:1.7 }}>{inquiry.message}</p>
            </div>
          )}

          {/* Update Status */}
          <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"14px" }}>
            <label style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Update Status</label>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {Object.entries(STATUS_MAP).map(([val, s]) => (
                <div key={val} onClick={() => setStatus(val)}
                  style={{ padding:"6px 14px", borderRadius:"99px", fontSize:"12px", fontWeight:600, cursor:"pointer", transition:"all 0.15s", background: status===val ? s.bg : "var(--bg-elevated)", color: status===val ? s.color : "var(--text-muted)", border: status===val ? `1px solid ${s.color}` : "1px solid var(--border-default)" }}>
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div style={{ display:"flex", flexDirection:"column", gap:"6px", marginBottom:"20px" }}>
            <label style={{ fontSize:"11px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em" }}>Internal Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about this inquiry..."
              style={{ ...inp, resize:"vertical", minHeight:"80px" }}
              onFocus={e => e.target.style.borderColor="var(--border-strong)"}
              onBlur={e  => e.target.style.borderColor="var(--border-default)"}
            />
          </div>

          <div style={{ display:"flex", gap:"10px", justifyContent:"flex-end", paddingTop:"16px", borderTop:"1px solid var(--border-subtle)" }}>
            <button onClick={onClose} style={{ padding:"9px 20px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-secondary)", cursor:"pointer", fontSize:"13px" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding:"9px 24px", borderRadius:"var(--radius-sm)", background:saving?"var(--bg-elevated)":"var(--text-primary)", color:saving?"var(--text-muted)":"#0a0a0a", border:"none", cursor:saving?"not-allowed":"pointer", fontSize:"13px", fontWeight:700, fontFamily:"var(--font-display)" }}>
              {saving ? "Saving..." : "UPDATE"}
            </button>
          </div>
        </div>
      </div>

      {/* Convert Modal — opens on top of Detail Modal */}
      {showConvert && (
        <ConvertToMemberModal
          inquiry={inquiry}
          onClose={() => setShowConvert(false)}
          onConverted={() => { onUpdate(); setStatus("converted"); }}
        />
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Inquiries({ onLogout }) {
  const { isSuper } = useAuth();
  const [inquiries, setInquiries]   = useState([]);
  const [pagination, setPagination] = useState({ total:0, page:1, limit:10, totalPages:1 });
  const [stats, setStats]           = useState(null);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState("");
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [deleteId, setDeleteId]     = useState(null);
  const timer = useRef(null);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchInquiries(1, search, filterStatus), 380);
    return () => clearTimeout(timer.current);
  }, [search, filterStatus]);

  const fetchAll = () => { fetchInquiries(1,"",""); fetchStats(); };

  const fetchInquiries = async (page=1, q="", st="") => {
    setLoading(true);
    try {
      const res = await api.get(`/inquiries?page=${page}&limit=10&search=${encodeURIComponent(q)}&status=${st}`);
      setInquiries(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/inquiries/stats/summary");
      setStats(res.data.data);
    } catch(e) { console.error(e); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/inquiries/${deleteId}`);
      setDeleteId(null);
      fetchAll();
    } catch(e) { console.error(e); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg-base)", fontFamily:"var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex:1, padding:"32px 36px", overflowY:"auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"24px", flexWrap:"wrap", gap:"14px" }}>
          <div>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:"28px", fontWeight:800, color:"var(--text-primary)", letterSpacing:"-0.5px", margin:0 }}>Inquiries</h1>
            <p style={{ color:"var(--text-muted)", fontSize:"13px", marginTop:"4px" }}>
              People interested in joining your gym
            </p>
          </div>
          <a href="http://localhost:5000/inquiry" target="_blank" rel="noreferrer"
            style={{ display:"flex", alignItems:"center", gap:"8px", padding:"10px 18px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-secondary)", textDecoration:"none", fontSize:"13px", fontWeight:600 }}>
            <FaExternalLinkAlt style={{ fontSize:"11px" }} /> View Public Form
          </a>
        </div>

        {/* Stats Strip */}
        <div className="fade-up stagger-1" style={{ display:"flex", gap:"12px", marginBottom:"22px", flexWrap:"wrap" }}>
          {[
            { label:"Total",     val:stats?.total          ||0, color:"var(--blue)",   bg:"var(--blue-bg)"   },
            { label:"New",       val:stats?.new_count       ||0, color:"var(--blue)",   bg:"var(--blue-bg)"   },
            { label:"Contacted", val:stats?.contacted_count ||0, color:"var(--yellow)", bg:"var(--yellow-bg)" },
            { label:"Converted", val:stats?.converted_count ||0, color:"var(--green)",  bg:"var(--green-bg)"  },
            { label:"Today",     val:stats?.today_count     ||0, color:"var(--text-primary)", bg:"rgba(80,80,80,0.12)" },
          ].map(s => (
            <div key={s.label} onClick={() => setFilter(s.label === "Total" || s.label === "Today" ? "" : s.label.toLowerCase())}
              style={{
                background:"var(--bg-surface)", border:"1px solid var(--border-subtle)",
                borderRadius:"var(--radius-md)", padding:"12px 20px",
                flex:"1 1 100px", cursor:"pointer", transition:"border-color 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor=s.color}
              onMouseLeave={e => e.currentTarget.style.borderColor="var(--border-subtle)"}
            >
              <div style={{ fontFamily:"var(--font-display)", fontSize:"22px", fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:"11px", color:"var(--text-muted)", marginTop:"2px", textTransform:"uppercase", letterSpacing:"0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="fade-up stagger-2" style={{ background:"var(--bg-surface)", border:"1px solid var(--border-subtle)", borderRadius:"var(--radius-lg)", overflow:"hidden" }}>
          {/* Controls */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", padding:"14px 20px", borderBottom:"1px solid var(--border-subtle)", flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:"8px", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", borderRadius:"var(--radius-sm)", padding:"8px 14px", flex:1, minWidth:"180px" }}>
              <FaSearch style={{ color:"var(--text-muted)", fontSize:"12px", flexShrink:0 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone..."
                style={{ background:"transparent", border:"none", outline:"none", color:"var(--text-primary)", fontSize:"13.5px", width:"100%", fontFamily:"var(--font-body)" }} />
              {search && <FaTimes style={{ color:"var(--text-muted)", cursor:"pointer", fontSize:"11px" }} onClick={() => setSearch("")} />}
            </div>
            <select value={filterStatus} onChange={e => setFilter(e.target.value)}
              style={{ ...inp, width:"140px", padding:"8px 12px", cursor:"pointer" }}>
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="rejected">Rejected</option>
            </select>
            <span style={{ color:"var(--text-muted)", fontSize:"12px", whiteSpace:"nowrap" }}>
              {pagination.total} inquir{pagination.total !== 1 ? "ies" : "y"}
            </span>
          </div>

          {/* Table */}
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ background:"var(--bg-elevated)" }}>
                  {["#","Person","Interest","Preferred Time","Received","Status",""].map((h,i) => (
                    <th key={i} style={{ padding:"10px 16px", textAlign:h===""?"center":"left", fontSize:"11px", fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:"1px solid var(--border-subtle)", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ padding:"48px", textAlign:"center", color:"var(--text-muted)" }}>Loading...</td></tr>
                ) : inquiries.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding:"48px", textAlign:"center", color:"var(--text-muted)" }}>
                    <FaEnvelope style={{ fontSize:"28px", display:"block", margin:"0 auto 10px", opacity:0.25 }} />
                    {search || filterStatus ? "No inquiries match your filter" : "No inquiries yet"}
                  </td></tr>
                ) : inquiries.map((inq,i) => {
                  const ss = STATUS_MAP[inq.status]         || STATUS_MAP.new;
                  const ii = INTEREST_MAP[inq.membership_interest] || INTEREST_MAP.not_sure;
                  return (
                    <tr key={inq.id}
                      style={{ borderBottom:"1px solid var(--border-subtle)", transition:"background 0.12s", cursor:"pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background="var(--bg-elevated)"}
                      onMouseLeave={e => e.currentTarget.style.background="transparent"}
                      onClick={() => setSelected(inq)}
                    >
                      <td style={{ padding:"13px 16px", color:"var(--text-muted)", fontSize:"12px", fontWeight:600 }}>
                        {(pagination.page-1)*pagination.limit+i+1}
                      </td>
                      <td style={{ padding:"13px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"var(--bg-active)", border:"1px solid var(--border-default)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:700, color:"var(--text-secondary)", flexShrink:0, overflow:"hidden" }}>
                            {inq.photo
                              ? <img src={inq.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                              : inq.full_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:"13px" }}>{inq.full_name}</div>
                            <div style={{ fontSize:"11px", color:"var(--text-muted)" }}>{inq.email} · {inq.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:"13px 16px" }}>
                        <Badge label={ii.label} color={ii.color} bg={ii.bg} />
                      </td>
                      <td style={{ padding:"13px 16px", color:"var(--text-secondary)", fontSize:"13px" }}>
                        {TIME_MAP[inq.preferred_time] || "Anytime"}
                      </td>
                      <td style={{ padding:"13px 16px", color:"var(--text-secondary)", fontSize:"12px", whiteSpace:"nowrap" }}>
                        {fmt(inq.created_at)}<br/>
                        <span style={{ color:"var(--text-muted)", fontSize:"11px" }}>{fmtTime(inq.created_at)}</span>
                      </td>
                      <td style={{ padding:"13px 16px" }}>
                        <Badge label={ss.label} color={ss.color} bg={ss.bg} />
                      </td>
                      <td style={{ padding:"13px 16px" }} onClick={e => e.stopPropagation()}>
                        {isSuper && (
                          <button onClick={() => setDeleteId(inq.id)}
                            style={{ padding:"6px 8px", borderRadius:"var(--radius-sm)", background:"var(--bg-active)", border:"1px solid var(--border-default)", color:"var(--text-secondary)", cursor:"pointer", transition:"all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor="var(--red)"; e.currentTarget.style.color="var(--red)"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor="var(--border-default)"; e.currentTarget.style.color="var(--text-secondary)"; }}
                          ><FaTrash style={{ fontSize:"12px" }} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 20px", borderTop:"1px solid var(--border-subtle)", flexWrap:"wrap", gap:"8px" }}>
              <span style={{ color:"var(--text-muted)", fontSize:"12px" }}>
                Showing {(pagination.page-1)*pagination.limit+1}–{Math.min(pagination.page*pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div style={{ display:"flex", gap:"6px" }}>
                <button disabled={pagination.page<=1} onClick={() => fetchInquiries(pagination.page-1,search,filterStatus)}
                  style={{ display:"flex", alignItems:"center", gap:"5px", padding:"6px 12px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:pagination.page<=1?"var(--text-disabled)":"var(--text-secondary)", cursor:pagination.page<=1?"not-allowed":"pointer", fontSize:"12px" }}>
                  <FaChevronLeft style={{ fontSize:"10px" }} /> Prev
                </button>
                <button disabled={pagination.page>=pagination.totalPages} onClick={() => fetchInquiries(pagination.page+1,search,filterStatus)}
                  style={{ display:"flex", alignItems:"center", gap:"5px", padding:"6px 12px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:pagination.page>=pagination.totalPages?"var(--text-disabled)":"var(--text-secondary)", cursor:pagination.page>=pagination.totalPages?"not-allowed":"pointer", fontSize:"12px" }}>
                  Next <FaChevronRight style={{ fontSize:"10px" }} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {selected && <DetailModal inquiry={selected} onClose={() => setSelected(null)} onUpdate={fetchAll} />}

      {deleteId && (
        <div className="fade-in" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(4px)" }}
          onClick={e => { if(e.target===e.currentTarget) setDeleteId(null); }}>
          <div className="fade-up" style={{ background:"var(--bg-surface)", border:"1px solid var(--border-default)", borderRadius:"var(--radius-xl)", padding:"32px", maxWidth:"360px", width:"100%", textAlign:"center" }}>
            <div style={{ width:"44px", height:"44px", borderRadius:"50%", background:"var(--red-bg)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", color:"var(--red)" }}>
              <FaTrash style={{ fontSize:"16px" }} />
            </div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:"18px", fontWeight:800, color:"var(--text-primary)", marginBottom:"8px" }}>Delete Inquiry?</h3>
            <p style={{ color:"var(--text-muted)", fontSize:"13px", marginBottom:"22px" }}>This inquiry will be permanently deleted.</p>
            <div style={{ display:"flex", gap:"10px" }}>
              <button onClick={() => setDeleteId(null)} style={{ padding:"9px 20px", borderRadius:"var(--radius-sm)", background:"var(--bg-elevated)", border:"1px solid var(--border-default)", color:"var(--text-secondary)", cursor:"pointer", fontSize:"13px", flex:1 }}>Cancel</button>
              <button onClick={handleDelete} style={{ padding:"9px 20px", borderRadius:"var(--radius-sm)", background:"var(--red-bg)", border:"1px solid rgba(248,113,113,0.3)", color:"var(--red)", cursor:"pointer", fontSize:"13px", fontWeight:700, flex:1 }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}