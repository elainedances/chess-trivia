import type { Metadata } from "next";
import { Fredoka, Inter } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-fredoka',
});

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Chess Trivia - Stream Game",
  description: "Generate a trivia game from any Chess.com profile",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${fredoka.variable} ${inter.variable}`}>{children}</body>
    </html>
  );
}
