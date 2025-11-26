import React, { useState } from "react";
import { Mic, Settings, Target, Zap } from "lucide-react";
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CircularProgress,
  Stack,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const PracticePage: React.FC = () => {
  const [role, setRole] = useState("");
  const [customRole, setCustomRole] = useState(""); 
  const [difficulty, setDifficulty] = useState("adaptive");
  const [focus, setFocus] = useState("general");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const auth = getAuth();

  const roles = [
    "Software Engineer",
    "Data Analyst",
    "Project Manager",
    "Product Manager",
    "Business Analyst",
    "Machine Learning Engineer",
    "DevOps Engineer",
    "Full Stack Developer",
    "Backend Developer",
    "Frontend Developer",
    "UX Designer",
    "Other (Specify)",   ];

  const handleStart = async () => {
    const selectedRole =
      role === "Other (Specify)" ? customRole.trim() : role;

    if (!selectedRole) {
      alert("Please enter your custom role.");
      return;
    }

    setLoading(true);
    const user = auth.currentUser;
    const uid = user?.uid;

    if (!uid) {
      alert("Please log in to start practice.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/practice/start?role=${encodeURIComponent(
          selectedRole
        )}&uid=${uid}&difficulty=${difficulty}&focus=${focus}`
      );

      if (!res.ok) throw new Error("Failed to initialize session");

      const data = await res.json();

      navigate("/practice-session", {
        state: {
          role: selectedRole,
          sessionId: data.sessionId,
          questions: data.questions,
          config: data.config,
          roundNumber: data.roundNumber,
        },
      });
    } catch (error) {
      console.error(error);
      alert("Unable to start practice session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        color: "#f8fafc",
        py: 8,
        px: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Title */}
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Mic size={36} color="#14b8a6" />
        <Typography
          variant="h4"
          fontWeight={700}
          sx={{
            background: "linear-gradient(90deg, #14b8a6, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          AI Interview Practice
        </Typography>
      </Box>

      <Typography
        variant="subtitle1"
        sx={{ color: "#cbd5e1", textAlign: "center", maxWidth: "700px", mb: 5 }}
      >
        Simulate real interviews with adaptive AI that learns from your mistakes.
      </Typography>

      {/* Config Card */}
      <Card
        sx={{
          background: "rgba(30,41,59,0.8)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "800px",
          mb: 6,
          boxShadow: "0 0 20px rgba(20,184,166,0.1)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={4}>
            {/* Role Selection */}
            <Box>
              <Typography
                variant="h6"
                fontWeight={600}
                mb={2}
                display="flex"
                alignItems="center"
                gap={1}
              >
                <Target size={20} color="#14b8a6" />
                Select Role
              </Typography>

              {/* Dropdown */}
              <FormControl fullWidth>
                <InputLabel sx={{ color: "#94a3b8" }}>Target Role</InputLabel>
                <Select
                  value={role}
                  label="Target Role"
                  onChange={(e) => setRole(e.target.value)}
                  sx={{
                    color: "#f8fafc",
                    ".MuiOutlinedInput-notchedOutline": {
                      borderColor: "rgba(255,255,255,0.2)",
                    },
                    "&:hover .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#14b8a6",
                    },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#14b8a6",
                    },
                  }}
                >
                  {roles.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Custom role input */}
              {role === "Other (Specify)" && (
                <Box mt={2}>
                  <input
                    type="text"
                    placeholder="Enter your custom role"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.05)",
                      color: "white",
                      fontSize: "1rem",
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Difficulty & Focus */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <Zap size={20} color="#fbbf24" />
                  Difficulty
                </Typography>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: "#94a3b8" }}>Level</InputLabel>
                  <Select
                    value={difficulty}
                    label="Level"
                    onChange={(e) => setDifficulty(e.target.value)}
                    sx={{
                      color: "#f8fafc",
                      ".MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.2)",
                      },
                    }}
                  >
                    <MenuItem value="adaptive">
                      <Stack>
                        <Typography fontWeight={600}>
                          Adaptive (Recommended)
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Adjusts based on your history
                        </Typography>
                      </Stack>
                    </MenuItem>
                    <MenuItem value="easy">Easy</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="hard">Hard</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  mb={2}
                  display="flex"
                  alignItems="center"
                  gap={1}
                >
                  <Settings size={20} color="#818cf8" />
                  Focus Area
                </Typography>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: "#94a3b8" }}>Focus</InputLabel>
                  <Select
                    value={focus}
                    label="Focus"
                    onChange={(e) => setFocus(e.target.value)}
                    sx={{
                      color: "#f8fafc",
                      ".MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(255,255,255,0.2)",
                      },
                    }}
                  >
                    <MenuItem value="general">General Mix</MenuItem>
                    <MenuItem value="technical">Technical</MenuItem>
                    <MenuItem value="behavioral">Behavioral</MenuItem>
                    <MenuItem value="weakness_remediation">
                      Fix Weaknesses
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Stack>

            {/* Start Button */}
            <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
              <Button
                variant="contained"
                disabled={!role || loading}
                onClick={handleStart}
                size="large"
                sx={{
                  background: "#14b8a6",
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "12px",
                  px: 6,
                  py: 1.5,
                  boxShadow: "0 0 20px rgba(20,184,166,0.4)",
                  "&:hover": { background: "#0d9488" },
                }}
              >
                {loading ? (
                  <>
                    <CircularProgress size={24} color="inherit" sx={{ mr: 2 }} />
                    Generating Session...
                  </>
                ) : (
                  "Start Interview Session"
                )}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PracticePage;
