import type { Metadata } from "next";
import {
  Hanken_Grotesk,
  Geist,
  Geist_Mono,
} from "next/font/google";

import { schoolbell } from "@/lib/fonts";

import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-hanken-grotesk",
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AttackDesk: A visual execution workspace",
  description:
    "Plan your day. Map your ideas. Track your deadlines. Ship your work. A visual execution workspace for missions, deadlines, content ideas, and freeform thinking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${geist.variable} ${geistMono.variable} ${schoolbell.variable}`}
    >
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router: external font stylesheet, not a pages-router <link> */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body
        className="font-body-md text-body-md bg-background text-on-surface"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
