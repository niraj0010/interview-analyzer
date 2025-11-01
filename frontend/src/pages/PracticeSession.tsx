import React, { useEffect, useRef, useState } from "react";
import {
  Backdrop,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  IconButton,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useLocation, useNavigate } from "react-router-dom";

type Phase =
  | "FETCHING_QUESTIONS"
  | "IDLE"
  | "RECORDING"
  | "PROCESSING_ANSWER"
  | "FINALIZING";

export default function PracticeSession() {
  const location = useLocation() as any;
  const navigate = useNavigate();

  const role = location?.state?.role ?? "Software Developer";
  const MAX = 8;

  // Replace Firebase uid logic with a simple unique placeholder for now
  const [uid] = useState(() => crypto.randomUUID());

  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("FETCHING_QUESTIONS");
  const [timer, setTimer] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [recorded, setRecorded] = useState<boolean[]>(Array(MAX).fill(false));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<number | null>(null);

  const question = questions[index] ?? "";
  const progress = ((index + 1) / MAX) * 100;

  // Fetch questions & sessionId from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/practice/start?role=${encodeURIComponent(
            role
          )}&uid=${uid}`
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        let qs = data?.questions ?? [];
        qs = qs.slice(0, MAX);
        while (qs.length < MAX) qs.push("Describe a recent challenge.");

        setSessionId(data.sessionId);
        setQuestions(qs);
        setPhase("IDLE");
      } catch (e) {
        console.error(e);
        alert("Failed to start practice. Please try again.");
        navigate(-1);
      }
    })();
  }, [role, uid, navigate]);

  // Timer helpers
  const startTimer = () => {
    stopTimer();
    setTimer(0);
    intervalRef.current = window.setInterval(
      () => setTimer((t) => t + 1),
      1000
    ) as unknown as number;
  };
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Recording controls
  const startRecording = async () => {
    try {
      setBlob(null);
      const arr = [...recorded];
      arr[index] = false;
      setRecorded(arr);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunksRef.current = [];

      r.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      r.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = r;
      r.start();
      startTimer();
      setPhase("RECORDING");
    } catch (e) {
      console.error(e);
      alert("Microphone permission is required to record.");
    }
  };

  const stopRecording = () => {
    stopTimer();
    mediaRecorderRef.current?.stop();
    setPhase("IDLE");
  };

  const handleNextQuestion = () => {
    if (blob) submitAnswer();
    else skip();
  };

  // Upload audio to backend
  const submitAnswer = async () => {
    setPhase("PROCESSING_ANSWER");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("uid", uid);
      fd.append("questionIndex", String(index));
      fd.append("question", question);
      fd.append("skipped", "false");
      if (blob) fd.append("file", blob, `q${index + 1}.webm`);

      const res = await fetch("http://127.0.0.1:8000/practice/answer", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());

      const arr = [...recorded];
      arr[index] = true;
      setRecorded(arr);
      next();
    } catch (e) {
      console.error(e);
      alert("Failed to upload your answer. Please try again.");
      setPhase("IDLE");
    }
  };

  // Skip question
  const skip = async () => {
    setPhase("PROCESSING_ANSWER");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("uid", uid);
      fd.append("questionIndex", String(index));
      fd.append("question", question);
      fd.append("skipped", "true");

      const res = await fetch("http://127.0.0.1:8000/practice/answer", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());

      const arr = [...recorded];
      arr[index] = false;
      setRecorded(arr);
      setBlob(null);
      next();
    } catch (e) {
      console.error(e);
      alert("Failed to skip. Please try again.");
      setPhase("IDLE");
    }
  };

 const next = () => {
  stopTimer();
  setBlob(null);
  setPhase("IDLE");  // ✅ Always reset to IDLE
  if (index + 1 < MAX) {
    setIndex((i) => i + 1);
  }
};

  // Final summary — handled by backend Firestore update
  const finish = async () => {
    setPhase("FINALIZING");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("uid", uid);

      const res = await fetch("http://127.0.0.1:8000/practice/finish", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      navigate("/summary", {
        state: { summary: data.summary, role, sessionId, uid },
      });
    } catch (e) {
      console.error(e);
      alert("Failed to compile your interview feedback. Please retry.");
      setPhase("IDLE");
    }
  };

  const isLast = index === MAX - 1;
  const canInteract = phase === "IDLE" || phase === "RECORDING";
  const disableActions = !canInteract || !question;
  const isReady = phase !== "FETCHING_QUESTIONS";

  return (
    <Box sx={{ minHeight: "100vh", p: 4, bgcolor: "#0b1220", color: "#e2e8f0" }}>
      {isReady && (
        <>
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#132030", borderRadius: "12px" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h6">
                  Question {Math.min(index + 1, MAX)} of {MAX}
                </Typography>
                <Typography fontSize={13} opacity={0.6}>
                  Role: {role}
                </Typography>
              </Box>
              <Chip
                label={`${Math.round(((index + 1) / MAX) * 100)}% Complete`}
                size="small"
                sx={{ bgcolor: "#0d9488", color: "white" }}
              />
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, borderRadius: 5 }} />
          </Paper>

          <Paper
            sx={{
              p: 4,
              bgcolor: "#1e293b",
              borderRadius: "14px",
              textAlign: "center",
              minHeight: "50vh",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography variant="h5" sx={{ mb: 4, fontWeight: 600, minHeight: "3em" }}>
              {question}
            </Typography>

            <IconButton
              onClick={phase === "RECORDING" ? stopRecording : startRecording}
              disabled={disableActions}
              sx={{
                width: 120,
                height: 120,
                bgcolor: phase === "RECORDING" ? "#e63946" : "#14b8a6",
                color: "white",
                "&:hover": {
                  bgcolor: phase === "RECORDING" ? "#c0303c" : "#11a090",
                },
                boxShadow: `0 0 20px ${
                  phase === "RECORDING" ? "#e63946" : "#14b8a6"
                }`,
              }}
            >
              {phase === "RECORDING" ? (
                <StopIcon sx={{ fontSize: 60 }} />
              ) : (
                <MicIcon sx={{ fontSize: 60 }} />
              )}
            </IconButton>

            <Typography sx={{ mt: 2, mb: 3, fontSize: "1.1rem" }}>
              {phase === "RECORDING"
                ? `Recording... ${new Date(timer * 1000).toISOString().substr(14, 5)}`
                : "Start Recording"}
            </Typography>

            {phase === "IDLE" && !isLast && (
              <Button
                endIcon={<NavigateNextIcon />}
                variant="contained"
                onClick={handleNextQuestion}
                disabled={disableActions}
                sx={{ bgcolor: "#0d9488", "&:hover": { bgcolor: "#0a7066" } }}
              >
                {blob ? "Save & Next" : "Next Question (Skip)"}
              </Button>
            )}

            {phase === "IDLE" && isLast && (
              <Button
                startIcon={<DoneAllIcon />}
                variant="contained"
                color="secondary"
                onClick={finish}
                disabled={disableActions}
                sx={{ animation: "pulse 1.5s infinite" }}
              >
                Finish & Get Feedback
              </Button>
            )}

            <Typography sx={{ mt: 3, opacity: 0.6, fontSize: "0.9rem" }}>
              {phase === "IDLE" && recorded[index] ? "Answer Saved. " : ""}
              Take your time and speak clearly. You can re-record if needed.
            </Typography>
          </Paper>

          <Paper sx={{ p: 2, mt: 3, bgcolor: "#132030", borderRadius: "12px" }}>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
              {[...Array(MAX).keys()].map((i) => {
                const isActive = i === index;
                const isDone = recorded[i];
                return (
                  <Box
                    key={i}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      bgcolor: isActive ? "#14b8a6" : "#1e293b",
                      border: isActive ? "2px solid #fff" : "2px solid transparent",
                      color: isActive ? "white" : "#e2e8f0",
                      fontWeight: isActive ? 700 : 400,
                      transition: "all 0.3s ease",
                      opacity: isDone || isActive ? 1 : 0.6,
                    }}
                  >
                    {isDone ? <CheckCircleIcon sx={{ color: "#4ade80" }} /> : i + 1}
                  </Box>
                );
              })}
            </Stack>
          </Paper>
        </>
      )}

      {/* Loading Overlays */}
      <Backdrop open={phase === "FETCHING_QUESTIONS"} sx={{ color: "#fff", zIndex: 9999 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Preparing your interview…</Typography>
        </Stack>
      </Backdrop>

      <Backdrop open={phase === "PROCESSING_ANSWER"} sx={{ color: "#fff", zIndex: 9999 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Saving your answer…</Typography>
        </Stack>
      </Backdrop>

      <Backdrop open={phase === "FINALIZING"} sx={{ color: "#fff", zIndex: 9999 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Compiling your interview feedback…</Typography>
        </Stack>
      </Backdrop>
    </Box>
  );
}
