import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "CRM Workspace",
  title: {
    default: "CRM Workspace",
    template: "%s — CRM Workspace",
  },
  description:
    "A multi-tenant CRM workspace for managing leads, contacts, accounts, and deals.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

// Explicit prop typing (instead of the global `LayoutProps` helper) keeps
// `tsc --noEmit` working in fresh clones/CI, where next-env.d.ts has not
// been generated yet. See AGENTS.md rule on reproducible typechecks.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
