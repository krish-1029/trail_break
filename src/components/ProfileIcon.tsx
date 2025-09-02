"use client";

export type Theme = 'gt' | 'f1';

interface ProfileIconProps {
  name?: string | null;
  email?: string | null;
  username?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  theme?: Theme;
}

export default function ProfileIcon({ 
  name, 
  email, 
  username, 
  size = "md", 
  className = "",
  theme = "f1"
}: ProfileIconProps) {
  // Get initials from name, username, or email (in that order of preference)
  const getInitials = (): string => {
    try {
      if (name?.trim()) {
        const nameParts = name.trim().split(' ').filter(Boolean);
        if (nameParts.length >= 2) {
          return (nameParts[0]!.charAt(0) + nameParts[nameParts.length - 1]!.charAt(0)).toUpperCase();
        }
        return nameParts[0]!.charAt(0).toUpperCase();
      }
      
      if (username?.trim()) {
        return username.trim().slice(0, 2).toUpperCase();
      }
      
      if (email?.trim()) {
        return email.trim().slice(0, 2).toUpperCase();
      }
    } catch {
      // Fallback for any errors
    }
    
    return "??";
  };

  // Size configurations
  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg"
  };

  const initials = getInitials();
  
  // Theme-based background colors
  const themeColors = {
    gt: "bg-red-600",
    f1: "bg-blue-600"
  };

  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        ${themeColors[theme]}
        rounded-full 
        flex 
        items-center 
        justify-center 
        text-white 
        font-semibold 
        flex-shrink-0
        ${className}
      `}
      title={name || username || email || "User"}
    >
      {initials}
    </div>
  );
} 