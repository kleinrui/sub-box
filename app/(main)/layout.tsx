import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppBreadcrumbs } from "@/components/app-breadcrumbs";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { api } from "@/server/api/trpc-server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await api.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <a href="#main-content" className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0">
        跳到主内容
      </a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center border-b bg-card">
            <div className="mx-auto flex min-w-0 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
              <SidebarTrigger className="-ml-1 shrink-0" aria-label="展开或收起导航" title="展开或收起导航" />
              <Separator orientation="vertical" className="h-5 shrink-0" />
              <Suspense fallback={<span className="text-sm text-muted-foreground">Sub Box</span>}>
                <AppBreadcrumbs />
              </Suspense>
            </div>
          </header>
          <div id="main-content" tabIndex={-1} className="mx-auto flex min-w-0 w-full max-w-[1440px] flex-1 flex-col px-4 py-6 outline-none sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
