"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { CollapseDisplay } from "@/components/collapse-display";
import { PopupSheet } from "@/components/popup-sheet";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { buildNodeClientImportItems, findNodeClientByUrl, importNodeClients, parseNodeClientUrls } from "@/lib/node-client-import";
import type { Node, User } from "@/types";
import { api } from "@/utils/api";

const formSchema = z.object({
  nodeId: z.string().min(1, "请选择所属节点"),
  urls: z.string().trim().min(1, "请输入至少一个订阅地址"),
  items: z.array(
    z.object({
      url: z.string().min(1),
      userId: z.string().min(1, "请选择用户"),
      enable: z.boolean(),
      clientId: z.string().optional(),
      error: z.string().optional(),
    })
  ),
});

type FormData = z.infer<typeof formSchema>;

interface BatchImportNodeClientDialogProps {
  userId?: string;
  node?: Node;
  nodes: Node[];
  users: User[];
}

export function BatchImportNodeClientDialog({ userId, node, nodes, users }: BatchImportNodeClientDialogProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [isImporting, setIsImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const importing = useRef(false);
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nodeId: node?.id ?? "", urls: "", items: [] },
  });
  const nodeId = form.watch("nodeId");
  const items = form.watch("items");
  const selectedNode = node ?? nodes.find((item) => item.id === nodeId);
  const clientsQuery = api.nodeClient.getNodeClientsWithUsers.useQuery(undefined, { enabled: open });
  const createClientMutation = api.nodeClient.create.useMutation();
  const setUserClientOptionMutation = api.nodeClient.setUserClientOption.useMutation();
  const dataReady = clientsQuery.data !== undefined && !clientsQuery.isError && !clientsQuery.isFetching;

  async function handleNext() {
    if (importing.current || !dataReady || !(await form.trigger(["nodeId", "urls"]))) return;
    const { urls, duplicateCount } = parseNodeClientUrls(form.getValues("urls"));
    if (!urls.length || !clientsQuery.data) return;
    const previousItems = form.getValues("items");
    const nextItems = buildNodeClientImportItems(urls, clientsQuery.data, nodeId, userId).map((item) => {
      const previous = previousItems.find((entry) => entry.url === item.url);
      return previous ? { ...item, userId: previous.userId, enable: previous.enable, error: previous.error } : item;
    });
    form.setValue("items", nextItems);
    form.clearErrors("items");
    setResultMessage(duplicateCount ? `已合并 ${duplicateCount} 条重复地址，将处理 ${urls.length} 个客户端。` : "");
    setStep(2);
  }

  async function handleImport(data: FormData) {
    if (importing.current || !dataReady || data.items.length === 0) return;
    importing.current = true;
    setIsImporting(true);
    setResultMessage("");
    try {
      const latest = await clientsQuery.refetch();
      if (latest.isError || !latest.data) throw new Error(latest.error?.message ?? "无法加载客户端关联，请重试");
      const result = await importNodeClients({
        nodeId: node?.id ?? data.nodeId,
        items: data.items,
        clients: latest.data,
        createClient: (input) => createClientMutation.mutateAsync(input),
        setUserClientOption: (input) => setUserClientOptionMutation.mutateAsync(input),
      });
      await Promise.allSettled([utils.nodeClient.invalidate(), utils.node.getAllWithClients.invalidate()]);
      router.refresh();
      if (result.failed.length) {
        const message = `用户关联成功 ${result.succeeded} 个，失败 ${result.failed.length} 个；已新建 ${result.created} 个客户端。失败地址已保留，可修改后重试。`;
        setResultMessage(message);
        form.setValue("items", result.failed);
        form.setValue("urls", result.failed.map((item) => item.url).join("\n"));
        if (result.succeeded || result.created) toast.warning(message);
        else toast.error(`导入未完成，${result.failed.length} 个地址需要重试。`);
      } else {
        toast.success(`导入完成：新建 ${result.created} 个客户端，更新 ${result.updated} 个客户端的用户关联。`);
        setOpen(false);
        setStep(1);
        form.reset({ nodeId: node?.id ?? "", urls: "", items: [] });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "导入失败，请重试";
      setResultMessage(`导入尚未开始：${message}。已保留本次填写内容。`);
      toast.error(message);
    } finally {
      importing.current = false;
      setIsImporting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        批量导入
      </Button>
      <PopupSheet
        open={open}
        onOpenChange={(value) => !importing.current && setOpen(value)}
        title="批量导入客户端"
        description="按订阅地址匹配当前节点的客户端，并保存所选用户的启用状态。"
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleImport)} className="space-y-4">
            {clientsQuery.isError ? (
              <div role="alert" className="space-y-2 rounded-md border border-destructive/50 p-3 text-sm">
                <p>客户端关联加载失败：{clientsQuery.error.message}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => clientsQuery.refetch()} disabled={clientsQuery.isFetching || isImporting}>
                  {clientsQuery.isFetching ? "加载中..." : "重新加载"}
                </Button>
              </div>
            ) : !dataReady && !isImporting ? (
              <p role="status" className="text-sm text-muted-foreground">
                正在加载客户端关联...
              </p>
            ) : null}
            {users.length === 0 && (
              <p role="alert" className="text-sm text-destructive">
                暂无用户，请先添加用户后再导入。
              </p>
            )}
            {resultMessage && (
              <p role="status" className="rounded-md bg-muted p-3 text-sm">
                {resultMessage}
              </p>
            )}
            {step === 1 ? (
              <>
                {node ? (
                  <p className="text-sm">所属节点：{node.name}</p>
                ) : (
                  <FormField
                    control={form.control}
                    name="nodeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>所属节点</FormLabel>
                        <Select
                          value={field.value || "__select_node__"}
                          onValueChange={(value) => {
                            field.onChange(value === "__select_node__" ? "" : value);
                            form.setValue("items", []);
                            setResultMessage("");
                          }}
                          disabled={isImporting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="选择节点" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="__select_node__" disabled>
                              选择节点
                            </SelectItem>
                            {nodes.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="urls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>订阅地址（每行一个）</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={8} className="font-mono" placeholder={"vless://xxx\nvless://yyy"} disabled={isImporting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
                  <Button type="button" onClick={handleNext} disabled={!dataReady || isImporting || users.length === 0 || nodes.length === 0}>
                    预览导入
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm">
                  所属节点：{selectedNode?.name ?? nodeId} · 共 {items.length} 个客户端
                </p>
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const existing = findNodeClientByUrl(clientsQuery.data ?? [], nodeId, item.url);
                    return (
                      <div key={item.url} className="space-y-3 rounded-lg border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <CollapseDisplay url={item.url} />
                          <span className="text-sm text-muted-foreground">{existing ? "更新用户关联" : "新建客户端"}</span>
                        </div>
                        {existing && <p className="text-xs text-muted-foreground">已有 {existing.users.length} 位用户关联，保存时保留其他用户及已有排序。</p>}
                        <div className="flex flex-wrap items-end gap-4">
                          <FormField
                            control={form.control}
                            name={`items.${index}.userId`}
                            render={({ field }) => (
                              <FormItem className="min-w-0 flex-1 basis-40">
                                <FormLabel>用户</FormLabel>
                                <Select
                                  value={field.value || "__select_user__"}
                                  disabled={isImporting}
                                  onValueChange={(value) => {
                                    const nextUserId = value === "__select_user__" ? "" : value;
                                    field.onChange(nextUserId);
                                    form.setValue(`items.${index}.enable`, existing?.users.find((option) => option.userId === nextUserId)?.enable ?? true);
                                    form.setValue(`items.${index}.error`, undefined);
                                  }}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="选择用户" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="__select_user__" disabled>
                                      选择用户
                                    </SelectItem>
                                    {users.map((user) => (
                                      <SelectItem key={user.id} value={user.id}>
                                        {user.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.enable`}
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0 pb-2">
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isImporting} />
                                </FormControl>
                                <FormLabel>启用</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                        {item.error && (
                          <p role="alert" className="text-sm text-destructive">
                            {item.clientId ? "客户端已存在，用户关联保存失败：" : "导入失败："}
                            {item.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isImporting}>
                    上一步
                  </Button>
                  <Button type="submit" disabled={isImporting || !dataReady || users.length === 0 || items.length === 0}>
                    {isImporting ? "导入中..." : items.some((item) => item.error) ? "重试失败项" : "确认导入"}
                  </Button>
                </div>
              </>
            )}
          </form>
        </Form>
      </PopupSheet>
    </>
  );
}
