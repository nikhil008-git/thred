import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Turborepo Auth Starter",
  description: "Better Auth with a protected API",
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
