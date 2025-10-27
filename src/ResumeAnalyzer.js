import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

// Section definitions for robust parsing using regex
const RESUME_SECTIONS = {
  contact: /\b(contact|email|phone|linkedin|github|address)\b/i,
  summary: /\b(summary|objective|profile|professional summary)\b/i,
  experience: /\b(experience|work experience|employment|career|professional history)\b/i,
  skills: /\b(skills|technical skills|competencies|technologies|tools)\b/i,
  education: /\b(education|degree|university|college|academic history)\b/i,
  projects: /\b(projects?|portfolio|personal projects?)\b/i,
  certifications: /\b(certifications?|certificates?|license|licensed?)\b/i,
  awards: /\b(awards|honors|achievements)\b/i,
};

console.log("RESUME_SECTIONS:", RESUME_SECTIONS);
// Core sections for scoring (must-haves)
const CORE_SECTIONS = ["contact", "summary", "experience", "skills", "education"];

// Template definitions for styling (Simplified and Professional)
export const RESUME_TEMPLATES = {
  modern: { id: 'modern', name: "Modern Professional", className: "theme-modern", fontStack: "'Roboto', 'Helvetica', 'Arial', sans-serif" },
  minimal: { id: 'minimal', name: "Minimal Clean", className: "theme-minimal", fontStack: "'Arial', sans-serif" },
  classic: { id: 'classic', name: "Classic Standard", className: "theme-classic", fontStack: "'Times New Roman', serif" },
};

// Stopwords used for cleaner keyword extraction from the JD
const STOPWORDS = new Set([
  "and", "the", "with", "from", "that", "this", "your", "their", "our", "for", "into", "able", "will", "shall", "must", "have", "has", "had",
  "are", "was", "were", "you", "they", "them", "over", "under", "about", "above", "below", "not", "only", "but", "also", "more", "than",
  "such", "etc", "using", "use", "used", "strong", "good", "great", "work", "role", "team", "skills", "requirements", "responsibilities",
  "job", "description", "looking", "plus", "preferred", "required", "experience", "years", "year", "developer", "engineer", "data", "to",
  "a", "an", "is", "of", "in", "it", "at", "by", "be", "as", "or", "which", "all", "we", "company", "client"
]);

// Weak words that penalize the formatting/vocabulary score (action verb detection)
const WEAK_WORDS = ["responsible for", "managed", "worked on", "assisted", "duties included", "had to", "developed a", "was involved in", "my main task was", "i was tasked with"];

// --- Utility Functions ---

/** Extracts unique, relevant keywords from text, ignoring common stopwords. */
function extractKeywords(text) {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9+#.-]/i)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !STOPWORDS.has(w))
  )];
}

/** Finds the first non-empty line to use as the candidate name. */
function firstNonEmptyLine(s) {
  return (s || "").split(/\r?\n/).map(x => x.trim()).find(x => x.length > 0) || "Candidate Name";
}

/** Escapes special HTML characters to prevent XSS in dangerouslySetInnerHTML. */
function escapeHTML(s) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

/** Converts plain text resume content into structured HTML for template rendering. */
function plainToHTML(resumeText) {
  const lines = (resumeText || "").split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  let htmlOutput = "";
  let inList = false;

  lines.forEach(trimmed => {
    const isHeading = Object.values(RESUME_SECTIONS).some(r => r.test(trimmed));
    const isBullet = trimmed.match(/^[-*•\d.()]+\s/); 
    const safeContent = escapeHTML(trimmed.replace(/^[-*•\d.()]+\s*/, ''));

    if (isHeading) {
      if (inList) htmlOutput += "</ul>\n";
      inList = false;
      htmlOutput += `<h2 class="section-heading">${safeContent}</h2>\n`;
    } else if (isBullet) {
      if (!inList) htmlOutput += "<ul>\n";
      inList = true;
      htmlOutput += `<li>${safeContent}</li>\n`;
    } else {
      if (inList) htmlOutput += "</ul>\n";
      inList = false;
      htmlOutput += `<p>${safeContent}</p>\n`;
    }
  });

  if (inList) htmlOutput += "</ul>\n";
  return htmlOutput;
}

/** Calculates the ATS score based on completeness, keyword match, and formatting. */
function calculateATSScore(resumeText, jobDescription) {
  const found = {};
  const missing = [];
  const resumeLower = resumeText.toLowerCase();

  // Score Weights: Completeness (40%), Keywords (30%), Formatting (30%)
  const WEIGHT_STRUCTURE = 40;
  const CORE_SECTIONS_LENGTH = CORE_SECTIONS.length;
  const MAX_WEAK_WORD_PENALTY = 15;

  // 1. Completeness (40%)
  Object.entries(RESUME_SECTIONS).forEach(([k, rgx]) => {
    const isFound = rgx.test(resumeLower);
    if (isFound) found[k] = true;
    else if (CORE_SECTIONS.includes(k)) missing.push(k);
  });

  const coreFoundCount = CORE_SECTIONS_LENGTH - missing.length;
  const structureScore = Math.round((coreFoundCount / CORE_SECTIONS_LENGTH) * WEIGHT_STRUCTURE);

  // 2. Keywords (30%) - JD matching
  const jdKeys = extractKeywords(jobDescription);
  const matched = jdKeys.filter(k => resumeLower.includes(k));
  const keywordMatchRatio = jdKeys.length ? matched.length / jdKeys.length : 1;
  const keywordScore = Math.round(keywordMatchRatio * 30);

  // 3. Formatting (30%) - Weak word check
  let weakWordCount = 0;
  WEAK_WORDS.forEach(word => {
    const safeWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
    const regex = new RegExp(`\\b${safeWord}\\b`, 'g'); 
    weakWordCount += (resumeLower.match(regex) || []).length;
  });

  const weakWordPenalty = Math.min(Math.floor(weakWordCount / 3) * 3, MAX_WEAK_WORD_PENALTY);
  const formattingScore = Math.max(0, 30 - weakWordPenalty);

  // Final Score calculation
  const atsScore = Math.max(0, Math.min(100, structureScore + keywordScore + formattingScore));
  const missingKeys = jdKeys.filter(k => !resumeLower.includes(k));

  return {
    found, missing, matched, missingKeys,
    atsScore, uniqueJD: jdKeys.length,
    weakWordCount,
  };
}

// --- Component and Hook ---

export default function ResumeAnalyzer() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(RESUME_TEMPLATES.modern.id);
  const [analysis, setAnalysis] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const previewRef = useRef(null);
  const fileInputRef = useRef(null);

  /** Handles file upload and processes content. */
  const handleFile = useCallback((file) => { // Wrapped in useCallback
    setFileError(null);
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setFileError("File too large (Max 2MB).");
      setResumeText("");
      return;
    }

    if (file.type === "application/pdf") {
      setFileError("⚠️ PDF selected. Use .txt for accurate analysis. Dummy content loaded for demonstration.");
      setResumeText("John Smith\n(555) 123-4567 | john.smith@email.com | LinkedIn/johnsmith\n\nSummary\nHighly motivated developer with experience in full-stack web technologies.\n\nExperience\n- Spearheaded the development of a customer-facing portal using React and Tailwind CSS.\n- Drove the migration of legacy systems to a new Firestore database, improving performance by 30%.\n- Led Agile sprint planning and deployment cycles.\n\nSkills\nReact, JavaScript, Tailwind CSS, Firebase, Firestore, Agile Methodology, SQL, Deployment.\n\nEducation\nB.S. Computer Science, University of Technology");
      return;
    }

    if (file.type !== "text/plain") {
      setFileError("Upload a .txt or .pdf file only. TXT recommended.");
      setResumeText("");
      return;
    }

    const reader = new FileReader();
    reader.onload = e => setResumeText(String(e.target.result || ""));
    reader.readAsText(file);
  }, [setFileError, setResumeText]); // Added dependencies

  // Effect to recalculate ATS score whenever input changes
  useEffect(() => {
    if (!resumeText) { setAnalysis(null); return; }
    const startTime = performance.now();
    setAnalysis(calculateATSScore(resumeText, jobDescription));
    const endTime = performance.now();
    console.log(`Resume analysis completed in ${(endTime - startTime).toFixed(2)} ms.`);
  }, [resumeText, jobDescription]); // No need to include setAnalysis here

  // Memoized function to generate actionable feedback for the user
  const feedback = useMemo(() => {
    if (!analysis) return [];
    const list = [];
    const { atsScore, missing, uniqueJD, matched, weakWordCount, missingKeys } = analysis;

    // 1. Structure Feedback (Using descriptive text and simple HTML for styling)
    if (missing.length > 0) {
      list.push(`<span class="feedback-icon bad">✖</span> Structure Deficiency: Missing core sections: <strong>${missing.map(s => s.toUpperCase()).join(", ")}</strong>. (Impact: High)`);
    } else {
      list.push(`<span class="feedback-icon ok">✓</span> Structure Complete: All standard core sections found.`);
    }

    // 2. Keyword Feedback
    const matchPct = uniqueJD ? Math.round((matched.length / uniqueJD) * 100) : 100;
    if (uniqueJD === 0) {
      list.push(`<span class="feedback-icon info">i</span> No JD provided. Paste one to calculate keyword alignment and boost your score!`);
    } else if (matchPct < 40) {
      list.push(`<span class="feedback-icon bad">#</span> Low Keyword Match (${matchPct}%): Major tailoring needed. Missing critical terms like: <strong>${missingKeys.slice(0, 3).join(', ')}...</strong>`);
    } else if (matchPct < 70) {
      list.push(`<span class="feedback-icon warn">!</span> Moderate Match (${matchPct}%): Add missing terms for a stronger ATS score. You're close!`);
    } else {
      list.push(`<span class="feedback-icon ok">✓</span> Strong Match (${matchPct}%): Excellent keyword alignment.`);
    }

    // 3. Formatting/Vocabulary Feedback
    if (weakWordCount > 0) {
      const actionVerbs = matched.filter(k => k.length > 4 && isNaN(parseInt(k))).slice(0, 3);
      const suggestions = actionVerbs.length > 0 ? actionVerbs.join(', ') : 'Spearheaded, Drove, Led';

      list.push(`<span class="feedback-icon warn">!</span> Vocabulary: Used weak verbs <strong>${weakWordCount}</strong> times. Replace passive terms like 'responsible for' with stronger **action verbs** like: <strong>${suggestions}</strong>.`);
    } else {
      list.push(`<span class="feedback-icon ok">✓</span> Vocabulary: Strong action verbs detected.`);
    }

    // 4. Final Score
    list.push(`<span class="feedback-icon brand">#</span> Final ATS Score: <strong>${atsScore}%</strong>. Target 80%+ for top performance.`);

    return list;
  }, [analysis]);

  // Template Recommendation based on score
  const templateRecommendation = useMemo(() => {
    if (!analysis) return null;
    const { atsScore } = analysis;

    if (atsScore >= 80) return RESUME_TEMPLATES.modern.id;
    if (atsScore >= 50) return RESUME_TEMPLATES.minimal.id;
    return RESUME_TEMPLATES.classic.id;
  }, [analysis]);

  const candidateName = useMemo(() => firstNonEmptyLine(resumeText), [resumeText]);
  const htmlBody = useMemo(() => plainToHTML(resumeText), [resumeText]);
  
  const currentTemplate = RESUME_TEMPLATES[selectedTemplate] || RESUME_TEMPLATES.modern;


  /** Dynamically loads external libraries (jsPDF and html2canvas) for export. */
  const loadLibraries = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (window.jspdf && window.html2canvas) return resolve();

      const jsPDFScript = document.createElement("script");
      jsPDFScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      jsPDFScript.onerror = () => reject(new Error("Failed to load jsPDF."));
      jsPDFScript.onload = () => {
        const html2canvasScript = document.createElement("script");
        html2canvasScript.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        html2canvasScript.onerror = () => reject(new Error("Failed to load html2canvas."));
        html2canvasScript.onload = resolve;
        document.body.appendChild(html2canvasScript);
      };
      document.body.appendChild(jsPDFScript);
    });
  }, []);

  /** Generates PDF locally for download. (FIXED: Accessing jsPDF constructor) */
  const handleDownload = async () => {
    if (!previewRef.current) return;

    setIsProcessing(true);
    let originalClass = '';
    const node = previewRef.current;
    
    try {
      await loadLibraries();
      
      // FIX: Access the jsPDF constructor correctly.
      const { jsPDF } = window.jspdf || {}; 
      if (!jsPDF) throw new Error("jsPDF object not found after loading UMD bundle.");


      originalClass = node.className;
      node.className = `resume-sheet ${currentTemplate.className} export-ready`; 

      // 1. Generate image from HTML/CSS
      const canvas = await window.html2canvas(node, {
        scale: 3,
        backgroundColor: "#fff",
        useCORS: true,
        windowWidth: node.scrollWidth,
        windowHeight: node.scrollHeight
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      // 2. Generate PDF using jsPDF
      const pdf = new jsPDF("p", "pt", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      // Simple multi-page handling
      let y = 0, remainingHeight = imgHeight;
      while (remainingHeight > 0) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -y, pageWidth, imgHeight); 
        remainingHeight -= pageHeight;
        y += pageHeight;
      }

      const fileName = `${candidateName.replace(/\s/g, "_")}_${selectedTemplate}_Resume.pdf`;

      // 3. Local Download
      pdf.save(fileName);

    } catch (err) {
      console.error(`⚠️ PDF Generation Error:`, err);
      alert(`PDF Generation failed. Please check the console for technical details. (Error: ${err.message})`);
    } finally {
      setIsProcessing(false);
      if (originalClass) node.className = originalClass;
    }
  };


  return (
    <React.Fragment>
      <section className="container">
        <div className="grid-2">
          {/* Resume Input Card (File/Text) */}
          <div className="card">
            <h2 className="section-title">📄 Resume Input (Max 2MB)</h2>
            <div className="resume-dropzone"
              onDrop={e => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
            >
              <p className="dropzone-text">Drag & Drop or Select a File (.txt, .pdf)</p>
              <input
                ref={fileInputRef} // Used here
                type="file"
                accept=".txt,application/pdf"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files?.[0])}
              />
              <button type="button" className="btn select-file-btn" onClick={() => fileInputRef.current.click()}>Select File</button>
              {fileError && <p className="hint file-error">{fileError}</p>} {/* Used here */}
            </div>
            <textarea className="text-input jd-input mt-1"
              placeholder="Paste your resume content here. (TXT is best for parsing accuracy)"
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
            />
          </div>

          {/* Job Description Card */}
          <div className="card">
            <h2 className="section-title">📝 Job Description (For Keyword Scoring)</h2>
            <textarea className="text-input jd-input" 
              placeholder="Paste Job Description here..." 
              value={jobDescription} 
              onChange={e => setJobDescription(e.target.value)} // Used here
            />
            <p className="hint">Pasting the JD is crucial. The tool analyzes keywords against this text for 30% of your ATS score.</p>
          </div>
        </div>

        {resumeText && (
          <>
            {/* Template Selection Card */}
            <div className="card">
              <h2 className="section-title">🎨 Choose Template</h2>
              <div className="template-grid">
                {Object.values(RESUME_TEMPLATES).map((t) => (
                  <button key={t.id} type="button" className={`template-card ${selectedTemplate === t.id ? "selected" : ""}`} onClick={() => setSelectedTemplate(t.id)} title={t.name}>
                    <div className={`template-swatch ${t.className.replace('theme-', 'swatch-')}`}></div>
                    <div className="template-name">{t.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ATS Analysis Card (Score + Feedback) */}
            {analysis && (
              <div className="card ats-analysis-card">
                <h2 className="section-title">📊 ATS Analysis (Score: {analysis.atsScore}%)</h2>
                <div className="score-row">
                  {/* Dynamic Score Ring with color coding */}
                  <div className="score-ring" style={{ "--pct": `${analysis.atsScore}%`, "--ring-color": analysis.atsScore >= 70 ? 'var(--ok)' : analysis.atsScore >= 40 ? 'var(--warn)' : 'var(--bad)' }}>
                    <div className="score-num">{analysis.atsScore}</div>
                    <div className="score-label">Score</div>
                  </div>
                  <div className="analysis-points">
                    <h3>Actionable Suggestions</h3>
                    <ul className="feedback-list">
                      {feedback.map((f, i) => <li key={i} dangerouslySetInnerHTML={{ __html: f }} />)}
                    </ul>
                    {/* Template Recommendation */}
                    {templateRecommendation && selectedTemplate !== templateRecommendation && (
                      <p className="hint mt-05 template-recommendation">
                        **Template Tip:** Based on your score, the **{RESUME_TEMPLATES[templateRecommendation].name}** template is recommended for optimal presentation.
                        <button type="button" className="link-button" onClick={() => setSelectedTemplate(templateRecommendation)}>Apply</button>
                      </p>
                    )}
                  </div>
                </div>
                <div className="actions">
                  <button className="btn primary" onClick={handleDownload} disabled={isProcessing}>
                    {isProcessing ? 'Processing PDF...' : `⬇️ Download '${currentTemplate.name}' as PDF`}
                  </button>
                  <p className="hint mt-05">Generates a high-quality A4 PDF of your formatted resume.</p>
                </div>
              </div>
            )}

            {/* Resume Preview Sheet */}
            <div ref={previewRef} className={`resume-sheet ${currentTemplate.className}`} style={{ fontFamily: currentTemplate.fontStack }}>
              <div className="responsive-preview-label">Live Preview (A4 Aspect Ratio)</div> 
              <div className="sheet-header">
                <div className="avatar">{candidateName.slice(0, 1).toUpperCase()}</div>
                <div className="headings">
                  <h1 className="name">{candidateName}</h1>
                  <div className="tagline">{currentTemplate.name} Template</div>
                </div>
              </div>
              <div className="sheet-body" dangerouslySetInnerHTML={{ __html: htmlBody }} />
            </div>
          </>
        )}
      </section>
      
      {/* Floating Action Button (FAB) for Chatbot */}
      <button 
        type="button" 
        className={`fab ${isChatbotOpen ? 'fab-active' : ''}`}
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        title={isChatbotOpen ? "Close Chatbot" : "Open Chatbot"}
      >
        {isChatbotOpen ? '✕' : '💬'}
      </button>

      {/* Chatbot Side Panel */}
      <div className={`chatbot-container ${isChatbotOpen ? 'open' : ''}`}>
        <div className="chatbot">
          <div className="chat-header">
            <h3>Resume AI Assistant</h3>
            <button className="x" onClick={() => setIsChatbotOpen(false)} title="Close Chat">✕</button>
          </div>
          <div className="chat-messages">
            <div className="chat-message bot">Hello! I can help you with your resume analysis. Ask me about your score or missing keywords!</div>
          </div>
          <div className="chat-input-row">
            <input type="text" placeholder="Type your message..." disabled />
            <button disabled>Send</button>
          </div>
        </div>
      </div>
    </React.Fragment>
  );
}
