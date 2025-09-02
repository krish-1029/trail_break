"use client";

import { useSession, signOut } from "next-auth/react";
import ProfileIcon from "./ProfileIcon";
import { useTheme } from "../contexts/ThemeContext";

export default function AuthButton() {
  const { data: session } = useSession();
  const { currentTheme } = useTheme();

  if (session) {
    return (
      <div className="flex items-center gap-3">
        <ProfileIcon 
          name={session.user?.name}
          email={session.user?.email}
          size="sm"
          theme={currentTheme}
        />
        <button
          onClick={() => signOut()}
          className="inline-flex items-center gap-2 px-4 py-2 text-white hover:text-red-400 transition-colors group"
        >
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <a 
      href="/auth/signin"
      className="inline-flex items-center gap-2 px-4 py-2 text-white hover:text-red-400 transition-colors group"
    >
      <span className="font-medium">Sign In</span>
    </a>
  );
} 