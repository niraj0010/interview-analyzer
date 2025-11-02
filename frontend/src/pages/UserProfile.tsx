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
  IconButton,
  Tooltip,
  ButtonGroup,
  Paper,
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarToday,
  Work,
  Business,
  Folder,
  BarChart,
  HomeOutlined,
  PersonOutline,
  Logout,
  Dashboard as DashboardIcon,
  PlayCircleOutline,
  Description,
  Bolt,
} from "@mui/icons-material";
import { DownloadIcon } from "lucide-react";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

// =====================
// ✅ Type Definitions
// =====================
interface PerformanceItem {
  category: string;
  score: number;
  summary?: string;
  suggestions?: string[];
}

interface Interview {
  id: string;
  title: string;
  company: string;
  position: string;
  fileName: string;
  fileSize: string;
  date: string;
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

// =====================
// 🎨 UI Helpers
// =====================
const Shell = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ bgcolor: "#0F172A", color: "#E2E8F0", minHeight: "100vh" }}>{children}</Box>
);

// ----------------------
// 📄 PDF Export Function
// ----------------------
const handleExportPDF = (interview: Interview) => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(interview.title, 40, 50);
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Date: ${interview.date} | Duration: ${interview.duration}`, 40, 70);
  doc.text(`Company: ${interview.company}`, 40, 90);
  doc.text(`Position: ${interview.position}`, 40, 110);

  // Divider
  doc.setDrawColor(200);
  doc.line(40, 120, 555, 120);

  // Section 1: Performance Breakdown
  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.text("Performance Breakdown", 40, 150);
  autoTable(doc, {
    startY: 160,
    head: [["Category", "Score", "Summary"]],
    body: interview.performance.map((p) => [
      p.category,
      p.score.toString(),
      p.summary || "—",
    ]),
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
  });

  // Section 2: Key Strengths
  let y = (doc as any).lastAutoTable?.finalY + 20 || 250;
  doc.text("Key Strengths", 40, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  interview.keyStrengths.forEach((s, i) => {
    doc.text(`• ${s}`, 50, y + 15 + i * 15);
  });

  // Section 3: Areas for Improvement
  y += 40 + interview.keyStrengths.length * 15;
  doc.setFont("helvetica", "bold");
  doc.text("Areas for Improvement", 40, y);
  doc.setFont("helvetica", "normal");
  interview.areasForImprovement.forEach((a, i) => {
    doc.text(`• ${a}`, 50, y + 15 + i * 15);
  });

  // Section 4: Immediate Actions
  y += 40 + interview.areasForImprovement.length * 15;
  doc.setFont("helvetica", "bold");
  doc.text("Immediate Action Items", 40, y);
  doc.setFont("helvetica", "normal");
  interview.immediateActionItems.forEach((a, i) => {
    doc.text(`• ${a}`, 50, y + 15 + i * 15);
  });

  // Section 5: Long-Term Development
  y += 40 + interview.immediateActionItems.length * 15;
  doc.setFont("helvetica", "bold");
  doc.text("Long-Term Development", 40, y);
  doc.setFont("helvetica", "normal");
  interview.longTermDevelopment.forEach((a, i) => {
    doc.text(`• ${a}`, 50, y + 15 + i * 15);
  });

  // Section 6: Emotion Analysis & Stats
  y += 40 + interview.longTermDevelopment.length * 15;
  doc.setFont("helvetica", "bold");
  doc.text("AI Summary", 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Emotion: ${interview.emotionAnalysis} | Confidence: ${interview.aiConfidence}% | Speech Quality: ${interview.speechQuality}%`,
    50,
    y + 20
  );
  doc.text(`Performance Level: ${interview.performanceLevel}`, 50, y + 40);

  // Transcript (if available)
  if (interview.transcript) {
    y += 70;
    doc.setFont("helvetica", "bold");
    doc.text("Interview Transcript (Excerpt)", 40, y);
    doc.setFont("helvetica", "normal");
    const transcript = doc.splitTextToSize(interview.transcript, 500);
    doc.text(transcript.slice(0, 25), 50, y + 20); // first few lines only
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    "Generated by Interview Analyzer AI Dashboard",
    40,
    doc.internal.pageSize.height - 30
  );

  // Save
  doc.save(`${interview.title.replace(/\s+/g, "_")}.pdf`);
};


const SectionHeader = ({ title, subt }: { title: string; subt: string }) => (
  <Box sx={{ px: { xs: 2.5, md: 4 }, pt: 3, pb: 1 }}>
    <Typography variant="h4" sx={{ fontWeight: 800, color: "#fff" }}>
      {title}
    </Typography>
    <Typography sx={{ color: "#94A3B8", mt: 0.5 }}>{subt}</Typography>
  </Box>
);

const MetricRow = ({ label, score }: { label: string; score: number }) => {
  const safe = Number.isFinite(score) ? Number(score) : 0;
  const normalized = safe > 10 ? Math.min(safe, 100) : Math.min((safe / 10) * 100, 100);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
      <Typography sx={{ flex: 1.6, fontSize: 13, color: "#E2E8F0" }}>{label}</Typography>
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
            transition: "width .6s ease",
          },
        }}
      />
      <Typography sx={{ width: 38, textAlign: "right", fontSize: 13, color: "#94A3B8" }}>
        {safe.toFixed(safe > 10 ? 0 : 1)}
      </Typography>
    </Box>
  );
};

// =====================
// ✅ Main Component
// =====================
const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"history" | "activity">("history");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      const userId = currentUser.uid;
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            firstName: "New",
            lastName: "User",
            email: currentUser.email || "unknown@email.com",
            jobTitle: "Candidate",
            location: "Unknown",
            education: "Information Technology",
            avatarUrl: "",
          });
        }

        const userData = (await getDoc(userRef)).data()!;
        const interviewsRef = collection(userRef, "interviews");
        const interviewsSnap = await getDocs(interviewsRef);

        const normalizeArray = (field: any): string[] => {
          if (Array.isArray(field)) return field;
          if (typeof field === "object" && field !== null) return Object.values(field);
          return [];
        };

        const interviewsList: Interview[] = interviewsSnap.docs.map((docSnap) => {
          const d = docSnap.data() as any;
          const feedback = d.feedback || {};

          const interviewDate = d.createdAt?.seconds
            ? new Date(d.createdAt.seconds * 1000).toLocaleDateString()
            : "Unknown";

          const rawPerformance =
            d.performanceBreakdown ||
            d.performance_breakdown ||
            feedback.performanceBreakdown ||
            feedback.performance ||
            [];

          const performance: PerformanceItem[] = Array.isArray(rawPerformance)
            ? rawPerformance.map((p: any) => ({
              category: p.category || "Unknown Metric",
              score: parseFloat(p.score) || 0,
              summary: p.summary || "",
              suggestions: Array.isArray(p.suggestions) ? p.suggestions : [],
            }))
            : [];

          const keyStrengths = normalizeArray(d.keyStrengths || feedback.keyStrengths);
          const areasForImprovement = normalizeArray(
            d.areasForImprovement || feedback.areasForImprovement
          );
          const immediateActionItems = normalizeArray(
            d.immediateActionItems || feedback.immediateActionItems
          );
          const longTermDevelopment = normalizeArray(
            d.longTermDevelopment || feedback.longTermDevelopment
          );

          const topEmotion =
            Array.isArray(d.allEmotions) && d.allEmotions.length > 0
              ? d.allEmotions.reduce((max: any, curr: any) =>
                curr.score > max.score ? curr : max
              )
              : { label: d.dominantEmotion || "neutral" };

          return {
            id: docSnap.id,
            title:
              d.fileName && typeof d.fileName === "string"
                ? `Interview_${d.fileName.replace(".mp4", "")}`
                : d.title || `Interview with ${d.company || "Unknown"}`,
            company: (userData.company as string) || "Microsoft",
            position: (userData.jobTitle as string) || "Candidate",
            fileName: d.fileName || "Unknown",
            fileSize: d.fileSize || "Unknown",
            date: interviewDate,
            duration: d.duration || "N/A",
            grade: d.grade || "N/A",
            score: typeof d.overallScore === "number" ? d.overallScore : feedback.aiConfidence || 0,
            performance,
            keyStrengths,
            areasForImprovement,
            immediateActionItems,
            longTermDevelopment,
            emotionAnalysis: (topEmotion as any).label || "neutral",
            aiConfidence: feedback.aiConfidence || d.aiConfidence || d.emotionConfidence || 0,
            speechQuality: d.speechQuality || feedback.speechQuality || 0,
            performanceLevel: d.performanceLevel || feedback.performanceLevel || "Unknown",
            transcript: d.transcript || feedback.transcript || "",
          };
        });

        setUser({
          name: `${userData.firstName} ${userData.lastName}`,
          email: userData.email,
          role: userData.jobTitle,
          bio: `${userData.education} student based in ${userData.location}.`,
          avatarUrl: (userData.avatarUrl as string) || "https://i.pravatar.cc/150?img=32",
          pastInterviews: interviewsList,
        });

        setInterviews(interviewsList);
      } catch (err) {
        console.error("❌ Error fetching Firestore data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <Shell>


        <Box sx={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="#94A3B8">Loading profile...</Typography>
        </Box>
      </Shell>
    );

  if (!user)
    return (
      <Shell>


        <Box sx={{ height: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography color="#94A3B8">No user profile found. Please log in again.</Typography>
        </Box>
      </Shell>
    );

  const filteredInterviews = interviews.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <SectionHeader title="Profile Dashboard" subt="Manage your account and track your progress" />

      {/* Search and Tabs */}
      <Box
        sx={{
          px: { xs: 2.5, md: 4 },
          mt: 1,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <ButtonGroup
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "rgba(148,163,184,0.08)",
          }}
        >
          <Button
            onClick={() => setTab("history")}
            sx={{
              px: 3,
              color: tab === "history" ? "#0F172A" : "#94A3B8",
              bgcolor: tab === "history" ? "#14B8A6" : "transparent",
              "&:hover": { bgcolor: tab === "history" ? "#10a392" : "rgba(148,163,184,0.12)" },
              fontWeight: 700,
            }}
          >
            Interview History
          </Button>
          <Button
            onClick={() => setTab("activity")}
            sx={{
              px: 3,
              color: tab === "activity" ? "#0F172A" : "#94A3B8",
              bgcolor: tab === "activity" ? "#14B8A6" : "transparent",
              "&:hover": { bgcolor: tab === "activity" ? "#10a392" : "rgba(148,163,184,0.12)" },
              fontWeight: 700,
            }}
          >
            Recent Activity
          </Button>
        </ButtonGroup>

        <Box sx={{ ml: "auto", display: "flex", gap: 1.5, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            placeholder="Search interviews..."
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
                borderRadius: 2,
                fieldset: { borderColor: "rgba(148,163,184,.18)" },
                "&:hover fieldset": { borderColor: "rgba(148,163,184,.32)" },
                "&.Mui-focused fieldset": { borderColor: "#14B8A6" },
                input: { color: "#E2E8F0" },
              },
            }}
          />
          <Button
            startIcon={<FilterListIcon />}
            sx={{
              bgcolor: "rgba(148,163,184,.12)",
              color: "#E2E8F0",
              borderRadius: 2,
              textTransform: "none",
              "&:hover": { bgcolor: "rgba(148,163,184,.18)" },
            }}
          >
            Filter
          </Button>
          <Chip
            label={`${interviews.length} Total Interviews`}
            sx={{ bgcolor: "#0B1220", color: "#22C55E", borderRadius: 2 }}
          />
        </Box>
      </Box>

      {/* Main Layout */}
      <Box
        sx={{
          px: { xs: 2.5, md: 4 },
          py: 3,
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
        }}
      >
        {/* Left Profile */}
        <Box sx={{ flex: "1 1 320px", maxWidth: 400 }}>
          <Card
            sx={{
              bgcolor: "rgba(2,6,23,0.7)",
              borderRadius: 3,
              border: "1px solid rgba(148,163,184,.14)",
              boxShadow: "0 10px 40px rgba(0,0,0,.35)",
            }}
          >
            <Box
              sx={{
                height: 90,
                background:
                  "radial-gradient(120px 50px at 20% -10%, rgba(20,184,166,.45), transparent 60%), radial-gradient(160px 60px at 80% -20%, rgba(56,189,248,.35), transparent 60%), linear-gradient(180deg, rgba(2,6,23,.42), rgba(2,6,23,.8))",
                borderBottom: "1px solid rgba(148,163,184,.14)",
              }}
            />
            <CardContent sx={{ pt: 0, textAlign: "center" }}>
              <Avatar
                src={user.avatarUrl}
                alt={user.name}
                sx={{
                  width: 100,
                  height: 100,
                  mt: -6,
                  mx: "auto",
                  mb: 1.5,
                  border: "3px solid rgba(51,65,85,.8)",
                  boxShadow: "0 10px 28px rgba(20,184,166,.22)",
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {user.name}
              </Typography>
              <Typography sx={{ color: "#9CA3AF", mt: 0.5 }}>{user.role}</Typography>
              <Typography sx={{ color: "#94A3B8", mt: 1 }}>{user.bio}</Typography>

              <Divider sx={{ my: 2.5, borderColor: "rgba(148,163,184,.14)" }} />

              <Box sx={{ textAlign: "left", px: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Description sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography variant="body2">{user.email}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Business sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography variant="body2">Southeastern Louisiana University</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CalendarToday sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography variant="body2">Member since 2025</Typography>
                </Box>
              </Box>

              <Button
                fullWidth
                sx={{
                  mt: 2.5,
                  background: "linear-gradient(90deg,#14B8A6,#10B981)",
                  color: "#021015",
                  fontWeight: 700,
                  borderRadius: 2,
                  "&:hover": { boxShadow: "0 12px 28px rgba(20,184,166,.22)" },
                }}
              >
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Right Interview Cards */}
        <Box
          sx={{
            flex: "3 1 600px",
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
            justifyContent: "flex-start",
          }}
        >
          {filteredInterviews.map((interview) => (
            <Card
              key={interview.id}
              sx={{
                flex: "1 1 360px",
                bgcolor: "#0D1626",
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,.12)",
                boxShadow: "0 10px 38px rgba(0,0,0,.35)",
                transition: "transform .18s ease",
                "&:hover": { transform: "translateY(-2px)" },
              }}
            >
              <CardContent sx={{ pb: 1.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      maxWidth: "80%",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {interview.title}
                  </Typography>
                  <Chip
                    size="small"
                    label={`${(interview.score / 10).toFixed(1)}/10`}
                    sx={{ bgcolor: "rgba(34,197,94,.15)", color: "#34D399", fontWeight: 700 }}
                  />
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 1 }}>
                  <CalendarToday sx={{ fontSize: 16, color: "#94A3B8" }} />
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                    {interview.date}
                  </Typography>
                  <Typography sx={{ color: "#475569" }}>•</Typography>
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                    ⏱ {interview.duration}
                  </Typography>
                </Box>

                {/* Performance */}
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#CBD5E1",
                    mt: 2,
                    mb: 0.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontWeight: 700,
                  }}
                >
                  <BarChart sx={{ fontSize: 18, color: "#38BDF8" }} />
                  Performance Breakdown
                </Typography>

                {interview.performance.length > 0 ? (
                  <Box sx={{ mt: 0.5 }}>
                    {interview.performance.slice(0, 4).map((m) => (
                      <MetricRow key={m.category} label={m.category} score={Number(m.score)} />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: "#64748B", fontStyle: "italic", mt: 1 }}>
                    No performance data available.
                  </Typography>
                )}

                {/* Strengths */}
                <Typography sx={{ mt: 2, fontWeight: 700 }}>Key Insights</Typography>
                <Box sx={{ mt: 0.5 }}>
                  {(interview.keyStrengths ?? []).slice(0, 2).map((s, i) => (
                    <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, color: "#9CA3AF" }}>
                      <span style={{ color: "#22C55E" }}>•</span>
                      <Typography variant="body2">{s}</Typography>
                    </Box>
                  ))}
                  {interview.keyStrengths.length > 2 && (
                    <Typography variant="body2" sx={{ color: "#22C55E", mt: 0.5 }}>
                      +{interview.keyStrengths.length - 2} more insights
                    </Typography>
                  )}
                </Box>

                {/* Emotion */}
                <Paper
                  elevation={0}
                  sx={{
                    mt: 1.5,
                    p: 1.25,
                    bgcolor: "rgba(20,184,166,.07)",
                    border: "1px solid rgba(20,184,166,.16)",
                    borderRadius: 2,
                  }}
                >
                  <Chip
                    size="small"
                    label="AI Emotion Analysis"
                    sx={{ bgcolor: "rgba(20,184,166,.18)", color: "#22C55E", mb: 0.5 }}
                  />
                  <Typography variant="body2" sx={{ color: "#9BD8C9" }}>
                    {interview.emotionAnalysis
                      ? `${interview.emotionAnalysis.charAt(0).toUpperCase() +
                      interview.emotionAnalysis.slice(1)} throughout`
                      : "Emotion summary unavailable"}
                  </Typography>
                </Paper>
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                <Button
                  fullWidth
                  startIcon={<PlayCircleOutline />}
                  variant="outlined"
                  onClick={() =>
                    navigate("/feedback", {
                      state: { userId: auth.currentUser?.uid, interviewId: interview.id },
                    })
                  }
                  sx={{
                    borderColor: "rgba(96,165,250,.6)",
                    color: "#93C5FD",
                    borderRadius: 2,
                    textTransform: "none",
                    "&:hover": { borderColor: "#60A5FA", bgcolor: "rgba(59,130,246,.08)" },
                  }}
                >
                  View Details
                </Button>
                <Button
                  fullWidth
                  startIcon={<DownloadIcon />}
                  variant="contained"
                  sx={{
                    bgcolor: "#2563EB",
                    borderRadius: 2,
                    textTransform: "none",
                    "&:hover": { bgcolor: "#1D4ED8" },
                  }}
                  onClick={() => handleExportPDF(interview)}
                >
                  Export
                </Button>

              </CardActions>
            </Card>
          ))}
        </Box>
      </Box>
    </Shell>
  );
};

export default UserProfile;
