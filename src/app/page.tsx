"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export default function RootPage() {
  const { data: session, status } = useSession();
  const { currentTheme } = useTheme();

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    
    if (session) {
      redirect("/featured"); // Redirect logged-in users to featured page
    } else {
      redirect("/landing"); // Redirect unauthenticated users to landing
    }
  }, [session, status]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
            <div className="text-center">
        <div className={`w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${
          currentTheme === 'gt' ? 'border-red-600' : 'border-blue-600'
        }`}></div>
        <p className="text-xl">Loading...</p>
      </div>
    </div>
  );
}
