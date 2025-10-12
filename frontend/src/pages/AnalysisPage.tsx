import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Typography,
  LinearProgress,
  useTheme,
} from "@mui/material";

const AnalysisPage: React.FC = () => {
  const theme = useTheme();
  const [progress, setProgress] = useState(0);
  const [steps, setSteps] = useState([
    { label: "Uploading file...", status: "complete" },
    { label: "Converting speech to text...", status: "pending" },
    { label: "Analyzing emotions and sentiment...", status: "pending" },
    { label: "Generating AI feedback...", status: "pending" },
    { label: "Preparing comprehensive report...", status: "pending" },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 100) return prev + 20;
        clearInterval(interval);
        return 100;
      });

      setSteps((prevSteps) => {
        const next = [...prevSteps];
        const currentStep = next.findIndex((s) => s.status === "pending");
        if (currentStep !== -1) {
          next[currentStep].status = "complete";
        }
        return next;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 4,
      }}
    >
      {/* Title */}
      <Typography
        variant="h4"
        sx={{
          mb: 2,
          textAlign: "center",
          color: theme.palette.primary.main,
          fontWeight: 600,
        }}
      >
        AI Analysis in Progress
      </Typography>

      <Typography
        variant="body1"
        sx={{
          mb: 6,
          textAlign: "center",
          color: "rgba(255,255,255,0.6)",
          maxWidth: 480,
        }}
      >
        Processing your interview with advanced machine learning algorithms
      </Typography>

      {/* Circular loader */}
      <Box sx={{ position: "relative", mb: 8 }}>
        <CircularProgress
          size={80}
          thickness={4}
          sx={{
            color: theme.palette.primary.main,
            filter: "drop-shadow(0 0 12px rgba(20,184,166,0.8))",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 600,
            fontSize: "1.2rem",
          }}
        >
          {progress}%
        </Box>
      </Box>

      {/* Steps Card */}
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 560,
          p: 4,
          borderRadius: 4,
          bgcolor: "background.paper",
        }}
      >
        {steps.map((step, index) => (
          <Box
            key={index}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              py: 1.5,
              borderBottom:
                index !== steps.length - 1
                  ? "1px solid rgba(255,255,255,0.1)"
                  : "none",
            }}
          >
            <Typography sx={{ fontSize: 15 }}>{step.label}</Typography>
            <Typography
              sx={{
                color:
                  step.status === "complete"
                    ? theme.palette.secondary.main
                    : "#FACC15",
                fontWeight: 500,
              }}
            >
              {step.status === "complete" ? "✔ Complete" : "⏳ Pending"}
            </Typography>
          </Box>
        ))}
      </Paper>

      {/* File info + progress bar */}
      <Typography
        variant="body2"
        sx={{
          mt: 6,
          color: "rgba(255,255,255,0.6)",
          textAlign: "center",
        }}
      >
        Processing:{" "}
        <Box component="span" sx={{ color: theme.palette.info.main }}>
          video_12345.mp4
        </Box>
      </Typography>

      <Box
        sx={{
          width: "100%",
          maxWidth: 560,
          mt: 2,
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 10,
            borderRadius: 5,
            backgroundColor: "rgba(255,255,255,0.1)",
            "& .MuiLinearProgress-bar": {
              borderRadius: 5,
              backgroundColor: theme.palette.primary.main,
              boxShadow: "0 0 12px rgba(20,184,166,0.8)",
            },
          }}
        />
        <Typography
          variant="body2"
          sx={{
            mt: 1,
            color: "rgba(255,255,255,0.6)",
            textAlign: "center",
          }}
        >
          {progress}% Complete
        </Typography>
      </Box>
    </Box>
  );
};

export default AnalysisPage;
