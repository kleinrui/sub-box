"use client";

import { Box, Cog, ExternalLink, FileJson, Github, Home, Link2, LogOut, type LucideIcon, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import pkg from "@/package.json";

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "首页",
    href: "/",
    icon: Home,
  },
  {
    title: "用户管理",
    href: "/users",
    icon: Users,
  },
  {
    title: "节点管理",
    href: "/nodes",
    icon: Link2,
  },
  {
    title: "订阅转换器",
    href: "/subconverters",
    icon: Cog,
  },
  {
    title: "Clash 配置",
    href: "/clash-configs",
    icon: FileJson,
  },
  {
    title: "导入导出",
    href: "/export",
    icon: Box,
  },
];

const docItems: NavItem[] = [
  {
    title: "Github",
    href: "https://github.com/kleinrui/sub-box",
    icon: Github,
    external: true,
  },
];

export function AppSidebar({ className, ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }
      toast.success("已退出登录");
      router.push("/login");
      router.refresh();
    } catch (_error) {
      toast.error("退出登录失败");
    }
  }

  return (
    <Sidebar className={cn("group/sidebar", className)} {...props}>
      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarMenu>
            {/* <SidebarMenuItem>
              <SidebarMenuButton asChild> */}
            <div className="flex items-center gap-2 my-4 mx-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Box className="h-5 w-5" />
              </div>
              <div className="grid flex-1 text-sm leading-tight">
                <span className="font-semibold">Sub Box</span>
                <span className="text-xs text-muted-foreground">v{pkg.version}</span>
              </div>
            </div>
            {/* </SidebarMenuButton>
            </SidebarMenuItem> */}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>管理面板</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>外部链接</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {docItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className="group">
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="!flex-row justify-between px-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={handleLogout} className="group-data-[collapsible=icon]/sidebar:w-10 group-data-[collapsible=icon]/sidebar:px-0">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">退出登录</span>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
