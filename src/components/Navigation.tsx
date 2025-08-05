"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AuthButton from "./AuthButton";

export default function Navigation() {
  const pathname = usePathname();

  // Don't show navigation on the landing page
  if (pathname === "/landing") {
    return null;
  }

  return (
    <nav className="bg-white/5 border-b border-white/10 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo/Brand */}
          <Link href="/landing" className="text-2xl font-bold transition-colors group">
            <span className="inline-block transition-colors duration-500 ease-in-out text-white group-hover:text-red-500">Trail</span>{" "}
            <span className="inline-block transition-colors duration-500 ease-in-out text-red-500 group-hover:text-white">Break</span>
          </Link>

          {/* Navigation Links */}
                     <div className="hidden md:flex items-center gap-6">
            <Link
              href="/data"
              className={`text-sm font-medium transition-colors ${
                pathname?.startsWith("/data")
                  ? "text-red-400"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/landing"
              className={`text-sm font-medium transition-colors ${
                pathname === "/landing"
                  ? "text-red-400"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Home
            </Link>
          </div>

          {/* Auth Button */}
          <AuthButton />
        </div>
      </div>
    </nav>
  );
} 