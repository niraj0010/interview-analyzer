import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  
} from "@mui/material";
import {
  Brain,
  Home,
  Mic,
  LayoutDashboard,
  User,
  LogOut,
} from "lucide-react";

interface Props {
  onProfileClick?: () => void;
  onLogout?: () => void;
}

export const NavigationBar: React.FC<Props> = ({
  onProfileClick,
  onLogout,
}) => {
  return (
    <AppBar
      position="sticky"
      elevation={6}
      sx={{
        background: "rgba(15,23,42,0.9)", // dark navy
        backdropFilter: "blur(10px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        paddingY: 0.5,
      }}
    >
      <Toolbar
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1300px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* ---- Left: Logo ---- */}
        <Box display="flex" alignItems="center" gap={1}>
          <Brain size={28} color="#14b8a6" />
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

        {/* ---- Center: Navigation Links ---- */}
        <Box
          sx={{
            display: "flex",
            gap: 3,
            alignItems: "center",
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          {/* Home Button with glow */}
          <Button
            startIcon={<Home size={18} />}
            sx={{
              background: "#14b8a6",
              color: "#fff",
              fontWeight: 600,
              borderRadius: "10px",
              px: 2.5,
              py: 0.8,
              boxShadow: "0 0 10px rgba(20,184,166,0.6)",
              "&:hover": {
                background: "#0d9488",
                boxShadow: "0 0 12px rgba(20,184,166,0.9)",
              },
            }}
          >
            Home
          </Button>

          {/* Other Links */}
          <Button
            startIcon={<Mic size={18} />}
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

        {/* ---- Right: Profile / Logout ---- */}
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<User size={18} />}
            onClick={onProfileClick}
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
            onClick={onLogout}
            sx={{
              color: "#fff",
              background: "rgba(30,41,59,0.8)",
              borderRadius: "10px",
              textTransform: "none",
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
