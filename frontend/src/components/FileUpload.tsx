import React, { useState } from "react";
import { Brain } from "lucide-react";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { Button, Typography, Paper, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

export const FileUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const navigate = useNavigate();

  // ✅ Upload to FastAPI backend
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://127.0.0.1:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();

      console.log("✅ Upload success:", data);

      // navigate to analysis page with backend response
      navigate("/analysis", { state: { result: data } });
    } catch (error) {
      console.error("❌ Upload error:", error);
      alert("Upload failed. Please try again.");
    }
  };

  // ✅ Handle file input
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      handleFileUpload(file); // upload immediately
    }
  };

  const handlePastInterviewsClick = () => {
    navigate("/profile"); // ✅ Go to user profile
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        color: "#e2e8f0",
        padding: "3rem 1rem",
      }}
    >
      {/* ======= Title Section ======= */}
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
          conversion, real-time emotion detection, and personalized performance
          feedback.
        </Typography>
      </Box>

      {/* ======= Upload Card ======= */}
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
          Click below or drag and drop your file here
        </Typography>

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
          {selectedFile ? "Change File" : "Choose File"}
          <input
            hidden
            type="file"
            accept="audio/*,video/*" // ✅ Restrict file types
            onChange={handleFileChange}
          />
        </Button>

        {selectedFile && (
          <Typography
            variant="body2"
            sx={{
              color: "#a1a1aa",
              mt: 3,
              wordBreak: "break-all",
              fontSize: "0.9rem",
            }}
          >
            {selectedFile.name}
          </Typography>
        )}
      </Paper>

      {/* ======= Supported Formats ======= */}
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

      {/* ======= Centered Single Button ======= */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          mt: 5,
        }}
      >
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