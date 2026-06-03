import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Wall — Anonymous Confessions & AI Roasts",
  description: "Confess your coding crimes anonymously. Get roasted by Claude AI. No mercy, no take-backs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: "#f5f0e8", color: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}
