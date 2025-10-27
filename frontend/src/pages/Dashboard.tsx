import React from "react";
import { Box } from "@mui/material";
import ProfileCard from "../components/ProfileCard";

const UserProfile: React.FC = () => {
  const handleEdit = () => console.log("Edit Profile clicked");
  const handleLogout = () => console.log("Log Out clicked");

  return (
    <Box
      display="flex"  
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{
        background: "linear-gradient(135deg,#0f172a,#1e293b)", // dark gradient like Figma
        p: 3
      }}
    >
      <ProfileCard
        name="Skrit Simkhada"
        email="skrit@email.com"
        role="Candidate"
        avatarUrl="https://i.pravatar.cc/150?img=32"  // replace with actual user image if available
        onEdit={handleEdit}
        onLogout={handleLogout}
      />
    </Box>
  );
};

export default UserProfile;
