import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Box,
  Avatar,
  Typography,
  Card,
  CardContent,
  CardActions,
  Divider,
  Button,
  LinearProgress,
  TextField,
  InputAdornment,
  Chip,
  ButtonGroup,
  CircularProgress,
  Paper,
  Stack,
  Pagination,
  IconButton,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarToday,
  Business,
  Description,
  BarChart,
  PlayCircleOutline,
  Mic as MicIcon,
  CloudUpload as CloudUploadIcon,
  DeleteForever as DeleteForeverIcon,
} from "@mui/icons-material";
import { DownloadIcon } from "lucide-react";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

// --- Types ---
interface PerformanceItem {
  category: string;
  score: number;
  summary?: string;
  suggestions?: string[];
}

interface Interview {
  id: string;
  type: "upload" | "practice";
  title: string;
  company: string;
  position: string;
  fileName?: string;
  fileSize?: string;
  roundNumber?: number;
  difficulty?: string;
  date: string;
  timestamp: number;
  duration: string;
  grade: string;
  score: number;
  performance: PerformanceItem[];
  keyStrengths: string[];
  areasForImprovement: string[];
  immediateActionItems: string[];
  longTermDevelopment: string[];
  emotionAnalysis: string;
  aiConfidence: number;
  speechQuality: number;
  performanceLevel: string;
  transcript?: string;
}

interface User {
  name: string;
  email: string;
  role: string;
  bio: string;
  avatarUrl: string;
  pastInterviews: Interview[];
}

// --- Layout Components ---
const Shell = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ bgcolor: "#0F172A", color: "#E2E8F0", minHeight: "100vh" }}>
    {children}
  </Box>
);

const SectionHeader = ({ title, subt }: { title: string; subt: string }) => (
  <Box sx={{ px: 4, pt: 3, pb: 1 }}>
    <Typography variant="h4" sx={{ fontWeight: 800, color: "#fff" }}>
      {title}
    </Typography>
    <Typography sx={{ color: "#94A3B8", mt: 0.5 }}>{subt}</Typography>
  </Box>
);

const MetricRow = ({ label, score }: { label: string; score: number }) => {
  const safe = Number.isFinite(score) ? score : 0;
  const normalized = Math.min(Math.max(safe, 0), 100);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
      <Typography sx={{ flex: 1.6, fontSize: 13, color: "#E2E8F0" }}>
        {label}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={normalized}
        sx={{
          flex: 3,
          height: 8,
          borderRadius: 5,
          bgcolor: "rgba(59,130,246,.18)",
          "& .MuiLinearProgress-bar": {
            bgcolor: "#14B8A6",
          },
        }}
      />
      <Typography
        sx={{ width: 38, textAlign: "right", fontSize: 12, color: "#94A3B8" }}
      >
        {Math.round(normalized)}
      </Typography>
    </Box>
  );
};

// --- PDF Export for card ---
const handleExportPDF = (interview: Interview) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(interview.title || "Interview Report", 40, 50);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Type: ${interview.type.toUpperCase()}  |  Date: ${interview.date}`,
    40,
    70
  );

  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`Duration: ${interview.duration || "N/A"}`, 40, 88);
  doc.text(`Grade: ${interview.grade || "N/A"}`, 40, 104);

  doc.setDrawColor(210);
  doc.line(40, 115, 555, 115);

  doc.setFontSize(13);
  doc.setTextColor(30);
  doc.text("Performance Breakdown", 40, 140);
  autoTable(doc, {
    startY: 155,
    head: [["Category", "Score", "Summary"]],
    body:
      interview.performance.length > 0
        ? interview.performance.map((p) => [
            p.category,
            `${Math.round(p.score)}/100`,
            p.summary || "—",
          ])
        : [["—", "—", "No performance data"]],
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
  });

  let y = (doc as any).lastAutoTable?.finalY || 200;

  const writeList = (title: string, items: string[]) => {
    if (!items || items.length === 0) return;
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(title, 40, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    items.forEach((item, idx) => {
      doc.text(`• ${item}`, 50, y + 16 + idx * 14);
    });
    y += 16 + items.length * 14;
  };

  writeList("Key Strengths", interview.keyStrengths);
  writeList("Areas for Improvement", interview.areasForImprovement);
  writeList("Immediate Action Items", interview.immediateActionItems);
  writeList("Long-Term Development", interview.longTermDevelopment);

  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("AI Summary", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  y += 16;
  doc.text(
    `Emotion: ${interview.emotionAnalysis || "N/A"}   |   AI Confidence: ${
      Math.round(interview.aiConfidence) || 0
    }%   |   Speech Quality: ${
      Math.round(interview.speechQuality) || 0
    }%`,
    40,
    y
  );
  y += 18;
  doc.text(`Performance Level: ${interview.performanceLevel || "N/A"}`, 40, y);

  if (interview.transcript) {
    y += 24;
    doc.setFont("helvetica", "bold");
    doc.text("Transcript (excerpt)", 40, y);
    doc.setFont("helvetica", "normal");
    const wrapped = doc.splitTextToSize(interview.transcript, 515);
    doc.text(wrapped.slice(0, 40), 40, y + 16);
  }

  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text(
    "Generated by Interview Analyzer",
    40,
    doc.internal.pageSize.height - 30
  );

  doc.save(
    `${(interview.title || "interview_report").replace(/\s+/g, "_")}.pdf`
  );
};

// --- Card component ---
const InterviewCard: React.FC<{
  interview: Interview;
  onViewDetails: () => void;
  onDelete: () => void;
}> = ({ interview, onViewDetails, onDelete }) => {
  const scoreOutOfTen =
    typeof interview.score === "number"
      ? (interview.score / 10).toFixed(1)
      : "–";

  const formattedEmotion = interview.emotionAnalysis
    ? interview.emotionAnalysis.charAt(0).toUpperCase() +
      interview.emotionAnalysis.slice(1)
    : "Neutral";

  const isPractice = interview.type === "practice";

  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: "100%",
        bgcolor: "#0B1220",
        borderRadius: 3,
        border: "1px solid rgba(148,163,184,.18)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.85)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent sx={{ p: 2.75, pb: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 1.5,
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
              {isPractice ? (
                <Chip
                  label="AI Practice"
                  size="small"
                  icon={<MicIcon style={{ fontSize: 14 }} />}
                  sx={{
                    height: 20,
                    fontSize: 10,
                    bgcolor: "rgba(139, 92, 246, 0.2)",
                    color: "#a78bfa",
                  }}
                />
              ) : (
                <Chip
                  label="Upload"
                  size="small"
                  icon={<CloudUploadIcon style={{ fontSize: 14 }} />}
                  sx={{
                    height: 20,
                    fontSize: 10,
                    bgcolor: "rgba(56, 189, 248, 0.2)",
                    color: "#38bdf8",
                  }}
                />
              )}
            </Stack>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: 16,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                color: "#F8FAFC",
              }}
            >
              {interview.title || "Untitled Session"}
            </Typography>

            {/* company/position hidden per your choice C */}
            <Typography
              sx={{ color: "#64748B", fontSize: 13 }}
              noWrap
            >{`${isPractice ? "AI Mock Session" : ""}`}</Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              size="small"
              label={`${scoreOutOfTen}/10`}
              sx={{
                bgcolor:
                  Number(scoreOutOfTen) > 7
                    ? "rgba(34,197,94,.18)"
                    : "rgba(251, 191, 36, 0.18)",
                color:
                  Number(scoreOutOfTen) > 7 ? "#4ADE80" : "#fbbf24",
                fontWeight: 700,
                fontSize: 12,
                borderRadius: 999,
              }}
            />
            <IconButton
              size="small"
              onClick={onDelete}
              sx={{
                color: "#f97373",
                "&:hover": { color: "#ef4444", bgcolor: "rgba(248,113,113,0.08)" },
              }}
            >
              <DeleteForeverIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Date / duration */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.75 }}
        >
          <CalendarToday sx={{ fontSize: 15, color: "#94A3B8" }} />
          <Typography sx={{ fontSize: 13, color: "#94A3B8" }}>
            {interview.date}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#475569" }}>•</Typography>
          <Typography sx={{ fontSize: 13, color: "#94A3B8" }}>
            ⏱ {interview.duration || "N/A"}
          </Typography>
        </Box>

        {/* Small info block – no company/position */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 1.25,
            mb: 2.25,
            p: 1.5,
            borderRadius: 2,
            bgcolor: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(148,163,184,0.25)",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#64748B",
              }}
            >
              File Size
            </Typography>
            <Typography
              sx={{ fontSize: 13.5, color: "#E2E8F0", mt: 0.25 }}
            >
              {interview.fileSize || "—"}
            </Typography>
          </Box>
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                textTransform: "uppercase",
                color: "#64748B",
              }}
            >
              Duration
            </Typography>
            <Typography
              sx={{ fontSize: 13.5, color: "#E2E8F0", mt: 0.25 }}
            >
              {interview.duration || "—"}
            </Typography>
          </Box>
        </Box>

        {/* Performance */}
        <Typography
          variant="subtitle2"
          sx={{
            color: "#CBD5E1",
            fontWeight: 700,
            fontSize: 13.5,
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mb: 0.75,
          }}
        >
          <BarChart sx={{ fontSize: 18, color: "#38BDF8" }} />
          Performance Breakdown
        </Typography>

        {interview.performance.length > 0 ? (
          <Box sx={{ mt: 0.25 }}>
            {interview.performance.slice(0, 3).map((m) => (
              <MetricRow key={m.category} label={m.category} score={m.score} />
            ))}
          </Box>
        ) : (
          <Typography
            sx={{
              fontSize: 12,
              color: "#64748B",
              fontStyle: "italic",
              mt: 0.5,
            }}
          >
            Processing or no metrics available yet.
          </Typography>
        )}

        {/* Key Insights */}
        <Box sx={{ mt: 1.75 }}>
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: "#E5E7EB",
              mb: 0.5,
            }}
          >
            Key Insights
          </Typography>
          {interview.keyStrengths && interview.keyStrengths.length > 0 ? (
            <Box
              sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}
            >
              {interview.keyStrengths.slice(0, 2).map((s, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 0.75,
                  }}
                >
                  <span style={{ color: "#22C55E", fontSize: 16 }}>•</span>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: 12.5, color: "#CBD5F5" }}
                  >
                    {s}
                  </Typography>
                </Box>
              ))}
              {interview.keyStrengths.length > 2 && (
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#22C55E",
                    mt: 0.25,
                  }}
                >
                  +{interview.keyStrengths.length - 2} more insights
                </Typography>
              )}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 12, color: "#64748B" }}>
              No key insights recorded yet.
            </Typography>
          )}
        </Box>

        {/* Emotion */}
        <Paper
          elevation={0}
          sx={{
            mt: 1.75,
            p: 1.25,
            bgcolor: "rgba(20,184,166,.07)",
            borderRadius: 2,
            border: "1px solid rgba(20,184,166,.18)",
          }}
        >
          <Chip
            size="small"
            label="AI Emotion Analysis"
            sx={{
              bgcolor: "rgba(20,184,166,.16)",
              color: "#22C55E",
              fontSize: 11,
              mb: 0.5,
            }}
          />
          <Typography
            variant="body2"
            sx={{ fontSize: 12.5, color: "#9BD8C9", mb: 0.25 }}
          >
            Detected <b>{formattedEmotion}</b> tone.
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: "#6EE7B7" }}>
            AI Confidence: {Math.round(interview.aiConfidence) || 0}% • Speech
            Quality: {Math.round(interview.speechQuality) || 0}%
          </Typography>
        </Paper>
      </CardContent>

      {/* Actions */}
      <CardActions
        sx={{
          px: 2.75,
          pb: 2.5,
          pt: 0.5,
          gap: 1,
          display: "flex",
        }}
      >
        <Button
          fullWidth
          startIcon={<PlayCircleOutline />}
          variant="outlined"
          onClick={onViewDetails}
          sx={{
            borderColor: "rgba(96,165,250,.7)",
            color: "#93C5FD",
            borderRadius: 2,
            fontSize: 13,
            textTransform: "none",
            "&:hover": {
              borderColor: "#60A5FA",
              bgcolor: "rgba(37,99,235,.12)",
            },
          }}
        >
          View Details
        </Button>

        <Button
          fullWidth
          startIcon={<DownloadIcon />}
          variant="contained"
          onClick={() => handleExportPDF(interview)}
          sx={{
            bgcolor: "#2563EB",
            borderRadius: 2,
            fontSize: 13,
            textTransform: "none",
            "&:hover": { bgcolor: "#1D4ED8" },
          }}
        >
          Export
        </Button>
      </CardActions>
    </Card>
  );
};

// --- Main Page Component ---
const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"history" | "activity">("history");
  const [page, setPage] = useState(1);
  const perPage = 9;

  const navigate = useNavigate();

  // reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const userId = currentUser.uid;
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          firstName: "New",
          lastName: "User",
          email: currentUser.email,
          jobTitle: "Candidate",
          location: "Unknown",
          education: "N/A",
          avatarUrl: "",
        });
      }

      const userData = (await getDoc(userRef)).data()!;

      // --- 1. Upload interviews ---
      const uploadsRef = collection(userRef, "interviews");
      const uploadsSnap = await getDocs(uploadsRef);

      const uploadsList: Interview[] = uploadsSnap.docs.map((d) => {
        const data: any = d.data();
        const feedback: any = data.feedback || {};

        const createdAt: any = data.createdAt;
        const tsSeconds =
          createdAt?.seconds ??
          (typeof createdAt?.toMillis === "function"
            ? Math.floor(createdAt.toMillis() / 1000)
            : 0);

        const overallScore: number =
          data.overallScore ?? feedback.overallScore ?? 0;

        let aiConfRaw: number | undefined =
          feedback.aiConfidence ?? data.aiConfidence ?? data.emotionConfidence;
        let aiConfidence = 0;
        if (typeof aiConfRaw === "number") {
          aiConfidence = aiConfRaw <= 1 ? aiConfRaw * 100 : aiConfRaw;
        }

        const speechQuality: number =
          data.speechQuality ?? feedback.speechQuality ?? 0;

        const perfArray: PerformanceItem[] = (
          data.performanceBreakdown ?? feedback.performanceBreakdown ?? []
        ).map((p: any) => ({
          category: p.category || "Category",
          score: typeof p.score === "number" ? p.score : 0,
          summary: p.summary,
          suggestions: p.suggestions || [],
        }));

        return {
          id: d.id,
          type: "upload",
          title:
            data.fileName || feedback.fileName || "Uploaded Interview",
          company: "",
          position: "",
          fileName: data.fileName || feedback.fileName || "",
          fileSize: data.fileSize || "—",
          date: createdAt?.toDate
            ? createdAt.toDate().toLocaleDateString()
            : tsSeconds
            ? new Date(tsSeconds * 1000).toLocaleDateString()
            : "Recently",
          timestamp: tsSeconds || 0,
          duration: data.duration || feedback.duration || "—",
          grade: data.grade || feedback.grade || "—",
          score: overallScore,
          performance: perfArray,
          keyStrengths:
            data.keyStrengths || feedback.keyStrengths || [],
          areasForImprovement:
            data.areasForImprovement ||
            feedback.areasForImprovement ||
            feedback.weaknesses ||
            [],
          immediateActionItems:
            data.immediateActionItems ||
            feedback.immediateActionItems ||
            feedback.recommendedImprovements ||
            [],
          longTermDevelopment:
            data.longTermDevelopment ||
            feedback.longTermDevelopment ||
            [],
          emotionAnalysis:
            data.dominantEmotion || feedback.dominantEmotion || "neutral",
          aiConfidence,
          speechQuality,
          performanceLevel:
            data.performanceLevel || feedback.performanceLevel || "Developing",
          transcript: data.transcript || feedback.transcript || "",
        };
      });

      // --- 2. Practice sessions ---
      const practiceRef = collection(userRef, "practiceSessions");
      const practiceSnap = await getDocs(practiceRef);

      const practiceList: Interview[] = practiceSnap.docs.map((d) => {
        const data: any = d.data();
        const summary: any = data.summary || {};
        const createdAt: any = data.createdAt;
        const tsSeconds =
          createdAt?.seconds ??
          (typeof createdAt?.toMillis === "function"
            ? Math.floor(createdAt.toMillis() / 1000)
            : 0);

        const perf: PerformanceItem[] =
          summary.performanceBreakdown ||
          [
            {
              category: "Technical",
              score: summary.technicalScore || summary.overallScore || 0,
            },
            {
              category: "Communication",
              score:
                summary.communicationScore ||
                (summary.overallScore ? summary.overallScore - 5 : 0),
            },
            {
              category: "Behavioral",
              score: summary.behavioralScore || summary.overallScore || 0,
            },
          ];

        return {
          id: d.id,
          type: "practice",
          title: `${data.role || "Practice"} (Round ${
            data.roundNumber || 1
          })`,
          company: "",
          position: data.role || "Practice session",
          fileName: undefined,
          fileSize: undefined,
          roundNumber: data.roundNumber,
          difficulty: data.config?.difficulty,
          date: createdAt?.toDate
            ? createdAt.toDate().toLocaleDateString()
            : tsSeconds
            ? new Date(tsSeconds * 1000).toLocaleDateString()
            : "Recently",
          timestamp: tsSeconds || 0,
          duration: `${data.questions?.length || 8} Questions`,
          grade: summary.overallScore > 85 ? "A" : "B",
          score: summary.overallScore || 0,
          performance: perf,
          keyStrengths: summary.strengths || summary.keyStrengths || [],
          areasForImprovement:
            summary.areasForImprovement ||
            summary.weaknesses ||
            summary.recommendedImprovements ||
            [],
          immediateActionItems:
            summary.immediateActionItems ||
            summary.recommendedImprovements ||
            [],
          longTermDevelopment: summary.longTermDevelopment || [],
          emotionAnalysis: "focused",
          aiConfidence: summary.aiConfidence ?? 90,
          speechQuality: summary.speechQuality ?? 95,
          performanceLevel: summary.performanceLevel || "Advanced",
          transcript: undefined,
        };
      });

      const allInterviews = [...uploadsList, ...practiceList].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      setUser({
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        role: userData.jobTitle,
        bio: `${userData.education} student based in ${userData.location}.`,
        avatarUrl:
          userData.avatarUrl ||
          "https://www.immerse.education/wp-content/uploads/2022/02/Computer-Science.jpg",
        pastInterviews: allInterviews,
      });

      setInterviews(allInterviews);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleDeleteInterview = async (interview: Interview) => {
    if (!auth.currentUser) return;
    const ok = window.confirm(
      "Delete this session permanently from your history?"
    );
    if (!ok) return;

    try {
      const userRef = doc(db, "users", auth.currentUser.uid);
      const collName =
        interview.type === "practice" ? "practiceSessions" : "interviews";
      const ref = doc(collection(userRef, collName), interview.id);
      await deleteDoc(ref);

      const updated = interviews.filter((i) => i.id !== interview.id);
      setInterviews(updated);

      const totalPages = Math.max(
        1,
        Math.ceil(updated.length / perPage)
      );
      if (page > totalPages) setPage(totalPages);
    } catch (e) {
      console.error(e);
      alert("Failed to delete session.");
    }
  };

 if (loading || !user) {
    return (
      <Shell>
        <SectionHeader title="Profile Dashboard" subt="Loading your data..." />
        <Box
          sx={{
            height: "50vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <CircularProgress sx={{ color: "#14B8A6" }} />
          <Typography sx={{ color: "#64748B" }}>Fetching your interview history...</Typography>
        </Box>
      </Shell>
    );
  }

  const filteredInterviews = interviews.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredInterviews.length / perPage)
  );
  const paginatedInterviews = filteredInterviews.slice(
    (page - 1) * perPage,
    page * perPage
  );

  return (
    <Shell>
      <SectionHeader
        title="Profile Dashboard"
        subt="Manage your account and track your progress"
      />

      {/* Top controls */}
      <Box
        sx={{
          px: 4,
          mt: 1,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <ButtonGroup>
          <Button
            onClick={() => setTab("history")}
            sx={{
              px: 3,
              color: tab === "history" ? "#0F172A" : "#94A3B8",
              bgcolor: tab === "history" ? "#14B8A6" : "transparent",
              fontWeight: 700,
            }}
          >
            All Activity
          </Button>

          <Button
            onClick={() => setTab("activity")}
            sx={{
              px: 3,
              color: tab === "activity" ? "#0F172A" : "#94A3B8",
              bgcolor: tab === "activity" ? "#14B8A6" : "transparent",
              fontWeight: 700,
            }}
          >
            Recent Activity
          </Button>
        </ButtonGroup>

        <Box sx={{ ml: "auto", display: "flex", gap: 1.5 }}>
          <TextField
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#94A3B8" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              minWidth: 340,
              "& .MuiOutlinedInput-root": {
                bgcolor: "#0B1220",
              },
            }}
          />

          <Button
            startIcon={<FilterListIcon />}
            sx={{ bgcolor: "rgba(148,163,184,.12)", color: "#E2E8F0" }}
          >
            Filter
          </Button>

          <Chip
            label={`${interviews.length} Sessions`}
            sx={{ bgcolor: "#0B1220", color: "#22C55E" }}
          />
        </Box>
      </Box>

      {/* Main layout */}
      <Box
        sx={{
          px: 2,
          py: 3,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "flex-start",
          columnGap: 2,
          width: "100%",
        }}
      >
        {/* Profile card */}
        <Box
          sx={{
            width: 360,
            flexShrink: 0,
          }}
        >
          <Card
            sx={{
              width: "100%",
              borderRadius: "24px",
              backgroundColor: "rgba(15,23,42,0.75)",
              border: "1px solid rgba(148,163,184,0.15)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <Box
              sx={{
                height: 65,
                background:
                  "radial-gradient(120px 50px at 20% -10%, rgba(20,184,166,.35), transparent 60%), radial-gradient(160px 60px at 80% -20%, rgba(56,189,248,.25), transparent 60%), linear-gradient(180deg, rgba(2,6,23,.5), rgba(2,6,23,.85))",
              }}
            />

            <CardContent sx={{ textAlign: "center", px: 3.5 }}>
              <Avatar
                src={user.avatarUrl}
                sx={{
                  width: 110,
                  height: 110,
                  mt: -7,
                  mx: "auto",
                  mb: 1.8,
                  border: "4px solid rgba(51,65,85,.8)",
                }}
              />

              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {user.name}
              </Typography>

              <Typography sx={{ color: "#9CA3AF", fontSize: 15 }}>
                {user.role}
              </Typography>

              <Typography sx={{ color: "#94A3B8", fontSize: 14, mt: 1 }}>
                {user.bio}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: "left", px: 1, pb: 1 }}>
                <Box sx={{ display: "flex", gap: 1.2, mb: 1 }}>
                  <Description sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography sx={{ fontSize: 14 }}>{user.email}</Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1.2, mb: 1 }}>
                  <Business sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography sx={{ fontSize: 14 }}>
                    Southeastern Louisiana University
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1.2 }}>
                  <CalendarToday sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography variant="body2" sx={{ fontSize: 14 }}>
                    Member since 2025
                  </Typography>
                </Box>
              </Box>

              <Button
                fullWidth
                sx={{
                  mt: 2.5,
                  height: 48,
                  fontSize: 15,
                  background: "linear-gradient(90deg,#14B8A6,#10B981)",
                  color: "#021015",
                  borderRadius: "12px",
                  fontWeight: 700,
                }}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Cards + pagination */}
        <Box
          sx={{
            flex: "3 1 600px",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 3,
            pr: 3,
          }}
        >
          {paginatedInterviews.length === 0 ? (
            <Box sx={{ gridColumn: "1 / -1", textAlign: "center", mt: 4 }}>
              <Typography sx={{ color: "#64748B" }}>
                No activity found.
              </Typography>
            </Box>
          ) : (
            paginatedInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onViewDetails={() =>
                  navigate("/feedback", {
                    state: {
                      interviewId: interview.id,
                      source:
                        interview.type === "practice" ? "practice" : "upload",
                    },
                  })
                }
                onDelete={() => handleDeleteInterview(interview)}
              />
            ))
          )}

          {/* Pagination row */}
          {totalPages > 1 && (
            <Box
              sx={{
                gridColumn: "1 / -1",
                display: "flex",
                justifyContent: "center",
                mt: 1,
              }}
            >
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, val) => setPage(val)}
                color="primary"
                sx={{
                  "& .MuiPaginationItem-root": {
                    color: "#E2E8F0",
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Box>
    </Shell>
  );
};

export default UserProfile;
