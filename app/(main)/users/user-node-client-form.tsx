"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MultiSelect } from "@/components/ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { type Node, type NodeClient, type User } from "@/types";
import { api } from "@/utils/api";

const formSchema = z.object({
  userIds: z.array(z.string()).min(1, "至少选择一个用户"),
  nodeId: z.string().min(1, "节点不能为空"),
  url: z.string().min(1, "URL不能为空"), // 不需要检查 url 是否是有效，因为可能有 vless:// 等格式
  currentUserEnable: z.boolean(), // 当前用户是否启用
});

type FormData = z.infer<typeof formSchema>;

interface UserNodeClientFormProps {
  userId: string;
  nodes: Node[];
  users: User[];
  item?: NodeClient & { users: { userId: string; enable: boolean; order: number }[] };
  onSuccess?: () => void;
}

export function UserNodeClientForm({ userId, nodes, users, item, onSuccess }: UserNodeClientFormProps) {
  const router = useRouter();
  
  // 使用TRPC创建和设置节点客户端权限
  const createNodeClientMutation = api.nodeClient.create.useMutation({
    onSuccess: () => {
      // 在onSubmit中处理成功回调
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
  
  const updateNodeClientMutation = api.nodeClient.update.useMutation({
    onSuccess: () => {
      // 在onSubmit中处理成功回调
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
  
  const setUserClientOptionsMutation = api.nodeClient.setUserClientOptions.useMutation({
    onSuccess: () => {
      // 在onSubmit中处理成功回调
    },
    onError: (error) => {
      toast.error(`设置用户权限失败: ${error.message}`);
    },
  });
  
  const updateUserClientOptionMutation = api.nodeClient.updateUserClientOption.useMutation({
    onSuccess: () => {
      // 在onSubmit中处理成功回调
    },
    onError: (error) => {
      toast.error(`更新用户权限失败: ${error.message}`);
    },
  });

  // 检查当前用户是否在item的users列表中并且是启用状态
  const currentUserEnabled = useMemo(() => {
    if (!item) return true;
    const userOption = item.users.find(u => u.userId === userId);
    return userOption ? userOption.enable : false;
  }, [item, userId]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userIds: item ? item.users.map(u => u.userId) : [userId],
      nodeId: item?.nodeId ?? (nodes.length === 1 ? nodes[0]?.id ?? "" : ""),
      url: item?.url ?? "",
      currentUserEnable: currentUserEnabled,
    },
  });

  // 监控userIds以检查当前用户是否在列表中
  const watchedUserIds = form.watch("userIds");
  const currentUserEnableValue = form.watch("currentUserEnable");
  const isCurrentUserInList = watchedUserIds.includes(userId);
  
  // 当用户从列表中移除当前用户时，禁用currentUserEnable
  useEffect(() => {
    if (!isCurrentUserInList && currentUserEnableValue) {
      form.setValue("currentUserEnable", false);
    }
  }, [isCurrentUserInList, currentUserEnableValue, form]);

  const selectedNode = nodes.find((n) => n.id === form.watch("nodeId"));

  const replaceHostInUrl = () => {
    const currentUrl = form.getValues("url");
    if (!currentUrl) {
      toast("URL不能为空");
      return;
    }
    if (!selectedNode?.host) {
      toast("节点主机不能为空");
      return;
    }

    const match = currentUrl.match(/@([^:]+):/);
    if (!match) {
      toast("URL格式不正确，未找到可替换的主机");
      return;
    }

    const newUrl = currentUrl.replace(/@([^:]+):/, `@${selectedNode.host}:`);
    form.setValue("url", newUrl);
    toast("主机已替换");
  };

  async function onSubmit(values: FormData) {
    try {
      // 创建或更新节点客户端
      let nodeClientId: string;
      
      if (item) {
        // 更新现有客户端
        await updateNodeClientMutation.mutateAsync({
          id: item.id,
          data: {
            nodeId: values.nodeId,
            url: values.url
          }
        });
        nodeClientId = item.id;
      } else {
        // 创建新客户端
        const result = await createNodeClientMutation.mutateAsync({
          nodeId: values.nodeId,
          url: values.url
        });
        nodeClientId = result.id;
      }
      
      // 处理新增的用户（比较表单中的userIds和item中已有的用户）
      const existingUserIds = item ? item.users.map(u => u.userId) : [];
      const newUserIds = values.userIds.filter(id => !existingUserIds.includes(id));
      
      if (newUserIds.length > 0) {
        // 添加新用户（不替换已有用户）
        await setUserClientOptionsMutation.mutateAsync({
          nodeClientId: nodeClientId,
          userIds: newUserIds,
          defaultOptions: {
            enable: true
          },
          replace: false,
        });
      }
      
      // 处理已有用户的启用状态更新
      if (isCurrentUserInList) {
        // 更新当前用户的启用状态
        await updateUserClientOptionMutation.mutateAsync({
          nodeClientId: nodeClientId,
          userId: userId,
          data: {
            enable: values.currentUserEnable
          }
        });
      }
      
      // 处理需要删除的用户（从item中移除的用户）
      const removedUserIds = existingUserIds.filter(id => !values.userIds.includes(id));
      if (removedUserIds.length > 0) {
        // 删除不在列表中的用户（替换为表单中的最终列表）
        await setUserClientOptionsMutation.mutateAsync({
          nodeClientId: nodeClientId,
          userIds: values.userIds, // 只保留表单中选择的用户
          defaultOptions: {}, // 不改变默认选项
          replace: true,
        });
      }

      toast.success("保存成功");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error(`操作失败: ${(error as Error).message}`);
    }
  }
  
  const isPending = createNodeClientMutation.isPending || 
                  updateNodeClientMutation.isPending || 
                  setUserClientOptionsMutation.isPending ||
                  updateUserClientOptionMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="userIds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户</FormLabel>
              <MultiSelect
                value={field.value}
                onValueChange={field.onChange}
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                }))}
                placeholder="选择用户"
              />
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* 当前用户启用开关 */}
        <FormField
          control={form.control}
          name="currentUserEnable"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!isCurrentUserInList}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal">
                  启用当前用户
                </FormLabel>
              </div>
              {!isCurrentUserInList && (
                <p className="text-xs text-muted-foreground">当前用户不在用户列表中，需要先添加当前用户</p>
              )}
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
        <Button type="submit" disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </Button>
      </form>
    </Form>
  );
} 