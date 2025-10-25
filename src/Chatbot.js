import React, { useState, useRef, useEffect, useCallback } from "react";

// Static responses for the  chatbot
const RESPONSES = {
  greeting: "Hello! I’m your Resume Assistant 👋 How can I help you improve your ATS score?",
  ats: "ATS scans for keywords, clean structure, and standard headings. Tailor your resume to the JD to beat it.",
  keywords: "Pick high-signal JD terms, use action verbs, and quantify results (%, $, time).",
  format: "Keep it simple: standard fonts, headings, bullets, consistent dates, no tables/graphics.",
  sections: "Must-have sections for high ATS: Contact, Summary, Experience, Skills, Education. Add Projects/Certs if relevant.",
  default: "I can help with general advice on ATS, keywords, formatting, or required sections. Ask me about your score breakdown!",
};


const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY ;   // here api key comes from .env file

export default function Chatbot({ onClose, isOpen })  {
  const [messages, setMessages] = useState([{ type: "bot", text: RESPONSES.greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fallback logic for static responses
  const replyFor = useCallback((text) => {
    const t = text.toLowerCase();
    if (t.includes("score") || t.includes("suggestions") || t.includes("breakdown")) return "To get a *detailed* breakdown and context-aware suggestions, you need to first upload your resume and run the analysis on the main page. I can then pull that data!";
    if (t.includes("ats")) return RESPONSES.ats;
    if (t.includes("keyword")) return RESPONSES.keywords;
    if (t.includes("format")) return RESPONSES.format;
    if (t.includes("section")) return RESPONSES.sections;
    if (t.includes("hello") || t.includes("hi")) return RESPONSES.greeting;
    return RESPONSES.default;
  }, []);

  // Gemini API call logic with fallback
  const getBotReply = async (text) => {
    try {
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
      const payload = {
        contents: [{ parts: [{ text }] }],
      };
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
        // Gemini response format
        return data.candidates[0].content.parts.map((p) => p.text).join(" ");
      } else if (data.error) {
        return replyFor(text) + `<br/><em>(Gemini API error: ${data.error.message})</em>`;
      }
      return replyFor(text);
    } catch (err) {
      return replyFor(text) + "<br/><em>(Could not connect to Gemini API)</em>";
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { type: "user", text }]);
    setInput("");
    setLoading(true);

    // Show "typing..." message for effect
    setMessages((prev) => [...prev, { type: "bot", text: "<em>Typing…</em>" }]);
    let reply = await getBotReply(text);

    // Remove "typing..." and show actual reply
    setMessages((prev) => [
      ...prev.slice(0, -1),
      { type: "bot", text: reply },
    ]);
    setLoading(false);
  };

    return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <div className="chatbot">
        <div className="chat-header">
          <h3>🤖 Resume Assistant</h3>
          <button className="x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-message ${m.type}`}
              dangerouslySetInnerHTML={{
                __html: m.text.replace(/\*(.*?)\*/g, "<strong>$1</strong>"),
              }}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-input-row">
          <input
            autoFocus
            value={input}
            disabled={loading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask about ATS, keywords, format…"
          />
          <button onClick={send} disabled={loading}>Send</button>
        </div>
      </div>
    </div>
  );
}
