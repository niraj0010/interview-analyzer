// src/pages/PracticeSession.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  CircularProgress,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import ReplayIcon from "@mui/icons-material/Replay";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

type AnalysisResult = {
  question: string;
  transcript: string;
  feedback?: string;
  clarity?: number;
  relevance?: number;
  confidence?: number;
  emotion?: string;
  error?: string;
};

type Phase = "LOADING" | "IDLE" | "RECORDING" | "PROCESSING" | "FEEDBACK";

const MAX = 8;

const formatTime = (s: number) => {
  const mm = Math.floor(s / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
};

export default function PracticeSession() {
  const location = useLocation() as any;
  const role = location?.state?.role ?? "Software Developer";
  const navigate = useNavigate();

  const auth = getAuth();
  const uid = auth.currentUser?.uid;   // ✅ proper user id

  const [questions, setQuestions] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("LOADING");
  const [timer, setTimer] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [allResults, setAllResults] = useState<AnalysisResult[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [processingText, setProcessingText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const intervalRef = useRef<number | null>(null);

  // ✅ Dynamically computed
  const question = useMemo(() => questions[index] ?? "", [questions, index]);
  const progress = (index / MAX) * 100;

  // ✅ Fetch AI questions ONCE
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/practice/start?role=${encodeURIComponent(
            role
          )}&uid=${uid}`
        );
        const data = await res.json();

        setSessionId(data.sessionId);
        let qs = data.questions.slice(0, MAX);

        while (qs.length < MAX) qs.push("Describe a recent challenge.");

        setQuestions(qs);
        setPhase("IDLE");
      } catch {
        setErr("Failed to load questions.");
      }
    })();
  }, []);

  const startTimer = () => {
    stopTimer();
    setTimer(0);
    intervalRef.current = window.setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
  };
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startRecording = async () => {
    setResult(null);
    setErr(null);
    setBlob(null);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => chunksRef.current.push(e.data);

    mr.onstop = () => {
      setBlob(new Blob(chunksRef.current, { type: "audio/webm" }));
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setPhase("PROCESSING");
      setProcessingText("Analyzing your response...");
    };

    mr.start();
    startTimer();
    setPhase("RECORDING");
  };

  const stopRecording = () => {
    stopTimer();
    mediaRecorderRef.current?.stop();
  };

  // ✅ Submit blob to backend
  const submit = useCallback(async () => {
    if (!blob) {
      skip(); // empty answer
      return;
    }

    const fd = new FormData();
    fd.append("file", blob, `q${index + 1}.webm`);
    fd.append("sessionId", sessionId!);
    fd.append("uid", uid!);
    fd.append("questionIndex", String(index));
    fd.append("question", question);
    fd.append("skipped", "false");

    const res = await fetch("http://127.0.0.1:8000/practice/answer", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();

    setResult({
      question,
      transcript: data.transcript,
      emotion: data.emotion?.label,
      feedback: data.feedback?.feedback,
      clarity: data.feedback?.clarity,
      relevance: data.feedback?.relevance,
      confidence: data.feedback?.confidence,
    });

    setAllResults((o) => {
      const arr = [...o];
      arr[index] = { ...data.feedback, question };
      return arr;
    });

    setPhase("FEEDBACK");
  }, [blob, index, question, sessionId]);

  useEffect(() => {
    if (phase === "PROCESSING" && blob) submit();
  }, [phase, blob]);

  const skip = async () => {
    stopTimer();
    setPhase("PROCESSING");
    setProcessingText("Skipping...");

    const fd = new FormData();
    fd.append("sessionId", sessionId!);
    fd.append("uid", uid!);
    fd.append("questionIndex", String(index));
    fd.append("question", question);
    fd.append("skipped", "true");

    await fetch("http://127.0.0.1:8000/practice/answer", {
      method: "POST",
      body: fd,
    });

    next();
  };

  // ✅ move forward
  const next = async () => {
    stopTimer();

    // last question
    if (index + 1 >= MAX) {
      setProcessingText("Generating summary...");
      setPhase("PROCESSING");

      const fd = new FormData();
      fd.append("sessionId", sessionId!);
      fd.append("uid", uid!);

      const res = await fetch("http://127.0.0.1:8000/practice/finish", {
        method: "POST",
        body: fd,
      });

      const summaryData = await res.json();

      navigate("/summary", {
        state: {
          role,
          results: allResults,
          summary: summaryData.summary,
        },
      });
      return;
    }

    // go next question
    setIndex((i) => i + 1);
    setPhase("IDLE");
  };

  const micStyle = {
    width: 130,
    height: 130,
    borderRadius: "50%",
    background: phase === "RECORDING" ? "#dc2626" : "#14b8a6",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    cursor: phase === "IDLE" || phase === "RECORDING" ? "pointer" : "not-allowed",
    boxShadow: `0 0 25px ${phase === "RECORDING" ? "#dc2626" : "#14b8a6"}`,
    transition: "0.25s",
    margin: "auto",
  };

  // ✅ loading state
  if (phase === "LOADING") {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", p: 4, bgcolor: "#0b1220", color: "#e2e8f0" }}>
      <Paper sx={{ p: 2, mb: 3, bgcolor: "#132030", borderRadius: "10px" }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography>Question {index + 1} of {MAX}</Typography>
          <Chip label={`${Math.round(progress)}%`} />
        </Stack>
        <LinearProgress value={progress} variant="determinate" sx={{ mt: 2 }} />
      </Paper>

      <Paper sx={{ p: 4, textAlign: "center", bgcolor: "#1e293b", borderRadius: "14px" }}>
        <Typography variant="h6" sx={{ mb: 3 }}>{question}</Typography>

        {/* --- MIC --- */}
        <Box
          sx={micStyle}
          onClick={
            phase === "IDLE" ? startRecording :
            phase === "RECORDING" ? stopRecording :
            undefined
          }
        >
          {phase === "RECORDING" ? <StopIcon /> : <MicIcon />}
        </Box>

        {phase === "RECORDING" && <Typography sx={{ mt: 2 }}>Recording: {formatTime(timer)}</Typography>}

        {phase === "PROCESSING" && (
          <Typography sx={{ mt: 3, fontStyle: "italic" }}>{processingText}</Typography>
        )}

        {phase === "FEEDBACK" && result && (
          <>
            <Typography sx={{ mt: 3 }}>{result.feedback}</Typography>
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
              <Button onClick={startRecording} startIcon={<ReplayIcon />} variant="outlined">Re-record</Button>
              <Button onClick={next} endIcon={<NavigateNextIcon />} variant="contained">
                {index + 1 >= MAX ? "Finish" : "Next"}
              </Button>
            </Stack>
          </>
        )}

        {phase === "IDLE" && (
          <Button
            variant="text"
            sx={{ mt: 3 }}
            startIcon={<SkipNextIcon />}
            onClick={skip}
          >
            Skip Question
          </Button>
        )}

        {err && <Typography sx={{ color: "salmon", mt: 2 }}>{err}</Typography>}
      </Paper>
    </Box>
  );
}
