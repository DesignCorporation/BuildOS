import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BuildOS - Construction Management Platform",
  description: "Multi-tenant SaaS platform for construction companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
