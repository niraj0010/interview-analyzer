import React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {  Home, Mic, LayoutDashboard, User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const NavigationBar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppBar
      position="sticky"
      elevation={6}
      sx={{
        background: "rgba(15,23,42,0.9)",
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        py: 0.8,
      }}
    >
     <Toolbar
  sx={{
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    width: "100%",
    px: 2,
  }}
>
        {/* ---- LEFT SECTION (Logo) ---- */}
        {/* ---- LEFT SECTION (Logo) ---- */}
<Box
  display="flex"
  alignItems="center"
  gap={1.2}
  sx={{
    cursor: "pointer",
    justifySelf: "start",          // aligns left inside grid cell
    justifyContent: "flex-start",  // aligns content fully left
  }}
  onClick={() => navigate("/upload")}
>
  <img 
    src="/logo.png" 
    alt="Logo" 
    style={{ width: 32, height: 32 }} 
  />

  <Box>
    <Typography
      variant="h6"
      fontWeight={700}
      sx={{ lineHeight: 1, color: "#fff" }}
    >
      Interview <span style={{ color: "#14b8a6" }}>Analyzer</span>
    </Typography>

    <Typography
      variant="caption"
      sx={{
        color: "#14b8a6",
        fontWeight: 500,
        letterSpacing: 1,
        fontSize: "0.7rem",
      }}
    >
      AI-POWERED INSIGHTS
    </Typography>
  </Box>
</Box>


        {/* ---- CENTER SECTION ---- */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 3,
            justifySelf: "center", // perfectly centered in grid cell
          }}
        >
          <Button
            startIcon={<Home size={18} />}
            onClick={() => navigate("/upload")}
            sx={{
              background: "#14b8a6",
              color: "#fff",
              fontWeight: 600,
              borderRadius: "10px",
              px: 2.8,
              py: 0.9,
              boxShadow: "0 0 10px rgba(20,184,166,0.6)",
              "&:hover": { background: "#0d9488" },
            }}
          >
            Home
          </Button>

          <Button
            startIcon={<Mic size={18} />}
            onClick={() => navigate("/practice")}
            sx={{
              color: "#e2e8f0",
              fontWeight: 500,
              textTransform: "none",
              "&:hover": { color: "#14b8a6" },
            }}
          >
            Practice
          </Button>

          <Button
            startIcon={<LayoutDashboard size={18} />}
            onClick={() => navigate("/profile")}
            sx={{
              color: "#e2e8f0",
              fontWeight: 500,
              textTransform: "none",
              "&:hover": { color: "#14b8a6" },
            }}
          >
            Dashboard
          </Button>
        </Box>

        {/* ---- RIGHT SECTION ---- */}
        <Box
          display="flex"
          alignItems="center"
          gap={2.2}
          sx={{
            justifySelf: "end", // fully right aligned
          }}
        >
          <Button
            startIcon={<User size={18} />}
            onClick={() => navigate("/profile")}
            sx={{
              color: "#e2e8f0",
              textTransform: "none",
              "&:hover": { color: "#14b8a6" },
            }}
          >
            Profile
          </Button>

          <Button
            startIcon={<LogOut size={18} />}
            onClick={() => navigate("/login")}
            sx={{
              color: "#fff",
              background: "rgba(30,41,59,0.8)",
              borderRadius: "10px",
              textTransform: "none",
              px: 2.4,
              "&:hover": {
                background: "rgba(51,65,85,0.9)",
                color: "#14b8a6",
              },
            }}
          >
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
