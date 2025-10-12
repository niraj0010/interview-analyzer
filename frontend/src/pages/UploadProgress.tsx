import React, { useEffect, useState } from "react";
import { Box, Typography, LinearProgress, Button, Paper } from "@mui/material";
import { Brain, FileVideo } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const UploadProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Simulate upload progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate("/analysis"), 800);
          return 100;
        }
        return old + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#e2e8f0",
        padding: "2rem",
      }}
    >
      {/* Header */}
      <Box textAlign="center" mb={5}>
        <Box display="flex" justifyContent="center" alignItems="center" gap={1}>
          <Brain color="#14b8a6" size={36} />
          <Typography variant="h4" fontWeight={700}>
            Interview <span style={{ color: "#14b8a6" }}>Analyzer</span>
          </Typography>
        </Box>
        <Typography
          variant="subtitle1"
          sx={{
            color: "#14b8a6",
            letterSpacing: 1,
            fontWeight: 500,
            mt: 0.5,
          }}
        >
          AI-POWERED INSIGHTS
        </Typography>

        <Typography
          variant="body1"
          sx={{
            color: "#cbd5e1",
            mt: 3,
            maxWidth: "600px",
            lineHeight: 1.6,
            fontSize: "1rem",
          }}
        >
          Transform your interview skills with advanced AI analysis. Upload mock
          interview recordings for comprehensive speech-to-text conversion,
          real-time emotion detection, and personalized performance feedback.
        </Typography>
      </Box>

      {/* Upload Progress Card */}
      <Paper
        elevation={6}
        sx={{
          background: "rgba(30,41,59,0.8)",
          borderRadius: "1rem",
          padding: "2rem",
          width: "100%",
          maxWidth: 500,
          textAlign: "center",
          backdropFilter: "blur(10px)",
        }}
      >
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{ mb: 1, color: "#fff" }}
        >
          Uploading Interview
        </Typography>
        <Typography
          variant="body2"
          sx={{ mb: 3, color: "#94a3b8" }}
        >
          Please wait while we process your file...
        </Typography>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: "#1e293b",
            "& .MuiLinearProgress-bar": {
              backgroundColor: "#14b8a6",
            },
          }}
        />
        <Typography
          variant="body2"
          sx={{ mt: 2, color: "#94a3b8", fontWeight: 500 }}
        >
          {progress}% complete
        </Typography>
      </Paper>

      {/* Button + Supported Formats */}
      <Box textAlign="center" mt={4}>
        <Button
          variant="outlined"
          startIcon={<FileVideo size={16} />}
          sx={{
            borderColor: "#14b8a6",
            color: "#14b8a6",
            borderRadius: "8px",
            textTransform: "none",
            px: 3,
            py: 1.2,
            fontWeight: 600,
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: "rgba(20,184,166,0.1)",
              borderColor: "#0d9488",
            },
          }}
          onClick={() => navigate("/past-interviews")}
        >
          View Past Interviews
        </Button>

        <Box mt={2} display="flex" gap={1.5} justifyContent="center">
          {["MP4", "WebM", "MP3", "WAV", "M4A"].map((format) => (
            <Typography
              key={format}
              variant="caption"
              sx={{
                backgroundColor: "rgba(20,184,166,0.15)",
                color: "#14b8a6",
                px: 1.5,
                py: 0.4,
                borderRadius: "6px",
                fontWeight: 500,
              }}
            >
              {format}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
