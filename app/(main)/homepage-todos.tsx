import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { HomepageItem } from "@/lib/homepage-data";

interface HomepageTodoGroupProps {
  title: string;
  description: string;
  items: HomepageItem[];
  destination: "users" | "nodes";
  action?: { href: string; label: string };
}

export function HomepageTodoGroup({ title, description, items, destination, action }: HomepageTodoGroupProps) {
  if (items.length === 0) return null;
  const preview = items.slice(0, 3);
  const target = destination === "users" ? "user" : "node";
  const footerAction = action ?? { href: `/${destination}`, label: destination === "users" ? "用户管理" : "节点管理" };

  return (
    <div className="min-w-0 rounded-lg border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-medium">{title}</h3>
        <Badge variant="secondary" className="tabular-nums">
          {items.length}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{description}</p>
      <ul className="mt-3 space-y-1">
        {preview.map((item) => (
          <li key={item.id}>
            <Link
              href={`/${destination}?${target}=${encodeURIComponent(item.id)}`}
              className="flex min-w-0 items-center justify-between gap-3 rounded-md py-2 text-sm text-primary underline-offset-4 hover:underline"
            >
              <span className="min-w-0 break-words">{item.name}</span>
              <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span className="text-muted-foreground">{items.length > preview.length ? `显示前 ${preview.length} 项，共 ${items.length} 项` : `共 ${items.length} 项`}</span>
        <Link href={footerAction.href} className="text-primary underline-offset-4 hover:underline">
          {footerAction.label}
        </Link>
      </div>
    </div>
  );
}

const setupSteps = [
  { title: "添加节点", description: "节点用于存放客户端，先填写节点基本信息。", href: "/nodes", label: "前往节点管理" },
  { title: "添加客户端", description: "在节点详情添加代理链接，或批量导入客户端。", href: "/nodes", label: "前往节点管理" },
  { title: "添加用户并关联客户端", description: "创建用户，在用户详情关联并启用客户端。", href: "/users", label: "前往用户管理" },
  { title: "配置转换器并复制订阅", description: "设置默认转换器或为用户指定转换器，再复制用户的订阅链接。", href: "/subconverters", label: "配置转换器" },
];

export function HomepageSetup() {
  return (
    <section className="space-y-4" aria-labelledby="homepage-setup-title">
      <div className="space-y-1">
        <h2 id="homepage-setup-title" className="text-lg font-semibold">
          开始配置订阅
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">从添加一个节点开始，按以下步骤准备可用的用户订阅。</p>
      </div>
      <ol className="grid gap-3 sm:grid-cols-2">
        {setupSteps.map((step, index) => (
          <li key={step.title} className="flex min-w-0 items-start gap-3 rounded-lg border p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium" aria-hidden="true">
              {index + 1}
            </span>
            <div className="min-w-0 space-y-1.5">
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm leading-6 text-muted-foreground">{step.description}</p>
              <Link href={step.href} className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
                {step.label}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
