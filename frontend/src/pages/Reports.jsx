import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  FaChartBar, FaUsers, FaClipboardCheck,
  FaFilePdf, FaFileExcel, FaRupeeSign,
  FaUserCheck, FaCalendarAlt
} from "react-icons/fa";
import ReportDrillDownModal from "../components/ReportDrillDownModal";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// ── Constants ──────────────────────────────────────────────────────────────────
const TABS = [
  { key: "revenue",    label: "Revenue",         icon: FaRupeeSign },
  { key: "members",    label: "Member Growth",   icon: FaUsers },
  { key: "attendance", label: "Attendance",      icon: FaClipboardCheck },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const chartColors = {
  blue:   "rgba(96,165,250,1)",
  blueBg: "rgba(96,165,250,0.15)",
  green:  "rgba(52,211,153,1)",
  greenBg:"rgba(52,211,153,0.15)",
  purple: "rgba(167,139,250,1)",
  purpleBg:"rgba(167,139,250,0.15)",
  yellow: "rgba(251,191,36,1)",
  red:    "rgba(248,113,113,1)",
  redBg:  "rgba(248,113,113,0.15)",
};

const chartOptions = (title) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: "#9ca3af", font: { size: 12 } } },
    title:  { display: false },
    tooltip: {
      backgroundColor: "#1a1a1a",
      titleColor: "#f9fafb",
      bodyColor:  "#9ca3af",
      borderColor:"#2a2a2a",
      borderWidth: 1,
    }
  },
  scales: {
    x: { ticks: { color: "#6b7280" }, grid: { color: "rgba(255,255,255,0.04)" } },
    y: { ticks: { color: "#6b7280" }, grid: { color: "rgba(255,255,255,0.04)" } },
  }
});

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color = "#60a5fa", sub }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)", padding: "20px 24px",
      display: "flex", alignItems: "center", gap: "16px"
    }}>
      <div style={{
        width: "44px", height: "44px", borderRadius: "10px", flexShrink: 0,
        background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Icon style={{ color, fontSize: "18px" }} />
      </div>
      <div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-display)" }}>
          {value}
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Chart Card ─────────────────────────────────────────────────────────────────
function ChartCard({ title, height = 280, children }) {
  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)", padding: "20px 24px"
    }}>
      <h3 style={{
        fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700,
        color: "var(--text-primary)", marginBottom: "20px"
      }}>{title}</h3>
      <div style={{ height: `${height}px` }}>{children}</div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Reports({ onLogout }) {
  const [activeTab, setActiveTab] = useState("revenue");
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [drillMonth, setDrillMonth] = useState(null);

  const years = Array.from({ length: 4 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchData();
  }, [activeTab, year]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${activeTab}`, { params: { year } });
      setData(res.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  // ── Build monthly array (fill missing months with 0) ──────────────────────
  const buildMonthly = (rows, key) => {
    return MONTHS.map((_, i) => {
      const found = rows?.find(r => r.month === i + 1);
      return found ? Number(found[key]) : 0;
    });
  };

  // ── EXPORT PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF();
    const title = `GymPro — ${TABS.find(t => t.key === activeTab)?.label} Report ${year}`;

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    if (activeTab === "revenue" && data?.monthly) {
      autoTable(doc, {
        startY: 38,
        head: [["Month", "Revenue (₹)", "Transactions"]],
        body: MONTHS.map((m, i) => {
          const row = data.monthly.find(r => r.month === i + 1);
          return [m, row ? `₹${Number(row.total).toLocaleString("en-IN")}` : "₹0", row?.count || 0];
        }),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30], textColor: [200, 200, 200] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      });
    }

    if (activeTab === "members" && data?.monthly) {
      autoTable(doc, {
        startY: 38,
        head: [["Month", "New Members"]],
        body: MONTHS.map((m, i) => {
          const row = data.monthly.find(r => r.month === i + 1);
          return [m, row?.new_members || 0];
        }),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30], textColor: [200, 200, 200] },
      });
    }

    if (activeTab === "attendance" && data?.monthly) {
      autoTable(doc, {
        startY: 38,
        head: [["Month", "Total", "Present", "Absent"]],
        body: MONTHS.map((m, i) => {
          const row = data.monthly.find(r => r.month === i + 1);
          return [m, row?.total || 0, row?.present || 0, row?.absent || 0];
        }),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 30, 30], textColor: [200, 200, 200] },
      });
    }

    doc.save(`gymro_${activeTab}_report_${year}.pdf`);
  };

  // ── EXPORT EXCEL ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    let sheetData = [];

    if (activeTab === "revenue" && data?.monthly) {
      sheetData = MONTHS.map((m, i) => {
        const row = data.monthly.find(r => r.month === i + 1);
        return { Month: m, "Revenue (₹)": row?.total || 0, Transactions: row?.count || 0 };
      });
    }
    if (activeTab === "members" && data?.monthly) {
      sheetData = MONTHS.map((m, i) => {
        const row = data.monthly.find(r => r.month === i + 1);
        return { Month: m, "New Members": row?.new_members || 0 };
      });
    }
    if (activeTab === "attendance" && data?.monthly) {
      sheetData = MONTHS.map((m, i) => {
        const row = data.monthly.find(r => r.month === i + 1);
        return { Month: m, Total: row?.total || 0, Present: row?.present || 0, Absent: row?.absent || 0 };
      });
    }

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `gymro_${activeTab}_report_${year}.xlsx`);
  };

  // ── RENDER REVENUE TAB ────────────────────────────────────────────────────
  const renderRevenue = () => {
    if (!data) return null;
    const { summary, monthly, byMethod } = data;
    const monthlyTotals = buildMonthly(monthly, "total");

    return (
      <>
        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
          <StatCard icon={FaRupeeSign} label="This Year"   value={`₹${Number(summary?.this_year||0).toLocaleString("en-IN")}`}  color="#60a5fa" />
          <StatCard icon={FaRupeeSign} label="Last Year"   value={`₹${Number(summary?.last_year||0).toLocaleString("en-IN")}`}  color="#a78bfa" />
          <StatCard icon={FaRupeeSign} label="This Month"  value={`₹${Number(summary?.this_month||0).toLocaleString("en-IN")}`} color="#34d399" />
          <StatCard icon={FaRupeeSign} label="All Time"    value={`₹${Number(summary?.all_time||0).toLocaleString("en-IN")}`}   color="#fbbf24" />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <ChartCard title={`Monthly Revenue — ${year}`}>
            <Bar
              data={{
                labels: MONTHS,
                datasets: [{
                  label: "Revenue (₹)",
                  data: monthlyTotals,
                  backgroundColor: chartColors.blueBg,
                  borderColor: chartColors.blue,
                  borderWidth: 2, borderRadius: 6,
                }]
              }}
              options={{
                ...chartOptions(),
                plugins: {
                  ...chartOptions().plugins,
                  tooltip: {
                    ...chartOptions().plugins.tooltip,
                    callbacks: { label: (c) => ` ₹${Number(c.raw).toLocaleString("en-IN")}` }
                  }
                }
              }}
            />
          </ChartCard>

          <ChartCard title="Payment Method Breakdown">
            <Doughnut
              data={{
                labels: byMethod?.map(m => m.payment_method) || [],
                datasets: [{
                  data: byMethod?.map(m => m.total) || [],
                  backgroundColor: [chartColors.blue, chartColors.green, chartColors.purple, chartColors.yellow],
                  borderWidth: 0,
                }]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { color: "#9ca3af", padding: 16, font: { size: 11 } } },
                  tooltip: { ...chartOptions().plugins.tooltip }
                }
              }}
            />
          </ChartCard>
        </div>

        {/* Monthly Table */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", overflow: "hidden"
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
              Monthly Breakdown
            </h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Month", "Revenue", "Transactions", "Avg per Transaction"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((m, i) => {
                const row = monthly?.find(r => r.month === i + 1);
                const total = row?.total || 0;
                const count = row?.count || 0;
                return (
                  <tr key={m}
                    onClick={() => count > 0 && setDrillMonth({ month: i + 1, year })}
                    style={{ borderBottom: "1px solid var(--border-subtle)", cursor: count > 0 ? "pointer" : "default", transition: "background 0.1s" }}
                    onMouseEnter={e => { if (count > 0) e.currentTarget.style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 20px", fontSize: "13px", fontWeight: 500 }}>
                      <span style={{ color: count > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>{m}</span>
                      {count > 0 && <span style={{ marginLeft: "8px", fontSize: "10px", color: "var(--blue)", opacity: 0.7 }}>→ details</span>}
                    </td>
                    <td style={{ padding: "12px 20px", color: total > 0 ? "#34d399" : "var(--text-muted)", fontSize: "13px", fontWeight: 600 }}>
                      ₹{Number(total).toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 20px", color: "var(--text-secondary)", fontSize: "13px" }}>{count}</td>
                    <td style={{ padding: "12px 20px", color: "var(--text-secondary)", fontSize: "13px" }}>
                      {count > 0 ? `₹${Number(total / count).toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // ── RENDER MEMBERS TAB ────────────────────────────────────────────────────
  const renderMembers = () => {
    if (!data) return null;
    const { summary, monthly, byType, byStatus } = data;
    const monthlyNew = buildMonthly(monthly, "new_members");

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
          <StatCard icon={FaUsers}     label="Total Members"      value={summary?.total      || 0} color="#60a5fa" />
          <StatCard icon={FaUserCheck} label="Active Members"     value={summary?.active     || 0} color="#34d399" />
          <StatCard icon={FaUsers}     label="Inactive"           value={summary?.inactive   || 0} color="#f87171" />
          <StatCard icon={FaUsers}     label="Joined This Month"  value={summary?.this_month || 0} color="#fbbf24" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <ChartCard title={`New Members Per Month — ${year}`}>
            <Line
              data={{
                labels: MONTHS,
                datasets: [{
                  label: "New Members",
                  data: monthlyNew,
                  borderColor: chartColors.green,
                  backgroundColor: chartColors.greenBg,
                  borderWidth: 2, fill: true, tension: 0.4,
                  pointBackgroundColor: chartColors.green,
                }]
              }}
              options={chartOptions()}
            />
          </ChartCard>

          <ChartCard title="Membership Type">
            <Doughnut
              data={{
                labels: byType?.map(t => t.membership_type) || [],
                datasets: [{
                  data: byType?.map(t => t.count) || [],
                  backgroundColor: [chartColors.blue, chartColors.green, chartColors.purple, chartColors.yellow, chartColors.red],
                  borderWidth: 0,
                }]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { color: "#9ca3af", padding: 16, font: { size: 11 } } },
                  tooltip: { ...chartOptions().plugins.tooltip }
                }
              }}
            />
          </ChartCard>
        </div>

        {/* Table */}
        <div style={{
          background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)", overflow: "hidden"
        }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Monthly Joins</h3>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                {["Month", "New Members"].map(h => (
                  <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((m, i) => {
                const row = monthly?.find(r => r.month === i + 1);
                const count = row?.new_members || 0;
                return (
                  <tr key={m} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontSize: "13px", fontWeight: 500 }}>{m}</td>
                    <td style={{ padding: "12px 20px", color: count > 0 ? "#60a5fa" : "var(--text-muted)", fontSize: "13px", fontWeight: 600 }}>{count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  // ── RENDER ATTENDANCE TAB ─────────────────────────────────────────────────
  const renderAttendance = () => {
    if (!data) return null;
    const { summary, monthly, weekly, topMembers } = data;
    const monthlyPresent = buildMonthly(monthly, "present");
    const weeklyLabels   = weekly?.map(w => w.day) || [];
    const weeklyCounts   = weekly?.map(w => w.count) || [];

    return (
      <>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px", marginBottom: "24px" }}>
          <StatCard icon={FaClipboardCheck} label="Total Records"  value={summary?.total      || 0} color="#60a5fa" />
          <StatCard icon={FaUserCheck}      label="Total Present"  value={summary?.present    || 0} color="#34d399" />
          <StatCard icon={FaCalendarAlt}    label="Today"          value={summary?.today      || 0} color="#fbbf24" />
          <StatCard icon={FaCalendarAlt}    label="This Month"     value={summary?.this_month || 0} color="#a78bfa" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
          <ChartCard title={`Monthly Attendance — ${year}`}>
            <Bar
              data={{
                labels: MONTHS,
                datasets: [{
                  label: "Present",
                  data: monthlyPresent,
                  backgroundColor: chartColors.purpleBg,
                  borderColor: chartColors.purple,
                  borderWidth: 2, borderRadius: 6,
                }]
              }}
              options={chartOptions()}
            />
          </ChartCard>

          <ChartCard title="Last 30 Days Daily Trend">
            <Line
              data={{
                labels: weeklyLabels,
                datasets: [{
                  label: "Check-ins",
                  data: weeklyCounts,
                  borderColor: chartColors.yellow,
                  backgroundColor: "rgba(251,191,36,0.1)",
                  borderWidth: 2, fill: true, tension: 0.4,
                  pointBackgroundColor: chartColors.yellow,
                }]
              }}
              options={chartOptions()}
            />
          </ChartCard>
        </div>

        {/* Top Members */}
        {topMembers?.length > 0 && (
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", overflow: "hidden"
          }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                Top 5 Most Active Members
              </h3>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {["Rank", "Member", "Membership", "Visits"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topMembers.map((m, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-hover)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "12px 20px", color: "var(--text-muted)", fontSize: "13px" }}>#{i + 1}</td>
                    <td style={{ padding: "12px 20px", color: "var(--text-primary)", fontSize: "13px", fontWeight: 600 }}>{m.full_name}</td>
                    <td style={{ padding: "12px 20px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                        {m.membership_type}
                      </span>
                    </td>
                    <td style={{ padding: "12px 20px", color: "#34d399", fontSize: "13px", fontWeight: 700 }}>{m.visits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  };

  return (
    <>
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "24px 32px", borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)", display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Reports & Analytics
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: "4px 0 0" }}>
              Visual insights from your gym data
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {/* Year selector */}
            <select value={year} onChange={e => setYear(Number(e.target.value))} style={{
              padding: "9px 14px", background: "var(--bg-elevated)",
              border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
              color: "var(--text-primary)", fontSize: "13px", cursor: "pointer", outline: "none"
            }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <button onClick={exportPDF} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "9px 16px", background: "rgba(248,113,113,0.1)",
              border: "1px solid rgba(248,113,113,0.2)", borderRadius: "var(--radius-md)",
              color: "#f87171", cursor: "pointer", fontSize: "13px", fontWeight: 600
            }}>
              <FaFilePdf /> PDF
            </button>

            <button onClick={exportExcel} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "9px 16px", background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.2)", borderRadius: "var(--radius-md)",
              color: "#34d399", cursor: "pointer", fontSize: "13px", fontWeight: 600
            }}>
              <FaFileExcel /> Excel
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
          {/* Tabs */}
          <div style={{
            display: "flex", gap: "4px", marginBottom: "24px",
            background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)", padding: "6px", width: "fit-content"
          }}>
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setActiveTab(key)} style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "9px 20px", borderRadius: "var(--radius-md)",
                border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600,
                background: activeTab === key ? "var(--bg-active)" : "transparent",
                color: activeTab === key ? "var(--text-primary)" : "var(--text-muted)",
                transition: "all 0.15s"
              }}>
                <Icon style={{ fontSize: "13px" }} /> {label}
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>
              Loading report data...
            </div>
          ) : (
            <>
              {activeTab === "revenue"    && renderRevenue()}
              {activeTab === "members"    && renderMembers()}
              {activeTab === "attendance" && renderAttendance()}
            </>
          )}
        </div>
      </main>
    </div>
    <ReportDrillDownModal
      month={drillMonth?.month}
      year={drillMonth?.year}
      onClose={() => setDrillMonth(null)}
    />
    </>
  );
}