import React from "react";
import { Box, Container, Typography, Stack, Divider } from "@mui/material";

const Footer: React.FC = () => {
  return (
    <Box
      component="footer"
      sx={{
        bgcolor: "#0D1524", // ✔ MATCHED TO PAGE BACKGROUND
        borderTop: "1px solid rgba(148,163,184,0.08)",
        py: 5,
        mt: "auto",
      }}
    >
      <Container maxWidth="lg">
        <Divider
          sx={{
            borderColor: "rgba(148,163,184,0.15)",
            width: "85%",
            mx: "auto",
            mb: 3,
          }}
        />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography
            variant="body2"
            sx={{ color: "#94A3B8", textAlign: { xs: "center", sm: "left" } }}
          >
            © {new Date().getFullYear()}{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #14b8a6, #22d3ee)",
                WebkitBackgroundClip: "text",
                color: "transparent",
                fontWeight: 600,
              }}
            >
              Interview Analyzer
            </span>{" "}
            . All rights reserved.
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "#94A3B8",
              bgcolor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(148,163,184,0.2)",
              px: 2.5,
              py: 0.8,
              borderRadius: "50px",
              textAlign: "center",
            }}
          >
            Built by{" "}
            <span style={{ color: "#14b8a6", fontWeight: 600 }}>
              Team Humanize
            </span>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default Footer;
