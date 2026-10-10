import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "いいかいご テレッサ",
  description: "訪問介護サービス提供記録（テレッサ）実地調査対応システム（モック）",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-7xl px-4 py-6 print:p-0 print:max-w-none">{children}</main>
      </body>
    </html>
  );
}
