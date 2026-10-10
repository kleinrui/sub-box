"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function MainError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <section className="flex flex-col items-center gap-4 rounded-xl border bg-card px-4 py-16 text-center" role="alert">
      <AlertCircle className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">页面加载失败</h1>
        <p className="text-sm text-muted-foreground">暂时无法读取页面数据，请稍后重试。</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button
          onClick={() => {
            reset();
            router.refresh();
          }}
        >
          <RefreshCw className="h-4 w-4" />
          重新加载
        </Button>
        <Button asChild variant="outline">
          <Link href="/">返回首页</Link>
        </Button>
      </div>
    </section>
  );
}
