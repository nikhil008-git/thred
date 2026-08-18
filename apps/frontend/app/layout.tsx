import type { Metadata } from "next";
import { LenisProvider } from "@/components/lenis-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "https://www.thred.fun";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "thred — shared memory for AI agents",
  description: "Shared memory for Claude, Cursor, and Codex so context carries across tools and sessions.",
  applicationName: "thred",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "thred — shared memory for AI agents",
    description: "Shared memory for Claude, Cursor, and Codex so context carries across tools and sessions.",
    siteName: "thred",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Context stays with the work — Thred shared memory for AI agents",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "thred — shared memory for AI agents",
    description: "Shared memory for Claude, Cursor, and Codex so context carries across tools and sessions.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
