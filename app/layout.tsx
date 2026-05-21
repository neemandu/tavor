import type { Metadata } from "next";
import { Noto_Sans_Hebrew, Noto_Sans_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const hebrewFont = Noto_Sans_Hebrew({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const arabicFont = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "תבור – אולפן ערבית",
  description: "מערכת לניהול אולפן ערבית צבאי",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body
        className={`${hebrewFont.variable} ${arabicFont.variable} antialiased`}
      >
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
