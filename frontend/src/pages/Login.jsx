import { useState } from "react";
import api from "../services/api";
import { FaDumbbell, FaEye, FaEyeSlash } from "react-icons/fa";

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      if (res.data.success) onLogin(res.data.token, res.data.admin);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @keyframes meshMove {
          0%   { transform: translate(0, 0) rotate(0deg); }
          33%  { transform: translate(30px, -20px) rotate(120deg); }
          66%  { transform: translate(-20px, 20px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px) rotate(-6deg); }
          50%      { transform: translateY(-12px) rotate(-6deg); }
        }
        .login-input {
          width: 100%; padding: 12px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-family: var(--font-body); font-size: 14px;
          outline: none; transition: all 0.2s;
        }
        .login-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
          background: var(--bg-active);
        }
        .login-input::placeholder { color: var(--text-muted); }
        .stat-pill {
          display: flex; flex-direction: column; align-items: center;
          padding: 16px 24px; border-radius: var(--radius-md);
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-subtle);
          backdrop-filter: blur(8px);
        }
        .feature-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: var(--radius-sm);
          background: rgba(59,130,246,0.06);
          border: 1px solid rgba(59,130,246,0.12);
          margin-bottom: 8px;
          animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards;
        }
      `}</style>

      <div style={{
        display: "flex", minHeight: "100vh",
        background: "var(--bg-base)", fontFamily: "var(--font-body)",
        position: "relative", overflow: "hidden"
      }}>
        {/* Background gradient blobs */}
        <div style={{
          position: "fixed", top: "-200px", left: "-200px",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
          animation: "meshMove 20s ease-in-out infinite", pointerEvents: "none"
        }} />
        <div style={{
          position: "fixed", bottom: "-150px", right: "-100px",
          width: "400px", height: "400px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)",
          animation: "meshMove 15s ease-in-out infinite reverse", pointerEvents: "none"
        }} />

        {/* ── Left Panel ── */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "60px 64px",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
          position: "relative", overflow: "hidden"
        }}>
          {/* Grid pattern */}
          <div style={{
            position: "absolute", inset: 0, opacity: 0.04,
            backgroundImage: `
              linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px"
          }} />
          {/* Diagonal accent line */}
          <div style={{
            position: "absolute", top: 0, right: 0, bottom: 0,
            width: "1px",
            background: "linear-gradient(180deg, transparent, rgba(59,130,246,0.3), transparent)",
          }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "64px" }}>
              <div style={{
                width: "42px", height: "42px",
                background: "var(--grad-blue)",
                borderRadius: "12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 8px 24px rgba(59,130,246,0.35)",
              }}>
                <FaDumbbell style={{ color: "#fff", fontSize: "17px" }} />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "20px", color: "var(--text-primary)", letterSpacing: "0.01em" }}>
                  GymPro
                </div>
                <div style={{ fontSize: "10px", color: "var(--accent-bright)", letterSpacing: "0.12em", opacity: 0.8 }}>
                  MANAGEMENT SYSTEM
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "52px",
              fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.05,
              marginBottom: "20px", letterSpacing: "-1.5px"
            }}>
              Manage Your<br />
              <span style={{
                background: "var(--grad-blue-cyan)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>Gym Smarter.</span>
            </h1>
            <p style={{
              color: "var(--text-secondary)", fontSize: "15px",
              maxWidth: "360px", lineHeight: 1.75, marginBottom: "48px"
            }}>
              Complete gym management — members, attendance, payments, and reports in one powerful dashboard.
            </p>

            {/* Features */}
            {[
              ["👥", "Member & Trainer Management"],
              ["📊", "Real-time Analytics & Reports"],
              ["💳", "Payments & Membership Tracking"],
            ].map(([icon, text], i) => (
              <div key={text} className="feature-row" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
                <span style={{ fontSize: "16px" }}>{icon}</span>
                <span style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>{text}</span>
              </div>
            ))}

            {/* Stats */}
            <div style={{ display: "flex", gap: "12px", marginTop: "40px" }}>
              {[["500+", "Members"], ["99%", "Uptime"], ["24/7", "Access"]].map(([val, label]) => (
                <div key={label} className="stat-pill">
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "22px", fontWeight: 700, color: "var(--accent-bright)" }}>{val}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "2px" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Panel — Login Form ── */}
        <div style={{
          width: "480px", flexShrink: 0,
          display: "flex", flexDirection: "column",
          justifyContent: "center", padding: "60px 48px",
          background: "var(--bg-base)"
        }}>
          <div style={{ animation: "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}>

            <div style={{
              width: "48px", height: "48px", borderRadius: "14px",
              background: "var(--accent-subtle)", border: "1px solid var(--border-blue)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "28px",
              boxShadow: "0 4px 20px rgba(59,130,246,0.15)"
            }}>
              <FaDumbbell style={{ color: "var(--accent)", fontSize: "18px" }} />
            </div>

            <h2 style={{
              fontFamily: "var(--font-display)", fontSize: "30px",
              fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px",
              letterSpacing: "-0.5px"
            }}>Welcome back</h2>
            <p style={{ color: "var(--text-muted)", marginBottom: "36px", fontSize: "14px" }}>
              Sign in to your admin account
            </p>

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Email */}
              <div>
                <label style={{
                  display: "block", marginBottom: "8px", fontSize: "11px",
                  fontWeight: 600, color: "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.1em"
                }}>Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@gym.com" required
                  className="login-input"
                />
              </div>

              {/* Password */}
              <div>
                <label style={{
                  display: "block", marginBottom: "8px", fontSize: "11px",
                  fontWeight: 600, color: "var(--text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.1em"
                }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="login-input"
                    style={{ paddingRight: "44px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{
                      position: "absolute", right: "14px", top: "50%",
                      transform: "translateY(-50%)", background: "none",
                      border: "none", cursor: "pointer",
                      color: "var(--text-muted)", fontSize: "14px",
                      display: "flex", alignItems: "center"
                    }}
                  >
                    {showPass ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{
                  padding: "12px 16px", borderRadius: "var(--radius-md)",
                  background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)",
                  color: "var(--red)", fontSize: "13px",
                  display: "flex", alignItems: "center", gap: "8px"
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                style={{
                  width: "100%", padding: "13px",
                  background: loading ? "var(--bg-elevated)" : "var(--grad-blue)",
                  color: loading ? "var(--text-muted)" : "#fff",
                  border: "none", borderRadius: "var(--radius-md)",
                  fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-display)", letterSpacing: "0.05em",
                  transition: "all 0.2s",
                  boxShadow: loading ? "none" : "0 4px 20px rgba(59,130,246,0.3)",
                  marginTop: "4px"
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(59,130,246,0.4)"; }}}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = loading ? "none" : "0 4px 20px rgba(59,130,246,0.3)"; }}
              >
                {loading ? "Signing in..." : "SIGN IN →"}
              </button>
            </form>

            <p style={{ color: "var(--text-muted)", fontSize: "11px", marginTop: "32px", textAlign: "center", letterSpacing: "0.05em" }}>
              WORKOUT WORLD GYM • Management System v2.0
            </p>
          </div>
        </div>
      </div>
    </>
  );
}