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
import { useLocation } from "react-router-dom";
import { db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

// === THEME (unchanged) ===
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


const GradientButton: React.FC<{
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void; // ✅ add this prop type
}> = ({ icon, children, onClick }) => ( // ✅ destructure onClick
  <Button
    startIcon={icon}
    onClick={onClick} // ✅ reference correctly
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

// Small bar for emotion list
const EmotionBar: React.FC<{ label: string; score: number }> = ({ label, score }) => {
  const pct = Math.round((score ?? 0) * 100);
  return (
    <Box sx={{ mb: 1.2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {pct}%
        </Typography>
      </Box>
      <GradientProgress value={pct} />
    </Box>
  );
};



// === Types ===
interface TranscriptEntry {
  speaker: string;        // e.g. "Candidate" or "Interviewer"
  time: string;           // e.g. "0:05"
  text: string;           // transcript sentence
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
  score: number; // 0–1 range
}

interface InterviewData {
  fileName?: string;
  duration?: string;
  status?: string;
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
  dominantEmotion?: string;
  emotionConfidence?: number;
  transcript?: string;
  transcriptData?: TranscriptEntry[]; // ✅ added structured transcript
  wordCount?: number;                // ✅ total words
  sentimentBreakdown?: SentimentBreakdown; // ✅ sentiment summary
  allEmotions?: EmotionItem[];
  communicationStyle?: string;
}


// === MAIN COMPONENT ===
const FeedbackPage: React.FC = () => {
  const location = useLocation();
  const { userId, interviewId } = (location.state || {}) as {
    userId: string;
    interviewId: string;
  };

  const [data, setData] = useState<InterviewData | null>(null);
  const [tab, setTab] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // --- Real-time Firestore listener (flattens `feedback`) ---
  useEffect(() => {
    if (!userId || !interviewId) return;
    const ref = doc(db, "users", userId, "interviews", interviewId);

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const raw = snap.data() as any;
        const feedback = (raw?.feedback ?? {}) as Partial<InterviewData>;
        // Flatten and prefer explicit top-level (e.g., transcript) while merging feedback values
        const merged: InterviewData = {
          ...feedback,
          ...raw,
          // Feedback might duplicate fileName/duration; enforce top-level fields to exist
          fileName: raw?.fileName ?? feedback?.fileName,
          duration: raw?.duration ?? feedback?.duration,
          overallScore: raw?.overallScore ?? feedback?.overallScore,
          aiConfidence: raw?.aiConfidence ?? feedback?.aiConfidence,
          speechQuality: raw?.speechQuality ?? feedback?.speechQuality,
          grade: raw?.grade ?? feedback?.grade,
          performanceLevel: raw?.performanceLevel ?? feedback?.performanceLevel,
        };
        setData(merged);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [userId, interviewId]);

  // --- UI States ---
  if (loading || !data)
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container sx={{ mt: 10, textAlign: "center" }}>
          <CircularProgress sx={{ color: "#14b8a6" }} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2 }}>
            Uploading and analyzing your interview...
          </Typography>
        </Container>
      </ThemeProvider>
    );

  if (data.status !== "completed")
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

  // ----------------------------
// 📄 PDF Export Function
// ----------------------------
const handleExportPDF = () => {
  if (!data) return;

  const d = data; // use current feedback data
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Interview Report`, 40, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`File: ${d.fileName || "N/A"}`, 40, 70);
  doc.text(`Duration: ${d.duration || "N/A"}`, 40, 90);
  doc.text(`Performance Level: ${d.performanceLevel || "—"}`, 40, 110);
  doc.text(`Grade: ${d.grade || "N/A"}`, 40, 130);
  doc.text(`Overall Score: ${Math.round(d.overallScore || 0)} / 100`, 40, 150);

  // Divider
  doc.setDrawColor(200);
  doc.line(40, 160, 555, 160);

  // --- Performance Breakdown Table ---
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

  // --- Key Strengths ---
  if (d.keyStrengths?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Key Strengths", 40, y);
    doc.setFont("helvetica", "normal");
    d.keyStrengths.forEach((s, i) => doc.text(`• ${s}`, 50, y + 15 + i * 15));
    y += 40 + d.keyStrengths.length * 15;
  }

  // --- Areas for Improvement ---
  if (d.areasForImprovement?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Areas for Improvement", 40, y);
    doc.setFont("helvetica", "normal");
    d.areasForImprovement.forEach((s, i) => doc.text(`• ${s}`, 50, y + 15 + i * 15));
    y += 40 + d.areasForImprovement.length * 15;
  }

  // --- Immediate Actions ---
  if (d.immediateActionItems?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Immediate Action Items", 40, y);
    doc.setFont("helvetica", "normal");
    d.immediateActionItems.forEach((s, i) => doc.text(`• ${s}`, 50, y + 15 + i * 15));
    y += 40 + d.immediateActionItems.length * 15;
  }

  // --- Long-term Development ---
  if (d.longTermDevelopment?.length) {
    doc.setFont("helvetica", "bold");
    doc.text("Long-Term Development", 40, y);
    doc.setFont("helvetica", "normal");
    d.longTermDevelopment.forEach((s, i) => doc.text(`• ${s}`, 50, y + 15 + i * 15));
    y += 40 + d.longTermDevelopment.length * 15;
  }

  // --- Emotion Analysis ---
  doc.setFont("helvetica", "bold");
  doc.text("Emotion Analysis", 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Dominant Emotion: ${d.dominantEmotion || "—"} (${Math.round(
      (d.emotionConfidence ?? 0) * 100
    )}%)`,
    50,
    y + 20
  );

  if (d.allEmotions?.length) {
    y += 35;
    autoTable(doc, {
      startY: y,
      head: [["Emotion", "Score"]],
      body: d.allEmotions.map((e) => [e.label, `${Math.round(e.score * 100)}%`]),
      theme: "plain",
      styles: { fontSize: 10, cellPadding: 4 },
    });
  }

  // --- Transcript excerpt ---
  if (d.transcript) {
    y = (doc as any).lastAutoTable?.finalY + 30 || y + 30;
    doc.setFont("helvetica", "bold");
    doc.text("Transcript (Excerpt)", 40, y);
    doc.setFont("helvetica", "normal");
    const text = doc.splitTextToSize(d.transcript, 500);
    doc.text(text.slice(0, 20), 50, y + 20); // partial transcript
  }

  // --- Footer ---
  const footerY = doc.internal.pageSize.height - 40;
  doc.setFontSize(9);
  doc.setTextColor(130);
  doc.text("Generated by Interview Analyzer AI", 40, footerY);

  doc.save(`${d.fileName?.replace(/\s+/g, "_") || "interview_report"}.pdf`);
};


  // Helpers
  const prettyScore = (n?: number) =>
    typeof n === "number" && !Number.isNaN(n) ? Math.round(n) : 0;

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
              <Typography variant="h6">Interview Analysis Complete</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Analysis for: <b>{d.fileName}</b>
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
                <Chip label={`${d.duration ?? "—"} Duration`} sx={{ bgcolor: "rgba(255,255,255,0.03)" }} />
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
            <Tab label="Transcript" />
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
                  </Box>
                </CardContent>
              </MuiCard>
            </Box>
          </Box>
        )}

{/* --- Transcript Tab --- */}


{/* --- Transcript Tab --- */}
{tab === 1 && (
  <Paper sx={{ p: 3, borderRadius: 3 }}>
    {/* Header */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 2,
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <Box>
        <Typography variant="h6">Speech Analysis & Transcript</Typography>
        <Typography variant="body2" color="text.secondary">
          Complete conversation breakdown with sentiment analysis
        </Typography>
      </Box>

      {/* Copy & Download Buttons */}
      <Box sx={{ display: "flex", gap: 1 }}>
        <GradientButton icon={<ShareIcon />}>Copy</GradientButton>
        <GradientButton icon={<DownloadIcon />}>Download</GradientButton>
      </Box>
    </Box>

    {/* Overview Stats */}
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
        <Typography variant="body2" color="text.secondary">
          Duration
        </Typography>
        <Typography variant="h6">{d.duration || "—"}</Typography>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Word Count
        </Typography>
        <Typography variant="h6">{d.wordCount ?? "—"}</Typography>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Avg Confidence
        </Typography>
        <Typography variant="h6">{d.aiConfidence ?? 0}%</Typography>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">
          Sentiment
        </Typography>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 1 }}>
          <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "#22c55e" }} />
          <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "#a3a3a3" }} />
          <Box sx={{ width: 14, height: 14, borderRadius: "50%", bgcolor: "#ef4444" }} />
        </Box>
      </Box>
    </Box>

    <Divider sx={{ mb: 3, borderColor: "rgba(255,255,255,0.1)" }} />

    {/* Full Transcript */}
    <Typography variant="h6" sx={{ mb: 2 }}>
      Full Transcript
    </Typography>

    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {(d.transcriptData ?? []).map((entry, i) => {
        const isCandidate = entry.speaker.toLowerCase().includes("candidate") || entry.speaker.toLowerCase().includes("mary");
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
                  ? "rgba(34,197,94,0.1)" // Candidate - green tint
                  : "rgba(255,255,255,0.05)", // Interviewer - neutral tint
                border: "1px solid rgba(255,255,255,0.06)",
                textAlign: "left",
              }}
            >
              {/* Speaker + Time */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isCandidate ? "#22c55e" : "#14b8a6",
                    fontWeight: 600,
                  }}
                >
                  {entry.speaker}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {entry.time}
                </Typography>
              </Box>

              {/* Message Text */}
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                {entry.text}
              </Typography>

              {/* Sentiment chip (top-right corner of bubble) */}
              <Chip
                label={entry.sentiment}
                size="small"
                sx={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  bgcolor:
                    entry.sentiment === "positive"
                      ? "rgba(34,197,94,0.2)"
                      : entry.sentiment === "negative"
                      ? "rgba(239,68,68,0.2)"
                      : "rgba(255,255,255,0.1)",
                  color:
                    entry.sentiment === "positive"
                      ? "#22c55e"
                      : entry.sentiment === "negative"
                      ? "#ef4444"
                      : "#d1d5db",
                  fontWeight: 600,
                  textTransform: "lowercase",
                }}
              />
            </Box>
          </Box>
        );
      })}

      {/* Fallback if transcriptData missing */}
      {(!d.transcriptData || d.transcriptData.length === 0) && (
        <Typography variant="body2" color="text.secondary">
          {d.transcript || "Transcript not available yet."}
        </Typography>
      )}
    </Box>

    {/* Sentiment Breakdown */}
    {d.sentimentBreakdown && (
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Sentiment Breakdown
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "flex-start" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", width: "200px" }}>
            <Typography>Positive</Typography>
            <Chip
              label={`${d.sentimentBreakdown.positive}%`}
              size="small"
              sx={{ bgcolor: "rgba(34,197,94,0.2)", color: "#22c55e", fontWeight: 600 }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", width: "200px" }}>
            <Typography>Neutral</Typography>
            <Chip
              label={`${d.sentimentBreakdown.neutral}%`}
              size="small"
              sx={{ bgcolor: "rgba(163,163,163,0.2)", color: "#d4d4d4", fontWeight: 600 }}
            />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", width: "200px" }}>
            <Typography>Negative</Typography>
            <Chip
              label={`${d.sentimentBreakdown.negative}%`}
              size="small"
              sx={{ bgcolor: "rgba(239,68,68,0.2)", color: "#ef4444", fontWeight: 600 }}
            />
          </Box>
        </Box>
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

            {/* Emotion Analysis (inside Detailed Feedback) */}
            <MuiCard>
              <CardContent>
                <Typography variant="h6">Emotion Analysis</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Dominant emotion: <b>{d.dominantEmotion ?? "—"}</b>{" "}
                  {typeof d.emotionConfidence === "number" && `• Confidence ${Math.round(d.emotionConfidence * 100)}%`}
                </Typography>

                <Box sx={{ mt: 2, display: "grid", gridTemplateColumns: "1fr", gap: 1 }}>
                  {(d.allEmotions ?? []).map((e, i) => (
                    <EmotionBar key={`${e.label}-${i}`} label={e.label} score={e.score} />
                  ))}
                </Box>
              </CardContent>
            </MuiCard>
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default FeedbackPage;
