import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "https://www.thred.fun";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Thred — one shared context stream",
  description: "Shared memory for Claude, Cursor, and Codex.",
  openGraph: {
    type: "website",
    url: "/share",
    title: "Thred — one shared context stream",
    description: "Shared memory for Claude, Cursor, and Codex.",
    siteName: "Thred",
    images: [
      {
        url: "/share/opengraph-image",
        width: 1200,
        height: 630,
        alt: "One shared context stream — Claude, Thred, Memory, Codex",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thred — one shared context stream",
    description: "Shared memory for Claude, Cursor, and Codex.",
    images: ["/share/opengraph-image"],
  },
};

export default function SharePage() {
  return <main className="min-h-screen bg-[#fafaf9]" aria-hidden="true" />;
}
