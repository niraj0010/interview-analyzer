import React, { useState } from "react";
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
} from "@mui/material";
import {
  Search as SearchIcon,
  FilterList as FilterListIcon,
  CalendarToday,
  Work,
  Business,
  Folder,
} from "@mui/icons-material";
import userData from "../data/userData.json";

const UserProfile: React.FC = () => {
  const user = userData; // Single user object
  const [search, setSearch] = useState("");

  const filteredInterviews = user.pastInterviews.filter((i) =>
    i.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box
      sx={{
        bgcolor: "#0E1621",
        color: "#E0E0E0",
        minHeight: "100vh",
        fontFamily: "Inter, sans-serif",
        p: 4,
      }}
    >
      {/* ===== Header ===== */}
      <Typography variant="h4" fontWeight="700" mb={1} sx={{ color: "#fff" }}>
        Profile Dashboard
      </Typography>
      <Typography variant="body1" mb={4} sx={{ color: "#94A3B8" }}>
        Manage your account and track your progress
      </Typography>

      {/* ===== Layout ===== */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 3,
        }}
      >
        {/* ===== Left Profile Card ===== */}
        <Card
          sx={{
            flex: "0 0 320px",
            bgcolor: "#1A2234",
            borderRadius: "16px",
            boxShadow: "0 0 20px rgba(0,0,0,0.4)",
          }}
        >
          <CardContent sx={{ textAlign: "center" }}>
            <Avatar
              src={user.avatarUrl}
              alt={user.name}
              sx={{
                width: 100,
                height: 100,
                mx: "auto",
                mb: 2,
                border: "3px solid #263449",
              }}
            />
            <Typography variant="h6" sx={{ color: "#fff" }}>
              {user.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "#9CA3AF", mb: 1 }}>
              {user.role}
            </Typography>
            <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
              {user.bio}
            </Typography>

            <Divider sx={{ my: 2, bgcolor: "#334155" }} />

            <Box sx={{ textAlign: "left", pl: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                📧 {user.email}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                🏫 Southeastern Louisiana University
              </Typography>
              <Typography variant="body2">🎓 BS Information Technology</Typography>
            </Box>
          </CardContent>
        </Card>

        {/* ===== Right Dashboard Content ===== */}
        <Box sx={{ flex: 1 }}>
          {/* Search + Filter */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 3,
              flexWrap: "wrap",
            }}
          >
            <TextField
              placeholder="Search interviews..."
              variant="outlined"
              fullWidth
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#94A3B8" }} />
                  </InputAdornment>
                ),
                sx: {
                  bgcolor: "#1E293B",
                  borderRadius: "12px",
                  input: { color: "#E2E8F0" },
                },
              }}
            />
            <Button
              variant="contained"
              startIcon={<FilterListIcon />}
              sx={{
                bgcolor: "#334155",
                borderRadius: "12px",
                textTransform: "none",
                "&:hover": { bgcolor: "#475569" },
              }}
            >
              Filter
            </Button>
            <Chip
              label={`${user.pastInterviews.length} Total Interviews`}
              sx={{ bgcolor: "#1E293B", color: "#22C55E" }}
            />
          </Box>

          {/* ===== Interview Cards ===== */}
          <Box
            sx={{
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
                  flex: "1 1 380px",
                  bgcolor: "#1E293B",
                  borderRadius: "16px",
                  boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                  transition: "transform 0.2s ease",
                  "&:hover": { transform: "scale(1.02)" },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {interview.title}
                    </Typography>
                    <Chip
                      label={`${interview.score}/10`}
                      sx={{ bgcolor: "#0F766E", color: "#D1FAE5" }}
                    />
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CalendarToday sx={{ fontSize: 16, color: "#94A3B8" }} />
                    <Typography variant="body2" sx={{ color: "#94A3B8" }}>
                      {interview.date} | ⏱ {interview.duration}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2, bgcolor: "#334155" }} />

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <Business sx={{ fontSize: 16, mr: 1, verticalAlign: "middle" }} />
                    Company: {interview.company}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <Work sx={{ fontSize: 16, mr: 1, verticalAlign: "middle" }} />
                    Position: {interview.position}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <Folder sx={{ fontSize: 16, mr: 1, verticalAlign: "middle" }} />
                    File Size: {interview.fileSize}
                  </Typography>

                  {/* Performance Breakdown */}
                  <Divider sx={{ my: 2, bgcolor: "#334155" }} />
                  <Typography variant="subtitle2" sx={{ color: "#CBD5E1", mb: 1 }}>
                    Performance Breakdown
                  </Typography>
                  {Object.entries(interview.performance).map(([metric, value]) => (
                    <Box key={metric} display="flex" alignItems="center" mt={0.5}>
                      <Typography sx={{ flex: 1, fontSize: 13 }}>{metric}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={value * 10}
                        sx={{
                          flex: 3,
                          height: 8,
                          borderRadius: 5,
                          mx: 1,
                          bgcolor: "#1E3A8A",
                          "& .MuiLinearProgress-bar": { bgcolor: "#60A5FA" },
                        }}
                      />
                      <Typography sx={{ width: 30, fontSize: 13 }}>{value}</Typography>
                    </Box>
                  ))}

                  {/* Key Insights */}
                  <Divider sx={{ my: 2, bgcolor: "#334155" }} />
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    💡 Key Insights
                  </Typography>
                  {interview.insights.map((insight, i) => (
                    <Typography key={i} variant="body2" sx={{ color: "#9CA3AF" }}>
                      • {insight}
                    </Typography>
                  ))}

                  <Divider sx={{ my: 2, bgcolor: "#334155" }} />
                  <Typography variant="body2" sx={{ color: "#10B981" }}>
                    🤖 AI Emotion Analysis: {interview.emotionAnalysis}
                  </Typography>
                </CardContent>

                <CardActions sx={{ justifyContent: "center", pb: 2 }}>
                  <Button variant="outlined" sx={{ borderColor: "#60A5FA", color: "#60A5FA" }}>
                    View Details
                  </Button>
                  <Button
                    variant="contained"
                    sx={{
                      bgcolor: "#2563EB",
                      "&:hover": { bgcolor: "#1D4ED8" },
                    }}
                  >
                    Export
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default UserProfile;
