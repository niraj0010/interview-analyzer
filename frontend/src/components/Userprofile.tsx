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
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarToday,
  Business,
  Description,
  BarChart,
  PlayCircleOutline,
} from "@mui/icons-material";
import { DownloadIcon } from "lucide-react";
import { doc, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import { useNavigate } from "react-router-dom";

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
  const normalized = Math.min((score / 100) * 100, 100);
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
          },
        }}
      />
      <Typography sx={{ width: 38, textAlign: "right", fontSize: 13, color: "#94A3B8" }}>
        {score}
      </Typography>
    </Box>
  );
};

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"history" | "activity">("history");
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;

      const userId = currentUser.uid;
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          firstName: "New",
          lastName: "User",
          email: currentUser.email,
          jobTitle: "Student",
          location: "Hammond, LA",
          education: "Information Technology",
          avatarUrl: "",
        });
      }

      const userData = (await getDoc(userRef)).data()!;
      const interviewsRef = collection(userRef, "interviews");
      const interviewsSnap = await getDocs(interviewsRef);

      const interviewsList: Interview[] = interviewsSnap.docs.map((d) => ({
        id: d.id,
        title: d.data().fileName,
        company: "Company",
        position: "Candidate",
        fileName: d.data().fileName,
        fileSize: d.data().fileSize,
        date: new Date().toLocaleDateString(),
        duration: "00:45",
        grade: "A",
        score: 90,
        performance: [],
        keyStrengths: [],
        areasForImprovement: [],
        immediateActionItems: [],
        longTermDevelopment: [],
        emotionAnalysis: "neutral",
        aiConfidence: 85,
        speechQuality: 80,
        performanceLevel: "intermediate",
        transcript: "",
      }));

      setUser({
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        role: userData.jobTitle,
        bio: `${userData.education} student based in ${userData.location}.`,
        avatarUrl:
          userData.avatarUrl ||
          "https://www.immerse.education/wp-content/uploads/2022/02/Computer-Science.jpg",
        pastInterviews: interviewsList,
      });

      setInterviews(interviewsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading || !user) return null;

  const filteredInterviews = interviews.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <SectionHeader title="Profile Dashboard" subt="Manage your account and track your progress" />

      {/* Search + Tabs */}
      <Box sx={{ px: 4, mt: 1, display: "flex", alignItems: "center", gap: 2 }}>
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
            Interview History
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
              },
            }}
          />

          <Button startIcon={<FilterListIcon />} sx={{ bgcolor: "rgba(148,163,184,.12)" }}>
            Filter
          </Button>

          <Chip label={`${interviews.length} Total Interviews`} sx={{ bgcolor: "#0B1220" }} />
        </Box>
      </Box>

      {/* MAIN LAYOUT */}
      <Box
        sx={{
          px: 4,
          py: 3,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-start",
          gap: 3,
        }}
      >
        {/* ===========================
             ⭐ UPDATED PROFILE CARD ⭐
        ============================ */}
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
              overflow: "hidden",
            }}
          >
            {/* Top Gradient */}
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

              <Typography sx={{ color: "#9CA3AF", fontSize: 15, mt: 0.3 }}>
                {user.role}
              </Typography>

              <Typography sx={{ color: "#94A3B8", fontSize: 14, mt: 1 }}>
                {user.bio}
              </Typography>

              <Divider sx={{ my: 2, borderColor: "rgba(148,163,184,.14)" }} />

              {/* info */}
              <Box sx={{ textAlign: "left", px: 1, pb: 1 }}>
                <Box sx={{ display: "flex", gap: 1.2, mb: 1 }}>
                  <Description sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography variant="body2" sx={{ fontSize: 14 }}>
                    {user.email}
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", gap: 1.2, mb: 1 }}>
                  <Business sx={{ fontSize: 18, color: "#94A3B8" }} />
                  <Typography variant="body2" sx={{ fontSize: 14 }}>
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

        {/* ===========================
             INTERVIEW CARDS (unchanged)
        ============================ */}
        <Box sx={{ flex: "3 1 600px", display: "flex", flexWrap: "wrap", gap: 3 }}>
          {filteredInterviews.map((interview) => (
            <Card
              key={interview.id}
              sx={{
                flex: "1 1 360px",
                bgcolor: "#0D1626",
                borderRadius: 3,
                border: "1px solid rgba(148,163,184,.12)",
                boxShadow: "0 10px 38px rgba(0,0,0,.35)",
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {interview.title}
                </Typography>

                <Typography sx={{ mt: 1 }}>{interview.date}</Typography>

                <Typography sx={{ mt: 2, fontWeight: 700 }}>
                  Performance Breakdown
                </Typography>

                {interview.performance.length === 0 && (
                  <Typography>No performance data.</Typography>
                )}
              </CardContent>

              <CardActions sx={{ px: 2, pb: 2 }}>
                <Button
                  fullWidth
                  startIcon={<PlayCircleOutline />}
                  onClick={() =>
                    navigate("/feedback", { state: { interviewId: interview.id } })
                  }
                >
                  View Details
                </Button>

                <Button fullWidth startIcon={<DownloadIcon />}>
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
