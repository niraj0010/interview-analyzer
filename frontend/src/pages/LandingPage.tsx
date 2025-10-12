import React from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: "linear-gradient(135deg, #0f172a, #1e293b)",
        color: "white",
        textAlign: "center",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 6,
          borderRadius: 4,
          background: "rgba(30, 41, 59, 0.8)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Typography variant="h3" fontWeight={700} color="primary" gutterBottom>
          Welcome to Interview Analyzer
        </Typography>

        <Typography
          variant="h6"
          color="secondary"
          sx={{ opacity: 0.9 }}
          gutterBottom
        >
          Your AI-powered tool for mock interview feedback 🚀
        </Typography>

        <Button
          variant="contained"
          color="primary"
          sx={{
            mt: 4,
            px: 4,
            py: 1.5,
            fontSize: "1rem",
            borderRadius: "1rem",
            boxShadow: "0 0 20px rgba(20, 184, 166, 0.6)",
          }}
          onClick={() => navigate("/upload")}
        >
          Go to Dashboard
        </Button>
      </Paper>
    </Box>
  );
};

export default LandingPage;
