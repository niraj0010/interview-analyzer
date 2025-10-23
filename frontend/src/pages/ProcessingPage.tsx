import React, { useEffect, useState } from "react";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";

const steps = [
  "Uploading file...",
  "Converting speech to text...",
  "Analyzing emotions and sentiment...",
  "Generating AI feedback...",
  "Preparing comprehensive report...",
];

const ProcessingPage: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Simulate progress increasing
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 10, 100);
        if (next === 100) {
          clearInterval(timer);
          setTimeout(() => navigate("/feedback"), 1200); // redirect after 1.2s
        }
        return next;
      });
    }, 800); // speed of progress updates
    return () => clearInterval(timer);
  }, [navigate]);

  const completedSteps = Math.floor((progress / 100) * steps.length);

  return (
    <Box
      sx={{
        bgcolor: "#0f172a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#e2e8f0",
        fontFamily: "Inter, sans-serif",
        p: 4,
      }}
    >
      <Typography variant="h4" fontWeight={700} sx={{ color: "#14b8a6", mb: 1 }}>
        AI Analysis in Progress
      </Typography>

      <Typography variant="body1" sx={{ color: "#94a3b8", mb: 4 }}>
        Processing your interview with advanced machine learning algorithms
      </Typography>

      {/* Circular Progress Visualization */}
      <Box sx={{ position: "relative", display: "inline-flex", mb: 4 }}>
        <svg width="120" height="120" viewBox="0 0 36 36">
          <path
            stroke="#1e293b"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            stroke="#14b8a6"
            strokeWidth="3"
            strokeDasharray={`${progress}, 100`}
            fill="none"
            strokeLinecap="round"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.2rem",
            color: "#14b8a6",
          }}
        >
          {progress}%
        </Box>
      </Box>

      {/* Steps list */}
      <Card
        sx={{
          bgcolor: "#1e293b",
          borderRadius: "16px",
          p: 3,
          width: "360px",
          boxShadow: "0 0 20px rgba(0,0,0,0.3)",
        }}
      >
        <CardContent>
          {steps.map((step, index) => (
            <Typography
              key={index}
              sx={{
                color: index < completedSteps ? "#10b981" : "#94a3b8",
                mb: 1,
              }}
            >
              {step} {index < completedSteps && "✓ Complete"}
            </Typography>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ProcessingPage;
