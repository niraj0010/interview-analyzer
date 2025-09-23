import React from "react";
import { Box, Typography, Button } from "@mui/material";
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
      sx={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", textAlign: "center" }}
    >
      <Typography variant="h3" fontWeight={700} color="primary" gutterBottom>
        Welcome to Interview Analyzer
      </Typography>

      <Typography variant="h6" color="text.secondary" gutterBottom>
        Your AI-powered tool for mock interview feedback 🚀
      </Typography>

      <Button
        variant="contained"
        color="primary"
        sx={{ mt: 3 }}
        onClick={() => navigate("/dashboard")}
      >
        Go to Dashboard
      </Button>
    </Box>
  );
};

export default LandingPage;
