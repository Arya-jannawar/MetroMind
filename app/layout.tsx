import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "MetroMind — Pune Metro commute copilot",
    template: "%s · MetroMind",
  },
  description:
    "MetroMind is an AI commute copilot for the Pune Metro: constraint-aware route planning, community crowd intelligence, safety triage, accessibility guidance and a commuter board — with plain-language explanations for every recommendation.",
  manifest: "/manifest.webmanifest",
  applicationName: "MetroMind",
  appleWebApp: { capable: true, title: "MetroMind", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "MetroMind — Pune Metro commute copilot",
    description:
      "State the goal. Read the reasoning. Routes, crowds, safety and community — one copilot for the Pune Metro.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MetroMind — Pune Metro commute copilot",
    description: "Constraint-aware routes, crowd intelligence and safety triage for Pune Metro.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0d11",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
