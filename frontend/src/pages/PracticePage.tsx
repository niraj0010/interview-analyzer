import React, { useState } from "react";
import { Mic } from "lucide-react";
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
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const PracticePage: React.FC = () => {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleStart = async () => {
    if (!role) return;
    const user = getAuth().currentUser;

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    setLoading(true);

    const res = await fetch(
      `http://localhost:8000/practice/start?role=${role}&uid=${user.uid}`
    );
    const data = await res.json();

    navigate("/practice-session", {
      state: {
        role,
        sessionId: data.sessionId,
        questions: data.questions,
      },
    });
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
        Simulate real interviews and get instant AI-powered feedback tailored to your selected role.
      </Typography>

      <Card
        sx={{
          background: "rgba(30,41,59,0.8)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "700px",
          mb: 6,
          boxShadow: "0 0 20px rgba(20,184,166,0.2)",
        }}
      >
        <CardContent>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Choose Your Practice Role
          </Typography>

          <Box display="flex" alignItems="center" gap={2}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: "#94a3b8" }}>Choose a role</InputLabel>
              <Select
                value={role}
                label="Choose a role"
                onChange={(e) => setRole(e.target.value)}
                sx={{ color: "#f8fafc" }}
              >
                <MenuItem value="Software Engineer">Software Engineer</MenuItem>
                <MenuItem value="Data Analyst">Data Analyst</MenuItem>
                <MenuItem value="Project Manager">Project Manager</MenuItem>
                <MenuItem value="Cloud Engineer">Cloud Engineer</MenuItem>
                <MenuItem value="Product Manager">Product Manager</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              disabled={!role || loading}
              onClick={handleStart}
              sx={{
                background: "#14b8a6",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "10px",
                px: 3,
                py: 1.2,
              }}
            >
              {loading ? "Generating..." : "Start Practice"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PracticePage;
