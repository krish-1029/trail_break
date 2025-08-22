
import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { Providers } from "./providers";
import InvisibleNavbar from "@/components/InvisibleNavbar";

export const metadata: Metadata = {
  title: "Trail Break - Sim Racing Telemetry",
  description: "Analyze your sim racing telemetry data to improve lap times and consistency",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="text-white min-h-screen h-full overscroll-none bg-transparent">
        <Providers>
          <div className="relative z-10">
            <InvisibleNavbar />
            <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
              {children}
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
