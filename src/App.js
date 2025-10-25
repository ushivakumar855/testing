import React, { useState, useCallback } from "react";
import ResumeAnalyzer from "./ResumeAnalyzer";
import Chatbot from "./Chatbot";
import Auth from "./Auth";
import "./App.css";

export default function App() {
  const [showChatbot, setShowChatbot] = useState(false);
  // State for login/logout and user credentials for secure file upload
  const [authData, setAuthData] = useState({
    isLoggedIn: false,
    userEmail: null,
    passwordHash: null,
  });

  // Handles successful dummy login, saving credentials for mock storage authorization
  const handleLogin = useCallback(({ email, passwordHash }) => {
    setAuthData({ isLoggedIn: true, userEmail: email, passwordHash });
  }, []);

  const handleLogout = useCallback(() => {
    setAuthData({ isLoggedIn: false, userEmail: null, passwordHash: null });
    // Using an informational message box instead of alert()
    console.log("Logged out. Resume data automatically cleared.");
  }, []);

  return (
    <div className="app">
      {/* HEADER */}
      <header className="hero">
        <div className="hero-content">
          <div className="header-row">
            <h1 className="title-small">🚀 Dynamic Resume Analyzer</h1>
            {authData.isLoggedIn && (
              <div className="auth-info">
                <span className="user-email" title={authData.userEmail}>{authData.userEmail}</span>
                <button className="btn logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
          <p className="subtitle">ATS-aware scoring • Templates • Instant PDF</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        {authData.isLoggedIn ? (
          <ResumeAnalyzer 
            userEmail={authData.userEmail} 
            passwordHash={authData.passwordHash} 
          />
        ) : (
          <Auth onLogin={handleLogin} />
        )}
      </main>

      {/* Floating Chatbot Button (FAB) */}
      {authData.isLoggedIn && (
        <>
          <button
            className={`fab ${showChatbot ? 'fab-active' : ''}`}
            aria-label="Open Resume Assistant"
            onClick={() => setShowChatbot(!showChatbot)}
          >
            {showChatbot ? '✕' : '💬'}
          </button>
          {/* Note: Chatbot component is now always rendered but hidden by CSS for smooth animation */}
          <Chatbot onClose={() => setShowChatbot(false)} isOpen={showChatbot} />
        </>
      )}

      {/* FOOTER */}
      <footer className="footer-v2">
        <div className="footer-content">
          <p className="footer-title">Dynamic Resume Analyzer</p>
          <div className="team-grid">
            <div className="team-member">
              <strong>Frontend</strong> - V C Ramjhith
            </div>
            <div className="team-member">
              <strong>Backend</strong> - Vamshi
            </div>
            <div className="team-member">
              <strong>QA Tester</strong> - Varshini
            </div>
            <div className="team-member">
              <strong>Team Leader</strong> - U Shivakumar
            </div>
          </div>
          <p className="footer-copyright">
            © 2025 Dynamic Resume Analyzer | ATS-Aware Excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
