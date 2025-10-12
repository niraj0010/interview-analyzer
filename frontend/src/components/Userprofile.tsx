import React, { useState } from "react";

export const UserProfile: React.FC = () => {
  const [username, setUsername] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@example.com");
  const [editing, setEditing] = useState(false);

  const handleSave = () => {
    setEditing(false);
    alert("Profile updated!");
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-md max-w-md mx-auto mt-6">
      <h2 className="text-lg font-bold mb-4">User Profile</h2>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Username:</label>
        {editing ? (
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border px-3 py-2 rounded-md w-full"
          />
        ) : (
          <p>{username}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block font-semibold mb-1">Email:</label>
        {editing ? (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border px-3 py-2 rounded-md w-full"
          />
        ) : (
          <p>{email}</p>
        )}
      </div>

      <button
        onClick={editing ? handleSave : () => setEditing(true)}
        className={`px-4 py-2 rounded-md transition ${
          editing
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {editing ? "Save" : "Edit Profile"}
      </button>
    </div>
  );
};
