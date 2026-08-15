import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thred — shared memory for AI agents",
  description: "Shared temporal memory for coding agents through MCP.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
