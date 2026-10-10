"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Node, NodeClient } from "@/types";
import { api } from "@/utils/api";

const formSchema = z.object({
  nodeId: z.string().min(1, "请选择节点"),
  url: z.string().trim().min(1, "订阅地址不能为空"),
});

type FormData = z.infer<typeof formSchema>;

interface NodeClientFormProps {
  client?: NodeClient;
  nodes: Node[];
  onSuccess?: () => void;
  nodeId?: string;
  onPendingChange?: (pending: boolean) => void;
}

export function NodeClientForm({ client, nodes, onSuccess, nodeId, onPendingChange }: NodeClientFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const submitting = useRef(false);

  const createNodeClientMutation = api.nodeClient.create.useMutation();
  const updateNodeClientMutation = api.nodeClient.update.useMutation();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nodeId: client?.nodeId || nodeId || "",
      url: client?.url || "",
    },
  });

  async function onSubmit(data: FormData) {
    if (submitting.current) return;
    submitting.current = true;
    onPendingChange?.(true);
    try {
      const input = { ...data, nodeId: nodeId ?? data.nodeId };
      if (client) {
        await updateNodeClientMutation.mutateAsync({ id: client.id, data: input });
      } else {
        await createNodeClientMutation.mutateAsync(input);
      }
      await Promise.allSettled([utils.nodeClient.invalidate(), utils.node.getAllWithClients.invalidate()]);
      router.refresh();
      toast.success(client ? "客户端更新成功" : "客户端添加成功");
      onSuccess?.();
    } catch (error) {
      toast.error(`${client ? "更新" : "添加"}失败：${error instanceof Error ? error.message : "请重试"}`);
    } finally {
      submitting.current = false;
      onPendingChange?.(false);
    }
  }

  const isPending = form.formState.isSubmitting || createNodeClientMutation.isPending || updateNodeClientMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nodeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>节点</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === "__select_node__" ? "" : value)}
                value={field.value || "__select_node__"}
                disabled={Boolean(nodeId) || isPending}
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
              <FormLabel>订阅地址</FormLabel>
              <FormControl>
                <Input {...field} disabled={isPending} placeholder="填写客户端订阅地址" />
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
