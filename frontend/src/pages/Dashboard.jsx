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

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt     = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, bg, sub, onClick, trend, trendLabel }) => (
  <div
    onClick={onClick}
    style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)", padding: "22px",
      cursor: onClick ? "pointer" : "default", transition: "all 0.2s",
      position: "relative", overflow: "hidden"
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-2px)"; }}}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-subtle)"; e.currentTarget.style.transform = "translateY(0)"; }}
  >
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: color, opacity: 0.6 }} />
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color }}>
        <Icon style={{ fontSize: "15px" }} />
      </div>
      {onClick && <FaArrowRight style={{ color: "var(--text-muted)", fontSize: "11px" }} />}
    </div>
    <div style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, marginBottom: "5px" }}>
      {value ?? "—"}
    </div>
    <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "3px" }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px", fontSize: "11px", color: trend >= 0 ? "var(--green)" : "var(--red)" }}>
        {trend >= 0 ? <FaArrowUp /> : <FaArrowDown />}
        {Math.abs(trend)} {trendLabel || "vs yesterday"}
      </div>
    )}
  </div>
);

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px", padding: "10px 14px" }}>
      <p style={{ color: "var(--text-muted)", fontSize: "11px", marginBottom: "4px" }}>{label}</p>
      <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "14px" }}>
        {prefix}{typeof payload[0].value === "number" ? payload[0].value.toLocaleString("en-IN") : payload[0].value}{suffix}
      </p>
    </div>
  );
};

// ── Recent Payment Row ────────────────────────────────────────────────────────
const PaymentRow = ({ p }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "10px 0", borderBottom: "1px solid var(--border-subtle)"
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{
        width: "32px", height: "32px", borderRadius: "50%",
        background: "var(--bg-active)", display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", flexShrink: 0
      }}>
        {p.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
      </div>
      <div>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.full_name}</div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{p.payment_for?.replace("_", " ")} · {p.payment_method}</div>
      </div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--green)", fontFamily: "var(--font-display)" }}>{fmt(p.amount)}</div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{fmtDate(p.payment_date)}</div>
    </div>
  </div>
);

// ── Member Row ────────────────────────────────────────────────────────────────
const MemberRow = ({ m }) => {
  const statusColor = m.status === "active" ? "var(--green)" : m.status === "expired" ? "var(--red)" : "var(--yellow)";
  const statusBg    = m.status === "active" ? "var(--green-bg)" : m.status === "expired" ? "var(--red-bg)" : "var(--yellow-bg)";
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "10px 0", borderBottom: "1px solid var(--border-subtle)"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "50%",
          background: "var(--bg-active)", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", flexShrink: 0
        }}>
          {m.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{m.full_name}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.membership_type} · {m.phone}</div>
        </div>
      </div>
      <span style={{
        padding: "3px 9px", borderRadius: "99px", fontSize: "11px",
        fontWeight: 600, background: statusBg, color: statusColor, textTransform: "capitalize"
      }}>{m.status}</span>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard({ onLogout }) {
  const navigate = useNavigate();
  const { admin } = useAuth();

  // Data states
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

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchAll(true), 120000);
    return () => clearInterval(interval);
  }, []);

  const hour  = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Derived values
  const statusBreakdown = attendStats?.statusBreakdown || [];
  const activeMembers   = statusBreakdown.find(r => r.status === "active")?.count  || 0;
  const expiredMembers  = statusBreakdown.find(r => r.status === "expired")?.count || 0;
  const attendTrend     = attendStats ? (attendStats.todayCount - attendStats.yesterdayCount) : undefined;
  const payTrend        = payStats    ? (Number(payStats.thisMonth) - Number(payStats.lastMonth)) : undefined;

  const membershipPie = attendStats?.membershipBreakdown?.map(r => ({ name: r.membership_type, value: r.count })) || [];
  const PIE_COLORS    = ["#e0e0e0", "#888888", "#444444", "#222222"];

  const revenueChart = payStats?.monthly6 || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "4px" }}>
            {greet}, <span style={{ color: "var(--text-secondary)" }}>{admin.name?.split(" ")[0] || "Admin"}</span> 👋
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
              Dashboard
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {lastUpdated && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
              <button
                onClick={() => fetchAll(true)}
                disabled={refreshing}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "6px 12px", borderRadius: "var(--radius-sm)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  color: "var(--text-secondary)", cursor: refreshing ? "not-allowed" : "pointer",
                  fontSize: "12px"
                }}
              >
                <FaSync style={{ fontSize: "10px", animation: refreshing ? "spin 1s linear infinite" : "none" }} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <div style={{
                padding: "5px 12px", borderRadius: "99px",
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                fontSize: "11px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px"
              }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--green)" }} />
                {admin.role?.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>

        {/* ── Top Stat Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "14px", marginBottom: "24px" }}>
          <StatCard
            icon={FaClipboardCheck} color="var(--green)"  bg="var(--green-bg)"
            label="Today's Attendance" value={loading ? "—" : attendStats?.todayCount ?? 0}
            trend={attendTrend} trendLabel="vs yesterday"
            onClick={() => navigate("/attendance")}
          />
          <StatCard
            icon={FaUsers}          color="var(--blue)"   bg="var(--blue-bg)"
            label="Active Members"  value={loading ? "—" : activeMembers}
            sub={`${expiredMembers} expired`}
            onClick={() => navigate("/members")}
          />
          <StatCard
            icon={FaUserTie}        color="var(--yellow)" bg="var(--yellow-bg)"
            label="Active Trainers" value={loading ? "—" : trainerStats?.active ?? 0}
            sub={`${trainerStats?.total ?? 0} total`}
            onClick={() => navigate("/trainers")}
          />
          <StatCard
            icon={FaRupeeSign}      color="var(--accent)" bg="rgba(255,255,255,0.05)"
            label="This Month"      value={loading ? "—" : fmt(payStats?.thisMonth)}
            trend={payTrend} trendLabel="vs last month"
            onClick={() => navigate("/payments")}
          />
        </div>

        {/* ── Secondary Stats Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[
            { icon: FaCheckCircle,        color: "var(--green)",  label: "This Week Checkins",   value: loading ? "—" : attendStats?.weekCount ?? 0 },
            { icon: FaTimesCircle,        color: "var(--red)",    label: "Expired Members",      value: loading ? "—" : expiredMembers },
            { icon: FaClock,              color: "var(--yellow)", label: "Pending Payments",     value: loading ? "—" : payStats?.pendingCount ?? 0 },
            { icon: FaExclamationTriangle,color: "#888",          label: "Pending Amount",       value: loading ? "—" : fmt(payStats?.pendingAmount) },
            { icon: FaRupeeSign,          color: "var(--green)",  label: "Today's Revenue",      value: loading ? "—" : fmt(payStats?.todayRevenue) },
            { icon: FaRupeeSign,          color: "var(--blue)",   label: "Total Revenue",        value: loading ? "—" : fmt(payStats?.totalRevenue) },
          ].map(({ icon: Icon, color, label, value }) => (
            <div key={label} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)", padding: "16px 18px"
            }}>
              <Icon style={{ fontSize: "13px", color, marginBottom: "10px" }} />
              <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, marginBottom: "4px" }}>{value}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Charts Row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

          {/* Weekly Attendance Chart */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "22px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Weekly Attendance</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Last 7 days check-ins</p>
              </div>
              <button onClick={() => navigate("/attendance")} style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
                borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)", color: "var(--text-muted)",
                cursor: "pointer", fontSize: "11px"
              }}>View <FaArrowRight style={{ fontSize: "9px" }} /></button>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={weekly} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e0e0e0" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#e0e0e0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip suffix=" checkins" />} />
                <Area type="monotone" dataKey="count" stroke="#e0e0e0" strokeWidth={2} fill="url(#attendGrad)"
                  dot={{ fill: "#e0e0e0", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: "#fff" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly Revenue Chart */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "22px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Monthly Revenue</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Last 6 months</p>
              </div>
              <button onClick={() => navigate("/payments")} style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
                borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)", color: "var(--text-muted)",
                cursor: "pointer", fontSize: "11px"
              }}>View <FaArrowRight style={{ fontSize: "9px" }} /></button>
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={revenueChart} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false}
                  tickFormatter={v => "₹" + (v / 1000).toFixed(0) + "k"} />
                <Tooltip content={<ChartTooltip prefix="₹" />} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {revenueChart.map((_, i) => (
                    <Cell key={i} fill={i === revenueChart.length - 1 ? "#f0f0f0" : "#333333"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Bottom Row: Membership Pie + Recent Payments + Recent Members ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1.4fr", gap: "16px" }}>

          {/* Membership Breakdown */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "22px"
          }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>Membership Types</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "16px" }}>Distribution</p>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie
                  data={membershipPie.length ? membershipPie : [{ name: "No data", value: 1 }]}
                  cx="50%" cy="50%" innerRadius={35} outerRadius={60}
                  paddingAngle={3} dataKey="value"
                >
                  {(membershipPie.length ? membershipPie : [{ name: "No data" }]).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "8px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: "12px" }}>
              {membershipPie.map((item, i) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: PIE_COLORS[i], flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "22px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Recent Payments</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Latest 5 transactions</p>
              </div>
              <button onClick={() => navigate("/payments")} style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
                borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)", color: "var(--text-muted)",
                cursor: "pointer", fontSize: "11px"
              }}>All <FaArrowRight style={{ fontSize: "9px" }} /></button>
            </div>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ height: "12px", width: "120px", borderRadius: "4px", background: "var(--bg-elevated)" }} />
                  <div style={{ height: "12px", width: "60px",  borderRadius: "4px", background: "var(--bg-elevated)" }} />
                </div>
              ))
            ) : recentPay.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No payments yet</p>
            ) : (
              recentPay.map(p => <PaymentRow key={p.id} p={p} />)
            )}
          </div>

          {/* Recent Members */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "22px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Recent Members</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Latest 5 joined</p>
              </div>
              <button onClick={() => navigate("/members")} style={{
                display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px",
                borderRadius: "var(--radius-sm)", background: "var(--bg-elevated)",
                border: "1px solid var(--border-default)", color: "var(--text-muted)",
                cursor: "pointer", fontSize: "11px"
              }}>All <FaArrowRight style={{ fontSize: "9px" }} /></button>
            </div>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between" }}>
                  <div style={{ height: "12px", width: "120px", borderRadius: "4px", background: "var(--bg-elevated)" }} />
                  <div style={{ height: "12px", width: "50px",  borderRadius: "4px", background: "var(--bg-elevated)" }} />
                </div>
              ))
            ) : recentMem.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No members yet</p>
            ) : (
              recentMem.map(m => <MemberRow key={m.id} m={m} />)
            )}
          </div>
        </div>

        {/* Spin animation */}
        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>

      </main>
    </div>
  );
}