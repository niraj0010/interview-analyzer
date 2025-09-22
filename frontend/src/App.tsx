// src/App.tsx
import React from "react";
import { Button, Typography, Container } from "@mui/material";

export default function App() {
  return (
    <Container>
      <Typography variant="h3" gutterBottom>
        Welcome to Interview Analyzer
      </Typography>
      <Button variant="contained" color="primary">
        Get Started
      </Button>
    </Container>
  );
}
