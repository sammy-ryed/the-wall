import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import KickedOutBanner from "@/components/KickedOutBanner";

export const metadata: Metadata = {
  title: "The Wall — Anonymous Confessions & AI Roasts",
  description: "Confess your coding crimes anonymously. Get roasted by AI. No mercy, no take-backs.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: "#f5f0e8", color: "#0a0a0a" }}>
        <AuthProvider>
          <KickedOutBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
