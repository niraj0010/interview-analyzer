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
  Paper,
  Stack,
  IconButton,
  Pagination,
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
  Bolt as BoltIcon,
  Delete as DeleteIcon,
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
        sx={{
          width: 38,
          textAlign: "right",
          fontSize: 12,
          color: "#94A3B8",
        }}
      >
        {Math.round(normalized)}
      </Typography>
    </Box>
  );
};

// --- PDF Export ---
const handleExportPDF = (interview: Interview) => {
  const docPdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(18);
  docPdf.text(interview.title || "Interview Report", 40, 50);

  docPdf.setFontSize(10);
  docPdf.setTextColor(100);
  docPdf.text(
    `Type: ${interview.type.toUpperCase()}  |  Date: ${interview.date}`,
    40,
    70
  );

  docPdf.setFontSize(11);
  docPdf.setTextColor(90);
  docPdf.text(`Company: ${interview.company}`, 40, 90);
  docPdf.text(`Position: ${interview.position}`, 40, 106);

  docPdf.setDrawColor(210);
  docPdf.line(40, 115, 555, 115);

  docPdf.setFontSize(13);
  docPdf.setTextColor(30);
  docPdf.text("Performance Breakdown", 40, 140);
  autoTable(docPdf, {
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

  let y = (docPdf as any).lastAutoTable?.finalY || 200;

  const writeList = (title: string, items: string[]) => {
    if (!items || items.length === 0) return;
    y += 24;
    docPdf.setFont("helvetica", "bold");
    docPdf.setFontSize(12);
    docPdf.text(title, 40, y);
    docPdf.setFont("helvetica", "normal");
    docPdf.setFontSize(11);
    items.forEach((item, idx) => {
      docPdf.text(`• ${item}`, 50, y + 16 + idx * 14);
    });
    y += 16 + items.length * 14;
  };

  writeList("Key Strengths", interview.keyStrengths);
  writeList("Areas for Improvement", interview.areasForImprovement);
  writeList("Immediate Action Items", interview.immediateActionItems);
  writeList("Long-Term Development", interview.longTermDevelopment);

  y += 24;
  docPdf.setFont("helvetica", "bold");
  docPdf.setFontSize(12);
  docPdf.text("AI Summary", 40, y);
  docPdf.setFont("helvetica", "normal");
  docPdf.setFontSize(11);
  y += 16;
  docPdf.text(
    `Emotion: ${interview.emotionAnalysis || "N/A"}   |   AI Confidence: ${
      Math.round(interview.aiConfidence) || 0
    }%   |   Speech Quality: ${
      Math.round(interview.speechQuality) || 0
    }%`,
    40,
    y
  );
  y += 18;
  docPdf.text(
    `Performance Level: ${interview.performanceLevel || "N/A"}`,
    40,
    y
  );

  if (interview.transcript) {
    y += 24;
    docPdf.setFont("helvetica", "bold");
    docPdf.text("Transcript (excerpt)", 40, y);
    docPdf.setFont("helvetica", "normal");
    const wrapped = docPdf.splitTextToSize(interview.transcript, 515);
    docPdf.text(wrapped.slice(0, 40), 40, y + 16);
  }

  docPdf.setFontSize(9);
  docPdf.setTextColor(140);
  docPdf.text(
    "Generated by Interview Analyzer",
    40,
    docPdf.internal.pageSize.height - 30
  );

  docPdf.save(
    `${(interview.title || "interview_report").replace(/\s+/g, "_")}.pdf`
  );
};

// --- InterviewCard ---
const InterviewCard: React.FC<{
  interview: Interview;
  onViewDetails: () => void;
  onDelete?: () => void;
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
        {/* HEADER */}
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
              {/* TYPE BADGE */}
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

            <Typography sx={{ color: "#64748B", fontSize: 13 }} noWrap>
              {interview.company} • {interview.position}
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 0.5,
            }}
          >
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
            {onDelete && (
              <IconButton
                size="small"
                onClick={onDelete}
                sx={{
                  color: "#f97373",
                  "&:hover": {
                    bgcolor: "rgba(248,113,113,0.12)",
                    color: "#fecaca",
                  },
                }}
              >
                <DeleteIcon sx={{ fontSize: 18 }} />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* META */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            mb: 1.75,
          }}
        >
          <CalendarToday sx={{ fontSize: 15, color: "#94A3B8" }} />
          <Typography sx={{ fontSize: 13, color: "#94A3B8" }}>
            {interview.date}
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#475569" }}>
            •
          </Typography>
          <Typography sx={{ fontSize: 13, color: "#94A3B8" }}>
            ⏱ {interview.duration || "N/A"}
          </Typography>
        </Box>

        {/* DETAILS GRID */}
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
              Company
            </Typography>
            <Typography
              sx={{ fontSize: 13.5, color: "#E2E8F0", mt: 0.25 }}
            >
              {interview.company || "—"}
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
              Position
            </Typography>
            <Typography
              sx={{ fontSize: 13.5, color: "#E2E8F0", mt: 0.25 }}
            >
              {interview.position || "—"}
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

        {/* PERFORMANCE */}
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
              <MetricRow
                key={m.category}
                label={m.category}
                score={m.score}
              />
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

        {/* KEY INSIGHTS */}
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
          {interview.keyStrengths &&
          interview.keyStrengths.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.25,
              }}
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
                  <span
                    style={{ color: "#22C55E", fontSize: 16 }}
                  >
                    •
                  </span>
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

        {/* EMOTION BUBBLE */}
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
          <Typography
            sx={{ fontSize: 11.5, color: "#6EE7B7" }}
          >
            AI Confidence: {Math.round(interview.aiConfidence) || 0}
            % • Speech Quality:{" "}
            {Math.round(interview.speechQuality) || 0}%
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
  const [userId, setUserId] = useState<string | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"history" | "activity">("history");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const PAGE_SIZE = 9; // 3 cards x 3 rows

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const uid = currentUser.uid;
      setUserId(uid);

      const userRef = doc(db, "users", uid);
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

      // 1. Fetch Uploaded Interviews
      const interviewsRef = collection(userRef, "interviews");
      const uploadsSnap = await getDocs(interviewsRef);

      const uploadsList: Interview[] = uploadsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: "upload",
          title: data.fileName || "Uploaded Interview",
          company: "Company",
          position: "Candidate",
          fileName: data.fileName,
          fileSize: data.fileSize,
          date: data.createdAt
            ? new Date(data.createdAt.seconds * 1000).toLocaleDateString()
            : "Recently",
          timestamp: data.createdAt ? data.createdAt.seconds : 0,
          duration: "00:45",
          grade: "B+",
          score: data.summary?.overallScore || 75,
          performance: [],
          keyStrengths: data.summary?.strengths || [],
          areasForImprovement: data.summary?.weaknesses || [],
          immediateActionItems: [],
          longTermDevelopment: [],
          emotionAnalysis: "neutral",
          aiConfidence: 85,
          speechQuality: 80,
          performanceLevel: "intermediate",
        };
      });

      // 2. Fetch Practice Sessions
      const practiceRef = collection(userRef, "practiceSessions");
      const practiceSnap = await getDocs(practiceRef);

      const practiceList: Interview[] = practiceSnap.docs.map((d) => {
        const data = d.data();
        const summary = data.summary || {};

        const mockPerformance: PerformanceItem[] = [
          {
            category: "Technical",
            score:
              summary.technicalScore || summary.overallScore || 0,
          },
          {
            category: "Communication",
            score:
              summary.communicationScore ||
              (summary.overallScore ? summary.overallScore - 5 : 0),
          },
          {
            category: "Behavioral",
            score:
              summary.behavioralScore || summary.overallScore || 0,
          },
        ];

        return {
          id: d.id,
          type: "practice",
          title: `${data.role} (Round ${data.roundNumber || 1})`,
          company: "AI Mock Interview",
          position: data.role,
          roundNumber: data.roundNumber,
          difficulty: data.config?.difficulty,
          date: data.createdAt
            ? new Date(data.createdAt.seconds * 1000).toLocaleDateString()
            : "Recently",
          timestamp: data.createdAt ? data.createdAt.seconds : 0,
          duration: `${data.questions?.length || 8} Questions`,
          grade: summary.overallScore > 85 ? "A" : "B",
          score: summary.overallScore || 0,
          performance: mockPerformance,
          keyStrengths: summary.strengths || [],
          areasForImprovement: summary.weaknesses || [],
          immediateActionItems: summary.recommendedImprovements || [],
          longTermDevelopment: [],
          emotionAnalysis: "focused",
          aiConfidence: 90,
          speechQuality: 95,
          performanceLevel: "Advanced",
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

  // reset to page 1 when search/filter changes
  useEffect(() => {
    setPage(1);
  }, [search, interviews.length]);

  if (loading || !user) return null;

  const filteredInterviews = interviews.filter((i) => {
    const target = `${i.title} ${i.company} ${i.position}`.toLowerCase();
    return target.includes(search.toLowerCase());
  });

  const totalPages =
    filteredInterviews.length === 0
      ? 1
      : Math.ceil(filteredInterviews.length / PAGE_SIZE);
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleInterviews = filteredInterviews.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const handleDeleteInterview = async (interview: Interview) => {
    if (!userId) return;
    const ok = window.confirm(
      "Delete this session? This cannot be undone."
    );
    if (!ok) return;

    const collectionName =
      interview.type === "practice" ? "practiceSessions" : "interviews";

    try {
      await deleteDoc(
        doc(db, "users", userId, collectionName, interview.id)
      );
      setInterviews((prev) =>
        prev.filter((i) => i.id !== interview.id)
      );
    } catch (err) {
      console.error("Failed to delete session", err);
      alert("Failed to delete session. Please try again.");
    }
  };

  return (
    <Shell>
      <SectionHeader
        title="Profile Dashboard"
        subt="Manage your account and track your progress"
      />

      {/* Tabs + Search */}
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
              bgcolor:
                tab === "history" ? "#14B8A6" : "transparent",
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
              bgcolor:
                tab === "activity" ? "#14B8A6" : "transparent",
              fontWeight: 700,
            }}
          >
            Statistics
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
            sx={{
              bgcolor: "rgba(148,163,184,.12)",
              color: "#E2E8F0",
            }}
          >
            Filter
          </Button>

          <Chip
            label={`${interviews.length} Sessions`}
            sx={{ bgcolor: "#0B1220", color: "#22C55E" }}
          />
        </Box>
      </Box>

      {/* Main Layout */}
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
        {/* Profile Card */}
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

              <Typography
                sx={{ color: "#9CA3AF", fontSize: 15 }}
              >
                {user.role}
              </Typography>

              <Typography
                sx={{ color: "#94A3B8", fontSize: 14, mt: 1 }}
              >
                {user.bio}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ textAlign: "left", px: 1, pb: 1 }}>
                <Box
                  sx={{ display: "flex", gap: 1.2, mb: 1 }}
                >
                  <Description
                    sx={{ fontSize: 18, color: "#94A3B8" }}
                  />
                  <Typography sx={{ fontSize: 14 }}>
                    {user.email}
                  </Typography>
                </Box>

                <Box
                  sx={{ display: "flex", gap: 1.2, mb: 1 }}
                >
                  <Business
                    sx={{ fontSize: 18, color: "#94A3B8" }}
                  />
                  <Typography sx={{ fontSize: 14 }}>
                    Southeastern Louisiana University
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1.2 }}>
                  <CalendarToday
                    sx={{ fontSize: 18, color: "#94A3B8" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontSize: 14 }}
                  >
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
                  background:
                    "linear-gradient(90deg,#14B8A6,#10B981)",
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

        {/* Cards Grid: 3 per row, 9 per page */}
        <Box
          sx={{
            flex: "3 1 600px",
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: "repeat(3, 1fr)", // 3 per row on desktop
            },
            gap: 3,
            pr: 3,
          }}
        >
          {filteredInterviews.length === 0 ? (
            <Box
              sx={{
                gridColumn: "1 / -1",
                textAlign: "center",
                mt: 4,
              }}
            >
              <Typography sx={{ color: "#64748B" }}>
                No activity found.
              </Typography>
            </Box>
          ) : (
            visibleInterviews.map((interview) => (
              <InterviewCard
                key={interview.id}
                interview={interview}
                onViewDetails={() =>
                  navigate("/feedback", {
                    state: {
                      interviewId: interview.id,
                      source:
                        interview.type === "practice"
                          ? "practice"
                          : "upload",
                    },
                  })
                }
                onDelete={() =>
                  handleDeleteInterview(interview)
                }
              />
            ))
          )}
        </Box>
      </Box>

      {/* Pagination controls */}
      {filteredInterviews.length > 0 && (
        <Box
          sx={{
            px: 4,
            pb: 4,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Pagination
            count={totalPages}
            page={safePage}
            onChange={(_, value) => setPage(value)}
            color="primary"
            sx={{
              "& .MuiPaginationItem-root": {
                color: "#E2E8F0",
              },
              "& .Mui-selected": {
                bgcolor: "#14B8A6 !important",
                color: "#0F172A",
              },
            }}
          />
        </Box>
      )}
    </Shell>
  );
};

export default UserProfile;
