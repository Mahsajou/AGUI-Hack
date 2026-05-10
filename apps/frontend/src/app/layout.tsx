import type { Metadata } from "next";

import { Plus_Jakarta_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

const splineMono = Spline_Sans_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "IdeaLens & AG-UI Hackathon Starter",
  description:
    "IdeaLens standalone workspace + lead triage (CopilotKit) hackathon starter",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${splineMono.variable}`}>
      <body className={`${jakarta.variable} ${splineMono.variable} subpixel-antialiased`}>
        {children}
      </body>
    </html>
  );
}
