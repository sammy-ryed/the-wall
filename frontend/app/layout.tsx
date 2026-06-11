import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import KickedOutBanner from "@/components/KickedOutBanner";

const SITE_URL = "https://the-wall-fawn.vercel.app";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "The Wall — Anonymous Confessions & AI Roasts",
    template: "%s | The Wall",
  },
  description:
    "Confess your deepest, darkest, most cringe-worthy moments anonymously. Our AI roasts you without mercy. Post it to the wall. Regret it forever.",
  keywords: ["anonymous confession", "AI roast", "cringe", "the wall", "confession board"],
  authors: [{ name: "The Wall" }],
  robots: { index: true, follow: true },
  // ── Open Graph (Discord, WhatsApp, Facebook, Slack) ──
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "The Wall",
    title: "The Wall — Confess. Get Roasted. No Mercy.",
    description:
      "Anonymous confessions + savage AI roasts. Every confession is judged, scored, and posted forever.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Wall — Anonymous Confessions & AI Roasts",
      },
    ],
  },
  // ── Twitter / X card ──
  twitter: {
    card: "summary_large_image",
    title: "The Wall — Confess. Get Roasted. No Mercy.",
    description:
      "Anonymous confessions + savage AI roasts. Every confession is judged, scored, and posted forever.",
    images: ["/og-image.png"],
  },
  // ── Icons ──
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  // ── PWA / manifest ──
  manifest: "/manifest.json",
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
        <AuthProvider>
          <KickedOutBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
