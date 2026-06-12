import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlow = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FightFlo — Reactive Fight Training",
  description:
    "Shadowboxing that fights back. Randomized reaction signals for Muay Thai, boxing, MMA and kickboxing.",
  applicationName: "FightFlo",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FightFlo",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    title: "FightFlo",
    description: "Can you survive Stadium Mode?",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${barlow.variable} h-full`}>
      <body className="min-h-dvh bg-black font-sans text-[#f5f5f5] antialiased">
        {children}
      </body>
    </html>
  );
}
