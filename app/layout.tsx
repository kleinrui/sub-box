import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TRPCProvider } from "@/providers/trpc-provider";

import "./globals.css";

// Add metadata export
export const metadata = {
  title: "Sub Box",
  description: "管理节点、用户和订阅转换的订阅管理应用",
};

interface RootLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme");
  const defaultTheme = theme?.value || "dark";

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-svh">
        <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem disableTransitionOnChange>
          <TRPCProvider>
            {children}
            <Toaster />
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
