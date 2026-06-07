import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  FaPlus, FaSearch, FaTimes,
  FaChevronLeft, FaChevronRight, FaUsers, FaUser,
  FaWhatsapp, FaEnvelope, FaCheck, FaPaperPlane, FaSyncAlt
} from "react-icons/fa";
import MemberProfileDrawer from "../components/MemberProfileDrawer";


const Field = ({ label, children }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
    <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</label>
    {children}
  </div>
);

const inputStyle = {
  padding: "9px 12px", borderRadius: "var(--radius-sm)",
  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
  color: "var(--text-primary)", fontSize: "13.5px", outline: "none",
  width: "100%", transition: "border-color 0.15s", fontFamily: "var(--font-body)"
};

const EMPTY = {
  full_name: "", email: "", phone: "", address: "",
  gender: "", date_of_birth: "", membership_type: "",
  membership_start: "", membership_end: "", status: "active"
};

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtLong = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
const daysLeft = (end) => end ? Math.ceil((new Date(end) - new Date()) / 86400000) : null;

const DUR_COLOR = {
  monthly: ["var(--blue)", "rgba(96,165,250,0.1)"],
  quarterly: ["var(--yellow)", "rgba(251,191,36,0.1)"],
  yearly: ["var(--green)", "rgba(74,222,128,0.1)"],
};

const MembershipBadge = ({ type, plans }) => {
  const plan = plans.find(p => p.name === type || p.duration_type === type);
  const [color, bg] = DUR_COLOR[plan?.duration_type] || ["var(--text-muted)", "rgba(80,80,80,0.12)"];
  return <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "99px", background: bg, color, textTransform: "capitalize", whiteSpace: "nowrap" }}>{type || "—"}</span>;
};

const StatusBadge = ({ status }) => {
  const map = { active: ["var(--green)", "var(--green-bg)"], expired: ["var(--red)", "var(--red-bg)"], inactive: ["var(--text-muted)", "rgba(80,80,80,0.12)"] };
  const [color, bg] = map[status] || map.inactive;
  return <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 10px", borderRadius: "99px", background: bg, color, textTransform: "capitalize" }}>{status}</span>;
};

// ─── WhatsApp Templates ────────────────────────────────────────────────────────
const WA_TEMPLATES = {
  expiry_warning: (m) => `Hi ${m.full_name}! 👋\n\nYour *GymPro* membership is expiring in *${daysLeft(m.membership_end) ?? "a few"} day(s)* (${fmtLong(m.membership_end)}).\n\nRenew now to continue your fitness journey! 💪\n\nContact us or visit the gym to renew.\n\n_Team GymPro_ ⚡`,
  payment_reminder: (m) => `Hi ${m.full_name}! 👋\n\nFriendly reminder — your *GymPro* membership payment is pending.\n\nPlan: *${m.membership_type || "Membership"}*\nExpiry: *${fmtLong(m.membership_end)}*\n\nPlease clear your dues at the earliest. 🙏\n\n_Team GymPro_ ⚡`,
  renewal_done: (m) => `Hi ${m.full_name}! 🎉\n\nYour *GymPro* membership has been successfully *renewed*!\n\nPlan: *${m.membership_type || "Membership"}*\nValid Till: *${fmtLong(m.membership_end)}*\n\nThank you! See you at the gym! 🏋️‍♂️\n\n_Team GymPro_ ⚡`,
  welcome: (m) => `Hi ${m.full_name}! 🎉\n\nWelcome to *GymPro*! Your membership is now *active*.\n\nPlan: *${m.membership_type || "Standard"}*\nValid Till: *${fmtLong(m.membership_end)}*\n\nBring a valid ID on your first visit. Let's crush those goals! 💪\n\n_Team GymPro_ ⚡`,
};

const NOTIFY_TYPES = [
  { key: "expiry_warning", icon: "⏰", label: "Expiry Warning", color: "#f59e0b", desc: "Membership khatam hone wali hai" },
  { key: "payment_reminder", icon: "💳", label: "Payment Due Reminder", color: "#ef4444", desc: "Payment pending — send a reminder" },
  { key: "renewal_done", icon: "✅", label: "Renewal Confirmation", color: "#10b981", desc: "Membership renewed — send confirmation" },
  { key: "welcome", icon: "🎉", label: "Welcome / Re-Welcome", color: "#6366f1", desc: "Welcome with membership details" },
];

// ─── Notify Modal ──────────────────────────────────────────────────────────────
function NotifyModal({ member, onClose }) {
  const [tab, setTab] = useState("email");
  const [selType, setSelType] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [waPreview, setWaPreview] = useState("");

  useEffect(() => { setSelType(""); setResult(null); setWaPreview(""); }, [tab]);
  useEffect(() => {
    if (tab === "whatsapp" && selType) setWaPreview(WA_TEMPLATES[selType]?.(member) || "");
    else setWaPreview("");
  }, [selType, tab, member]);

  const sendEmail = async () => {
    if (!selType) return;
    setSending(true); setResult(null);
    try {
      const res = await api.post(`/members/${member.id}/send-email`, { type: selType });
      setResult({ ok: true, msg: res.data.message || "Email sent!" });
    } catch (e) { setResult({ ok: false, msg: e.response?.data?.message || "Email send failed" }); }
    finally { setSending(false); }
  };

  const openWhatsApp = () => {
    if (!waPreview || !member.phone) return;
    let phone = member.phone.replace(/[\s\-\(\)]/g, "");
    if (phone.startsWith("0")) phone = phone.slice(1);
    if (!phone.startsWith("+")) phone = "91" + phone;
    else phone = phone.replace("+", "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waPreview)}`, "_blank");
    setResult({ ok: true, msg: "WhatsApp opened! Send message from there." });
  };

  if (!member) return null;
  const days = daysLeft(member.membership_end);

  const TypeSelector = ({ value, onChange }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
      {NOTIFY_TYPES.map(t => (
        <div key={t.key} onClick={() => onChange(t.key)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "var(--radius-sm)", cursor: "pointer", border: value === t.key ? `1px solid ${t.color}55` : "1px solid var(--border-default)", background: value === t.key ? `${t.color}10` : "var(--bg-elevated)", transition: "all 0.15s" }}>
          <span style={{ fontSize: "20px", lineHeight: 1 }}>{t.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{t.label}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{t.desc}</div>
          </div>
          <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: value === t.key ? `2px solid ${t.color}` : "2px solid var(--border-default)", background: value === t.key ? t.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {value === t.key && <FaCheck style={{ fontSize: "8px", color: "#fff" }} />}
          </div>
        </div>
      ))}
    </div>
  );

  const ResultBanner = () => result ? (
    <div style={{ padding: "11px 14px", borderRadius: "var(--radius-sm)", marginBottom: "14px", background: result.ok ? "var(--green-bg)" : "var(--red-bg)", border: `1px solid ${result.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`, color: result.ok ? "var(--green)" : "var(--red)", fontSize: "13px" }}>
      {result.ok ? "✅" : "❌"} {result.msg}
    </div>
  ) : null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "500px", maxHeight: "88vh", overflowY: "auto", boxShadow: "var(--shadow-lg)" }}>

        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Notify Member</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>{member.full_name} · {member.phone || "No phone"}</p>
            </div>
            <button onClick={onClose} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FaTimes style={{ fontSize: "12px" }} />
            </button>
          </div>
          {/* Info strip */}
          <div style={{ display: "flex", gap: "12px", marginTop: "12px", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Plan: <strong style={{ color: "var(--text-secondary)" }}>{member.membership_type || "—"}</strong></span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Expiry: <strong style={{ color: days !== null && days <= 7 ? "var(--red)" : days !== null && days <= 15 ? "var(--yellow)" : "var(--text-secondary)" }}>{fmtLong(member.membership_end)}</strong></span>
            {days !== null && (
              <span style={{ fontSize: "11px", padding: "1px 8px", borderRadius: "99px", background: days <= 0 ? "var(--red-bg)" : days <= 7 ? "var(--red-bg)" : days <= 15 ? "var(--yellow-bg)" : "var(--green-bg)", color: days <= 0 ? "var(--red)" : days <= 7 ? "var(--red)" : days <= 15 ? "var(--yellow)" : "var(--green)", fontWeight: 600 }}>
                {days <= 0 ? "Expired" : `${days}d left`}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
          {[{ key: "email", icon: <FaEnvelope />, label: "Email" }, { key: "whatsapp", icon: <FaWhatsapp />, label: "WhatsApp" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ flex: 1, padding: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", background: tab === t.key ? "var(--bg-elevated)" : "transparent", border: "none", borderBottom: tab === t.key ? "2px solid var(--text-primary)" : "2px solid transparent", color: tab === t.key ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer", fontWeight: tab === t.key ? 700 : 400, fontSize: "13px", fontFamily: "var(--font-body)", transition: "all 0.15s" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* EMAIL TAB */}
          {tab === "email" && (
            <>
              {!member.email && <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", color: "var(--red)", fontSize: "13px", marginBottom: "14px", border: "1px solid rgba(248,113,113,0.2)" }}>⚠️ No email address registered for this member.</div>}
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>Select email type:</p>
              <TypeSelector value={selType} onChange={setSelType} />
              <ResultBanner />
              <button onClick={sendEmail} disabled={!selType || !member.email || sending} style={{ width: "100%", padding: "11px", borderRadius: "var(--radius-sm)", background: (!selType || !member.email || sending) ? "var(--bg-elevated)" : "var(--text-primary)", color: (!selType || !member.email || sending) ? "var(--text-muted)" : "#0a0a0a", border: "none", cursor: (!selType || !member.email || sending) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <FaPaperPlane style={{ fontSize: "12px" }} />
                {sending ? "Sending..." : `Send to ${member.email || "—"}`}
              </button>
            </>
          )}

          {/* WHATSAPP TAB */}
          {tab === "whatsapp" && (
            <>
              {!member.phone && <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", color: "var(--red)", fontSize: "13px", marginBottom: "14px", border: "1px solid rgba(248,113,113,0.2)" }}>⚠️ No phone number registered for this member.</div>}
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>Select message type:</p>
              <TypeSelector value={selType} onChange={setSelType} />
              {waPreview && (
                <div style={{ marginBottom: "16px" }}>
                  <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Message Preview</p>
                  <div style={{ background: "#1a2e1a", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "var(--radius-sm)", padding: "14px 16px", fontSize: "12px", color: "#dcfce7", lineHeight: 1.75, whiteSpace: "pre-wrap", fontFamily: "monospace", maxHeight: "160px", overflowY: "auto" }}>
                    {waPreview}
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>💡 Message will be pre-filled in WhatsApp — send from there</p>
                </div>
              )}
              <ResultBanner />
              <button onClick={openWhatsApp} disabled={!selType || !member.phone} style={{ width: "100%", padding: "11px", borderRadius: "var(--radius-sm)", background: (!selType || !member.phone) ? "var(--bg-elevated)" : "#25d366", color: (!selType || !member.phone) ? "var(--text-muted)" : "#fff", border: "none", cursor: (!selType || !member.phone) ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <FaWhatsapp style={{ fontSize: "15px" }} />
                Open WhatsApp — {member.phone || "No phone"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Renew Modal ───────────────────────────────────────────────────────────────
function RenewModal({ member, plans, plansByType, onClose, onSuccess }) {
  const TYPE_LABEL = { monthly: "Monthly Plans", quarterly: "Quarterly Plans", yearly: "Yearly Plans" };
  const [selectedPlan,    setSelectedPlan]    = useState(member.membership_type || "");
  const [startFrom,       setStartFrom]       = useState("today");
  const [paidAmount,      setPaidAmount]      = useState("");
  const [payMethod,       setPayMethod]       = useState("cash");
  const [notes,           setNotes]           = useState("");
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState("");
  const [pendingPayments, setPendingPayments] = useState([]);
  const [collectPending,  setCollectPending]  = useState(false);
  const [pendingLoading,  setPendingLoading]  = useState(true);
  const [discountType,    setDiscountType]    = useState("flat");
  const [discountValue,   setDiscountValue]   = useState("");

  const plan        = plans.find(p => p.name === selectedPlan);
  const days        = daysLeft(member.membership_end);
  const planPrice   = plan ? Number(plan.price) : 0;

  const discountAmt = (() => {
    const v = Number(discountValue) || 0;
    if (discountType === "percent") return Math.min(planPrice, Math.round(planPrice * v / 100));
    return Math.min(planPrice, v);
  })();
  const afterDiscount = Math.max(0, planPrice - discountAmt);

  // Auto-fill paid amount when plan or discount changes
  useEffect(() => {
    if (plan) {
      const v = Number(discountValue) || 0;
      const disc = discountType === "percent"
        ? Math.min(Number(plan.price), Math.round(Number(plan.price) * v / 100))
        : Math.min(Number(plan.price), v);
      setPaidAmount(String(Math.max(0, Number(plan.price) - disc)));
    }
  }, [plan?.id, discountValue, discountType]);

  useEffect(() => {
    const fetchPending = async () => {
      setPendingLoading(true);
      try {
        const r = await api.get(`/payments/member/${member.id}`);
        const pending = (r.data.data || []).filter(p => p.status === "pending");
        setPendingPayments(pending);
      } catch (e) {}
      finally { setPendingLoading(false); }
    };
    fetchPending();
  }, [member.id]);

  // ✅ FIX: due_amount use karo — actual pending amount
  const totalPending = pendingPayments.reduce((s, p) => s + Number(p.due_amount || p.amount || 0), 0);

  // Calculate new start & end based on choice
  const calcDates = () => {
    if (!plan) return { start: null, end: null };
    const base = startFrom === "expiry" && member.membership_end && days > 0
      ? new Date(member.membership_end)
      : new Date();
    const end = new Date(base);
    end.setDate(end.getDate() + plan.duration_days);
    return {
      start: base.toISOString().split("T")[0],
      end:   end.toISOString().split("T")[0]
    };
  };

  const { start: newStart, end: newEnd } = calcDates();

  const handleRenew = async () => {
    setError("");
    if (!selectedPlan) { setError("Please select a plan."); return; }
    if (!paidAmount || isNaN(paidAmount) || Number(paidAmount) < 0) { setError("Please enter a valid amount."); return; }
    setSaving(true);
    try {
      // 1. Update member — spread all existing fields so backend required fields (full_name etc) are satisfied
      await api.put(`/members/${member.id}`, {
        full_name:        member.full_name,
        email:            member.email,
        phone:            member.phone,
        address:          member.address || "",
        gender:           member.gender || "",
        date_of_birth:    member.date_of_birth?.split("T")[0] || "",
        membership_type:  selectedPlan,
        membership_start: newStart,
        membership_end:   newEnd,
        status:           "active",
      });
      // 2. Record renewal payment
      // ✅ FIX: amount = plan ka full price, paid_amount = jo user ne diya
      // Backend automatically due_amount = amount - paid_amount calculate karega
      const finalPrice = afterDiscount;                       // price after discount
      const paidAmt    = Number(paidAmount);
      const dueAmt     = Math.max(0, finalPrice - paidAmt);
      await api.post("/payments", {
        member_id:      member.id,
        amount:         finalPrice,           // ← discounted price
        paid_amount:    paidAmt,              // ← amount paid now
        due_amount:     dueAmt,              // ← remaining due
        discount_amount: discountAmt,        // ← discount applied
        discount_type:  discountAmt > 0 ? discountType : null,
        payment_for:    plan?.duration_type || "monthly",
        payment_method: payMethod,
        payment_date:   new Date().toISOString().split("T")[0],
        status:         dueAmt > 0 ? "pending" : "paid",
        notes:          notes || `Renewal — ${selectedPlan}`,
        plan_name:      selectedPlan,
        plan_start:     newStart,
        plan_end:       newEnd,
        months_covered: plan ? Math.round(plan.duration_days / 30) : 1,
      });
      // 3. If collect pending checked — mark all pending as paid
      // ✅ FIX: due_amount: 0 aur paid_amount: full amount set karo
      if (collectPending && pendingPayments.length > 0) {
        await Promise.all(pendingPayments.map(p =>
          api.put(`/payments/${p.id}`, {
            member_id:      p.member_id,
            amount:         Number(p.amount),
            paid_amount:    Number(p.amount),  // ← fully paid
            due_amount:     0,                  // ← ✅ due clear
            payment_date:   new Date().toISOString().split("T")[0],
            payment_method: payMethod,
            payment_for:    p.payment_for    || "monthly",
            status:         "paid",            // ← ✅ status paid
            months_covered: p.months_covered || 1,
            notes:          p.notes          || null,
            plan_name:      p.plan_name      || null,
            plan_start:     p.plan_start     || null,
            plan_end:       p.plan_end       || null,
          })
        ));
      }
      onSuccess();
    } catch (e) {
      setError(e.response?.data?.message || "Renewal failed. Try again.");
    } finally { setSaving(false); }
  };

  return (
    <div
      className="fade-in"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-lg)" }}>

        {/* Header */}
        <div style={{ padding: "22px 24px 16px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <FaSyncAlt style={{ fontSize: "14px", color: "var(--green)" }} /> Renew Membership
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>{member.full_name}</p>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FaTimes style={{ fontSize: "12px" }} />
          </button>
        </div>

        {/* Current Membership Info */}
        <div style={{ margin: "16px 24px", padding: "12px 16px", borderRadius: "var(--radius-sm)", background: days !== null && days <= 0 ? "var(--red-bg)" : "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>Current Plan</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{member.membership_type || "No Plan"}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                {fmt(member.membership_start)} → {fmt(member.membership_end)}
              </div>
            </div>
            <span style={{
              padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: 700,
              background: days === null ? "rgba(80,80,80,0.12)" : days <= 0 ? "var(--red-bg)" : days <= 7 ? "var(--red-bg)" : days <= 15 ? "var(--yellow-bg)" : "var(--green-bg)",
              color: days === null ? "var(--text-muted)" : days <= 0 ? "var(--red)" : days <= 7 ? "var(--red)" : days <= 15 ? "var(--yellow)" : "var(--green)"
            }}>
              {days === null ? "—" : days <= 0 ? "Expired" : `${days}d left`}
            </span>
          </div>
        </div>

        <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* ── Pending Payment Alert ── */}
          {!pendingLoading && totalPending > 0 && (
            <div style={{
              borderRadius: "var(--radius-sm)",
              border: "1px solid rgba(248,113,113,0.3)",
              background: "var(--red-bg)",
              overflow: "hidden"
            }}>
              {/* Header row */}
              <div style={{ padding: "11px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "14px" }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--red)" }}>
                      Pending Payment — ₹{Number(totalPending).toLocaleString("en-IN")}
                    </div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "1px" }}>
                      {pendingPayments.length} pending record{pendingPayments.length > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: "13px", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--red)" }}>
                  ₹{Number(totalPending).toLocaleString("en-IN")}
                </span>
              </div>

              {/* Individual pending items */}
              <div style={{ borderTop: "1px solid rgba(248,113,113,0.15)", padding: "8px 14px", display: "flex", flexDirection: "column", gap: "5px" }}>
                {pendingPayments.map(p => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)" }}>
                    <span>{p.payment_for?.replace(/_/g, " ") || "Payment"} · {fmt(p.payment_date)}</span>
                    {/* ✅ FIX: due_amount show karo — actual baaki amount */}
                    <span style={{ fontWeight: 600, color: "var(--red)" }}>
                      ₹{Number(p.due_amount || p.amount).toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Collect toggle */}
              <div
                onClick={() => setCollectPending(v => !v)}
                style={{ borderTop: "1px solid rgba(248,113,113,0.15)", padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", background: collectPending ? "rgba(248,113,113,0.1)" : "transparent", transition: "background 0.15s" }}
              >
                <div style={{
                  width: "16px", height: "16px", borderRadius: "4px", flexShrink: 0,
                  border: collectPending ? "none" : "1px solid rgba(248,113,113,0.5)",
                  background: collectPending ? "var(--red)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {collectPending && <FaCheck style={{ fontSize: "8px", color: "#fff" }} />}
                </div>
                <span style={{ fontSize: "12px", color: collectPending ? "var(--red)" : "var(--text-muted)", fontWeight: collectPending ? 600 : 400 }}>
                  Collect pending dues ₹{Number(totalPending).toLocaleString("en-IN")} along with this renewal
                </span>
              </div>
            </div>
          )}
          <Field label="New Plan *">
            <select style={inputStyle} value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
              <option value="">— Select a Plan —</option>
              {Object.entries(plansByType).map(([type, list]) => (
                <optgroup key={type} label={TYPE_LABEL[type] || type}>
                  {list.map(p => <option key={p.id} value={p.name}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")} / {p.duration_days} days</option>)}
                </optgroup>
              ))}
            </select>
            {plan && (
              <div style={{ marginTop: "6px", padding: "8px 12px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", display: "flex", gap: "20px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Duration: <strong style={{ color: "var(--text-secondary)" }}>{plan.duration_days} days</strong></span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Price: <strong style={{ color: "var(--green)" }}>₹{Number(plan.price).toLocaleString("en-IN")}</strong></span>
              </div>
            )}
          </Field>

          {/* Start From */}
          <Field label="Start From">
            <div style={{ display: "flex", gap: "8px" }}>
              {[
                { val: "today",  label: "Today", desc: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) },
                { val: "expiry", label: "After Expiry", desc: member.membership_end ? fmt(member.membership_end) : "—", disabled: !member.membership_end || days <= 0 }
              ].map(opt => (
                <div
                  key={opt.val}
                  onClick={() => !opt.disabled && setStartFrom(opt.val)}
                  style={{
                    flex: 1, padding: "10px 12px", borderRadius: "var(--radius-sm)", cursor: opt.disabled ? "not-allowed" : "pointer",
                    border: startFrom === opt.val ? "1px solid var(--green)" : "1px solid var(--border-default)",
                    background: startFrom === opt.val ? "var(--green-bg)" : "var(--bg-elevated)",
                    opacity: opt.disabled ? 0.45 : 1, transition: "all 0.15s"
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: startFrom === opt.val ? "var(--green)" : "var(--text-primary)" }}>{opt.label}</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{opt.desc}</div>
                </div>
              ))}
            </div>
          </Field>

          {/* New Date Preview */}
          {plan && newStart && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)" }}>
              <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>New Validity</div>
              <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>
                {fmt(newStart)} → {fmt(newEnd)}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{plan.duration_days} days</div>
            </div>
          )}

          {/* Discount */}
          <Field label="Discount (Optional)">
            <div style={{ display: "flex", gap: "8px" }}>
              {/* Type toggle */}
              <div style={{ display: "flex", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", overflow: "hidden", flexShrink: 0 }}>
                {[{ val: "flat", label: "₹" }, { val: "percent", label: "%" }].map(opt => (
                  <button key={opt.val} type="button" onClick={() => { setDiscountType(opt.val); setDiscountValue(""); }}
                    style={{ padding: "9px 14px", background: discountType === opt.val ? "var(--bg-active, var(--accent-subtle))" : "var(--bg-elevated)", border: "none", color: discountType === opt.val ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer", fontWeight: discountType === opt.val ? 700 : 400, fontSize: "13px", transition: "all 0.15s" }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <input
                style={{ ...inputStyle, flex: 1 }} type="number" min="0"
                max={discountType === "percent" ? 100 : planPrice}
                value={discountValue}
                placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 200"}
                onChange={e => setDiscountValue(e.target.value)}
                onFocus={e => e.target.style.borderColor = "var(--border-strong)"}
                onBlur={e => e.target.style.borderColor = "var(--border-default)"}
              />
            </div>
            {/* Discount summary strip */}
            {discountAmt > 0 && plan && (
              <div style={{ marginTop: "6px", display: "flex", gap: "10px", padding: "7px 12px", borderRadius: "var(--radius-sm)", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Original: <strong style={{ color: "var(--text-secondary)", textDecoration: "line-through" }}>₹{planPrice.toLocaleString("en-IN")}</strong></span>
                <span style={{ fontSize: "11px", color: "var(--red)" }}>− ₹{discountAmt.toLocaleString("en-IN")}</span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--green)" }}>= ₹{afterDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
          </Field>

          {/* Amount + Method */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <Field label="Amount Paid (₹) *">
              <input
                style={inputStyle} type="number" min="0"
                value={paidAmount}
                placeholder={afterDiscount || (plan ? plan.price : "0")}
                onChange={e => setPaidAmount(e.target.value)}
                onFocus={e => e.target.style.borderColor = "var(--border-strong)"}
                onBlur={e => e.target.style.borderColor = "var(--border-default)"}
              />
            </Field>
            <Field label="Payment Method">
              <select style={inputStyle} value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </Field>
          </div>

          {/* Partial Payment Summary */}
          {plan && (() => {
            const paid = Number(paidAmount) || 0;
            const due  = Math.max(0, afterDiscount - paid);
            const isPartial = due > 0;
            return (
              <div style={{ padding: "12px 14px", borderRadius: "var(--radius-sm)", background: isPartial ? "rgba(245,158,11,0.07)" : "rgba(74,222,128,0.06)", border: `1px solid ${isPartial ? "rgba(245,158,11,0.3)" : "rgba(74,222,128,0.25)"}` }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
                  Payment Summary
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {discountAmt > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Plan Price</span>
                      <span style={{ color: "var(--text-secondary)", textDecoration: "line-through" }}>₹{planPrice.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {discountAmt > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ color: "var(--text-muted)" }}>Discount ({discountType === "percent" ? `${discountValue}%` : "Flat"})</span>
                      <span style={{ color: "var(--red)", fontWeight: 600 }}>− ₹{discountAmt.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Payable Amount</span>
                    <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>₹{afterDiscount.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ height: "1px", background: "var(--border-subtle)", margin: "2px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span style={{ color: "var(--text-muted)" }}>Paid Now</span>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>₹{paid.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                    <span style={{ fontWeight: 700, color: isPartial ? "#f59e0b" : "var(--green)" }}>
                      {isPartial ? "⚠️ Balance Due" : "✅ Fully Paid"}
                    </span>
                    <span style={{ fontWeight: 800, color: isPartial ? "#f59e0b" : "var(--green)", fontFamily: "var(--font-display)" }}>
                      ₹{due.toLocaleString("en-IN")}
                    </span>
                  </div>
                  {isPartial && (
                    <div style={{ marginTop: "2px", fontSize: "11px", color: "var(--text-muted)", background: "rgba(245,158,11,0.08)", padding: "5px 8px", borderRadius: "6px" }}>
                      💡 Partial payment — remaining ₹{due.toLocaleString("en-IN")} will be recorded as due.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Notes */}
          <Field label="Notes (Optional)">
            <input
              style={inputStyle} value={notes}
              placeholder={`Renewal — ${selectedPlan || "Plan"}`}
              onChange={e => setNotes(e.target.value)}
              onFocus={e => e.target.style.borderColor = "var(--border-strong)"}
              onBlur={e => e.target.style.borderColor = "var(--border-default)"}
            />
          </Field>

          {/* Error */}
          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px" }}>
              ⚠️ {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
            <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
            <button onClick={handleRenew} disabled={saving} style={{ flex: 2, padding: "10px", borderRadius: "var(--radius-sm)", background: saving ? "var(--bg-elevated)" : "var(--green-bg)", border: saving ? "1px solid var(--border-default)" : "1px solid rgba(74,222,128,0.4)", color: saving ? "var(--text-muted)" : "var(--green)", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
              <FaSyncAlt style={{ fontSize: "11px" }} /> {saving ? "Renewing..." : "CONFIRM RENEWAL"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Members({ onLogout }) {
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifyMember, setNotifyMember] = useState(null);
  const [profileMember, setProfileMember] = useState(null);
  const [renewMember, setRenewMember] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => { fetchMembers(1, ""); fetchPlans(); }, []);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchMembers(1, search), 380);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchPlans = async () => { try { const r = await api.get("/membership-plans?status=active"); setPlans(r.data.data || []); } catch (e) { } };
  const fetchMembers = async (page = 1, q = "") => {
    setLoading(true);
    try { const r = await api.get(`/members?page=${page}&limit=10&search=${encodeURIComponent(q)}`); setMembers(r.data.data || []); setPagination(r.data.pagination || {}); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handlePlanSelect = (planName) => {
    setF("membership_type", planName);
    const p = plans.find(pl => pl.name === planName);
    if (p) {
      const start = new Date(), end = new Date();
      end.setDate(end.getDate() + p.duration_days);
      setF("membership_start", start.toISOString().split("T")[0]);
      setF("membership_end", end.toISOString().split("T")[0]);
    }
  };

  const openAdd = () => { setForm(EMPTY); setEditingId(null); setFormError(""); setShowModal(true); };
  const openEdit = (m) => {
    setForm({ full_name: m.full_name || "", email: m.email || "", phone: m.phone || "", address: m.address || "", gender: m.gender || "", date_of_birth: m.date_of_birth?.split("T")[0] || "", membership_type: m.membership_type || "", membership_start: m.membership_start?.split("T")[0] || "", membership_end: m.membership_end?.split("T")[0] || "", status: m.status || "active" });
    setEditingId(m.id); setFormError(""); setShowModal(true);
  };

  const handleSave = async () => {
    setFormError("");
    if (!form.full_name || !form.email || !form.phone) { setFormError("Name, email, and phone are required."); return; }
    setSaving(true);
    try {
      if (editingId) await api.put(`/members/${editingId}`, form);
      else await api.post("/members", form);
      setShowModal(false); fetchMembers(pagination.page, search);
    } catch (e) { setFormError(e.response?.data?.message || "Failed to save."); }
    finally { setSaving(false); }
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const plansByType = plans.reduce((a, p) => { if (!a[p.duration_type]) a[p.duration_type] = []; a[p.duration_type].push(p); return a; }, {});
  const TYPE_LABEL = { monthly: "Monthly Plans", quarterly: "Quarterly Plans", yearly: "Yearly Plans" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* Header */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>Members</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>{pagination.total} total member{pagination.total !== 1 ? "s" : ""} registered</p>
          </div>
          <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "var(--radius-sm)", background: "var(--text-primary)", color: "#0a0a0a", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.03em", transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.85"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            <FaPlus style={{ fontSize: "11px" }} /> ADD MEMBER
          </button>
        </div>

        {/* Table Card */}
        <div className="fade-up stagger-1" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
          {/* Search */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: "360px" }}>
              <FaSearch style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: "12px" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, phone…" style={{ ...inputStyle, paddingLeft: "34px", width: "100%", boxSizing: "border-box" }} />
            </div>
            {search && <button onClick={() => setSearch("")} style={{ padding: "8px", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}><FaTimes style={{ fontSize: "12px" }} /></button>}
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "var(--bg-elevated)" }}>
                  {["Name", "Contact", "Membership Plan", "Period", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border-subtle)", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}><div style={{ height: "12px", borderRadius: "4px", background: "var(--bg-elevated)", width: j === 0 ? "140px" : "80px" }} /></td>)}</tr>)
                ) : members.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                    <FaUsers style={{ fontSize: "32px", opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
                    {search ? `No members match "${search}"` : "No members yet. Add your first one!"}
                  </td></tr>
                ) : (
                  members.map(m => {
                    const days = daysLeft(m.membership_end);
                    const warn = days !== null && days <= 7 && days >= 0;
                    return (
                      <tr key={m.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.1s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "12px 14px" }}>
                          <div
                            onClick={() => setProfileMember(m)}
                            style={{ fontWeight: 600, color: "var(--text-primary)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px" }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--blue)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-primary)"}
                            title="Click to view profile"
                          >
                            <FaUser style={{ fontSize: "9px", opacity: 0.4 }} />
                            {m.full_name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{m.email}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ color: "var(--text-secondary)" }}>{m.email || "—"}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{m.phone}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}><MembershipBadge type={m.membership_type} plans={plans} /></td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{fmt(m.membership_start)}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>→ {fmt(m.membership_end)}</div>
                        </td>
                        <td style={{ padding: "14px 16px" }}><StatusBadge status={m.status} /></td>
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            {/* Renew */}
                            <button onClick={() => setRenewMember(m)} title="Renew Membership" style={{ padding: "5px 9px", borderRadius: "var(--radius-sm)", background: "var(--green-bg)", border: "1px solid rgba(74,222,128,0.25)", color: "var(--green)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                              <FaSyncAlt style={{ fontSize: "10px" }} /> Renew
                            </button>
                            {/* Notify — Email + WhatsApp */}
                            <button
                              onClick={() => setNotifyMember(m)}
                              title="Send Email or WhatsApp"
                              style={{ padding: "5px 9px", borderRadius: "var(--radius-sm)", background: warn ? "rgba(245,158,11,0.1)" : "var(--bg-elevated)", border: warn ? "1px solid rgba(245,158,11,0.35)" : "1px solid var(--border-default)", color: warn ? "#f59e0b" : "var(--text-secondary)", cursor: "pointer", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px", transition: "all 0.15s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(37,211,102,0.1)"; e.currentTarget.style.borderColor = "#25d36655"; e.currentTarget.style.color = "#25d366"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = warn ? "rgba(245,158,11,0.1)" : "var(--bg-elevated)"; e.currentTarget.style.borderColor = warn ? "rgba(245,158,11,0.35)" : "var(--border-default)"; e.currentTarget.style.color = warn ? "#f59e0b" : "var(--text-secondary)"; }}
                            >
                              <FaEnvelope style={{ fontSize: "10px" }} /> Notify
                            </button>
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
          {pagination.totalPages > 1 && (
            <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Page {pagination.page} of {pagination.totalPages} — {pagination.total} members</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => fetchMembers(pagination.page - 1, search)} disabled={pagination.page === 1} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: pagination.page === 1 ? "var(--text-muted)" : "var(--text-secondary)", cursor: pagination.page === 1 ? "not-allowed" : "pointer" }}><FaChevronLeft /></button>
                <button onClick={() => fetchMembers(pagination.page + 1, search)} disabled={pagination.page === pagination.totalPages} style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: pagination.page === pagination.totalPages ? "var(--text-muted)" : "var(--text-secondary)", cursor: pagination.page === pagination.totalPages ? "not-allowed" : "pointer" }}><FaChevronRight /></button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Notify Modal */}
      {notifyMember && <NotifyModal member={notifyMember} onClose={() => setNotifyMember(null)} />}

      {/* Member Profile Drawer */}
      <MemberProfileDrawer
        member={profileMember}
        onClose={() => setProfileMember(null)}
        onEdit={(m) => {
          setProfileMember(null);
          openEdit(m);
        }}
      />

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="fade-up" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", borderRadius: "var(--radius-xl)", padding: "28px", width: "100%", maxWidth: "580px", boxShadow: "var(--shadow-lg)", maxHeight: "92vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "20px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{editingId ? "Edit Member" : "Add Member"}</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>{editingId ? "Update member details" : "Register a new gym member"}</p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-muted)", cursor: "pointer", borderRadius: "var(--radius-sm)", width: "30px", height: "30px", display: "flex", alignItems: "center", justifyContent: "center" }}><FaTimes style={{ fontSize: "12px" }} /></button>
            </div>
            <div style={{ height: "1px", background: "var(--border-subtle)", marginBottom: "22px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Full Name *"><input style={inputStyle} value={form.full_name} onChange={e => setF("full_name", e.target.value)} placeholder="Enter full name" onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} /></Field></div>
              <Field label="Email Address *"><input style={inputStyle} type="email" value={form.email} onChange={e => setF("email", e.target.value)} placeholder="email@example.com" onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} /></Field>
              <Field label="Phone Number *"><input style={inputStyle} value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="9876543210" onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} /></Field>
              <Field label="Gender"><select style={inputStyle} value={form.gender} onChange={e => setF("gender", e.target.value)}><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
              <Field label="Date of Birth"><input style={inputStyle} type="date" value={form.date_of_birth} onChange={e => setF("date_of_birth", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} /></Field>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Address"><input style={inputStyle} value={form.address} onChange={e => setF("address", e.target.value)} placeholder="Enter address" onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} /></Field></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Membership Plan">
                  <select style={inputStyle} value={form.membership_type} onChange={e => handlePlanSelect(e.target.value)}>
                    <option value="">— Select a Plan —</option>
                    {Object.entries(plansByType).map(([type, list]) => (
                      <optgroup key={type} label={TYPE_LABEL[type] || type}>
                        {list.map(p => <option key={p.id} value={p.name}>{p.name} — ₹{Number(p.price).toLocaleString("en-IN")} / {p.duration_days} days</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                {form.membership_type && (() => { const p = plans.find(pl => pl.name === form.membership_type); if (!p) return null; return <div style={{ marginTop: "8px", padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", display: "flex", gap: "20px", flexWrap: "wrap" }}><span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Duration: <strong style={{ color: "var(--text-secondary)" }}>{p.duration_days} days</strong></span><span style={{ fontSize: "12px", color: "var(--text-muted)" }}>Price: <strong style={{ color: "var(--green)" }}>₹{Number(p.price).toLocaleString("en-IN")}</strong></span></div>; })()}
              </div>
              <Field label="Status"><select style={inputStyle} value={form.status} onChange={e => setF("status", e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="expired">Expired</option></select></Field>
              <div />
              <Field label="Membership Start"><input style={inputStyle} type="date" value={form.membership_start} onChange={e => setF("membership_start", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} /></Field>
              <Field label="Membership End"><input style={inputStyle} type="date" value={form.membership_end} onChange={e => setF("membership_end", e.target.value)} onFocus={e => e.target.style.borderColor = "var(--border-strong)"} onBlur={e => e.target.style.borderColor = "var(--border-default)"} /></Field>
              <div style={{ gridColumn: "1 / -1" }}><p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>💡 Start/end dates are automatically set when a plan is selected.</p></div>
            </div>
            {formError && <div style={{ marginTop: "16px", padding: "11px 14px", borderRadius: "var(--radius-sm)", background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)", color: "var(--red)", fontSize: "13px" }}>{formError}</div>}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--border-subtle)" }}>
              <button onClick={() => setShowModal(false)} style={{ padding: "9px 20px", borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: "9px 24px", borderRadius: "var(--radius-sm)", background: saving ? "var(--bg-elevated)" : "var(--text-primary)", color: saving ? "var(--text-muted)" : "#0a0a0a", border: "none", cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", fontWeight: 700, fontFamily: "var(--font-display)", letterSpacing: "0.03em" }}>
                {saving ? "Saving..." : editingId ? "UPDATE" : "ADD MEMBER"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Membership Modal */}
      {renewMember && (
        <RenewModal
          member={renewMember}
          plans={plans}
          plansByType={plansByType}
          onClose={() => setRenewMember(null)}
          onSuccess={() => { setRenewMember(null); fetchMembers(pagination.page, search); }}
        />
      )}
    </div>
  );
}