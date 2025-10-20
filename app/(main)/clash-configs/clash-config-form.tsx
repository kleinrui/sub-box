"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { parse as parseYaml } from "yaml";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type ClashConfig } from "@/types";
import { api } from "@/utils/api";

const formSchema = z.object({
  key: z
    .string()
    .min(2, "key 长度必须在 2-50 之间")
    .max(50, "key 长度必须在 2-50 之间")
    .regex(/^[a-zA-Z0-9]+$/, "key 只能包含英文和数字"),
  name: z.string().min(1, "名称不能为空"),
  globalConfig: z
    .string()
    .nullable()
    .transform((val) => val?.trim() ?? null)
    .refine((val) => {
      if (!val) return true;
      try {
        parseYaml(val);
        return true;
      } catch {
        return false;
      }
    }, "全局配置必须是有效的 YAML 格式"),
  rules: z
    .string()
    .nullable()
    .transform((val) => val?.trim() ?? null)
    .refine((val) => {
      if (!val) return true;
      const lines = val?.split("\n").filter((line) => line.trim()) ?? [];
      return lines.every((line) => {
        const parts = line.split(",");
        return parts.length === 3 && parts.every((part) => part.trim().length > 0);
      });
    }, "规则格式错误，每行必须是 TYPE,VALUE,PROXY 格式"),
});

type FormData = z.infer<typeof formSchema>;

interface ClashConfigFormProps {
  config?: ClashConfig;
  onSuccess?: () => void;
}

export function ClashConfigForm({ config, onSuccess }: ClashConfigFormProps) {
  const router = useRouter();
  // 使用TRPC mutations
  const createClashConfigMutation = api.clashConfig.create.useMutation({
    onSuccess: () => {
      toast.success("创建成功");
      router.refresh();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateClashConfigMutation = api.clashConfig.update.useMutation({
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
      key: config?.key ?? "",
      name: config?.name ?? "",
      globalConfig: config?.globalConfig ?? "",
      rules: config?.rules ?? "",
    },
  });

  function onSubmit(data: FormData) {
        if (config) {
      updateClashConfigMutation.mutate({
        id: config.id,
        data: data,
      });
        } else {
      createClashConfigMutation.mutate(data);
        }
  }

  const isPending = createClashConfigMutation.isPending || updateClashConfigMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="key"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Key</FormLabel>
              <FormControl>
                <Input {...field} placeholder="仅支持英文和数字" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>名称</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="globalConfig"
          render={({ field: { value, ...field } }) => (
            <FormItem>
              <FormLabel>全局配置</FormLabel>
              <FormControl>
                <Textarea {...field} value={value ?? ""} placeholder="# YAML 格式" className="font-mono" rows={10} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rules"
          render={({ field: { value, ...field } }) => (
            <FormItem>
              <FormLabel>规则</FormLabel>
              <FormControl>
                <Textarea {...field} value={value ?? ""} placeholder="规则格式: TYPE,VALUE,PROXY" className="font-mono" rows={10} />
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
