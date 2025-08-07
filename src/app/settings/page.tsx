"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import DashboardLayout from "@/components/DashboardLayout";
import ProfileIcon from "@/components/ProfileIcon";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Get user data
  const { data: user, refetch } = api.user.getProfile.useQuery(undefined, {
    enabled: !!session,
  });

  // Update username mutation
  const updateUsername = api.user.updateUsername.useMutation({
    onSuccess: () => {
      setSuccess("Username updated successfully!");
      setError("");
      setIsEditingUsername(false);
      setNewUsername("");
      void refetch();
    },
    onError: (error: any) => {
      setError(error.message);
      setSuccess("");
    }
  });

  const handleUsernameEdit = () => {
    setIsEditingUsername(true);
    setNewUsername(user?.username || "");
    setError("");
    setSuccess("");
  };

  const handleUsernameSave = () => {
    if (!newUsername.trim()) {
      setError("Username cannot be empty");
      return;
    }
    if (newUsername.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    updateUsername.mutate({ username: newUsername.trim() });
  };

  const handleUsernameCancel = () => {
    setIsEditingUsername(false);
    setNewUsername("");
    setError("");
    setSuccess("");
  };

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl text-white">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="text-white">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Account Settings</h1>
          <p className="text-gray-400">Manage your account information and preferences</p>
        </div>

        {/* Account Information */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <ProfileIcon 
              name={user.name}
              username={user.username}
              email={user.email}
              size="lg"
            />
            <div>
              <h2 className="text-2xl font-bold">Account Information</h2>
              <p className="text-gray-400">Manage your profile details</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              {isEditingUsername ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full max-w-md px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter username"
                    disabled={updateUsername.isPending}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleUsernameSave}
                      disabled={updateUsername.isPending}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      {updateUsername.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={handleUsernameCancel}
                      disabled={updateUsername.isPending}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {user.username || <span className="text-gray-500 italic">No username set</span>}
                  </span>
                  <button
                    onClick={handleUsernameEdit}
                    className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {user.username ? "Edit" : "Set Username"}
                  </button>
                </div>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <span className="text-lg">
                {user.name || <span className="text-gray-500 italic">No display name</span>}
              </span>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <span className="text-lg">{user.email}</span>
            </div>

            {/* Account Created */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Account Created
              </label>
              <span className="text-lg">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Success/Error Messages */}
          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-600 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}
          {success && (
            <div className="mt-4 p-3 bg-green-900/30 border border-green-600 rounded-lg">
              <p className="text-green-400">{success}</p>
            </div>
          )}
        </div>

        {/* Additional Settings Sections */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <h2 className="text-2xl font-bold mb-4">Preferences</h2>
          <p className="text-gray-400">
            More settings options will be available here in the future.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
} 