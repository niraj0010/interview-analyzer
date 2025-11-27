import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Typography,
  Button,
  Box,
  Container,
  Paper,
  Card as MuiCard,
  CardContent,
  Tabs,
  Tab,
  Chip,
  ThemeProvider,
  CssBaseline,
  CircularProgress,
  Divider,
} from "@mui/material";
import { createTheme } from "@mui/material/styles";
import ShareIcon from "@mui/icons-material/Share";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// === THEME ===
export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a",
      paper: "rgba(30, 41, 59, 0.8)",
    },
    primary: { main: "#14b8a6" },
    secondary: { main: "#10b981" },
    info: { main: "#8b5cf6" },
    text: { primary: "#E2E8F0", secondary: "#94A3B8" },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    body1: { fontWeight: 300 },
    button: { fontWeight: 500, letterSpacing: "0.05em" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          boxShadow: "0 0 12px rgba(20, 184, 166, 0.5)",
        },
      },
    },
  },
});

// === UI Components ===
const GradientButton: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ icon, children, onClick }) => (
  <Button
    startIcon={icon}
    onClick={onClick}
    sx={{
      background: "linear-gradient(90deg,#14b8a6,#10b981)",
      color: "#03121a",
      px: 2,
      borderRadius: 2,
      "&:hover": { boxShadow: "0 10px 34px rgba(20,184,166,0.22)" },
    }}
  >
    {children}
  </Button>
);

const GradientProgress: React.FC<{ value: number; start?: string; end?: string }> = ({
  value,
  start = "#14b8a6",
  end = "#10b981",
}) => {
  const clamp = Math.max(0, Math.min(100, value ?? 0));
  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      <Box
        sx={{
          width: "100%",
          height: 10,
          borderRadius: 99,
          bgcolor: "rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${clamp}%`,
            backgroundImage: `linear-gradient(90deg, ${start}, ${end})`,
            transition: "width .6s ease",
          }}
        />
      </Box>
    </Box>
  );
};

const ScoreRing: React.FC<{ size?: number; value: number }> = ({ size = 110, value }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id="g1" x1="0" x2="1">
          <stop offset="0" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <g transform={`translate(${size / 2}, ${size / 2})`}>
        <circle r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={10} />
        <circle
          r={radius}
          fill="none"
          stroke="url(#g1)"
          strokeWidth={10}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90)"
        />
        <text x="0" y="6" textAnchor="middle" fontSize={18} fill="#E2E8F0" fontWeight={700}>
          {`${pct}%`}
        </text>
      </g>
    </svg>
  );
};

// === Types ===
interface TranscriptEntry {
  speaker: string;
  time: string;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
}

interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

interface BreakdownItem {
  category: string;
  score: number;
  summary?: string;
  suggestions?: string[];
}

interface EmotionItem {
  label: string;
  score: number;
}

interface PracticeQuestionAnswer {
  questionIndex: number;
  question: string;
  skipped: boolean;
  transcript?: string;
  emotion?: {
    label: string;
    confidence: number;
  };
  duration?: string;
  error?: string;
}

interface InterviewData {
  // Common fields
  overallScore?: number;
  grade?: string;
  performanceLevel?: string;
  aiConfidence?: number;
  speechQuality?: number;
  keyStrengths?: string[];
  areasForImprovement?: string[];
  immediateActionItems?: string[];
  longTermDevelopment?: string[];
  performanceBreakdown?: BreakdownItem[];
  status?: string;
  
  // Upload pipeline specific
  fileName?: string;
  duration?: string;
  dominantEmotion?: string;
  emotionConfidence?: number;
  transcript?: string;
  transcriptData?: TranscriptEntry[];
  wordCount?: number;
  sentimentBreakdown?: SentimentBreakdown;
  allEmotions?: EmotionItem[];
  communicationStyle?: string;
  
  // Practice pipeline specific
  role?: string;
  questions?: string[];
  perQuestion?: PracticeQuestionAnswer[];
  summary?: any;
  complete?: boolean;
}

// === MAIN COMPONENT ===
const FeedbackPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = getAuth();
  
  // Safe destructure with defaults
  const state = (location.state || {}) as any;
  const { interviewId, source = "upload", role } = state;
  // Initialize userId from state, but allow fallback to Auth
  const [userId, setUserId] = useState<string | null>(state.userId || null);

  const [data, setData] = useState<InterviewData | null>(null);
  const [tab, setTab] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // 1. Auth Listener: Ensure we have a userId if navigation didn't pass it
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        // If not logged in and no ID passed, redirect to login
        if (!state.userId) navigate("/login");
      }
    });
    return () => unsub();
  }, [auth, navigate, state.userId]);

  // 2. Data Fetcher
  useEffect(() => {
    if (!userId || !interviewId) return;

    // Different collection based on source
    const collectionName = source === "practice" ? "practiceSessions" : "interviews";
    const ref = doc(db, "users", userId, collectionName, interviewId);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as any;
        
        // --- PRACTICE SESSION MAPPING ---
        // --- PRACTICE SESSION MAPPING ---
        if (source === "practice") {
          const summary = raw?.summary || {};
          const perQuestionData = raw?.perQuestion || [];
          
          const strengths = summary.keyStrengths ?? summary.strengths ?? [];
          
          // 1. Gather all generic improvements into one master list
          const allImprovements = [
            ...(summary.areasForImprovement ?? []),
            ...(summary.weaknesses ?? []),
            ...(summary.recommendedImprovements ?? []),
          ];

          // 2. Initialize with explicit data if available
          let immediate = summary.immediateActionItems || [];
          let longTerm = summary.longTermDevelopment || [];

          // 3. SMART SPLIT: If explicit buckets are missing, split the generic list
          if (immediate.length === 0 && longTerm.length === 0 && allImprovements.length > 0) {
              // Remove duplicates just in case
              const uniqueImprovements = [...new Set(allImprovements)];
              const midpoint = Math.ceil(uniqueImprovements.length / 2);
              
              // First half goes to Immediate Actions
              immediate = uniqueImprovements.slice(0, midpoint);
              // Second half goes to Long Term Development
              longTerm = uniqueImprovements.slice(midpoint);
          }

          // 4. Calculate AI Confidence from individual question emotions
          let calculatedAIConfidence = 0;
          if (perQuestionData.length > 0) {
            const answeredQuestions = perQuestionData.filter((q: PracticeQuestionAnswer) => !q.skipped && q.emotion);
            if (answeredQuestions.length > 0) {
              const totalConfidence = answeredQuestions.reduce(
                (acc: number, q: PracticeQuestionAnswer) => acc + (q.emotion?.confidence || 0), 0
              );
              calculatedAIConfidence = Math.round((totalConfidence / answeredQuestions.length) * 100);
            }
          }

          const merged: InterviewData = {
            fileName: "Practice Session",
            role: raw?.role || role,
            duration: `${perQuestionData.length} Questions`,
            overallScore: summary.overallScore,
            grade: summary.grade,
            performanceLevel: summary.performanceLevel,
            aiConfidence: summary.aiConfidence ?? calculatedAIConfidence,
            speechQuality: summary.speechQuality ?? 0,
            
            keyStrengths: strengths, 
            areasForImprovement: allImprovements, // Keep full list for Summary tab if needed
            immediateActionItems: immediate,      // <--- Now distinct
            longTermDevelopment: longTerm,        // <--- Now distinct
            
            performanceBreakdown: summary.performanceBreakdown || [],
            // FORCE COMPLETED if summary exists
            status: raw?.complete || summary.overallScore ? "completed" : "processing",
            questions: raw?.questions || [],
            perQuestion: perQuestionData,
            summary: summary,
            complete: raw?.complete || false,
          };
          setData(merged);
        }
        // --- UPLOAD PIPELINE MAPPING ---
        else {
          const feedback = (raw?.feedback ?? {}) as Partial<InterviewData>;
          const merged: InterviewData = {
            ...feedback,
            ...raw,
            fileName: raw?.fileName ?? feedback?.fileName,
            duration: raw?.duration ?? feedback?.duration,
            overallScore: raw?.overallScore ?? feedback?.overallScore,
            aiConfidence: raw?.aiConfidence ?? feedback?.aiConfidence,
            speechQuality: raw?.speechQuality ?? feedback?.speechQuality,
            grade: raw?.grade ?? feedback?.grade,
            performanceLevel: raw?.performanceLevel ?? feedback?.performanceLevel,
            // FORCE COMPLETED if we are viewing history (data exists)
            status: raw?.status || "completed", 
          };
          setData(merged);
        }
      } else {
        console.error("Document doesn't exist");
      }
      setLoading(false);
    });

    return () => unsub();
  }, [userId, interviewId, source, role]);

  // --- PDF Export Function ---
  const handleExportPDF = () => {
    if (!data) return;

    const d = data;
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(source === "practice" ? "Practice Session Report" : "Interview Report", 40, 50);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    if (source === "practice") {
      doc.text(`Role: ${d.role || "N/A"}`, 40, 70);
      doc.text(`Questions Completed: ${d.perQuestion?.filter(q => !q.skipped).length || 0}/${d.perQuestion?.length || 0}`, 40, 90);
    } else {
      doc.text(`File: ${d.fileName || "N/A"}`, 40, 70);
      doc.text(`Duration: ${d.duration || "N/A"}`, 40, 90);
    }
    
    doc.text(`Performance Level: ${d.performanceLevel || "—"}`, 40, 110);
    doc.text(`Grade: ${d.grade || "N/A"}`, 40, 130);
    doc.text(`Overall Score: ${Math.round(d.overallScore || 0)} / 100`, 40, 150);

    // Divider
    doc.setDrawColor(200);
    doc.line(40, 160, 555, 160);

    // Performance Breakdown Table
    if (d.performanceBreakdown?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Performance Breakdown", 40, 185);
      autoTable(doc, {
        startY: 195,
        head: [["Category", "Score", "Summary"]],
        body: d.performanceBreakdown.map((p) => [
          p.category,
          p.score.toString(),
          p.summary || "—",
        ]),
        theme: "grid",
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      });
    }

    let y = (doc as any).lastAutoTable?.finalY + 25 || 220;

    // Key Strengths
    if (d.keyStrengths?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Key Strengths", 40, y);
      doc.setFont("helvetica", "normal");
      d.keyStrengths.forEach((s, i) => doc.text(`• ${s}`, 50, y + 15 + i * 15));
      y += 40 + d.keyStrengths.length * 15;
    }

    // Areas for Improvement
    if (d.areasForImprovement?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Areas for Improvement", 40, y);
      doc.setFont("helvetica", "normal");
      d.areasForImprovement.forEach((s, i) => doc.text(`• ${s}`, 50, y + 15 + i * 15));
      y += 40 + d.areasForImprovement.length * 15;
    }

    // Practice-specific: Questions & Answers
    if (source === "practice" && d.perQuestion?.length) {
      doc.setFont("helvetica", "bold");
      doc.text("Questions & Responses", 40, y);
      y += 20;
      
      d.perQuestion.forEach((qa, i) => {
        doc.setFont("helvetica", "bold");
        doc.text(`Q${i + 1}: ${qa.question}`, 50, y);
        y += 15;
        doc.setFont("helvetica", "normal");
        if (qa.skipped) {
          doc.text("[Skipped]", 50, y);
        } else {
          const text = doc.splitTextToSize(qa.transcript || "No transcript available", 480);
          doc.text(text.slice(0, 5), 50, y);
          y += text.slice(0, 5).length * 12;
        }
        y += 20;
      });
    }

    // Footer
    const footerY = doc.internal.pageSize.height - 40;
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text("Generated by Interview Analyzer AI", 40, footerY);

    const fileName = source === "practice" 
      ? `practice_session_${d.role?.replace(/\s+/g, "_") || "report"}.pdf`
      : `${d.fileName?.replace(/\s+/g, "_") || "interview_report"}.pdf`;
    
    doc.save(fileName);
  };

  // Helper functions
  const prettyScore = (n?: number) =>
    typeof n === "number" && !Number.isNaN(n) ? Math.round(n) : 0;

  const handleBack = () => {
    if (source === "practice") {
      navigate("/practice");
    } else {
      navigate("/profile"); // Updated to dashboard
    }
  };

  // --- UI States ---
  if (loading || !data)
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container sx={{ mt: 10, textAlign: "center" }}>
          <CircularProgress sx={{ color: "#14b8a6" }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
             Loading results...
          </Typography>
        </Container>
      </ThemeProvider>
    );

  // Status check for *NEW* uploads only
  if (data.status !== "completed" && source === "upload")
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container sx={{ mt: 10, textAlign: "center" }}>
          <Typography variant="h5" color="text.primary">
            {data.status === "processing" ? "Analyzing your interview..." : "Uploading your file..."}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Please wait, this may take a few minutes.
          </Typography>
          <CircularProgress sx={{ color: "#14b8a6", mt: 2 }} />
        </Container>
      </ThemeProvider>
    );

  // === Render when completed ===
  const d = data;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        {/* Header */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={handleBack}
                sx={{ mb: 1, color: "text.secondary" }}
              >
                {source === "practice" ? "Back to Practice" : "Back to Dashboard"}
              </Button>
              <Typography variant="h6">
                {source === "practice" 
                  ? "Practice Session Analysis Complete" 
                  : "Interview Analysis Complete"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {source === "practice" 
                  ? `Practice Role: ${d.role || "N/A"}` 
                  : `Analysis for: ${d.fileName || "N/A"}`}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <Chip
                  label="AI Analyzed"
                  sx={{
                    bgcolor: "rgba(20,184,166,0.08)",
                    color: "#14b8a6",
                    fontWeight: 600,
                  }}
                />
                {source === "practice" ? (
                  <Chip 
                    label={`${d.perQuestion?.filter(q => !q.skipped).length || 0}/${d.perQuestion?.length || 0} Questions Completed`} 
                    sx={{ bgcolor: "rgba(255,255,255,0.03)" }} 
                  />
                ) : (
                  <Chip 
                    label={`${d.duration ?? "—"} Duration`} 
                    sx={{ bgcolor: "rgba(255,255,255,0.03)" }} 
                  />
                )}
                <Chip
                  label={`Score: ${prettyScore(d.overallScore)}/100`}
                  sx={{ bgcolor: "rgba(255,255,255,0.03)" }}
                />
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <GradientButton icon={<RefreshIcon />}>Regenerate</GradientButton>
              <GradientButton icon={<DownloadIcon />} onClick={handleExportPDF}>
                Export PDF
              </GradientButton>
              <GradientButton icon={<ShareIcon />}>Share</GradientButton>
            </Box>
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            TabIndicatorProps={{ style: { background: "#14b8a6", height: 3 } }}
          >
            <Tab label="Summary" />
            <Tab label={source === "practice" ? "Questions & Answers" : "Transcript"} />
            <Tab label="Detailed Feedback" />
          </Tabs>
        </Paper>

        {/* --- Summary Tab --- */}
        {tab === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <MuiCard sx={{ flex: "1 1 320px", minWidth: 280 }}>
                <CardContent>
                  <Typography variant="subtitle1" color="text.secondary">
                    Overall Performance
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                    <ScoreRing value={prettyScore(d.overallScore)} />
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 700, color: "#14b8a6" }}>
                        {prettyScore(d.overallScore)}/100
                      </Typography>
                      <Chip label={d.grade ?? "—"} sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.04)" }} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {d.performanceLevel ?? "—"}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </MuiCard>

              <MuiCard sx={{ flex: "1 1 320px", minWidth: 280, textAlign: "center" }}>
                <CardContent>
                  <Typography variant="subtitle1" color="text.secondary">
                    AI Confidence
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 1 }}>
                    {prettyScore(d.aiConfidence)}%
                  </Typography>
                  <GradientProgress value={prettyScore(d.aiConfidence)} />
                </CardContent>
              </MuiCard>

              <MuiCard sx={{ flex: "1 1 320px", minWidth: 280, textAlign: "center" }}>
                <CardContent>
                  <Typography variant="subtitle1" color="text.secondary">
                    Speech Quality
                  </Typography>
                  <Typography variant="h3" sx={{ mt: 1 }}>
                    {prettyScore(d.speechQuality)}%
                  </Typography>
                  <GradientProgress value={prettyScore(d.speechQuality)} start="#f59e0b" end="#facc15" />
                </CardContent>
              </MuiCard>
            </Box>

            {/* Strengths / Improvements */}
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <MuiCard sx={{ flex: "1 1 48%", minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#22C55E", mb: 1 }}>
                    Top Strengths
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {(d.keyStrengths ?? []).map((s, i) => (
                      <li key={i}>
                        <Typography variant="body2">{s}</Typography>
                      </li>
                    ))}
                    {d.keyStrengths?.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No strengths identified yet.
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </MuiCard>

              <MuiCard sx={{ flex: "1 1 48%", minWidth: 300 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ color: "#F59E0B", mb: 1 }}>
                    Key Areas to Improve
                  </Typography>
                  <Box component="ul" sx={{ pl: 2, m: 0 }}>
                    {(d.areasForImprovement ?? []).map((s, i) => (
                      <li key={i}>
                        <Typography variant="body2">{s}</Typography>
                      </li>
                    ))}
                    {d.areasForImprovement?.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No improvement areas identified yet.
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </MuiCard>
            </Box>
          </Box>
        )}

        {/* --- Transcript/Q&A Tab --- */}
        {tab === 1 && (
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            {source === "practice" ? (
              // Practice Session Q&A View
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Box>
                    <Typography variant="h6">Practice Questions & Answers</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Review your responses to each question
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <GradientButton icon={<DownloadIcon />}>Download</GradientButton>
                  </Box>
                </Box>

                <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.1)" }} />

                {d.perQuestion?.map((qa, i) => (
                  <Box
                    key={i}
                    sx={{
                      mb: 3,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: "#14b8a6", fontWeight: 600 }}>
                        Question {i + 1}
                      </Typography>
                      {qa.skipped ? (
                        <Chip label="Skipped" size="small" sx={{ bgcolor: "rgba(239,68,68,0.2)", color: "#ef4444" }} />
                      ) : qa.emotion && (
                        <Chip 
                          label={`${qa.emotion.label} (${Math.round(qa.emotion.confidence * 100)}%)`} 
                          size="small" 
                          sx={{ bgcolor: "rgba(20,184,166,0.1)", color: "#14b8a6" }}
                        />
                      )}
                    </Box>
                    
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 500 }}>
                      {qa.question}
                    </Typography>
                    
                    <Box sx={{ pl: 2, borderLeft: "3px solid rgba(255,255,255,0.1)" }}>
                      <Typography variant="body2" color="text.secondary">
                        {qa.skipped 
                          ? "[No response provided]" 
                          : qa.error 
                          ? `[Error: ${qa.error}]`
                          : qa.transcript || "Processing transcript..."}
                      </Typography>
                    </Box>
                    
                    {qa.duration && !qa.skipped && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                        Duration: {qa.duration}
                      </Typography>
                    )}
                  </Box>
                ))}
                
                {(!d.perQuestion || d.perQuestion.length === 0) && (
                  <Typography variant="body2" color="text.secondary">
                    No question data available yet.
                  </Typography>
                )}
              </Box>
            ) : (
              // Upload Pipeline Transcript View
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                  }}
                >
                  <Box>
                    <Typography variant="h6">Speech Analysis & Transcript</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Complete conversation breakdown
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <GradientButton icon={<ShareIcon />}>Copy</GradientButton>
                    <GradientButton icon={<DownloadIcon />}>Download</GradientButton>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-around",
                    alignItems: "center",
                    textAlign: "center",
                    my: 3,
                    flexWrap: "wrap",
                    gap: 3,
                  }}
                >
                  <Box>
                    <Typography variant="body2" color="text.secondary">Duration</Typography>
                    <Typography variant="h6">{d.duration || "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Word Count</Typography>
                    <Typography variant="h6">{d.wordCount ?? "—"}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Avg Confidence</Typography>
                    <Typography variant="h6">{d.aiConfidence ?? 0}%</Typography>
                  </Box>
                </Box>

                <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.1)" }} />

                <Typography variant="h6" sx={{ mb: 2 }}>Full Transcript</Typography>

                {d.transcriptData?.length ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {d.transcriptData.map((entry, i) => {
                      const isCandidate = entry.speaker.toLowerCase().includes("candidate");
                      return (
                        <Box
                          key={i}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: isCandidate ? "flex-end" : "flex-start",
                            width: "100%",
                          }}
                        >
                          <Box
                            sx={{
                              maxWidth: "80%",
                              p: 2,
                              borderRadius: 3,
                              position: "relative",
                              bgcolor: isCandidate
                                ? "rgba(34,197,94,0.1)"
                                : "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                              <Typography
                                variant="subtitle2"
                                sx={{ color: isCandidate ? "#22c55e" : "#14b8a6", fontWeight: 600 }}
                              >
                                {entry.speaker}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {entry.time}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                              {entry.text}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {d.transcript || "Transcript not available yet."}
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        )}

        {/* --- Detailed Feedback Tab --- */}
        {tab === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Immediate Actions + Long term */}
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <MuiCard sx={{ flex: "1 1 48%", minWidth: 320 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Immediate Actions
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {(d.immediateActionItems ?? []).map((it, i) => (
                      <li key={i}>
                        <Typography variant="body2">{it}</Typography>
                      </li>
                    ))}
                    {d.immediateActionItems?.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No immediate actions identified.
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </MuiCard>

              <MuiCard sx={{ flex: "1 1 48%", minWidth: 320 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Long-term Development
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {(d.longTermDevelopment ?? []).map((it, i) => (
                      <li key={i}>
                        <Typography variant="body2">{it}</Typography>
                      </li>
                    ))}
                    {d.longTermDevelopment?.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No long-term recommendations yet.
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </MuiCard>
            </Box>

            {/* Detailed Performance Breakdown */}
            {(d.performanceBreakdown?.length ?? 0) > 0 && (
              <MuiCard>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Detailed Performance Breakdown
                  </Typography>
                  <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
                    {d.performanceBreakdown!.map((item, idx) => (
                      <Paper key={idx} sx={{ p: 2, borderRadius: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography variant="subtitle1">{item.category}</Typography>
                          <Chip
                            label={`${prettyScore(item.score)}/100`}
                            sx={{ bgcolor: "rgba(255,255,255,0.05)" }}
                          />
                        </Box>
                        {item.summary && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {item.summary}
                          </Typography>
                        )}
                        {item.suggestions && item.suggestions.length > 0 && (
                          <>
                            <Divider sx={{ my: 1.5, borderColor: "rgba(255,255,255,0.07)" }} />
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Suggestions
                            </Typography>
                            <Box component="ul" sx={{ pl: 2, m: 0 }}>
                              {item.suggestions.map((s, i) => (
                                <li key={i}>
                                  <Typography variant="body2">{s}</Typography>
                                </li>
                              ))}
                            </Box>
                          </>
                        )}
                      </Paper>
                    ))}
                  </Box>
                </CardContent>
              </MuiCard>
            )}
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default FeedbackPage;