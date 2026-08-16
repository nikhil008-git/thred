import type { Metadata } from "next";
import { LenisProvider } from "@/components/lenis-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "thred shared memory for AI agents",
  description: "Shared temporal memory for coding agents through MCP.",
  applicationName: "thred",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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
