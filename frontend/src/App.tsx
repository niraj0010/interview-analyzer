import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";

// --- Pages ---
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandingPage from "./pages/LandingPage";
import AnalysisPage from "./pages/AnalysisPage";
import ProcessingPage from "./pages/ProcessingPage";
import UserProfile from "./pages/UserProfile";
import { UploadProgress } from "./pages/UploadProgress";
import PracticePage from "./pages/PracticePage"; 
import PracticeSession from "./pages/PracticeSession";
import Feedback from "./pages/FeedbackPage";
import SummaryPage from './pages/SummaryPage';

// --- Components ---
import { FileUpload } from "./components/FileUpload";
import { NavigationBar } from "./components/NavigationBar";
import Footer from "./components/Footer";

// Minimal Theme: Just colors and font, no shape overrides
const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: "#0f172a",
      paper: "#1e293b",
    },
    primary: { main: "#14b8a6" },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
  }
});

const App: React.FC = () => {
  const location = useLocation();
  const hideNavbar = location.pathname === "/login" || location.pathname === "/signup";

  return (
    // 1. OUTER BOX: Forces full height
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh', 
        bgcolor: 'background.default',
        color: 'text.primary'
      }}
    >
      {!hideNavbar && <NavigationBar />}

      {/* 2. MAIN CONTENT: Pushes footer down */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex',
          flexDirection: 'column',
          pt: hideNavbar ? 0 : 8, 
          width: '100%',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/processing" element={<ProcessingPage />} />
          <Route path="/upload-progress" element={<UploadProgress />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice-session" element={<PracticeSession />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/summary" element={<SummaryPage />} />
        </Routes>
      </Box>

      {/* 3. FOOTER */}
      {!hideNavbar && <Footer />}
    </Box>
  );
};

export default function AppWrapper() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /> 
      <Router>
        <App />
      </Router>
    </ThemeProvider>
  );
}