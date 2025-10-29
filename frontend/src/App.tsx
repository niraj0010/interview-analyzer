import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import LandingPage from "./pages/LandingPage";
import { FileUpload } from "./components/FileUpload";
import { NavigationBar } from "./components/NavigationBar";
import AnalysisPage from "./pages/AnalysisPage";
import UserProfile from "./pages/UserProfile";
import { UploadProgress } from "./pages/UploadProgress";
import PracticePage from "./pages/PracticePage"; 
import PracticeSession from "./pages/PracticeSession";
import Feedback from "./pages/FeedbackPage";


const App: React.FC = () => {
  const location = useLocation();

  
  const hideNavbar =
    location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="min-h-screen bg-gray-50">
      {/*  Show navbar unless on login/signup */}
      {!hideNavbar && <NavigationBar />}

      <main className="pt-16">
        <Routes>
          {/* Redirect root to login */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/*  Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* App routes */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/upload" element={<FileUpload />} />
          <Route path="/upload-progress" element={<UploadProgress />} />
          <Route path="/analysis" element={<AnalysisPage />} />
          <Route path="/profile" element={<UserProfile />} />

          {/* New Practice route */}
          <Route path="/practice" element={<PracticePage />} />
          <Route path="/practice-session" element={<PracticeSession />} />
           <Route path="/feedback" element={<Feedback />} />

        </Routes>
      </main>
    </div>
  );
};

export default function AppWrapper() {
  return (
    <Router>
      <App />
    </Router>
  );
}