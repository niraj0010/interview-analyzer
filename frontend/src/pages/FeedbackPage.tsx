import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
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
} from "@mui/material";
import { createTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import PersonIcon from "@mui/icons-material/Person";
import LogoutIcon from "@mui/icons-material/Logout";
import ShareIcon from "@mui/icons-material/Share";
import DownloadIcon from "@mui/icons-material/Download";
import RefreshIcon from "@mui/icons-material/Refresh";
import feedbackData from "../data/feedback.json";

// THEME (exact colors you provided)
export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a",
      paper: "rgba(30, 41, 59, 0.8)"
    },
    primary: { main: "#14b8a6" },
    secondary: { main: "#10b981" },
    info: { main: "#8b5cf6" },
    text: { primary: "#E2E8F0", secondary: "#94A3B8" }
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.02em" },
    body1: { fontWeight: 300 },
    button: { fontWeight: 500, letterSpacing: "0.05em" }
  },
  shape: { borderRadius: 12 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)"
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          boxShadow: "0 0 12px rgba(20, 184, 166, 0.5)"
        }
      }
    }
  }
});

// Helper: gradient button
const GradientButton: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Button
    startIcon={icon}
    sx={{
      background: "linear-gradient(90deg,#14b8a6,#10b981)",
      color: "#03121a",
      px: 2,
      borderRadius: 2,
      "&:hover": { boxShadow: "0 10px 34px rgba(20,184,166,0.22)" }
    }}
  >
    {children}
  </Button>
);

// Helper: gradient progress bar
const GradientProgress: React.FC<{ value: number; start?: string; end?: string }> = ({ value, start = "#14b8a6", end = "#10b981" }) => {
  const clamp = Math.max(0, Math.min(100, value));
  return (
    <Box sx={{ width: "100%", mt: 1 }}>
      <Box sx={{ width: "100%", height: 10, borderRadius: 99, bgcolor: "rgba(255,255,255,0.03)", overflow: "hidden" }}>
        <Box
          sx={{
            height: "100%",
            width: `${clamp}%`,
            backgroundImage: `linear-gradient(90deg, ${start}, ${end})`,
            transition: "width .6s ease"
          }}
        />
      </Box>
    </Box>
  );
};

// Helper: circular score ring
const ScoreRing: React.FC<{ size?: number; value: number }> = ({ size = 110, value }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
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

const FeedbackPage: React.FC = () => {
  const data = feedbackData as any;
  const [tab, setTab] = useState<number>(0);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Top bar */}
      <AppBar position="sticky" sx={{ background: "rgba(17,24,39,0.95)", backdropFilter: "blur(6px)" }}>
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Typography variant="h6" color="primary">
              Interview Analyzer
            </Typography>
            <Typography variant="body2" color="text.secondary">
              AI-POWERED INSIGHTS
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button variant="contained" color="primary" startIcon={<HomeIcon />}>
              Home
            </Button>
            <Button color="inherit" startIcon={<PersonIcon />}>
              Profile
            </Button>
            <Button color="inherit" startIcon={<LogoutIcon />}>
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
        {/* Header card */}
        <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="h6">Interview Analysis Complete</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Analysis for: <b>{data.fileName}</b> • Processed on {data.processedOn}
              </Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                <Chip label="AI Analyzed" sx={{ bgcolor: "rgba(20,184,166,0.08)", color: "#14b8a6", fontWeight: 600 }} />
                <Chip label={`${data.duration} Duration`} sx={{ bgcolor: "rgba(255,255,255,0.03)" }} />
                <Chip label={`Score: ${data.overallScore}/100`} sx={{ bgcolor: "rgba(255,255,255,0.03)" }} />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <GradientButton icon={<RefreshIcon />}>Regenerate</GradientButton>
              <GradientButton icon={<DownloadIcon />}>Export PDF</GradientButton>
              <GradientButton icon={<ShareIcon />}>Share</GradientButton>
            </Box>
          </Box>
        </Paper>

        {/* Tabs */}
        <Paper sx={{ borderRadius: 3, mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" TabIndicatorProps={{ style: { background: "#14b8a6", height: 3 } }}>
            <Tab label="Summary" />
            <Tab label="Transcript" />
            <Tab label="Detailed Feedback" />
          </Tabs>
        </Paper>

        <Box sx={{ display: "flex", gap: 3, flexDirection: "column" }}>
          {/* --- SUMMARY --- */}
          {tab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {/* Top row: three cards in a row (responsive) */}
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <MuiCard sx={{ flex: "1 1 320px", minWidth: 280, borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" color="text.secondary">
                      Overall Performance
                    </Typography>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                      <ScoreRing value={data.overallScore} />
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: "#14b8a6" }}>
                          {data.overallScore}/100
                        </Typography>
                        <Chip label={data.grade} sx={{ mt: 1, bgcolor: "rgba(255,255,255,0.04)" }} />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {data.performanceLevel}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </MuiCard>

                <MuiCard sx={{ flex: "1 1 320px", minWidth: 280, borderRadius: 3 }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="subtitle1" color="text.secondary">
                      AI Confidence
                    </Typography>
                    <Typography variant="h3" sx={{ mt: 1 }}>
                      {data.aiConfidence}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Analysis accuracy
                    </Typography>
                    <GradientProgress value={data.aiConfidence} start="#14b8a6" end="#10b981" />
                  </CardContent>
                </MuiCard>

                <MuiCard sx={{ flex: "1 1 320px", minWidth: 280, borderRadius: 3 }}>
                  <CardContent sx={{ textAlign: "center" }}>
                    <Typography variant="subtitle1" color="text.secondary">
                      Speech Quality
                    </Typography>
                    <Typography variant="h3" sx={{ mt: 1 }}>
                      {data.speechQuality}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Average confidence
                    </Typography>
                    <GradientProgress value={data.speechQuality} start="#f59e0b" end="#facc15" />
                  </CardContent>
                </MuiCard>
              </Box>

              {/* Strengths / Improvements */}
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <MuiCard sx={{ flex: "1 1 48%", minWidth: 300, borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: "#22C55E", mb: 1 }}>
                      Top Strengths
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {data.strengths.map((s: string, i: number) => (
                        <li key={i}>
                          <Typography variant="body2">{s}</Typography>
                        </li>
                      ))}
                    </Box>
                  </CardContent>
                </MuiCard>

                <MuiCard sx={{ flex: "1 1 48%", minWidth: 300, borderRadius: 3 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: "#F59E0B", mb: 1 }}>
                      Key Areas to Improve
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {data.improvements.map((s: string, i: number) => (
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

          {/* --- TRANSCRIPT --- */}
          {/* --- TRANSCRIPT --- */}
{tab === 1 && (
  <Paper sx={{ p: 3, borderRadius: 3 }}>
    <Typography variant="h6">Speech Analysis & Transcript</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      Duration: {data.duration} • Avg Confidence: {data.speechQuality}%
    </Typography>

    {/* Summary metrics row */}
    <Box
      sx={{
        mt: 3,
        bgcolor: "rgba(15,23,42,1)",
        p: 3,
        borderRadius: 2,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {/* Top row: stats */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ textAlign: "center", minWidth: 120 }}>
          <Typography variant="caption" color="text.secondary">
            Duration
          </Typography>
          <Typography variant="h6">{data.duration}</Typography>
        </Box>

        <Box sx={{ textAlign: "center", minWidth: 120 }}>
          <Typography variant="caption" color="text.secondary">
            Word Count
          </Typography>
          <Typography variant="h6">{data.wordCount ?? "1,847"}</Typography>
        </Box>

        <Box sx={{ textAlign: "center", minWidth: 120 }}>
          <Typography variant="caption" color="text.secondary">
            Avg Confidence
          </Typography>
          <Typography variant="h6">{data.speechQuality}%</Typography>
        </Box>

        <Box sx={{ textAlign: "center", minWidth: 120 }}>
          <Typography variant="caption" color="text.secondary">
            Sentiment
          </Typography>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#10b981" }} />
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#f59e0b" }} />
            <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ef4444" }} />
          </Box>
        </Box>
      </Box>

      {/* Sentiment Breakdown */}
      <Paper
        sx={{
          p: 2,
          borderRadius: 2,
          bgcolor: "rgba(30,41,59,0.8)",
        }}
      >
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Sentiment Breakdown
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2">Positive</Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.3,
                bgcolor: "rgba(16,185,129,0.2)",
                borderRadius: "9999px",
                color: "#10b981",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {data.sentimentBreakdown?.positive ?? "60%"}
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2">Neutral</Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.3,
                bgcolor: "rgba(148,163,184,0.2)",
                borderRadius: "9999px",
                color: "#E2E8F0",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {data.sentimentBreakdown?.neutral ?? "35%"}
            </Box>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2">Negative</Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.3,
                bgcolor: "rgba(239,68,68,0.2)",
                borderRadius: "9999px",
                color: "#ef4444",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {data.sentimentBreakdown?.negative ?? "5%"}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Full Transcript */}
      <Box sx={{ mt: 1 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Full Transcript
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            maxHeight: 420,
            overflow: "auto",
            pr: 1,
          }}
        >
          {data.transcript.map((t: any, idx: number) => (
            <Paper
              key={idx}
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "rgba(15,23,42,0.6)",
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  color: t.speaker === "Candidate" ? "secondary.main" : "primary.main",
                  fontWeight: 700,
                }}
              >
                {t.speaker}
                <Typography
                  component="span"
                  sx={{ color: "text.secondary", fontWeight: 400, ml: 1 }}
                >
                  {t.timestamp}
                </Typography>
              </Typography>

              <Typography variant="body1" sx={{ mt: 1, color: "text.primary" }}>
                {t.text}
              </Typography>
            </Paper>
          ))}
        </Box>
      </Box>
    </Box>
  </Paper>
)}


          {/* --- DETAILED FEEDBACK --- */}
          {tab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                <MuiCard sx={{ flex: "1 1 48%", minWidth: 300 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ color: "#22C55E", mb: 1 }}>
                      Top Strengths
                    </Typography>
                    <Box component="ul" sx={{ pl: 2 }}>
                      {data.strengths.map((s: string, i: number) => (
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
                    <Box component="ul" sx={{ pl: 2 }}>
                      {data.improvements.map((s: string, i: number) => (
                        <li key={i}>
                          <Typography variant="body2">{s}</Typography>
                        </li>
                      ))}
                    </Box>
                  </CardContent>
                </MuiCard>
              </Box>

              <MuiCard>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 1 }}>
                    Action Items
                  </Typography>

                  <Typography variant="subtitle2" color="text.secondary">
                    Immediate
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {data.actionItems.immediate.map((it: string, i: number) => (
                      <li key={i}>
                        <Typography variant="body2">{it}</Typography>
                      </li>
                    ))}
                  </Box>

                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                    Long-term
                  </Typography>
                  <Box component="ul" sx={{ pl: 2 }}>
                    {data.actionItems.longTerm.map((it: string, i: number) => (
                      <li key={i}>
                        <Typography variant="body2">{it}</Typography>
                      </li>
                    ))}
                  </Box>
                </CardContent>
              </MuiCard>
            </Box>
          )}
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default FeedbackPage;
