import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AgentationDevOverlay } from "../components/AgentationDevOverlay";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Threads Auto Poster & AI Content Writer",
  description: "TypeORM, Google Sheets Topic Sync, AI Content Generator & Meta Threads API Auto Poster",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-gray-100">
        {children}
        <AgentationDevOverlay />
      </body>
    </html>
  );
}
