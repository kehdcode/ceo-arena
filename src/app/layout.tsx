import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEO Arena — Build. Decide. Compete.",
  description: "A competitive business simulation. Build your Lagos fashion brand, make the call, and see what the market does.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#080b0a] text-[#f2f6f0] antialiased">{children}</body>
    </html>
  );
}
