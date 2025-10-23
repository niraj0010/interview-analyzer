import React from "react";
import {
  Card,
  CardContent,
  Avatar,
  Typography,
  Divider,
  Button,
  Stack
} from "@mui/material";

interface ProfileCardProps {
  name: string;
  email: string;
  role?: string;
  avatarUrl?: string;
  onEdit?: () => void;
  onLogout?: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  email,
  role = "Candidate",
  avatarUrl = "https://i.pravatar.cc/c150?img=32",
  onEdit = () => console.log("Edit clicked"),
  onLogout = () => console.log("Logout clicked")
}) => {
  return (
    <Card
      sx={{
        width: 350,
        borderRadius: 3,
        backgroundColor: "rgba(255,255,255,0.05)", // glassy card look
        backdropFilter: "blur(8px)",
        boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
        color: "text.primary",
        transition: "transform 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 12px 24px rgba(0,0,0,0.4)"
        }
      }}
    >
      <CardContent>
        <Stack alignItems="center" spacing={2}>
          <Avatar
            src={avatarUrl}
            alt={name}
            sx={{
              width: 100,
              height: 100,
              border: "3px solid #3b82f6"
            }}
          />

          <Typography variant="h5" fontWeight={700} color="primary">
            {name}
          </Typography>

          <Typography variant="body1" color="text.secondary">
            {email}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            {role}
          </Typography>

          <Divider
            flexItem
            sx={{
              my: 2,
              width: "100%",
              borderColor: "rgba(255,255,255,0.1)"
            }}
          />

          <Button variant="contained" color="primary" fullWidth onClick={onEdit}>
            Edit Profile
          </Button>
          <Button variant="outlined" color="primary" fullWidth onClick={onLogout}>
            Log Out
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ProfileCard;
