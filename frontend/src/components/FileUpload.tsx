import React, { useState, useRef } from "react";
import { Brain } from "lucide-react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { 
  Button, 
  Typography, 
  Paper, 
  Box, 
  IconButton, 
  Stack,
  Tooltip 
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

export const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  // 1. Handle File Selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
    }
  };

  // 2. Handle Removing the File
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset HTML input
    }
  };

  // 3. Start Analysis -> Navigate to Processing Page
  const handleStartAnalysis = () => {
    if (!selectedFile) return;

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("Please sign in first.");
      return;
    }

    navigate("/processing", { state: { file: selectedFile } });
  };

  const handlePastInterviewsClick = () => {
    navigate("/profile");
  };

  return (
    <Box
      sx={{
        // KEY FIX: Use flexGrow instead of minHeight
        flexGrow: 1, 
        width: '100%',
        
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        color: "#e2e8f0",
        padding: "3rem 1rem",
      }}
    >
      {/* ===== Title ===== */}
      <Box sx={{ textAlign: "center", mb: 5 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <Brain color="#14b8a6" size={35} strokeWidth={2.5} />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: "#14b8a6",
              letterSpacing: "-0.02em",
            }}
          >
            Interview Analyzer
          </Typography>
        </Box>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 500,
            color: "#e2e8f0",
            maxWidth: "600px",
            lineHeight: 1.5,
            margin: "1rem auto 0",
            fontSize: "1.05rem",
          }}
        >
          Transform your interview skills with advanced AI analysis
        </Typography>

        <Typography
          variant="body2"
          sx={{
            color: "#94a3b8",
            maxWidth: "700px",
            lineHeight: 1.7,
            mt: 1,
            fontSize: "0.95rem",
            margin: "0 auto",
          }}
        >
          Upload mock interview recordings for comprehensive speech-to-text
          conversion, emotion detection, and personalized AI feedback.
        </Typography>
      </Box>

      {/* ===== Upload Card ===== */}
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          maxWidth: 480,
          padding: "2.5rem",
          textAlign: "center",
          borderRadius: "1rem",
          border: "2px dashed rgba(148, 163, 184, 0.4)",
          background: "rgba(30, 41, 59, 0.6)",
          backdropFilter: "blur(14px)",
          color: "#e2e8f0",
        }}
      >
        <CloudUploadIcon
          sx={{ fontSize: 70, color: "#14b8a6", marginBottom: "1rem" }}
        />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Upload your video or audio
        </Typography>
        <Typography variant="body2" sx={{ color: "#94a3b8", mb: 3 }}>
          {selectedFile 
            ? "File selected! Review below." 
            : "Click below or drag and drop your file here"}
        </Typography>

        {/* --- FILE SELECTION BUTTON --- */}
        {!selectedFile && (
            <Button
            variant="contained"
            component="label"
            sx={{
                backgroundColor: "#14b8a6",
                "&:hover": { backgroundColor: "#0d9488" },
                borderRadius: "8px",
                textTransform: "none",
                px: 3,
                py: 1.2,
            }}
            >
            Choose File
            <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileChange}
            />
            </Button>
        )}

        {/* --- SELECTED FILE PREVIEW + ACTIONS --- */}
        {selectedFile && (
          <Box 
            sx={{ 
                mt: 3, 
                p: 2, 
                bgcolor: "rgba(15, 23, 42, 0.5)", 
                borderRadius: 2, 
                border: "1px solid rgba(148, 163, 184, 0.2)" 
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
                    <UploadFileIcon sx={{ color: "#14b8a6" }} />
                    <Box sx={{ textAlign: 'left' }}>
                        <Typography variant="body2" noWrap sx={{ color: "#e2e8f0", fontWeight: 600, maxWidth: "200px" }}>
                            {selectedFile.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                    </Box>
                </Box>

                {/* REMOVE BUTTON */}
                <Tooltip title="Remove file">
                    <IconButton onClick={handleRemoveFile} size="small" sx={{ color: "#ef4444", bgcolor: "rgba(239, 68, 68, 0.1)", "&:hover": { bgcolor: "rgba(239, 68, 68, 0.2)" } }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </Stack>

            {/* UPLOAD BUTTON (Navigates to Processing) */}
            <Button
                fullWidth
                variant="contained"
                onClick={handleStartAnalysis}
                sx={{
                    mt: 2,
                    backgroundColor: "#14b8a6",
                    "&:hover": { backgroundColor: "#0d9488" },
                    textTransform: "none",
                    fontWeight: 600
                }}
            >
                Start Analysis
            </Button>
          </Box>
        )}
      </Paper>

      {/* Supported Formats */}
      <Typography
        variant="body2"
        sx={{
          color: "#94a3b8",
          mt: 2,
          fontSize: "0.85rem",
        }}
      >
        Supported formats: .mp3, .wav, .mp4, .mov, .avi, .webm
      </Typography>

      {/* Past Interviews Button */}
      <Box sx={{ display: "flex", justifyContent: "center", mt: 5 }}>
        <Button
          variant="outlined"
          onClick={handlePastInterviewsClick}
          sx={{
            borderColor: "#14b8a6",
            color: "#14b8a6",
            borderRadius: "8px",
            textTransform: "none",
            px: 4,
            py: 1.2,
            fontWeight: 600,
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: "rgba(20, 184, 166, 0.1)",
              borderColor: "#0d9488",
            },
          }}
        >
          Past Interviews
        </Button>
      </Box>
    </Box>
  );
};