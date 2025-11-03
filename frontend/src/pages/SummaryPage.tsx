// src/pages/SummaryPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ReplayIcon from "@mui/icons-material/Replay";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getApp } from "firebase/app";

export default function SummaryPage() {
  const location = useLocation() as any;
  const { summary: initialSummary, role, sessionId, uid } = location.state || {};
  const [summary, setSummary] = useState<any>(initialSummary);
  const [tab, setTab] = useState("summary");
  const [loading, setLoading] = useState(!initialSummary);

  useEffect(() => {
    const fetchSummary = async () => {
      if (summary || !sessionId || !uid) return;
      try {
        setLoading(true);
        const db = getFirestore(getApp());
        const appId = "default-app-id"; // optional override if needed
        const ref = doc(db, `artifacts/${appId}/users/${uid}/sessions`, sessionId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setSummary(data.summary || {});
        }
      } catch (e) {
        console.error("Error loading summary:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [summary, sessionId, uid]);

  const handleExportPDF = () => {
    // TODO: implement PDF export
    alert("Exporting as PDF coming soon.");
  };

  const handleRegenerate = () => {
    // TODO: implement regenerate flow (re-run Gemini on transcripts)
    alert("Regeneration feature coming soon.");
  };

  const scoreColor = (score: number) => {
    if (score >= 85) return "#4ade80";
    if (score >= 70) return "#14b8a6";
    return "#f87171";
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "#0b1220",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Loading your interview analysis...</Typography>
        </Stack>
      </Box>
    );
  }

  const overall = summary?.overallScore ?? 0;
  const aiConf = summary?.aiConfidence ?? 85;
  const speech = summary?.speechQuality ?? 87;
  const strengths = summary?.strengths ?? summary?.keyStrengths ?? [];
  const weaknesses =
    summary?.recommendedImprovements ?? summary?.areasForImprovement ?? [];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        color: "#f8fafc",
        py: 6,
        px: { xs: 2, md: 8 },
      }}
    >
      {/* Header Section */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={4}
      >
        <Box>
          <Button
            onClick={() => window.history.back()}
            sx={{
              color: "#94a3b8",
              textTransform: "none",
              fontWeight: 500,
              mb: 1,
            }}
          >
            ← New Practice Session
          </Button>
          <Typography variant="h5" fontWeight={700}>
            Practice session completed
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            Analysis for: {role} • Processed on{" "}
            {new Date().toLocaleDateString()}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            startIcon={<ReplayIcon />}
            variant="outlined"
            sx={{
              color: "#14b8a6",
              borderColor: "#14b8a6",
              textTransform: "none",
            }}
            onClick={handleRegenerate}
          >
            Regenerate
          </Button>
          <Button
            startIcon={<PictureAsPdfIcon />}
            variant="contained"
            sx={{
              background: "#14b8a6",
              textTransform: "none",
              fontWeight: 600,
            }}
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </Stack>
      </Stack>

      {/* Analysis Summary Header */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          bgcolor: "rgba(30,41,59,0.6)",
          borderRadius: "16px",
          p: 3,
          mb: 4,
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <CheckCircleIcon sx={{ color: "#14b8a6", fontSize: 36 }} />
          <Box>
            <Typography variant="h6" fontWeight={600}>
              Interview Analysis Complete
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              AI Analyzed • Score: {overall}/100
            </Typography>
          </Box>
        </Stack>
        <Chip
          label={`Score: ${overall}/100`}
          sx={{
            bgcolor: "rgba(20,184,166,0.15)",
            color: "#14b8a6",
            fontWeight: 600,
          }}
        />
      </Stack>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="inherit"
        TabIndicatorProps={{ style: { background: "#14b8a6" } }}
        sx={{ mb: 4 }}
      >
        <Tab label="Summary" value="summary" />
        <Tab label="Transcript" value="transcript" />
        <Tab label="Detailed Feedback" value="details" />
      </Tabs>

      {tab === "summary" && (
        <Box>
          {/* Top Metrics */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            mb={4}
            justifyContent="space-between"
          >
            <Card
              sx={{
                flex: 1,
                bgcolor: "#132030",
                color: "white",
                borderRadius: "14px",
                textAlign: "center",
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Overall Performance
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: scoreColor(overall),
                    fontWeight: 700,
                    my: 1,
                  }}
                >
                  {overall}/100
                </Typography>
                <Chip
                  label={overall >= 85 ? "A" : overall >= 70 ? "B+" : "C"}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.1)",
                    color: "#14b8a6",
                    fontWeight: 600,
                  }}
                />
              </CardContent>
            </Card>

            <Card
              sx={{
                flex: 1,
                bgcolor: "#132030",
                color: "white",
                borderRadius: "14px",
                textAlign: "center",
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  AI Confidence
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: "#14b8a6",
                    fontWeight: 700,
                    my: 1,
                  }}
                >
                  {aiConf}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Analysis accuracy
                </Typography>
              </CardContent>
            </Card>

            <Card
              sx={{
                flex: 1,
                bgcolor: "#132030",
                color: "white",
                borderRadius: "14px",
                textAlign: "center",
              }}
            >
              <CardContent>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Speech Quality
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    color: "#14b8a6",
                    fontWeight: 700,
                    my: 1,
                  }}
                >
                  {speech}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Average confidence
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {/* Strengths and Improvements */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            justifyContent="space-between"
          >
            <Card
              sx={{
                flex: 1,
                bgcolor: "#132030",
                borderRadius: "14px",
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  sx={{ color: "#4ade80" }}
                >
                  Top Strengths
                </Typography>
                <Stack spacing={1}>
                  {strengths.map((s: string, i: number) => (
                    <Typography key={i} variant="body2" sx={{ opacity: 0.9 }}>
                      • {s}
                    </Typography>
                  ))}
                  {!strengths.length && (
                    <Typography variant="body2" sx={{ opacity: 0.5 }}>
                      No strengths identified.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card
              sx={{
                flex: 1,
                bgcolor: "#132030",
                borderRadius: "14px",
              }}
            >
              <CardContent>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  sx={{ color: "#f87171" }}
                >
                  Key Areas to Improve
                </Typography>
                <Stack spacing={1}>
                  {weaknesses.map((s: string, i: number) => (
                    <Typography key={i} variant="body2" sx={{ opacity: 0.9 }}>
                      • {s}
                    </Typography>
                  ))}
                  {!weaknesses.length && (
                    <Typography variant="body2" sx={{ opacity: 0.5 }}>
                      No improvement areas found.
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Box>
      )}

      {tab === "transcript" && (
        <Typography sx={{ opacity: 0.7 }}>Transcript view coming soon.</Typography>
      )}
      {tab === "details" && (
        <Typography sx={{ opacity: 0.7 }}>
          Detailed feedback breakdown coming soon.
        </Typography>
      )}
    </Box>
  );
}
