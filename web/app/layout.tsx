import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Shell } from "@/components/Shell";
import { DataProvider } from "@/lib/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "いいかいご テレッサ",
  description: "訪問介護サービス提供記録（テレッサ）・訪問介護計画・介護報告書 運営指導対応システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <DataProvider>
          <Nav />
          <main className="mx-auto max-w-7xl px-4 py-6 print:max-w-none print:p-0">
            <Shell>{children}</Shell>
          </main>
        </DataProvider>
      </body>
    </html>
  );
}
