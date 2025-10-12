
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0f172a", // deep navy
      paper: "rgba(30, 41, 59, 0.8)", // charcoal w/ transparency
    },
    primary: {
      main: "#14b8a6", // teal
    },
    secondary: {
      main: "#10b981", // green
    },
    info: {
      main: "#8b5cf6", // purple
    },
  },
  typography: {
    fontFamily: "Inter, sans-serif",
    h4: { fontWeight: 700, letterSpacing: "-0.02em" }, // bold headings
    body1: { fontWeight: 300 }, // light body
    button: { fontWeight: 500, letterSpacing: "0.05em" },
  },
  shape: {
    borderRadius: 12, // rounded cards
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: "blur(12px)", // glassmorphism
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          boxShadow: "0 0 12px rgba(20, 184, 166, 0.5)", // glowing effect
        },
      },
    },
  },
});

