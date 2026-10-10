import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[80dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-sm font-medium text-muted-foreground">404</span>
      <h1 className="text-2xl font-semibold">找不到这个页面</h1>
      <p className="text-sm text-muted-foreground">请检查页面地址，或返回首页继续操作。</p>
      <Button asChild>
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Link>
      </Button>
    </main>
  );
}
