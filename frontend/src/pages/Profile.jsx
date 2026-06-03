import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import api from "../services/api";
import {
  FaUser, FaEnvelope, FaLock, FaEdit, FaCheck,
  FaTimes, FaShieldAlt, FaCalendarAlt, FaEye, FaEyeSlash
} from "react-icons/fa";

// ── Small helper ──────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

// ── Input Field ───────────────────────────────────────────────────────────────
const Field = ({ label, icon: Icon, type = "text", value, onChange, placeholder, disabled, rightEl }) => (
  <div style={{ marginBottom: "18px" }}>
    <label style={{
      display: "block", marginBottom: "6px", fontSize: "11px", fontWeight: 600,
      color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em"
    }}>{label}</label>
    <div style={{ position: "relative" }}>
      {Icon && (
        <Icon style={{
          position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
          color: "var(--text-muted)", fontSize: "13px", pointerEvents: "none"
        }} />
      )}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        style={{
          width: "100%", padding: `10px ${rightEl ? "40px" : "14px"} 10px ${Icon ? "38px" : "14px"}`,
          boxSizing: "border-box",
          background: disabled ? "var(--bg-base)" : "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-sm)", color: disabled ? "var(--text-muted)" : "var(--text-primary)",
          fontSize: "13px", outline: "none", transition: "border-color 0.2s",
          cursor: disabled ? "not-allowed" : "text"
        }}
        onFocus={e => { if (!disabled) e.target.style.borderColor = "var(--border-strong)"; }}
        onBlur={e => e.target.style.borderColor = "var(--border-default)"}
      />
      {rightEl && (
        <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}>
          {rightEl}
        </div>
      )}
    </div>
  </div>
);

// ── Alert Banner ──────────────────────────────────────────────────────────────
const Alert = ({ msg, type }) => {
  if (!msg) return null;
  const isError = type === "error";
  return (
    <div style={{
      padding: "11px 14px", borderRadius: "var(--radius-sm)", marginBottom: "16px", fontSize: "13px",
      background: isError ? "var(--red-bg)"   : "var(--green-bg)",
      border:     `1px solid ${isError ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
      color:      isError ? "var(--red)"       : "var(--green)",
      display: "flex", alignItems: "center", gap: "8px"
    }}>
      {isError ? <FaTimes style={{ flexShrink: 0 }} /> : <FaCheck style={{ flexShrink: 0 }} />}
      {msg}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Profile({ onLogout }) {
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  // Profile edit state
  const [editMode,  setEditMode]  = useState(false);
  const [fullName,  setFullName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [saving,    setSaving]    = useState(false);
  const [profMsg,   setProfMsg]   = useState({ text: "", type: "" });

  // Password state
  const [curPwd,    setCurPwd]    = useState("");
  const [newPwd,    setNewPwd]    = useState("");
  const [confPwd,   setConfPwd]   = useState("");
  const [showCur,   setShowCur]   = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg,    setPwdMsg]    = useState({ text: "", type: "" });

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get("/profile");
      setProfile(res.data.data);
      setFullName(res.data.data.full_name);
      setEmail(res.data.data.email);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // ── Save profile ────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      setProfMsg({ text: "Name and email are required", type: "error" }); return;
    }
    setSaving(true); setProfMsg({ text: "", type: "" });
    try {
      await api.put("/profile/update", { full_name: fullName, email });
      // Update localStorage so Sidebar shows new name immediately
      const stored = JSON.parse(localStorage.getItem("gym_admin") || "{}");
      localStorage.setItem("gym_admin", JSON.stringify({ ...stored, name: fullName, email }));
      setProfile(p => ({ ...p, full_name: fullName, email }));
      setEditMode(false);
      setProfMsg({ text: "Profile updated successfully!", type: "success" });
      setTimeout(() => setProfMsg({ text: "", type: "" }), 3000);
    } catch (e) {
      setProfMsg({ text: e.response?.data?.message || "Update failed", type: "error" });
    } finally { setSaving(false); }
  };

  const handleCancelEdit = () => {
    setFullName(profile?.full_name || "");
    setEmail(profile?.email || "");
    setEditMode(false);
    setProfMsg({ text: "", type: "" });
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!curPwd || !newPwd || !confPwd) {
      setPwdMsg({ text: "All fields are required", type: "error" }); return;
    }
    if (newPwd !== confPwd) {
      setPwdMsg({ text: "New passwords do not match", type: "error" }); return;
    }
    if (newPwd.length < 6) {
      setPwdMsg({ text: "Password must be at least 6 characters", type: "error" }); return;
    }
    setPwdSaving(true); setPwdMsg({ text: "", type: "" });
    try {
      await api.put("/profile/change-password", {
        current_password: curPwd, new_password: newPwd, confirm_password: confPwd
      });
      setCurPwd(""); setNewPwd(""); setConfPwd("");
      setPwdMsg({ text: "Password changed successfully!", type: "success" });
      setTimeout(() => setPwdMsg({ text: "", type: "" }), 3000);
    } catch (e) {
      setPwdMsg({ text: e.response?.data?.message || "Failed to change password", type: "error" });
    } finally { setPwdSaving(false); }
  };

  // Password strength
  const pwdStrength = () => {
    if (!newPwd) return null;
    if (newPwd.length < 6)  return { label: "Too short", color: "var(--red)",    width: "25%" };
    if (newPwd.length < 8)  return { label: "Weak",      color: "var(--yellow)", width: "50%" };
    if (!/[A-Z]/.test(newPwd) || !/[0-9]/.test(newPwd))
                            return { label: "Medium",    color: "var(--blue)",   width: "70%" };
    return                         { label: "Strong",    color: "var(--green)",  width: "100%" };
  };
  const strength = pwdStrength();

  const eyeBtn = (show, toggle) => (
    <button onClick={toggle} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 0, display: "flex" }}>
      {show ? <FaEyeSlash style={{ fontSize: "13px" }} /> : <FaEye style={{ fontSize: "13px" }} />}
    </button>
  );

  const initials = profile?.full_name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() || "A";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)", fontFamily: "var(--font-body)" }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px", margin: 0 }}>
            Profile
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>
            Manage your account details and password
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "20px", alignItems: "start" }}>

          {/* ── Left: Avatar + Info card ── */}
          <div>
            {/* Avatar card */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)", padding: "28px",
              textAlign: "center", marginBottom: "16px"
            }}>
              {/* Avatar circle */}
              <div style={{
                width: "80px", height: "80px", borderRadius: "50%",
                background: "var(--bg-active)", border: "2px solid var(--border-strong)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 800,
                color: "var(--text-primary)", margin: "0 auto 16px"
              }}>{loading ? "—" : initials}</div>

              <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                {loading ? "—" : profile?.full_name}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "16px" }}>
                {loading ? "—" : profile?.email}
              </div>

              {/* Role badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "6px",
                padding: "5px 14px", borderRadius: "99px", fontSize: "12px", fontWeight: 600,
                background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                color: "var(--text-secondary)"
              }}>
                <FaShieldAlt style={{ fontSize: "10px", color: "var(--green)" }} />
                {profile?.role?.replace("_", " ") || "admin"}
              </span>
            </div>

            {/* Account info card */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)", padding: "20px"
            }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "13px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 14px" }}>
                Account Info
              </h3>
              {[
                { icon: FaUser,        label: "Full Name", value: profile?.full_name },
                { icon: FaEnvelope,    label: "Email",     value: profile?.email },
                { icon: FaShieldAlt,   label: "Role",      value: profile?.role?.replace("_", " ") },
                { icon: FaCalendarAlt, label: "Member Since", value: fmtDate(profile?.created_at) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 0", borderBottom: "1px solid var(--border-subtle)"
                }}>
                  <div style={{
                    width: "28px", height: "28px", borderRadius: "6px",
                    background: "var(--bg-elevated)", display: "flex", alignItems: "center",
                    justifyContent: "center", color: "var(--text-muted)", flexShrink: 0
                  }}>
                    <Icon style={{ fontSize: "11px" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                    <div style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 500, textTransform: "capitalize" }}>
                      {loading ? "—" : value || "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: Edit profile + Change password ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

            {/* Edit Profile Card */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)", padding: "24px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    Edit Profile
                  </h3>
                  <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Update your name and email</p>
                </div>
                {!editMode && (
                  <button onClick={() => setEditMode(true)} style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "7px 14px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: "12px"
                  }}>
                    <FaEdit style={{ fontSize: "10px" }} /> Edit
                  </button>
                )}
              </div>

              <Alert msg={profMsg.text} type={profMsg.type} />

              <Field label="Full Name" icon={FaUser}     value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name"  disabled={!editMode} />
              <Field label="Email"     icon={FaEnvelope} value={email}    onChange={e => setEmail(e.target.value)}    placeholder="your@email.com"   disabled={!editMode} />

              <div style={{ marginBottom: "0" }}>
                <label style={{
                  display: "block", marginBottom: "6px", fontSize: "11px", fontWeight: 600,
                  color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em"
                }}>Role</label>
                <input value={profile?.role?.replace("_", " ") || ""} disabled style={{
                  width: "100%", padding: "10px 14px", boxSizing: "border-box",
                  background: "var(--bg-base)", border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)", color: "var(--text-muted)",
                  fontSize: "13px", cursor: "not-allowed", textTransform: "capitalize"
                }} />
              </div>

              {editMode && (
                <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                  <button onClick={handleCancelEdit} style={{
                    flex: 1, padding: "10px", borderRadius: "var(--radius-sm)",
                    background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}>
                    <FaTimes style={{ fontSize: "11px" }} /> Cancel
                  </button>
                  <button onClick={handleSaveProfile} disabled={saving} style={{
                    flex: 1, padding: "10px", borderRadius: "var(--radius-sm)",
                    background: saving ? "var(--bg-elevated)" : "var(--text-primary)",
                    color: saving ? "var(--text-muted)" : "#0a0a0a",
                    border: "none", cursor: saving ? "not-allowed" : "pointer",
                    fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
                  }}>
                    <FaCheck style={{ fontSize: "11px" }} />
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            {/* Change Password Card */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)", padding: "24px"
            }}>
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                  Change Password
                </h3>
                <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "3px" }}>Keep your account secure</p>
              </div>

              <Alert msg={pwdMsg.text} type={pwdMsg.type} />

              <Field label="Current Password" icon={FaLock} type={showCur ? "text" : "password"}
                value={curPwd} onChange={e => setCurPwd(e.target.value)}
                placeholder="Enter current password"
                rightEl={eyeBtn(showCur, () => setShowCur(v => !v))} />

              <Field label="New Password" icon={FaLock} type={showNew ? "text" : "password"}
                value={newPwd} onChange={e => setNewPwd(e.target.value)}
                placeholder="Enter new password"
                rightEl={eyeBtn(showNew, () => setShowNew(v => !v))} />

              {/* Password strength bar */}
              {strength && (
                <div style={{ marginTop: "-12px", marginBottom: "18px" }}>
                  <div style={{ height: "3px", background: "var(--bg-elevated)", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: strength.width, background: strength.color, borderRadius: "99px", transition: "all 0.3s" }} />
                  </div>
                  <div style={{ fontSize: "10px", color: strength.color, marginTop: "4px", fontWeight: 600 }}>{strength.label}</div>
                </div>
              )}

              <Field label="Confirm New Password" icon={FaLock} type={showConf ? "text" : "password"}
                value={confPwd} onChange={e => setConfPwd(e.target.value)}
                placeholder="Confirm new password"
                rightEl={eyeBtn(showConf, () => setShowConf(v => !v))} />

              {/* Match indicator */}
              {confPwd && newPwd && (
                <div style={{
                  marginTop: "-12px", marginBottom: "16px", fontSize: "11px", fontWeight: 600,
                  color: confPwd === newPwd ? "var(--green)" : "var(--red)",
                  display: "flex", alignItems: "center", gap: "5px"
                }}>
                  {confPwd === newPwd ? <FaCheck style={{ fontSize: "9px" }} /> : <FaTimes style={{ fontSize: "9px" }} />}
                  {confPwd === newPwd ? "Passwords match" : "Passwords do not match"}
                </div>
              )}

              <button onClick={handleChangePassword} disabled={pwdSaving} style={{
                width: "100%", padding: "11px", borderRadius: "var(--radius-sm)",
                background: pwdSaving ? "var(--bg-elevated)" : "var(--text-primary)",
                color: pwdSaving ? "var(--text-muted)" : "#0a0a0a",
                border: "none", cursor: pwdSaving ? "not-allowed" : "pointer",
                fontWeight: 700, fontSize: "13px", fontFamily: "var(--font-display)",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px"
              }}>
                <FaLock style={{ fontSize: "11px" }} />
                {pwdSaving ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}