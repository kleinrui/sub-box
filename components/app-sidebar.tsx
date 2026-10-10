"use client";

import { Box, Cog, ExternalLink, FileJson, Github, Home, Link2, LogOut, type LucideIcon, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { appRouteLabels, isAppNavActive } from "@/lib/app-navigation";
import { cn } from "@/lib/utils";
import pkg from "@/package.json";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

function navItem(href: string, icon: LucideIcon): NavItem {
  return { title: appRouteLabels[href] ?? href, href, icon };
}

const navGroups: { title?: string; items: NavItem[] }[] = [
  { items: [navItem("/", Home)] },
  { title: "用户与节点", items: [navItem("/users", Users), navItem("/nodes", Link2)] },
  { title: "订阅配置", items: [navItem("/subconverters", Cog), navItem("/clash-configs", FileJson)] },
  { title: "工具", items: [navItem("/ai-api", Cog), navItem("/export", Box), { title: "Github", href: "https://github.com/kleinrui/sub-box", icon: Github, external: true }] },
];

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile, setOpenMobile } = useSidebar();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    if (pathname) setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  function closeMobileNavigation() {
    if (isMobile) setOpenMobile(false);
  }

  async function handleLogout() {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setIsLoggingOut(true);
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }
      toast.success("已退出登录");
      closeMobileNavigation();
      router.push("/login");
      router.refresh();
    } catch (_error) {
      toast.error("退出登录失败");
    } finally {
      loggingOut.current = false;
      setIsLoggingOut(false);
    }
  }

  return (
    <Sidebar className={cn("group/sidebar", className)} {...props}>
      <nav aria-label="主导航" className="flex min-h-0 flex-1 flex-col">
        <SidebarHeader className="px-4 pb-4 pt-5">
          <Link href="/" onClick={closeMobileNavigation} aria-label="Sub Box 首页" className="flex items-center gap-3 rounded-md">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Box className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="grid min-w-0 flex-1 gap-1 leading-tight group-data-[collapsible=icon]/sidebar:hidden">
              <span className="text-base font-semibold tracking-tight">Sub Box</span>
              <span className="text-xs text-muted-foreground">订阅管理 · v{pkg.version}</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent className="gap-0 px-2">
          {navGroups.map((group) => (
            <SidebarGroup key={group.title ?? "home"} className="pb-2 pt-1">
              {group.title && <SidebarGroupLabel className="h-7 px-3 text-muted-foreground">{group.title}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active = !item.external && isAppNavActive(pathname, item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title} className="h-10 rounded-lg px-3">
                          {item.external ? (
                            <a href={item.href} onClick={closeMobileNavigation} target="_blank" rel="noopener noreferrer">
                              <item.icon className="h-4 w-4" aria-hidden="true" />
                              <span className="flex-1">{item.title}</span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                            </a>
                          ) : (
                            <Link href={item.href} onClick={closeMobileNavigation} aria-current={active ? "page" : undefined}>
                              <item.icon className="h-4 w-4" aria-hidden="true" />
                              <span>{item.title}</span>
                            </Link>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="!flex-row items-center justify-between border-t px-3 py-3">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={isLoggingOut ? "正在退出登录" : "退出登录"}
            className="group-data-[collapsible=icon]/sidebar:w-10 group-data-[collapsible=icon]/sidebar:px-0"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{isLoggingOut ? "正在退出登录" : "退出登录"}</span>
          </Button>
        </SidebarFooter>
      </nav>
      <SidebarRail aria-label="展开或收起导航" title="展开或收起导航" />
    </Sidebar>
  );
}
