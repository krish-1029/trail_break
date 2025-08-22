"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import AuthButton from "./AuthButton";

export default function InvisibleNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Don't show navbar on dashboard pages when user is logged in
  if (session && (pathname?.startsWith("/data") || pathname?.startsWith("/featured") || pathname?.startsWith("/settings"))) {
    return null;
  }

  return (
    <nav className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Left side - conditionally show home button */}
          <div>
            {pathname?.startsWith("/auth") && (
              <Link
                href="/landing"
                className="inline-flex items-center gap-2 px-4 py-2 text-white hover:text-red-400 transition-colors group"
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Home</span>
              </Link>
            )}
          </div>

          {/* Right side - conditionally show auth button */}
          <div>
            {pathname === "/landing" && (
              <AuthButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 