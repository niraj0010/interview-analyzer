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

const PracticePage: React.FC = () => {
  const [role, setRole] = useState("");
  const navigate = useNavigate(); // ✅ added

  const handleStart = () => {
    if (role) {
      navigate("/practice-session", { state: { role } }); 
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
      {/* Header Section */}
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

      {/* Choose Role Section */}
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
          <Typography variant="body2" color="#94a3b8" mb={3}>
            Select the position you want to practice for, and our AI will generate dynamic,
            tailored interview questions.
          </Typography>

          <Box display="flex" alignItems="center" gap={2}>
            <FormControl
              fullWidth
              sx={{
                background: "#1e293b",
                borderRadius: "10px",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(255,255,255,0.1)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#14b8a6",
                },
              }}
            >
              <InputLabel sx={{ color: "#94a3b8" }}>Choose a role</InputLabel>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                label="Choose a role"
                sx={{ color: "#f1f5f9" }}
              >
                <MenuItem value="Software Engineer">Software Engineer</MenuItem>
                <MenuItem value="Data Analyst">Data Analyst</MenuItem>
                <MenuItem value="Project Manager">Project Manager</MenuItem>
                
              </Select>
            </FormControl>

            <Button
              variant="contained"
              onClick={handleStart}
              disabled={!role}
              sx={{
                background: "#14b8a6",
                fontWeight: 600,
                textTransform: "none",
                borderRadius: "10px",
                px: 3,
                py: 1.2,
                boxShadow: "0 0 10px rgba(20,184,166,0.6)",
                "&:hover": {
                  background: "#0d9488",
                  boxShadow: "0 0 14px rgba(20,184,166,0.8)",
                },
              }}
            >
              Start Practice
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Info Cards Section */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          gap: 4,
          maxWidth: "1100px",
          width: "100%",
        }}
      >
        {[
          {
            title: "AI-Generated Questions",
            desc: "Dynamic questions tailored to your selected role and experience level.",
          },
          {
            title: "Voice Recording",
            desc: "Record your responses with real-time feedback and replay options.",
          },
          {
            title: "Instant Analysis",
            desc: "Get comprehensive feedback on tone, content, and confidence instantly.",
          },
        ].map((item, i) => (
          <Card
            key={i}
            sx={{
              background: "rgba(30,41,59,0.85)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px",
              boxShadow: "0 0 15px rgba(20,184,166,0.15)",
              p: 2,
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              "&:hover": {
                transform: "translateY(-6px)",
                boxShadow: "0 0 25px rgba(20,184,166,0.4)",
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" color="#14b8a6" fontWeight={600}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="#cbd5e1" mt={1.5}>
                {item.desc}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Session Info */}
      <Typography
        variant="body2"
        color="#94a3b8"
        textAlign="center"
        maxWidth="800px"
        mt={6}
      >
        Each session includes eight role-specific questions. Take your time to respond thoughtfully.
        Our AI will analyze your communication, clarity, and confidence.
      </Typography>
    </Box>
  );
};

export default PracticePage;
