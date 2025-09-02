"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";
import { TRPCReactProvider } from "@/trpc/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
 
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TRPCReactProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </TRPCReactProvider>
    </SessionProvider>
  );
} 