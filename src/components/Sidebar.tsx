"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import ProfileIcon from "./ProfileIcon";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    {
      name: "Profile",
      href: "/profile",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      name: "Data",
      href: "/data",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    }
  ];

  const bottomNavItems = [
    {
      name: "Settings",
      href: "/settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  return (
    <>
      <div className={`fixed left-0 top-0 h-full bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-500 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}>
      
      {/* Expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-6 bg-gray-900 border border-gray-800 rounded-full p-1 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors z-10"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
              {/* Header */}
        <div className={`p-6 border-b border-gray-800 flex items-center min-h-[84px] ${isCollapsed ? "justify-center" : "justify-between"}`}>
          <Link href="/landing" className="group cursor-pointer relative">
            <div className="text-xl font-bold tracking-tight leading-none whitespace-nowrap">
              {/* TB - always present, visible when collapsed */}
              <div className={`absolute inset-0 flex justify-center transition-opacity duration-300 ${
                isCollapsed ? "opacity-100" : "opacity-0"
              }`}>
                <span className="transition-colors duration-500 ease-in-out text-white group-hover:text-red-500">T</span><span className="transition-colors duration-500 ease-in-out text-red-500 group-hover:text-white">B</span>
              </div>
              
              {/* Trail Break - always present, visible when expanded */}
              <div className={`transition-opacity duration-300 ${
                isCollapsed ? "opacity-0" : "opacity-100"
              }`}>
                <span className="transition-colors duration-500 ease-in-out text-white group-hover:text-red-500">Trail</span>{" "}
                <span className="transition-colors duration-500 ease-in-out text-red-500 group-hover:text-white">Break</span>
              </div>
            </div>
          </Link>
        
        {/* Toggle button - only show when expanded */}
        {!isCollapsed && (
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors p-1 flex-shrink-0"
            title="Collapse sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-red-600 text-white"
                      : "text-gray-300 hover:bg-gray-800 hover:text-white"
                  } ${isCollapsed ? "justify-center" : ""}`}
                  title={isCollapsed ? item.name : ""}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  {!isCollapsed && (
                    <span className="font-medium transition-opacity duration-300 ease-in-out">
                      {item.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

            {/* Bottom navigation and user section */}
      <div className="border-t border-gray-800">
        {/* Settings */}
        <div className="p-4">
          <ul className="space-y-2">
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-red-600 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    } ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? item.name : ""}
                  >
                    <div className="flex-shrink-0">{item.icon}</div>
                    {!isCollapsed && (
                      <span className="font-medium transition-opacity duration-300 ease-in-out">
                        {item.name}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* User info and sign out */}
        <div className="p-4 border-t border-gray-800">
          {/* User Profile */}
          <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? "justify-center" : ""}`}>
            <ProfileIcon 
              name={session?.user?.name}
              email={session?.user?.email}
              size="md"
            />
            <div className="flex-1 min-w-0 relative">
              {/* User info - always present, visible when expanded */}
              <div className={`transition-opacity duration-300 ${
                isCollapsed ? "opacity-0" : "opacity-100"
              }`}>
                <div className="text-sm font-medium text-white truncate whitespace-nowrap">
                  {session?.user?.name || "User"}
                </div>
                <div className="text-xs text-gray-400 truncate whitespace-nowrap">
                  {session?.user?.email}
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => signOut({ callbackUrl: "/landing" })}
            className={`w-full flex items-center gap-2 px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg transition-all duration-300 ${
              isCollapsed ? "justify-center" : ""
            }`}
            title={isCollapsed ? "Sign Out" : ""}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && (
              <span className="transition-opacity duration-300 ease-in-out">Sign Out</span>
            )}
          </button>
        </div>
      </div>
    </div>
    </>
  );
} 