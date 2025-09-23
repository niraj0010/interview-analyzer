import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  Link,
} from "@mui/material";
import Grid from "@mui/material/Grid"; //  In v7 Grid includes Grid2 features
import { useNavigate } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    jobTitle: "",
    company: "",
    location: "",
    education: "",
  });

  const [error, setError] = useState("");
  const [agree, setAgree] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignup = async () => {
    setError("");
    if (!agree) {
      setError("You must agree to the Terms and Privacy Policy");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Create user in Firebase Auth
      const userCred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // Save extra profile info in Firestore
      await setDoc(doc(db, "users", userCred.user.uid), {
        firstName: form.firstName,
        lastName: form.lastName,
        jobTitle: form.jobTitle,
        company: form.company,
        location: form.location,
        education: form.education,
        email: form.email,
        createdAt: new Date(),
      });

      navigate("/landing");
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
      <Card sx={{ width: 500 }}>
        <CardContent>
          <Box display="flex" justifyContent="center" mb={2}>
            <img
              src="/logo.png"
              alt="Interview Analyzer Logo"
              style={{ width: "100px", height: "100px" }}
            />
          </Box>
          <Typography variant="h4" align="center" fontWeight={700}>
            Interview Analyzer
          </Typography>
          <Typography variant="body2" align="center" gutterBottom>
            Create your account to start analyzing interviews
          </Typography>

          <Grid container spacing={2} mt={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                name="firstName"
                label="First Name"
                value={form.firstName}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                name="lastName"
                label="Last Name"
                value={form.lastName}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                name="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                name="password"
                label="Password"
                type="password"
                value={form.password}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                name="jobTitle"
                label="Job Title"
                value={form.jobTitle}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                name="company"
                label="Company"
                value={form.company}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                name="location"
                label="Location"
                value={form.location}
                onChange={handleChange}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                name="education"
                label="Education"
                value={form.education}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <FormControlLabel
            control={
              <Checkbox
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">
                I agree to the{" "}
                <Link underline="hover" color="primary">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link underline="hover" color="primary">
                  Privacy Policy
                </Link>
              </Typography>
            }
          />

          {error && (
            <Typography color="error" variant="body2" mt={1}>
              {error}
            </Typography>
          )}

          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            onClick={handleSignup}
          >
            Create Account
          </Button>

          <Typography align="center" mt={2}>
            Already have an account?{" "}
            <Link
              component="button"
              onClick={() => navigate("/login")}
              underline="hover"
              color="primary"
            >
              Sign in
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Signup;
