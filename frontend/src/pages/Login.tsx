import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  InputAdornment,
  IconButton,
  Link,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase"; // your firebase.ts

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/upload");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ background: "linear-gradient(135deg,#0f172a,#1e293b)" }}
    >
      <Card sx={{ width: 400 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" mb={2}>
            <img
              src="/logo.png"
              alt="Interview Analyzer Logo"
              style={{ width: "100px", height: "100px" }}
            />
          </Box>
          <Typography variant="h4" gutterBottom align="center" fontWeight={700}>
            Interview Analyzer
          </Typography>
          <Typography variant="body2" align="center" gutterBottom>
            Sign in to analyze your mock interviews
          </Typography>

          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>
              Email
            </Typography>
            <TextField
              fullWidth
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Typography variant="subtitle1" gutterBottom mt={2}>
              Password
            </Typography>
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            onClick={handleLogin}
          >
            Sign In
          </Button>

          <Typography align="center" mt={2}>
            Don’t have an account?{" "}
            <Link
              component="button"
              onClick={() => navigate("/signup")}
              underline="hover"
              color="primary"
            >
              Sign up
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
