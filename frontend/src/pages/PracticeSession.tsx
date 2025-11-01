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
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import DoneAllIcon from "@mui/icons-material/DoneAll";
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
  const auth = getAuth();
  const uid = auth.currentUser?.uid;

  const role = location?.state?.role ?? "Software Developer";
  const MAX = 8;

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

  // Fetch questions & sessionId
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
        setSessionId(data.sessionId);
        setQuestions(data.questions || []);
        setPhase("IDLE");
      } catch (e) {
        console.error(e);
        alert("Failed to start practice. Please try again.");
        navigate(-1);
      }
    })();
  }, [role, uid, navigate]);

  // Timer
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

  // Recording
  const startRecording = async () => {
    try {
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

  // Submit current answer audio (FAST: just upload)
  const submitAnswer = async () => {
    setPhase("PROCESSING_ANSWER");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("uid", uid!);
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

  // Skip
  const skip = async () => {
    setPhase("PROCESSING_ANSWER");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("uid", uid!);
      fd.append("questionIndex", String(index));
      fd.append("question", question);
      fd.append("skipped", "true");

      const res = await fetch("http://127.0.0.1:8000/practice/answer", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());

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
    if (index + 1 >= MAX) {
      // On last question, reveal Finish flow
      setPhase("IDLE");
    } else {
      setIndex((i) => i + 1);
      setPhase("IDLE");
    }
  };

  // Finish interview (single heavy analysis)
  const finish = async () => {
    setPhase("FINALIZING");
    try {
      const fd = new FormData();
      fd.append("sessionId", sessionId);
      fd.append("uid", uid!);

      const res = await fetch("http://127.0.0.1:8000/practice/finish", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      navigate("/summary", {
        state: { summary: data.summary, role },
      });
    } catch (e) {
      console.error(e);
      alert("Failed to compile your interview feedback. Please retry.");
      setPhase("IDLE");
    }
  };

  const format = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
      s % 60
    ).padStart(2, "0")}`;

  const isLast = index === MAX - 1;

  return (
    <Box sx={{ minHeight: "100vh", p: 4, bgcolor: "#0b1220", color: "#e2e8f0" }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, bgcolor: "#192233" }}>
        <Typography variant="h6">
          Question {Math.min(index + 1, MAX)} of {MAX}
        </Typography>
        <Typography variant="body2">Role: {role}</Typography>
        <LinearProgress value={progress} variant="determinate" sx={{ mt: 1 }} />
      </Paper>

      {/* Question Card */}
      <Paper sx={{ p: 4, bgcolor: "#1e293b", textAlign: "center" }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          {question || "Loading question..."}
        </Typography>

        <Stack direction="row" spacing={2} justifyContent="center" mb={2}>
          <Chip label={`Timer: ${format(timer)}`} />
          <Chip label={phase === "RECORDING" ? "Recording" : "Idle"} />
          {recorded[index] && <Chip color="success" label="Saved" />}
        </Stack>

        {/* Controls */}
        {phase !== "RECORDING" && (
          <Button
            startIcon={<MicIcon />}
            variant="contained"
            onClick={startRecording}
            disabled={phase !== "IDLE" || !question}
          >
            Start Recording
          </Button>
        )}

        {phase === "RECORDING" && (
          <Button
            startIcon={<StopIcon />}
            variant="contained"
            color="error"
            onClick={stopRecording}
          >
            Stop Recording
          </Button>
        )}

        {/* After a recording exists, allow Next (upload) */}
        {phase === "IDLE" && blob && (
          <Button
            endIcon={<NavigateNextIcon />}
            variant="contained"
            sx={{ mt: 2, ml: 2 }}
            onClick={submitAnswer}
          >
            Save & Next
          </Button>
        )}

        {/* Skip always available when not recording */}
        {phase !== "RECORDING" && (
          <Button
            startIcon={<SkipNextIcon />}
            variant="outlined"
            sx={{ mt: 2, ml: 2 }}
            onClick={skip}
            disabled={!question || phase !== "IDLE"}
          >
            Skip
          </Button>
        )}

        {/* Finish visible only on the last question (after recorded/skip or even empty) */}
        {isLast && phase === "IDLE" && (
          <Button
            startIcon={<DoneAllIcon />}
            variant="contained"
            color="secondary"
            sx={{ mt: 3, display: "block", mx: "auto" }}
            onClick={finish}
          >
            Finish & Submit
          </Button>
        )}
      </Paper>

      {/* Global backdrops for long actions */}
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
