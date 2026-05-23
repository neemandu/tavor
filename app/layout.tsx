import type { Metadata } from "next";
import { Alef, Noto_Naskh_Arabic } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TavorLoader } from "@/components/tavor-loader";
import "./globals.css";

const hebrewFont = Alef({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const arabicFont = Noto_Naskh_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
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
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:`
          try{var s=localStorage.getItem('theme'),p=window.matchMedia('(prefers-color-scheme:dark)').matches;if(s==='dark'||(s!=='light'&&p))document.documentElement.classList.add('dark')}catch(e){}
        `}} />
      </head>
      <body
        className={`${hebrewFont.variable} ${arabicFont.variable} antialiased`}
      >
        <TavorLoader />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
