import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Card,
  CardContent,
} from "@mui/material";
import { Mic, StopCircle, Play } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const PracticeSession: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = location.state?.role || "Software Engineer";

  const [currentQuestion, setCurrentQuestion] = useState(1);
  const totalQuestions = 8;
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const progress = ((currentQuestion - 1) / totalQuestions) * 100;

  const questions = [
    `Tell me about yourself and your background in ${role.toLowerCase()}.`,
    "Describe a challenge you faced and how you overcame it.",
    "What motivates you to work in this field?",
    "Tell me about a project you are most proud of.",
    "How do you handle tight deadlines or pressure?",
    "What are your strengths and weaknesses?",
    "How do you stay updated with the latest trends?",
    "Why should we hire you for this role?",
  ];

  // Format seconds → mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleRecording = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunks.current = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setRecordedUrl(url);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);

        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Error accessing microphone:", error);
      }
    } else {
      // Stop recording
      mediaRecorderRef.current?.stop();
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleNext = () => {
    setRecordedUrl(null);
    setRecordingTime(0);
    if (currentQuestion < totalQuestions) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      navigate("/analysis", { state: { role } });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        py: 8,
        px: 3,
      }}
    >
      {/* Progress Bar */}
      <Card
        sx={{
          width: "100%",
          maxWidth: "800px",
          mb: 4,
          background: "rgba(30,41,59,0.85)",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#f8fafc",
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography fontWeight={600}>
              Question {currentQuestion} of {totalQuestions}
            </Typography>
            <Typography
              sx={{
                border: "1px solid #14b8a6",
                px: 1.5,
                py: 0.3,
                borderRadius: "8px",
                color: "#14b8a6",
                fontSize: "0.8rem",
              }}
            >
              {Math.round(progress)}% Complete
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 8,
              borderRadius: 5,
              background: "rgba(255,255,255,0.08)",
              "& .MuiLinearProgress-bar": {
                background: "#14b8a6",
              },
            }}
          />
        </CardContent>
      </Card>

      {/* Question Section */}
      <Card
        sx={{
          width: "100%",
          maxWidth: "800px",
          background: "rgba(30,41,59,0.9)",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#f1f5f9",
          textAlign: "center",
          py: 6,
          px: 4,
          boxShadow: "0 0 20px rgba(20,184,166,0.15)",
        }}
      >
        <Typography variant="h6" mb={4}>
          {questions[currentQuestion - 1]}
        </Typography>

        {/* Recording Controls */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
          <Box
            onClick={toggleRecording}
            sx={{
              width: 100,
              height: 100,
              background: isRecording ? "#dc2626" : "#14b8a6",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: isRecording
                ? "0 0 30px rgba(220,38,38,0.5)"
                : "0 0 30px rgba(20,184,166,0.4)",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
          >
            {isRecording ? <StopCircle size={40} color="#fff" /> : <Mic size={40} color="#fff" />}
          </Box>

          {/* Timestamp */}
          <Typography fontWeight={600} color={isRecording ? "#f87171" : "#14b8a6"}>
            {isRecording ? `Recording... ${formatTime(recordingTime)}` : "Start Recording"}
          </Typography>

          {/* Replay */}
          {recordedUrl && !isRecording && (
            <Box mt={2}>
              <audio controls src={recordedUrl}></audio>
              <Typography variant="body2" color="#94a3b8" mt={1}>
                Duration: {formatTime(recordingTime)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Next Button */}
        <Button
          variant="contained"
          onClick={handleNext}
          sx={{
            mt: 5,
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
          {currentQuestion < totalQuestions ? "Next Question →" : "Finish Practice"}
        </Button>

        <Typography variant="body2" color="#94a3b8" mt={3}>
          Take your time and speak clearly. You can re-record your answer if needed.
        </Typography>
      </Card>

      {/* Question Indicators */}
      <Box display="flex" justifyContent="center" gap={2} mt={5}>
        {[...Array(totalQuestions)].map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: i + 1 === currentQuestion ? "#14b8a6" : "rgba(255,255,255,0.1)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default PracticeSession;