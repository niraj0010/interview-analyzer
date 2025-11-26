// src/theme.ts
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a", // Deep Navy
      paper: "#1e293b",   // Card Background
    },
    primary: {
      main: "#14b8a6",    // Teal
    },
    secondary: {
      main: "#8b5cf6",    // Violet
    },
    text: {
      primary: "#e2e8f0",
      secondary: "#94a3b8",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: "none", // No ALL CAPS buttons
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16, // 👈 GLOBAL ROUNDING (The "Sexy" Factor)
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24, // Extra rounded cards
          backgroundImage: "none", // Clean flat look without gradient overlay
          boxShadow: "0 10px 40px -10px rgba(0,0,0,0.5)", // Soft modern shadow
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Rounded buttons
          padding: "10px 24px",
        },
        containedPrimary: {
          background: "linear-gradient(90deg, #14b8a6, #0d9488)", // Subtle gradient
          boxShadow: "0 4px 14px 0 rgba(20, 184, 166, 0.39)",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12, // Rounded input fields
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#14b8a6",
            borderWidth: 2,
          },
        },
      },
    },
  },
});