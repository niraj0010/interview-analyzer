import React from "react";
import {
  Box,
  Container,
  Typography,
  Stack,
} from "@mui/material";
import { Favorite } from "@mui/icons-material"; // Heart icon

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "#0B1220",
        borderTop: "1px solid",
        borderColor: "rgba(148, 163, 184, 0.1)", // Very subtle border
        py: 4,
        mt: "auto", // Pushes footer to bottom if page content is short
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", sm: "row" }} // Stack on mobile, Row on desktop
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          {/* Left Side: Brand & Copyright */}
          <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
            <Typography
              variant="h6"
              sx={{
                fontFamily: "monospace",
                fontWeight: 700,
                letterSpacing: ".05rem",
                background: "linear-gradient(90deg, #14b8a6, #22d3ee)",
                backgroundClip: "text",
                textFillColor: "transparent",
                lineHeight: 1,
                mb: 0.5,
              }}
            >
              Interview Analyzer
            </Typography>
            <Typography variant="caption" sx={{ color: "#64748B" }}>
              © {new Date().getFullYear()} All rights reserved.
            </Typography>
          </Box>

          {/* Right Side: Team Credit */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              bgcolor: "rgba(15, 23, 42, 0.5)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              px: 2,
              py: 0.75,
              borderRadius: 50,
            }}
          >
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              Built with
            </Typography>
            <Favorite sx={{ fontSize: 14, color: "#f43f5e" }} />
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              by
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#14b8a6", fontWeight: 600 }}
            >
              Team Humanize
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;