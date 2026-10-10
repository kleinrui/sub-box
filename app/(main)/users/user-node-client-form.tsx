"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Node, NodeClient, User } from "@/types";
import { api } from "@/utils/api";

const formSchema = z
  .object({
    mode: z.enum(["create", "edit", "associate"]),
    nodeClientId: z.string(),
    userIds: z.array(z.string()).min(1, "至少选择一个用户"),
    nodeId: z.string(),
    url: z.string().trim(),
    currentUserEnable: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.mode === "associate") {
      if (!values.nodeClientId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["nodeClientId"], message: "请选择已有客户端" });
      return;
    }
    if (!values.nodeId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["nodeId"], message: "请选择节点" });
    if (!values.url.trim()) context.addIssue({ code: z.ZodIssueCode.custom, path: ["url"], message: "URL不能为空" });
  });

type FormData = z.infer<typeof formSchema>;

interface UserNodeClientFormProps {
  userId: string;
  nodes: Node[];
  users: User[];
  item?: NodeClient & { users: { userId: string; enable: boolean; order: number }[] };
  mode?: "create" | "associate";
  onSuccess?: () => void;
  onPendingChange?: (pending: boolean) => void;
}

export function UserNodeClientForm({ userId, nodes, users, item, mode = "create", onSuccess, onPendingChange }: UserNodeClientFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const savingRef = useRef(false);
  // 若创建后关联保存失败，重试时继续使用该客户端，避免重复创建。
  const createdClientIdRef = useRef<string | null>(null);
  const isAssociating = mode === "associate";
  const createNodeClientMutation = api.nodeClient.create.useMutation();
  const updateNodeClientMutation = api.nodeClient.update.useMutation();
  const setUserClientOptionsMutation = api.nodeClient.setUserClientOptions.useMutation();
  const setUserClientOptionMutation = api.nodeClient.setUserClientOption.useMutation();
  const updateUserClientOptionMutation = api.nodeClient.updateUserClientOption.useMutation();
  const clientsQuery = api.nodeClient.getNodeClientsWithUsers.useQuery(undefined, { enabled: isAssociating });
  const availableClients = (clientsQuery.data ?? []).filter((client) => !client.users.some((user) => user.userId === userId));

  const currentUserEnabled = useMemo(() => {
    if (!item) return true;
    return item.users.find((user) => user.userId === userId)?.enable ?? false;
  }, [item, userId]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: item ? "edit" : mode,
      nodeClientId: "",
      userIds: item ? item.users.map((user) => user.userId) : [userId],
      nodeId: item?.nodeId ?? (nodes.length === 1 ? (nodes[0]?.id ?? "") : ""),
      url: item?.url ?? "",
      currentUserEnable: currentUserEnabled,
    },
  });

  const watchedUserIds = form.watch("userIds");
  const currentUserEnableValue = form.watch("currentUserEnable");
  const isCurrentUserInList = watchedUserIds.includes(userId);
  const selectedNode = nodes.find((node) => node.id === form.watch("nodeId"));
  const selectedClient = availableClients.find((client) => client.id === form.watch("nodeClientId"));

  useEffect(() => {
    if (!isCurrentUserInList && currentUserEnableValue) form.setValue("currentUserEnable", false);
  }, [isCurrentUserInList, currentUserEnableValue, form]);

  const replaceHostInUrl = () => {
    const currentUrl = form.getValues("url");
    if (!currentUrl) return toast.error("URL不能为空");
    if (!selectedNode?.host) return toast.error("节点主机不能为空");
    if (!/@([^:]+):/.test(currentUrl)) return toast.error("URL格式不正确，未找到可替换的主机");
    form.setValue("url", currentUrl.replace(/@([^:]+):/, `@${selectedNode.host}:`), { shouldDirty: true });
    toast.success("主机已替换");
  };

  async function refreshClients() {
    await Promise.allSettled([utils.nodeClient.invalidate(), utils.node.getAllWithClients.invalidate()]);
    router.refresh();
  }

  async function onSubmit(values: FormData) {
    if (savingRef.current) return;
    savingRef.current = true;
    onPendingChange?.(true);
    let clientSaved = false;
    try {
      if (isAssociating) {
        await setUserClientOptionMutation.mutateAsync({
          nodeClientId: values.nodeClientId,
          userId,
          data: { enable: values.currentUserEnable },
        });
      } else {
        let nodeClientId = item?.id ?? createdClientIdRef.current;
        if (nodeClientId) {
          await updateNodeClientMutation.mutateAsync({ id: nodeClientId, data: { nodeId: values.nodeId, url: values.url } });
        } else {
          const client = await createNodeClientMutation.mutateAsync({ nodeId: values.nodeId, url: values.url });
          nodeClientId = client.id;
          createdClientIdRef.current = client.id;
        }
        clientSaved = true;

        const existingUserIds = item?.users.map((user) => user.userId) ?? [];
        const hasAssociationChanges = !item || values.userIds.length !== existingUserIds.length || values.userIds.some((id) => !existingUserIds.includes(id));
        if (hasAssociationChanges) {
          // 此 API 替换完整集合；保留的用户 enable/order 由服务端保持原值。
          await setUserClientOptionsMutation.mutateAsync({ nodeClientId, userIds: values.userIds, defaultOptions: { enable: true } });
        }
        if (values.userIds.includes(userId)) {
          await updateUserClientOptionMutation.mutateAsync({ nodeClientId, userId, data: { enable: values.currentUserEnable } });
        }
      }

      await refreshClients();
      toast.success(isAssociating ? "关联成功" : "保存成功");
      onSuccess?.();
    } catch (error) {
      if (clientSaved) await refreshClients();
      const message = error instanceof Error ? error.message : "请稍后重试";
      toast.error(clientSaved ? `客户端已保存，但用户关联设置失败，请重试保存：${message}` : `${isAssociating ? "关联" : "保存"}失败：${message}`);
    } finally {
      savingRef.current = false;
      onPendingChange?.(false);
    }
  }

  const isPending =
    form.formState.isSubmitting ||
    createNodeClientMutation.isPending ||
    updateNodeClientMutation.isPending ||
    setUserClientOptionsMutation.isPending ||
    setUserClientOptionMutation.isPending ||
    updateUserClientOptionMutation.isPending;

  if (!isAssociating && nodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        暂无节点，请先前往{" "}
        <Link href="/nodes" className="underline underline-offset-4">
          节点页面
        </Link>{" "}
        添加节点，再添加客户端。
      </p>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <fieldset disabled={isPending} className="space-y-4">
          {isAssociating ? (
            <>
              <p className="text-sm text-muted-foreground">选择已有客户端关联到当前用户，保留其他用户的关联和启用状态。</p>
              {clientsQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">正在加载客户端...</p>
              ) : clientsQuery.isError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">客户端加载失败：{clientsQuery.error.message}</p>
                  <Button type="button" variant="outline" onClick={() => void clientsQuery.refetch()}>
                    重试
                  </Button>
                </div>
              ) : availableClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">暂无可关联的客户端。请先添加客户端，或在节点页面创建客户端。</p>
              ) : (
                <FormField
                  control={form.control}
                  name="nodeClientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>已有客户端</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isPending}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择客户端" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableClients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {nodes.find((node) => node.id === client.nodeId)?.name ?? "未知节点"} · {client.id.slice(-6)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedClient && <Textarea value={selectedClient.url} readOnly rows={3} className="font-mono text-sm" aria-label="所选客户端 URL" />}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </>
          ) : (
            <>
              {item && (
                <p className="text-sm text-muted-foreground">
                  修改节点或 URL 会影响此客户端关联的所有用户{item.users.length > 1 ? `（共 ${item.users.length} 位）` : ""}；启用开关只影响当前用户。
                </p>
              )}
              <FormField
                control={form.control}
                name="userIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关联用户</FormLabel>
                    <MultiSelect value={field.value} onValueChange={field.onChange} options={users.map((user) => ({ value: user.id, label: user.name }))} placeholder="选择用户" />
                    <p className="text-xs text-muted-foreground">取消选择会解除对应用户的关联；保留用户的启用状态和顺序不变。</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nodeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>节点</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isPending}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择节点" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {nodes.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.name}
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
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>URL</FormLabel>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={replaceHostInUrl}>
                        覆盖主机
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea {...field} rows={6} className="font-mono text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
          <FormField
            control={form.control}
            name="currentUserEnable"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isCurrentUserInList || isPending} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">启用当前用户</FormLabel>
                </div>
                {!isCurrentUserInList && <p className="text-xs text-muted-foreground">当前用户不在关联用户中，需要先选择当前用户。</p>}
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending || (isAssociating && (clientsQuery.isLoading || clientsQuery.isError || availableClients.length === 0))}>
            {isPending ? (isAssociating ? "关联中..." : "保存中...") : isAssociating ? "关联" : "保存"}
          </Button>
        </fieldset>
      </form>
    </Form>
  );
}
