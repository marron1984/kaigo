import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import { Shell } from "@/components/Shell";
import { authConfig } from "@/lib/auth";
import { DataProvider } from "@/lib/store";
import "./globals.css";

// ログイン設定（環境変数）をリクエストごとに反映するため、事前生成しない
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "いいかいご テレッサ",
  description: "訪問介護サービス提供記録（テレッサ）・訪問介護計画・介護報告書 運営指導対応システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { enabled } = authConfig();
  return (
    <html lang="ja">
      <body className="min-h-screen">
        <DataProvider>
          {!enabled && (
            <div className="no-print bg-amber-500 px-4 py-1 text-center text-xs text-white">
              ログインが未設定です。誰でもこの画面を開けます（Vercel の環境変数 LOGIN_USERS を設定してください）
            </div>
          )}
          <Nav authEnabled={enabled} />
          <main className="mx-auto max-w-7xl px-4 py-6 print:max-w-none print:p-0">
            <Shell>{children}</Shell>
          </main>
        </DataProvider>
      </body>
    </html>
  );
}
