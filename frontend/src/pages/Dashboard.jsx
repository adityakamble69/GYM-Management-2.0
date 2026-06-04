import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  FaUsers, FaUserTie, FaClipboardCheck, FaRupeeSign,
  FaArrowRight, FaArrowUp, FaArrowDown, FaSync,
  FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle
} from "react-icons/fa";
import NotificationBell from "../components/NotificationBell";

const fmt     = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

// ── Stat Card ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, sub, onClick, trend, trendLabel, delay = 0 }) => (
  <div
    onClick={onClick}
    className="fade-up"
    style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)", padding: "22px",
      cursor: onClick ? "pointer" : "default",
      transition: "all 0.22s cubic-bezier(0.16,1,0.3,1)",
      position: "relative", overflow: "hidden",
      animationDelay: `${delay}s`, opacity: 0
    }}
    onMouseEnter={e => {
      if (onClick) {
        e.currentTarget.style.borderColor = color;
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = `0 8px 32px ${color}20`;
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.borderColor = "var(--border-subtle)";
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.boxShadow = "none";
    }}
  >
    {/* Top color bar */}
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: "2px",
      background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.8
    }} />
    {/* Subtle bg glow */}
    <div style={{
      position: "absolute", top: 0, right: 0,
      width: "80px", height: "80px", borderRadius: "50%",
      background: bg, filter: "blur(20px)", opacity: 0.5
    }} />

    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px", position: "relative" }}>
      <div style={{
        width: "38px", height: "38px", borderRadius: "10px",
        background: bg, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center", color,
      }}>
        <Icon style={{ fontSize: "15px" }} />
      </div>
      {onClick && <FaArrowRight style={{ color: "var(--text-muted)", fontSize: "10px", opacity: 0.5 }} />}
    </div>
    <div style={{
      fontFamily: "var(--font-display)", fontSize: "30px",
      fontWeight: 700, color: "var(--text-primary)", lineHeight: 1,
      marginBottom: "5px", position: "relative"
    }}>
      {value ?? "—"}
    </div>
    <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, position: "relative" }}>{label}</div>
    {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px", position: "relative" }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{
        display: "flex", alignItems: "center", gap: "4px",
        marginTop: "10px", fontSize: "11px",
        color: trend >= 0 ? "var(--green)" : "var(--red)",
        position: "relative"
      }}>
        {trend >= 0 ? <FaArrowUp style={{ fontSize: "9px" }} /> : <FaArrowDown style={{ fontSize: "9px" }} />}
        <span>{Math.abs(trend)} {trendLabel || "vs yesterday"}</span>
      </div>
    )}
  </div>
);

// ── Mini Stat ──────────────────────────────────────────────────────────────────
const MiniStat = ({ icon: Icon, label, value, color, delay = 0 }) => (
  <div
    className="fade-up"
    style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)", padding: "16px 18px",
      transition: "all 0.18s", animationDelay: `${delay}s`, opacity: 0
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = "var(--bg-elevated)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
  >
    <Icon style={{ fontSize: "13px", color, marginBottom: "10px" }} />
    <div style={{
      fontFamily: "var(--font-display)", fontSize: "19px", fontWeight: 700,
      color: "var(--text-primary)", lineHeight: 1, marginBottom: "4px"
    }}>{value}</div>
    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{label}</div>
  </div>
);

// ── Chart Tooltip ──────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-elevated)", border: "1px solid var(--border-strong)",
      borderRadius: "10px", padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
    }}>
      <p style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "4px" }}>{label}</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}>
        {prefix}{typeof payload[0].value === "number" ? payload[0].value.toLocaleString("en-IN") : payload[0].value}{suffix}
      </p>
    </div>
  );
};

// ── Recent Row Components ──────────────────────────────────────────────────────
const Avatar = ({ name, size = 32 }) => (
  <div style={{
    width: size, height: size, borderRadius: "50%",
    background: "var(--bg-active)", border: "1px solid var(--border-strong)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: size * 0.34 + "px", fontWeight: 700, color: "var(--accent-bright)", flexShrink: 0
  }}>
    {name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?"}
  </div>
);

const PaymentRow = ({ p }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "1px solid var(--border-subtle)"
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <Avatar name={p.full_name} />
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          {p.payment_for?.replace("_", " ")} · {p.payment_method}
        </div>
      </div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-display)" }}>
        {fmt(p.amount)}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmtDate(p.payment_date)}</div>
    </div>
  </div>
);

const MemberRow = ({ m }) => {
  const statusColor = m.status === "active" ? "var(--green)" : m.status === "expired" ? "var(--red)" : "var(--yellow)";
  const statusBg    = m.status === "active" ? "var(--green-bg)" : m.status === "expired" ? "var(--red-bg)" : "var(--yellow-bg)";
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid var(--border-subtle)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <Avatar name={m.full_name} />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{m.full_name}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.membership_type} · {m.phone}</div>
        </div>
      </div>
      <span style={{
        padding: "3px 10px", borderRadius: "99px", fontSize: "11px",
        fontWeight: 600, background: statusBg, color: statusColor, textTransform: "capitalize"
      }}>{m.status}</span>
    </div>
  );
};

// ── Section Card Wrapper ───────────────────────────────────────────────────────
const SectionCard = ({ children, style = {} }) => (
  <div style={{
    background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-lg)", padding: "22px", ...style
  }}>
    {children}
  </div>
);

const SectionHeader = ({ title, sub, onNav }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px" }}>
    <div>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{title}</h3>
      {sub && <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>{sub}</p>}
    </div>
    {onNav && (
      <button onClick={onNav} style={{
        display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
        borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)", color: "var(--text-muted)",
        cursor: "pointer", fontSize: "11px", transition: "all 0.15s"
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-muted)"; }}
      >View <FaArrowRight style={{ fontSize: "9px" }} /></button>
    )}
  </div>
);

const SkeletonRows = ({ n = 4 }) => [...Array(n)].map((_, i) => (
  <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
    <div style={{ display: "flex", gap: "10px", flex: 1 }}>
      <div className="skeleton" style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: "11px", width: "55%", marginBottom: "6px" }} />
        <div className="skeleton" style={{ height: "10px", width: "35%" }} />
      </div>
    </div>
    <div className="skeleton" style={{ height: "11px", width: "60px" }} />
  </div>
));

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const { admin } = useAuth();

  const [attendStats,  setAttendStats]  = useState(null);
  const [weekly,       setWeekly]       = useState([]);
  const [payStats,     setPayStats]     = useState(null);
  const [trainerStats, setTrainerStats] = useState(null);
  const [recentPay,    setRecentPay]    = useState([]);
  const [recentMem,    setRecentMem]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);

  const fetchAll = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [attendRes, weekRes, payRes, trainerRes, recentPayRes, recentMemRes] = await Promise.all([
        api.get("/attendance/stats/summary"),
        api.get("/attendance/stats/weekly"),
        api.get("/payments/stats/summary"),
        api.get("/trainers/stats/summary"),
        api.get("/payments", { params: { limit: 5, page: 1 } }),
        api.get("/members",  { params: { limit: 5, page: 1 } }),
      ]);
      setAttendStats(attendRes.data.data);
      setWeekly(weekRes.data.data.map(d => ({
        ...d,
        label: new Date(d.day).toLocaleDateString("en-IN", { weekday: "short" })
      })));
      setPayStats(payRes.data.data);
      setTrainerStats(trainerRes.data.data);
      setRecentPay(recentPayRes.data.data);
      setRecentMem(recentMemRes.data.data);
      setLastUpdated(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), 120000);
    return () => clearInterval(interval);
  }, []);

  const hour  = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const statusBreakdown = attendStats?.statusBreakdown || [];
  const activeMembers   = statusBreakdown.find(r => r.status === "active")?.count  || 0;
  const expiredMembers  = statusBreakdown.find(r => r.status === "expired")?.count || 0;
  const attendTrend     = attendStats ? (attendStats.todayCount - attendStats.yesterdayCount) : undefined;
  const payTrend        = payStats    ? (Number(payStats.thisMonth) - Number(payStats.lastMonth)) : undefined;

  const membershipPie = attendStats?.membershipBreakdown?.map(r => ({ name: r.membership_type, value: r.count })) || [];
  const PIE_COLORS    = ["#3b82f6", "#06b6d4", "#8b5cf6", "#34d399", "#fbbf24"];
  const revenueChart  = payStats?.monthly6 || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* ── Header ── */}
        <div className="fade-up" style={{ marginBottom: "28px", position: "relative", zIndex: 100 }}>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "4px", letterSpacing: "0.02em" }}>
            {greet},{" "}
            <span style={{
              background: "var(--grad-blue-cyan)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 600
            }}>{admin?.name?.split(" ")[0] || "Admin"}</span> 👋
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 700,
              color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0
            }}>Dashboard</h1>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {lastUpdated && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={() => fetchAll(true)} disabled={refreshing}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "7px 14px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)", cursor: refreshing ? "not-allowed" : "pointer",
                  fontSize: "12px", transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-default)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >
                <FaSync style={{ fontSize: "10px", animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <NotificationBell />
              <div style={{
                padding: "6px 12px", borderRadius: "99px",
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                fontSize: "11px", color: "var(--text-muted)",
                display: "flex", alignItems: "center", gap: "6px"
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
                {admin?.role?.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          <StatCard icon={FaClipboardCheck} color="var(--green)"  bg="var(--green-bg)"
            label="Today's Attendance" value={loading ? "—" : attendStats?.todayCount ?? 0}
            trend={attendTrend} delay={0.05} onClick={() => navigate("/attendance")} />
          <StatCard icon={FaUsers}          color="var(--accent)" bg="var(--accent-subtle)"
            label="Active Members"   value={loading ? "—" : activeMembers}
            sub={`${expiredMembers} expired`} delay={0.10} onClick={() => navigate("/members")} />
          <StatCard icon={FaUserTie}        color="var(--yellow)" bg="var(--yellow-bg)"
            label="Active Trainers"  value={loading ? "—" : trainerStats?.active ?? 0}
            sub={`${trainerStats?.total ?? 0} total`} delay={0.15} onClick={() => navigate("/trainers")} />
          <StatCard icon={FaRupeeSign}      color="var(--cyan)"   bg="var(--cyan-bg)"
            label="This Month Rev"   value={loading ? "—" : fmt(payStats?.thisMonth)}
            trend={payTrend} trendLabel="vs last month" delay={0.20} onClick={() => navigate("/payments")} />
        </div>

        {/* ── Mini Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: "10px", marginBottom: "20px" }}>
          <MiniStat icon={FaCheckCircle}         color="var(--green)"  label="Week Checkins"    value={loading ? "—" : attendStats?.weekCount ?? 0}        delay={0.25} />
          <MiniStat icon={FaTimesCircle}         color="var(--red)"    label="Expired Members"  value={loading ? "—" : expiredMembers}                      delay={0.28} />
          <MiniStat icon={FaClock}               color="var(--yellow)" label="Pending Payments" value={loading ? "—" : payStats?.pendingCount ?? 0}         delay={0.31} />
          <MiniStat icon={FaExclamationTriangle} color="var(--purple)" label="Pending Amount"   value={loading ? "—" : fmt(payStats?.pendingAmount)}        delay={0.34} />
          <MiniStat icon={FaRupeeSign}           color="var(--green)"  label="Today's Revenue"  value={loading ? "—" : fmt(payStats?.todayRevenue)}         delay={0.37} />
          <MiniStat icon={FaRupeeSign}           color="var(--cyan)"   label="Total Revenue"    value={loading ? "—" : fmt(payStats?.totalRevenue)}         delay={0.40} />
        </div>

        {/* ── Charts Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

          {/* Weekly Attendance */}
          <SectionCard>
            <SectionHeader title="Weekly Attendance" sub="Last 7 days check-ins" onNav={() => navigate("/attendance")} />
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={weekly} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix=" checkins" />} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                  fill="url(#attendGrad)"
                  dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, fill: "#60a5fa", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Monthly Revenue */}
          <SectionCard>
            <SectionHeader title="Monthly Revenue" sub="Last 6 months" onNav={() => navigate("/payments")} />
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={revenueChart} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<ChartTooltip prefix="₹" />} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {revenueChart.map((_, i) => (
                    <Cell key={i} fill={i === revenueChart.length - 1 ? "#3b82f6" : "#1e3a5f"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* ── Bottom Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.4fr", gap: "16px" }}>

          {/* Membership Pie */}
          <SectionCard>
            <SectionHeader title="Membership Types" sub="Distribution" />
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie
                  data={membershipPie.length ? membershipPie : [{ name: "No data", value: 1 }]}
                  cx="50%" cy="50%" innerRadius={35} outerRadius={58}
                  paddingAngle={3} dataKey="value"
                >
                  {(membershipPie.length ? membershipPie : [{ name: "No data" }]).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  borderRadius: "8px", fontSize: "12px"
                }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: "10px" }}>
              {membershipPie.map((item, i) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: PIE_COLORS[i], flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Recent Payments */}
          <SectionCard>
            <SectionHeader title="Recent Payments" sub="Latest 5 transactions" onNav={() => navigate("/payments")} />
            {loading ? <SkeletonRows n={4} /> :
              recentPay.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No payments yet</p>
              ) : recentPay.map(p => <PaymentRow key={p.id} p={p} />)
            }
          </SectionCard>

          {/* Recent Members */}
          <SectionCard>
            <SectionHeader title="Recent Members" sub="Latest 5 joined" onNav={() => navigate("/members")} />
            {loading ? <SkeletonRows n={4} /> :
              recentMem.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No members yet</p>
              ) : recentMem.map(m => <MemberRow key={m.id} m={m} />)
            }
          </SectionCard>
        </div>

      </main>
    </div>
  );
}