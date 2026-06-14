import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const display = Inter({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Feedback — AI Sports Coaching",
  description:
    "Record your training. AI tells you exactly why you'd get hit. Upload any training video for technical biomechanical coaching.",
  openGraph: {
    title: "Feedback — AI Sports Coaching",
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
      <body className={`${inter.variable} ${display.variable} ${serif.variable} min-h-dvh antialiased`}>
        {children}
      </body>
    </html>
  );
}
