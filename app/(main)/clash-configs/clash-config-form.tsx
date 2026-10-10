"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useId, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type * as z from "zod";

import { FormActions } from "@/components/form-actions";
import { usePopupSheetFormState } from "@/components/popup-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { clashConfigFormSchema } from "@/lib/subscription-config-form";
import type { ClashConfig } from "@/types";
import { api } from "@/utils/api";

type FormData = z.infer<typeof clashConfigFormSchema>;

interface ClashConfigFormProps {
  config?: ClashConfig;
  onSuccess?: () => void;
}

export function ClashConfigForm({ config, onSuccess }: ClashConfigFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const sectionId = useId();
  const savingRef = useRef(false);
  const createClashConfigMutation = api.clashConfig.create.useMutation();
  const updateClashConfigMutation = api.clashConfig.update.useMutation();

  const form = useForm<FormData>({
    resolver: zodResolver(clashConfigFormSchema),
    defaultValues: {
      key: config?.key ?? "",
      name: config?.name ?? "",
      globalConfig: config?.globalConfig ?? "",
      rules: config?.rules ?? "",
    },
  });
  const isPending = form.formState.isSubmitting || createClashConfigMutation.isPending || updateClashConfigMutation.isPending;
  const requestClose = usePopupSheetFormState({ isDirty: form.formState.isDirty, isPending });

  async function onSubmit(data: FormData) {
    if (savingRef.current) return;
    savingRef.current = true;
    form.clearErrors("root");
    try {
      const saved = config ? await updateClashConfigMutation.mutateAsync({ id: config.id, data }) : await createClashConfigMutation.mutateAsync(data);
      await Promise.allSettled([utils.clashConfig.invalidate(), utils.subscription.invalidate()]);
      router.refresh();
      toast.success(config ? "Clash 配置更新成功" : "Clash 配置创建成功");
      form.reset({ key: saved.key, name: saved.name, globalConfig: saved.globalConfig ?? "", rules: saved.rules ?? "" });
      onSuccess?.();
    } catch {
      const message = "保存失败，请确认 Key 未重复，或稍后重试。";
      form.setError("root", { message });
      toast.error(message);
    } finally {
      savingRef.current = false;
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-col gap-6">
        <div className="space-y-8">
          <section aria-labelledby={`${sectionId}-basic`} className="space-y-4">
            <h2 id={`${sectionId}-basic`} className="text-base font-semibold">
              基本信息
            </h2>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>配置名称（必填）</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="例如：日常使用" aria-required="true" disabled={isPending} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Key（必填）</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="例如：daily01" aria-required="true" disabled={isPending} />
                  </FormControl>
                  <FormDescription>2–50 个英文字母或数字，用于区分配置，须保持唯一。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
          <section aria-labelledby={`${sectionId}-global`} className="space-y-4 border-t pt-6">
            <div className="space-y-1">
              <h2 id={`${sectionId}-global`} className="text-base font-semibold">
                全局配置
              </h2>
              <p className="text-sm text-muted-foreground">合并时替换订阅中的同名配置项，其余配置项保留。</p>
            </div>
            <FormField
              control={form.control}
              name="globalConfig"
              render={({ field: { value, ...field } }) => (
                <FormItem>
                  <FormLabel>YAML 配置（可选）</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={value ?? ""} placeholder={"# YAML 格式\nmode: rule\nlog-level: info"} className="font-mono" rows={8} disabled={isPending} />
                  </FormControl>
                  <FormDescription>留空则保留原订阅的全局配置。格式错误会提示所在行、列。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
          <section aria-labelledby={`${sectionId}-rules`} className="space-y-4 border-t pt-6">
            <div className="space-y-1">
              <h2 id={`${sectionId}-rules`} className="text-base font-semibold">
                规则
              </h2>
              <p className="text-sm text-muted-foreground">规则会添加到原订阅规则之前，按填写顺序匹配。</p>
            </div>
            <FormField
              control={form.control}
              name="rules"
              render={({ field: { value, ...field } }) => (
                <FormItem>
                  <FormLabel>规则列表（可选）</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={value ?? ""}
                      placeholder={"# YAML list\n- DOMAIN-SUFFIX,example.com,PROXY\n- GEOIP,CN,DIRECT"}
                      className="font-mono"
                      rows={8}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormDescription>每条规则以 - 开头，使用 YAML list；留空则不添加规则。</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </section>
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
