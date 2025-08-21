"use client";

import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function RootPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load
    
    if (session) {
      redirect("/profile"); // Redirect logged-in users to profile
    } else {
      redirect("/landing"); // Redirect unauthenticated users to landing
    }
  }, [session, status]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
            <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-xl">Loading...</p>
      </div>
    </div>
  );
}
