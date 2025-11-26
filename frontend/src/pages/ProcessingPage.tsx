import React, { useEffect, useState, useRef } from "react";
import { Box, Typography, Card, CardContent, CircularProgress } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { getAuth } from "firebase/auth";

const steps = [
  "Initializing secure upload...",
  "Transcribing speech to text...",
  "Analyzing vocal tone & emotions...",
  "Generating AI feedback...",
  "Compiling final report...",
];

// --- 1. Reusing the Shell for consistency ---
const Shell = ({ children }: { children: React.ReactNode }) => (
  <Box 
    sx={{ 
      bgcolor: "#0F172A", 
      color: "#E2E8F0", 
      minHeight: "100vh", // Forces full height immediately
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      pb: 10 // Extra padding at bottom to ensure footer stays down
    }}
  >
    {children}
  </Box>
);

const ProcessingPage: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"processing" | "success" | "error">("processing");
  const navigate = useNavigate();
  const location = useLocation();
  const hasStartedRef = useRef(false);

  // 1. Safety Check: Redirect if no file
  useEffect(() => {
    if (!location.state?.file) {
      navigate("/");
    }
  }, [location, navigate]);

  // 2. Smart Animation
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((oldProgress) => {
        if (uploadStatus === "success") return 100;
        if (uploadStatus === "error") return oldProgress;

        let increment = 0;
        if (oldProgress < 30) increment = Math.random() * 5 + 2;
        else if (oldProgress < 60) increment = Math.random() * 2;
        else if (oldProgress < 85) increment = Math.random() * 0.5;
        else if (oldProgress < 95) increment = 0.1;
        
        return Math.min(oldProgress + increment, 95);
      });
    }, 400);
    return () => clearInterval(timer);
  }, [uploadStatus]);

  // 3. API Call
  useEffect(() => {
    const performUpload = async () => {
      const file = location.state?.file;
      const auth = getAuth();
      const user = auth.currentUser;

      if (!file || !user || hasStartedRef.current) return;
      hasStartedRef.current = true;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_id", user.uid);

      try {
        const response = await fetch("http://127.0.0.1:8000/analyze", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Analysis failed");
        const data = await response.json();

        setUploadStatus("success");
        
        setTimeout(() => {
          navigate("/feedback", {
            state: { userId: data.userId, interviewId: data.interviewId, source: 'upload' },
          });
        }, 800);

      } catch (error) {
        console.error(error);
        setUploadStatus("error");
        alert("Analysis failed. Please try again.");
        navigate("/");
      }
    };

    performUpload();
  }, [location.state, navigate]);

  const currentStepIndex = Math.min(Math.floor(progress / 20), 4);

  // --- 4. Render using Shell ---
  return (
    <Shell>
      <Typography variant="h4" fontWeight={700} sx={{ color: "#14b8a6", mb: 1 }}>
        {uploadStatus === "success" ? "Analysis Complete!" : "AI Analysis in Progress"}
      </Typography>

      <Typography variant="body1" sx={{ color: "#94a3b8", mb: 4 }}>
        {uploadStatus === "success" 
          ? "Redirecting to your results..." 
          : "Processing your interview with advanced machine learning..."}
      </Typography>

      {/* Circular Progress */}
      <Box sx={{ position: "relative", display: "inline-flex", mb: 4 }}>
        <svg width="140" height="140" viewBox="0 0 36 36">
          <path
            stroke="#1e293b"
            strokeWidth="3"
            fill="none"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            stroke="#14b8a6"
            strokeWidth="3"
            strokeDasharray={`${progress}, 100`}
            fill="none"
            strokeLinecap="round"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            style={{ transition: "stroke-dasharray 0.5s ease" }}
          />
        </svg>
        <Box
          sx={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h5" fontWeight={700} sx={{ color: "#14b8a6" }}>
            {Math.round(progress)}%
          </Typography>
        </Box>
      </Box>

      {/* Steps List */}
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
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isActive = index === currentStepIndex;

            return (
              <Typography
                key={index}
                sx={{
                  color: isCompleted ? "#10b981" : isActive ? "#14b8a6" : "#64748b",
                  fontWeight: isActive ? 700 : 400,
                  mb: 1.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  transition: "all 0.3s ease",
                  opacity: index > currentStepIndex ? 0.5 : 1
                }}
              >
                {isCompleted ? "✓" : isActive ? <CircularProgress size={14} color="inherit" /> : "○"}
                {step}
              </Typography>
            );
          })}
        </CardContent>
      </Card>
    </Shell>
  );
};

export default ProcessingPage;