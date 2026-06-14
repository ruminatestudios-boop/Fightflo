import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});

const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Fightflo — AI Coaching",
  description:
    "Film your training. AI tracks your movement and tells you exactly what to improve.",
  openGraph: {
    title: "Fightflo — AI Coaching",
    description:
      "Upload any training video. Get timestamped technical coaching in minutes.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${barlow.variable} min-h-dvh antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
