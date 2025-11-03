"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import AuthButton from "./AuthButton";
import { useTheme } from "@/contexts/ThemeContext";

export default function InvisibleNavbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { currentTheme, setCurrentTheme } = useTheme();
  const [styleSelectorExpanded, setStyleSelectorExpanded] = useState(false);
  const [navVisible, setNavVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Compute visibility (we'll return after all hooks are declared)
  const shouldHideNavbar =
    !!session && (pathname?.startsWith("/data") || pathname?.startsWith("/featured") || pathname?.startsWith("/settings"));

  const switchTheme = (newTheme: 'gt' | 'f1') => {
    if (newTheme === currentTheme) return;
    setCurrentTheme(newTheme);
    setStyleSelectorExpanded(false);
  };

  // Trigger nav fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setNavVisible(true);
    }, 500); // Slight delay for navbar to appear after other content
    return () => clearTimeout(timer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setStyleSelectorExpanded(false);
      }
    };

    if (styleSelectorExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [styleSelectorExpanded]);

  // Safe early return AFTER all hooks to keep hook order consistent
  if (shouldHideNavbar) {
    return null;
  }

  return (
    <nav className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          {/* Left side - Theme selector and conditionally show home button */}
          <div 
            className="flex items-center gap-4 pr-6 transition-opacity duration-1000 ease-out"
            style={{
              opacity: navVisible ? 1 : 0
            }}
          >
            {/* Theme Selector - Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setStyleSelectorExpanded(!styleSelectorExpanded)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-white transition-colors group ${
                  currentTheme === 'gt' ? 'hover:text-red-400' : 'hover:text-blue-400'
                }`}
                title="Style selector"
              >
                <span className="font-medium">{currentTheme.toUpperCase()}</span>
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${
                    styleSelectorExpanded ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Content - Direct cards without wrapper */}
              <div 
                className={`absolute top-full left-0 pt-2 transition-all duration-300 ease-out ${
                  styleSelectorExpanded 
                    ? 'opacity-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 -translate-y-2 pointer-events-none'
                }`}
                style={{
                  transformOrigin: 'top',
                }}
              >
                <div className="space-y-2">
                  <button
                    onClick={() => switchTheme('gt')}
                    className={`group relative flex items-center justify-start gap-3 w-full px-4 py-2 rounded-lg border-2 transition-all duration-300 ${
                      currentTheme === 'gt' 
                        ? 'border-red-500 bg-red-500/20 shadow-lg shadow-red-500/20' 
                        : 'border-red-500/40 bg-red-500/10 hover:border-red-500/60 hover:bg-red-500/15'
                    }`}
                  >
                    <span className="text-red-500 font-bold text-sm">GT</span>
                    <span className="text-white/80 text-xs">Racing Style</span>
                  </button>
                  <button
                    onClick={() => switchTheme('f1')}
                    className={`group relative flex items-center justify-start gap-3 w-full px-4 py-2 rounded-lg border-2 transition-all duration-300 ${
                      currentTheme === 'f1' 
                        ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20' 
                        : 'border-blue-500/40 bg-blue-500/10 hover:border-blue-500/60 hover:bg-blue-500/15'
                    }`}
                  >
                    <span className="text-blue-500 font-bold text-sm">F1</span>
                    <span className="text-white/80 text-xs">Formula 1 Style</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Home button - conditionally show */}
            {pathname?.startsWith("/auth") && (
              <Link
                href="/landing"
                className={`inline-flex items-center gap-2 px-4 py-2 text-white transition-colors group ${
                  currentTheme === 'gt' ? 'hover:text-red-400' : 'hover:text-blue-400'
                }`}
              >
                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Home</span>
              </Link>
            )}
          </div>

          {/* Right side - conditionally show auth button */}
          <div 
            className="transition-opacity duration-1000 ease-out"
            style={{
              opacity: navVisible ? 1 : 0
            }}
          >
            {pathname === "/landing" && (
              <AuthButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 