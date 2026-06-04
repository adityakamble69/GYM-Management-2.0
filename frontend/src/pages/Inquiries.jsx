import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import { useAuth } from "../hooks/useAuth";
import {
  FaSearch, FaTimes, FaTrash, FaChevronLeft, FaChevronRight,
  FaEnvelope, FaPhone, FaClock, FaCheckCircle,
  FaTimesCircle, FaExternalLinkAlt, FaSync
} from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true }) : "";

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
  width:"100%", fontFamily:"var(--font-body)", transition:"border-color 0.15s"
};

// ─── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ inquiry, onClose, onUpdate }) {
  const [status, setStatus] = useState(inquiry.status);
  const [notes,  setNotes]  = useState(inquiry.notes || "");
  const [saving, setSaving] = useState(false);

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

  return (
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
          <div style={{ width:"48px", height:"48px", borderRadius:"50%", background:"var(--bg-active)", border:"1px solid var(--border-strong)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"18px", fontWeight:700, color:"var(--text-secondary)", flexShrink:0 }}>
            {inquiry.full_name?.charAt(0)?.toUpperCase()}
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
                style={{
                  padding:"6px 14px", borderRadius:"99px", fontSize:"12px", fontWeight:600,
                  cursor:"pointer", transition:"all 0.15s",
                  background: status===val ? s.bg    : "var(--bg-elevated)",
                  color:      status===val ? s.color : "var(--text-muted)",
                  border:     status===val ? `1px solid ${s.color}` : "1px solid var(--border-default)"
                }}
              >{s.label}</div>
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
                          <div style={{ width:"32px", height:"32px", borderRadius:"50%", background:"var(--bg-active)", border:"1px solid var(--border-default)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"12px", fontWeight:700, color:"var(--text-secondary)", flexShrink:0 }}>
                            {inq.full_name?.charAt(0)?.toUpperCase()}
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