import { useEffect, useRef, useState } from "react";
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
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import BoltIcon from "@mui/icons-material/Bolt";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";

import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

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
  const initialSessionId = location?.state?.sessionId ?? "";
  const initialQuestions = (location?.state?.questions as string[] | undefined) ?? [];
  const config = location?.state?.config ?? { difficulty: "Adaptive", focus: "General" };
  const roundNumber = location?.state?.roundNumber ?? 1;

  const MAX = 8;

  // --- Firebase Auth ---
  const auth = getAuth();
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setUid(user.uid);
      else navigate("/login");
    });
    return () => unsub();
  }, [auth, navigate]);

  const [sessionId, setSessionId] = useState(initialSessionId);
  const [questions, setQuestions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("FETCHING_QUESTIONS");
  const [timer, setTimer] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [recorded, setRecorded] = useState<boolean[]>(Array(MAX).fill(false));
  const [cameraError, setCameraError] = useState(false);

  // Video & Media Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<number | null>(null);
  const startedRef = useRef(false);

  const question = questions[index] ?? "";
  const progress = ((index + 1) / MAX) * 100;

  // --- 1. Initialize Camera Stream (Run on mount) ---
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720 },
          audio: true,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setCameraError(false);
      } catch (err) {
        console.error("Camera access denied:", err);
        setCameraError(true);
      }
    };

    startCamera();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // --- Initialize questions ---
  useEffect(() => {
    if (!uid) return;
    if (startedRef.current) return;

    if (initialSessionId && initialQuestions.length > 0) {
      let qs = [...initialQuestions];
      qs = qs.slice(0, MAX);
      while (qs.length < MAX) qs.push("Describe a recent challenge.");
      setSessionId(initialSessionId);
      setQuestions(qs);
      setPhase("IDLE");
      startedRef.current = true;
      return;
    }

    // Fallback fetch
    (async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/practice/start?role=${encodeURIComponent(
            role
          )}&uid=${uid}&difficulty=adaptive&focus=general`
        );
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();

        let qs = data?.questions ?? [];
        qs = qs.slice(0, MAX);
        while (qs.length < MAX) qs.push("Describe a recent challenge.");

        setSessionId(data.sessionId);
        setQuestions(qs);
        setPhase("IDLE");
        startedRef.current = true;
      } catch (e) {
        console.error(e);
        alert("Failed to start practice.");
        navigate(-1);
      }
    })();
  }, [uid, role, initialSessionId, initialQuestions, navigate]);

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

  // --- Recording Controls ---
  const startRecording = async () => {
    try {
      setBlob(null);
      const arr = [...recorded];
      arr[index] = false;
      setRecorded(arr);

      // Use the existing stream if available, otherwise try to get it again
      let stream = streamRef.current;
      if (!stream || !stream.active) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (e) {
          alert("Could not start camera for recording.");
          return;
        }
      }

      const r = new MediaRecorder(stream!);
      chunksRef.current = [];

      r.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      r.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "video/webm" });
        setBlob(b);
      };

      mediaRecorderRef.current = r;
      r.start();
      startTimer();
      setPhase("RECORDING");
    } catch (e) {
      console.error(e);
      alert("Error initializing recording.");
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

  // --- Submit Answer ---
  const submitAnswer = async () => {
    if (!uid || !sessionId) return;
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
      alert("Failed to upload your answer.");
      setPhase("IDLE");
    }
  };

  const skip = async () => {
    if (!uid || !sessionId) return;
    setPhase("PROCESSING_ANSWER");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("uid", uid);
      fd.append("questionIndex", String(index));
      fd.append("question", question);
      fd.append("skipped", "true");

      await fetch("http://127.0.0.1:8000/practice/answer", { method: "POST", body: fd });

      const arr = [...recorded];
      arr[index] = false;
      setRecorded(arr);
      setBlob(null);
      next();
    } catch (e) {
      console.error(e);
      alert("Failed to skip.");
      setPhase("IDLE");
    }
  };

  const next = () => {
    stopTimer();
    setBlob(null);
    setPhase("IDLE");
    if (index + 1 < MAX) {
      setIndex((i) => i + 1);
    }
  };

  // --- NEW: Back navigation ---
  const goBackOne = () => {
    if (index === 0) return;
    if (phase === "RECORDING" || phase === "PROCESSING_ANSWER" || phase === "FINALIZING") return;

    stopTimer();
    setBlob(null);
    setPhase("IDLE");
    setIndex((i) => Math.max(0, i - 1));
  };

  // --- NEW: Click bubble to jump to previous question ---
  const handleBubbleClick = (targetIndex: number) => {
    // Only allow jumping to previous or current questions, and only when not busy
    if (
      targetIndex > index ||
      phase === "RECORDING" ||
      phase === "PROCESSING_ANSWER" ||
      phase === "FINALIZING"
    ) {
      return;
    }

    stopTimer();
    setBlob(null);
    setPhase("IDLE");
    setIndex(targetIndex);
  };

  const finish = async () => {
    if (!uid || !sessionId) return;
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

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      navigate("/feedback", {
        state: { userId: uid, interviewId: sessionId, source: "practice", role: role },
      });
    } catch (e) {
      console.error(e);
      alert("Failed to finish session.");
      setPhase("IDLE");
    }
  };

  const isLast = index === MAX - 1;
  const canInteract = phase === "IDLE" || phase === "RECORDING";
  const disableActions = !canInteract || !question;
  const isReady = phase !== "FETCHING_QUESTIONS";

  return (
    <Box sx={{ minHeight: "100vh", p: 4, bgcolor: "#0b1220", color: "#e2e8f0" }}>
      {isReady && uid && (
        <>
          {/* Header Card */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#132030", borderRadius: "12px" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                {/* NEW Back button */}
                <Button
                  size="small"
                  variant="text"
                  onClick={goBackOne}
                  disabled={index === 0 || phase !== "IDLE"}
                  sx={{
                    mb: 1,
                    color: index === 0 || phase !== "IDLE" ? "#64748b" : "#e2e8f0",
                    textTransform: "none",
                    px: 0,
                  }}
                >
                  ← Back to previous question
                </Button>

                <Stack direction="row" alignItems="center" gap={1.5}>
                  <Typography variant="h6">
                    Question {Math.min(index + 1, MAX)} of {MAX}
                  </Typography>
                  <Chip
                    label={`Round ${roundNumber}`}
                    size="small"
                    sx={{
                      bgcolor: "#3b82f6",
                      color: "white",
                      fontWeight: "bold",
                      height: 24,
                      fontSize: "0.75rem",
                    }}
                  />
                </Stack>
                <Typography fontSize={14} sx={{ opacity: 0.7, mt: 0.5 }}>
                  Role: {role}
                </Typography>

                <Stack direction="row" spacing={1} mt={1.5}>
                  <Chip
                    icon={<BoltIcon style={{ fontSize: 16 }} />}
                    label={`Difficulty: ${config.difficulty}`}
                    size="small"
                    sx={{ bgcolor: "#334155", color: "#94a3b8", textTransform: "capitalize" }}
                  />
                  <Chip
                    icon={<CenterFocusStrongIcon style={{ fontSize: 16 }} />}
                    label={`Focus: ${config.focus}`}
                    size="small"
                    sx={{ bgcolor: "#334155", color: "#94a3b8", textTransform: "capitalize" }}
                  />
                </Stack>
              </Box>

              <Stack alignItems="flex-end">
                <Chip
                  label={`${Math.round(((index + 1) / MAX) * 100)}% Complete`}
                  size="small"
                  sx={{ bgcolor: "#0d9488", color: "white", mb: 1 }}
                />
              </Stack>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                mt: 2,
                borderRadius: 5,
                height: 8,
                bgcolor: "#1e293b",
                "& .MuiLinearProgress-bar": { bgcolor: "#0d9488" },
              }}
            />
          </Paper>

          {/* Main Interaction Area */}
          <Paper
            sx={{
              p: 4,
              bgcolor: "#1e293b",
              borderRadius: "14px",
              textAlign: "center",
              minHeight: "50vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography
              variant="h5"
              sx={{ mb: 4, fontWeight: 600, minHeight: "2em", maxWidth: "800px" }}
            >
              {question}
            </Typography>

            {/* Video Container */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                maxWidth: "640px",
                aspectRatio: "16/9",
                bgcolor: "black",
                borderRadius: "12px",
                overflow: "hidden",
                mb: 3,
                boxShadow:
                  phase === "RECORDING"
                    ? "0 0 0 4px #e63946"
                    : "0 0 20px rgba(0,0,0,0.5)",
              }}
            >
              {cameraError ? (
                <Stack height="100%" alignItems="center" justifyContent="center" bgcolor="#333">
                  <VideocamOffIcon sx={{ fontSize: 60, color: "#666" }} />
                  <Typography color="#aaa" mt={2}>
                    Camera Unavailable
                  </Typography>
                </Stack>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                  }}
                />
              )}

              {phase === "RECORDING" && (
                <Box
                  sx={{
                    position: "absolute",
                    top: 16,
                    left: 16,
                    bgcolor: "rgba(230, 57, 70, 0.9)",
                    color: "white",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <FiberManualRecordIcon sx={{ fontSize: 16 }} />
                  <Typography variant="subtitle2" fontWeight="bold">
                    REC
                  </Typography>
                  <Typography variant="subtitle2" sx={{ ml: 1 }}>
                    {new Date(timer * 1000).toISOString().substr(14, 5)}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Controls */}
            <Stack direction="row" spacing={2} justifyContent="center" mb={2}>
              {phase === "RECORDING" ? (
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<StopCircleIcon />}
                  onClick={stopRecording}
                  sx={{
                    px: 4,
                    py: 1.5,
                    borderRadius: "50px",
                    fontSize: "1.1rem",
                  }}
                >
                  Stop Recording
                </Button>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  onClick={startRecording}
                  disabled={disableActions}
                  startIcon={cameraError ? <MicIcon /> : <FiberManualRecordIcon />}
                  sx={{
                    bgcolor: "#14b8a6",
                    "&:hover": { bgcolor: "#0d9488" },
                    px: 4,
                    py: 1.5,
                    borderRadius: "50px",
                    fontSize: "1.1rem",
                  }}
                >
                  {cameraError ? "Record Audio" : "Start Answer"}
                </Button>
              )}
            </Stack>

            {/* Next / Finish Actions */}
            <Stack direction="row" spacing={2} mt={2}>
              {phase === "IDLE" && !isLast && (
                <Button
                  endIcon={<NavigateNextIcon />}
                  variant="outlined"
                  onClick={handleNextQuestion}
                  disabled={disableActions}
                  sx={{ color: "#14b8a6", borderColor: "#14b8a6", px: 4 }}
                >
                  {blob ? "Save & Next" : "Skip Question"}
                </Button>
              )}

              {phase === "IDLE" && isLast && (
                <Button
                  startIcon={<DoneAllIcon />}
                  variant="contained"
                  color="secondary"
                  onClick={finish}
                  disabled={disableActions}
                  sx={{ px: 4 }}
                >
                  Finish Session
                </Button>
              )}
            </Stack>

            <Typography sx={{ mt: 3, opacity: 0.6, fontSize: "0.9rem" }}>
              {phase === "IDLE" && recorded[index] ? "Answer Saved." : ""}
            </Typography>
          </Paper>

          {/* Question Nav Bubbles */}
          <Paper sx={{ p: 2, mt: 3, bgcolor: "#132030", borderRadius: "12px" }}>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={2}>
              {[...Array(MAX).keys()].map((i) => {
                const isActive = i === index;
                const isDone = recorded[i];
                const isFuture = i > index;

                const clickable =
                  !isFuture &&
                  phase !== "RECORDING" &&
                  phase !== "PROCESSING_ANSWER" &&
                  phase !== "FINALIZING";

                return (
                  <Box
                    key={i}
                    onClick={() => clickable && handleBubbleClick(i)}
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
                      opacity: isDone || isActive ? 1 : isFuture ? 0.4 : 0.7,
                      cursor: clickable ? "pointer" : "default",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      "&:hover": clickable
                        ? {
                            transform: "translateY(-2px)",
                            boxShadow: "0 8px 20px rgba(15,23,42,0.8)",
                          }
                        : undefined,
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
          <Typography>Preparing your interview...</Typography>
        </Stack>
      </Backdrop>

      <Backdrop open={phase === "PROCESSING_ANSWER"} sx={{ color: "#fff", zIndex: 9999 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Saving your answer...</Typography>
        </Stack>
      </Backdrop>

      <Backdrop open={phase === "FINALIZING"} sx={{ color: "#fff", zIndex: 9999 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Compiling your interview feedback...</Typography>
        </Stack>
      </Backdrop>
    </Box>
  );
}
