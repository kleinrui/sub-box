"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
  url: z.string().min(1, "订阅地址不能为空"),
});

type FormData = z.infer<typeof formSchema>;

interface NodeClientFormProps {
  client?: NodeClient;
  nodes: Node[];
  onSuccess?: () => void;
  nodeId?: string;
}

export function NodeClientForm({ client, nodes, onSuccess, nodeId }: NodeClientFormProps) {
  const router = useRouter();

  // 使用TRPC mutations
  const createNodeClientMutation = api.nodeClient.create.useMutation({
    onSuccess: () => {
      toast.success("创建成功");
      router.refresh();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateNodeClientMutation = api.nodeClient.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      router.refresh();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nodeId: client?.nodeId || nodeId || "",
      url: client?.url || "",
    },
  });

  function onSubmit(data: FormData) {
    if (client) {
      updateNodeClientMutation.mutate({
        id: client.id,
        data: data,
      });
    } else {
      createNodeClientMutation.mutate(data);
    }
  }

  const isPending = createNodeClientMutation.isPending || updateNodeClientMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <FormLabel>订阅地址</FormLabel>
              <FormControl>
                <Input {...field} />
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
