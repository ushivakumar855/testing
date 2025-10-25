import React, { useState, useCallback } from "react";

// NOTE: This URL points to a mock Google Apps Script endpoint 
// for demonstration purposes of authentication flow and security implementation.
const APPS_SCRIPT_URL ="https://script.google.com/macros/s/AKfycbzTqKmb1sqsmGhh2g5MgBIw7JWtgYpEQ10cxZYIKFK0Kuitd6I_UYFKoUSoEIMDux1m/exec";

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // SHA-256 helper for client-side password hashing (security simulation)
  const sha256 = useCallback(async (message) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    // Note: crypto.subtle.digest is asynchronous and secure
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const validateEmail = (value) => {
    return /^.+@.+\..+$/.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!validateEmail(normalizedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
      return;
    }

    setLoading(true);
    try {
      // 1. Hash password securely before transmission
      const passwordHash = await sha256(password);

      // 2. Mock API call
      const url = `${APPS_SCRIPT_URL}?action=${
        isLogin ? "login" : "register"
      }&email=${encodeURIComponent(normalizedEmail)}&password=${passwordHash}`;

      const resp = await fetch(url);
      const result = await resp.json();

      if (result.status === "success") {
        // Successful login/register
        onLogin({ email: normalizedEmail, passwordHash }); 
      } else {
        // Handle API-side errors (e.g., user not found)
        setError(result.message || "Authentication failed. Check your credentials.");
      }
    } catch (err) {
      // Handle network errors
      setError("Network or server error: Could not reach the authentication endpoint.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h2 className="section-title center">
          {isLogin ? "Login" : "Register"} to use Resume Analyzer
        </h2>

        <form onSubmit={handleSubmit}>
          <input
            className="text-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />

          <input
            className="text-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          <button type="submit" className="btn primary full-width" disabled={loading}>
            {loading ? (isLogin ? "Logging in..." : "Registering...") : isLogin ? "Login" : "Register"}
          </button>
        </form>

        {error && <p className="error" style={{ color: "#b00020", marginTop: "0.6rem" }}>{error}</p>}

        <div className="switch-auth center" style={{ marginTop: "0.8rem" }}>
          <span style={{ marginRight: "0.5rem" }}>
            {isLogin ? "Need an account?" : "Already have an account?"}
          </span>
          <button
            className="link-button"
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            type="button"
            disabled={loading}
          >
            {isLogin ? "Register" : "Login"}
          </button>
        </div>

        <p className="hint center mt-1" style={{ marginTop: "0.6rem" }}>
          <small>.</small>
        </p>
      </div>
    </div>
  );
}
