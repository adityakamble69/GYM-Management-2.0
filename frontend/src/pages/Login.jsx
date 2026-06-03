import { useState } from "react";
import api from "../services/api";

export default function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
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
    <div style={{
      display: "flex", minHeight: "100vh",
      background: "var(--bg-base)", fontFamily: "var(--font-body)"
    }}>
      {/* Left Panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "60px",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        position: "relative", overflow: "hidden"
      }}>
        {/* Background grid pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: "linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        {/* Big decorative text */}
        <div style={{
          position: "absolute", bottom: "-20px", left: "-10px",
          fontSize: "200px", fontFamily: "var(--font-display)", fontWeight: 800,
          color: "rgba(255,255,255,0.02)", lineHeight: 1, userSelect: "none",
          letterSpacing: "-8px"
        }}>GYM</div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "10px",
            marginBottom: "60px"
          }}>
            <div style={{
              width: "36px", height: "36px", background: "var(--text-primary)",
              borderRadius: "8px", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "18px"
            }}>⚡</div>
            <span style={{
              fontFamily: "var(--font-display)", fontWeight: 700,
              fontSize: "18px", color: "var(--text-primary)", letterSpacing: "0.02em"
            }}>GYMPR<span style={{ color: "var(--text-muted)" }}>O</span></span>
          </div>

          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: "48px",
            fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1,
            marginBottom: "16px", letterSpacing: "-1px"
          }}>
            Manage Your<br />
            <span style={{ color: "var(--text-muted)" }}>Gym Smarter.</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "15px", maxWidth: "340px", lineHeight: 1.7 }}>
            Complete gym management — members, attendance, payments, and reports in one place.
          </p>

          <div style={{ display: "flex", gap: "32px", marginTop: "48px" }}>
            {[["500+", "Members"], ["99%", "Uptime"], ["24/7", "Access"]].map(([val, label]) => (
              <div key={label}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>{val}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div style={{
        width: "480px", display: "flex", flexDirection: "column",
        justifyContent: "center", padding: "60px 50px",
        background: "var(--bg-base)"
      }}>
        <div className="fade-up">
          <h2 style={{
            fontFamily: "var(--font-display)", fontSize: "28px",
            fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px"
          }}>Welcome back</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: "40px", fontSize: "14px" }}>
            Sign in to your admin account
          </p>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{
                display: "block", marginBottom: "8px", fontSize: "12px",
                fontWeight: 600, color: "var(--text-secondary)",
                textTransform: "uppercase", letterSpacing: "0.08em"
              }}>Email Address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@gym.com" required
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "var(--border-strong)"}
                onBlur={e => e.target.style.borderColor = "var(--border-default)"}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: "28px" }}>
              <label style={{
                display: "block", marginBottom: "8px", fontSize: "12px",
                fontWeight: 600, color: "var(--text-secondary)",
                textTransform: "uppercase", letterSpacing: "0.08em"
              }}>Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{
                  width: "100%", padding: "12px 16px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-md)", color: "var(--text-primary)",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "var(--border-strong)"}
                onBlur={e => e.target.style.borderColor = "var(--border-default)"}
              />
            </div>

            {error && (
              <div style={{
                padding: "12px 16px", borderRadius: "var(--radius-md)",
                background: "var(--red-bg)", border: "1px solid rgba(248,113,113,0.2)",
                color: "var(--red)", fontSize: "13px", marginBottom: "20px"
              }}>{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "13px",
                background: loading ? "var(--bg-elevated)" : "var(--text-primary)",
                color: loading ? "var(--text-muted)" : "#0a0a0a",
                border: "none", borderRadius: "var(--radius-md)",
                fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-display)", letterSpacing: "0.05em",
                transition: "all 0.2s"
              }}
            >
              {loading ? "Signing in..." : "SIGN IN →"}
            </button>
          </form>

          <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "32px", textAlign: "center" }}>
            WORKOUT WORLD GYM Management System v2.0
          </p>
        </div>
      </div>
    </div>
  );
}