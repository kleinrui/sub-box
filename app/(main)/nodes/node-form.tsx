"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type * as z from "zod";

import { FormActions } from "@/components/form-actions";
import { usePopupSheetFormState } from "@/components/popup-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { nodeFormSchema } from "@/lib/resource-form";
import type { Node } from "@/types";
import { api } from "@/utils/api";

type FormData = z.infer<typeof nodeFormSchema>;

interface NodeFormProps {
  node?: Node;
  onSuccess?: (savedNode: Node) => void;
  onSubmitSuccess?: (savedNode: Node) => void;
}

export function NodeForm({ node, onSuccess, onSubmitSuccess }: NodeFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const savingRef = useRef(false);
  const createNodeMutation = api.node.create.useMutation();
  const updateNodeMutation = api.node.update.useMutation();

  const form = useForm<FormData>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: {
      name: node?.name ?? "",
      type: node?.type ?? "custom",
      host: node?.host ?? "",
      accessUrl: node?.accessUrl ?? "",
    },
  });
  const isPending = form.formState.isSubmitting || createNodeMutation.isPending || updateNodeMutation.isPending;
  const requestClose = usePopupSheetFormState({ isDirty: form.formState.isDirty, isPending });
  const type = form.watch("type");
  const accessUrlDescription =
    type === "3x-ui"
      ? "记录 3X-UI 面板地址，包含端口及面板路径（如有）。"
      : type === "external-subscription"
        ? "记录服务商提供的订阅来源地址；客户端链接可在节点详情中添加。"
        : "记录管理页面或相关链接，需以 http:// 或 https:// 开头。";
  const accessUrlPlaceholder =
    type === "3x-ui" ? "https://panel.example.com:2053/panel" : type === "external-subscription" ? "https://example.com/subscription" : "https://example.com/manage";

  async function onSubmit(data: FormData) {
    if (savingRef.current) return;
    savingRef.current = true;
    form.clearErrors("root");
    const submitData = {
      ...data,
      host: data.host || null,
      accessUrl: data.accessUrl || null,
    };

    try {
      const savedNode = node ? await updateNodeMutation.mutateAsync({ id: node.id, data: submitData }) : await createNodeMutation.mutateAsync(submitData);
      await Promise.allSettled([utils.node.invalidate(), utils.nodeClient.invalidate()]);
      router.refresh();
      toast.success(node ? "节点更新成功" : "节点创建成功");
      form.reset({ name: savedNode.name, type: savedNode.type, host: savedNode.host ?? "", accessUrl: savedNode.accessUrl ?? "" });
      onSuccess?.(savedNode);
      onSubmitSuccess?.(savedNode);
    } catch {
      const message = "保存失败，请检查填写内容或稍后重试。";
      form.setError("root", { message });
      toast.error(message);
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-col gap-6">
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>节点名称（必填）</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="例如：香港节点" aria-required="true" disabled={isPending} />
                </FormControl>
                <FormDescription>使用容易辨认的名称，方便查找和添加客户端。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>节点类型（必填）</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger aria-required="true">
                      <SelectValue placeholder="选择类型" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="3x-ui">3X-UI</SelectItem>
                    <SelectItem value="external-subscription">外部订阅</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>按节点来源选择类型；手动维护客户端链接时可选择“自定义”。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>主机（可选）</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={type === "3x-ui" ? "panel.example.com 或 203.0.113.10" : "example.com 或 203.0.113.10"} disabled={isPending} />
                </FormControl>
                <FormDescription>
                  {type === "3x-ui"
                    ? "填写节点的域名或 IP，不包含协议和端口；添加客户端时可用于覆盖链接中的主机。"
                    : "填写域名或 IP，不包含协议和端口；需要替换客户端链接中的主机时可使用此值。"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accessUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{type === "3x-ui" ? "面板地址" : type === "external-subscription" ? "订阅来源地址" : "访问 URL"}（可选）</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={accessUrlPlaceholder} disabled={isPending} />
                </FormControl>
                <FormDescription>{accessUrlDescription}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root?.message && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
        </div>
        <FormActions isPending={isPending} onCancel={requestClose} />
      </form>
    </Form>
  );
}
