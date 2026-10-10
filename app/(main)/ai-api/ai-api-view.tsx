"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type CreateApiTokenInput, createApiTokenSchema } from "@/lib/api-token";
import type { RouterOutputs } from "@/utils/api";
import { api } from "@/utils/api";

type Token = RouterOutputs["apiToken"]["list"][number];
const date = (value: string | null) => (value ? new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" }) : "尚未使用");

export function AiApiView({ tokens, now }: { tokens: Token[]; now: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<Token | null>(null);
  const form = useForm<CreateApiTokenInput>({
    resolver: zodResolver(createApiTokenSchema),
    defaultValues: { name: "", permission: "read", expiresInDays: "30" },
  });
  const create = api.apiToken.create.useMutation({
    gcTime: 0,
    onSuccess: ({ token }) => {
      setSecret(token);
      form.reset();
      router.refresh();
    },
    onError: (error) => toast.error(error.message),
  });
  const revoke = api.apiToken.revoke.useMutation({
    onSuccess: () => {
      setRevokeTarget(null);
      router.refresh();
      toast.success("Token 已撤销");
    },
    onError: (error) => toast.error(error.message),
  });
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制");
    } catch {
      toast.error("复制失败，请手动复制");
    }
  }
  function closeCreate() {
    if (create.isPending) return;
    setOpen(false);
    setSecret(null);
    create.reset();
    form.reset();
  }
  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI 与 API</h1>
        <p className="mt-2 text-sm text-muted-foreground">让外部 agent 使用 API 管理节点、用户和订阅。</p>
      </div>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Agent 接入</CardTitle>
          <CardDescription>OpenAPI 文档公开可读，数据操作需要 API Token。无需配置 MCP server 或模型 API Key。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">将接入说明交给 agent，并在运行 agent 的环境中设置 SUB_BOX_API_TOKEN。不要将 Token 粘贴到聊天中。</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => copy(`请阅读 ${window.location.origin}/api/openapi.json，按文档操作 Sub Box；使用环境变量 SUB_BOX_API_TOKEN 作为 Bearer Token。`)}>
              复制接入说明
            </Button>
            <Button asChild variant="outline">
              <a href="/api/openapi.json" target="_blank" rel="noreferrer">
                查看 OpenAPI 文档
              </a>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            只读 Token 可调用 GET 查询；读写 Token 还可调用 POST，包括生成订阅和配置合并。数据可能包含订阅密钥及节点链接，请只交给信任的 agent。
          </p>
        </CardContent>
      </Card>
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>API Token</CardTitle>
            <CardDescription className="mt-2">时间以北京时间（UTC+8）显示。</CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>创建 Token</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                {["名称 / 前缀", "权限", "创建时间", "过期时间", "最近使用", "状态", "操作"].map((label) => (
                  <TableHead key={label}>{label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    暂无 Token，创建后即可接入 agent。
                  </TableCell>
                </TableRow>
              )}
              {tokens.map((token) => {
                const expired = Date.parse(token.expiresAt) <= now;
                return (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div>{token.name}</div>
                      <code className="text-xs text-muted-foreground">{token.prefix}…</code>
                    </TableCell>
                    <TableCell>{token.permission === "read" ? "只读" : "读写"}</TableCell>
                    <TableCell>{date(token.createdAt)}</TableCell>
                    <TableCell>{date(token.expiresAt)}</TableCell>
                    <TableCell>{date(token.lastUsedAt)}</TableCell>
                    <TableCell>{token.revokedAt ? "已撤销" : expired ? "已过期" : "有效"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" disabled={!!token.revokedAt || expired} onClick={() => setRevokeTarget(token)}>
                        撤销
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!value) closeCreate();
        }}
      >
        <DialogContent
          onInteractOutside={(event) => {
            if (secret || create.isPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{secret ? "Token 已创建" : "创建 API Token"}</DialogTitle>
            <DialogDescription>{secret ? "完整 Token 仅显示这一次，请复制并保存。关闭后无法再次查看。" : "使用可辨认的名称，选择权限和有效期。"}</DialogDescription>
          </DialogHeader>
          {secret ? (
            <div className="space-y-4">
              <Input aria-label="新建的 API Token" value={secret} readOnly className="font-mono" />
              <div className="flex gap-2">
                <Button onClick={() => copy(secret)}>复制 Token</Button>
                <Button variant="outline" onClick={closeCreate}>
                  已保存，关闭
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((input) => create.mutate(input))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名称</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：本机 Claude Code" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="permission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>权限</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="read">只读</SelectItem>
                          <SelectItem value="write">读写</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiresInDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>有效期</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["7", "30", "90", "365"].map((days) => (
                            <SelectItem key={days} value={days}>
                              {days} 天
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "正在创建…" : "创建"}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!revokeTarget}
        onOpenChange={(value) => {
          if (!value && !revoke.isPending) setRevokeTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>撤销 Token</DialogTitle>
            <DialogDescription>撤销「{revokeTarget?.name}」后，使用它的 agent 将无法继续访问 API。此操作不可恢复。</DialogDescription>
          </DialogHeader>
          <Button
            variant="destructive"
            disabled={revoke.isPending}
            onClick={() => {
              if (revokeTarget) revoke.mutate({ id: revokeTarget.id });
            }}
          >
            {revoke.isPending ? "正在撤销…" : "确认撤销"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
