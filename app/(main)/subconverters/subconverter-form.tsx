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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { defaultSubconverterOptions, subconverterFormSchema } from "@/lib/subscription-config-form";
import type { Subconverter } from "@/types";
import { api } from "@/utils/api";
import { SubconverterVerificationResult, useSubconverterVerification } from "./subconverter-verification";

type FormData = z.infer<typeof subconverterFormSchema>;

interface SubconverterFormProps {
  subconverter?: Subconverter;
  onSuccess?: () => void;
}

export function SubconverterForm({ subconverter, onSuccess }: SubconverterFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const savingRef = useRef(false);
  const createSubconverterMutation = api.subconverter.create.useMutation();
  const updateSubconverterMutation = api.subconverter.update.useMutation();

  const form = useForm<FormData>({
    resolver: zodResolver(subconverterFormSchema),
    defaultValues: {
      url: subconverter?.url ?? "",
      options: subconverter?.options ?? defaultSubconverterOptions,
      isDefault: subconverter?.isDefault ?? false,
    },
  });
  const url = form.watch("url");
  const verification = useSubconverterVerification(url);
  const isSaving = form.formState.isSubmitting || createSubconverterMutation.isPending || updateSubconverterMutation.isPending;
  const isPending = isSaving || verification.isPending;
  const requestClose = usePopupSheetFormState({ isDirty: form.formState.isDirty, isPending });

  async function onSubmit(formData: FormData) {
    if (savingRef.current || verification.isPending) return;
    savingRef.current = true;
    form.clearErrors("root");
    try {
      const saved = subconverter ? await updateSubconverterMutation.mutateAsync({ id: subconverter.id, data: formData }) : await createSubconverterMutation.mutateAsync(formData);
      await Promise.allSettled([utils.subconverter.invalidate(), utils.user.invalidate(), utils.subscription.invalidate()]);
      router.refresh();
      toast.success(subconverter ? "订阅转换器更新成功" : "订阅转换器创建成功");
      form.reset({ url: saved.url, options: saved.options, isDefault: saved.isDefault });
      onSuccess?.();
    } catch {
      const message = "保存失败，已保留填写内容，请稍后重试。";
      form.setError("root", { message });
      toast.error(message);
    } finally {
      savingRef.current = false;
    }
  }

  async function verifyUrl() {
    if (savingRef.current || verification.isPending) return;
    const requestedUrl = form.getValues("url");
    if (!(await form.trigger("url")) || form.getValues("url") !== requestedUrl || savingRef.current) return;
    await verification.verify();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-full flex-col gap-6">
        <div className="space-y-6">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>转换器地址（必填）</FormLabel>
                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <FormControl>
                    <Input {...field} placeholder="https://subconverter.example.com" aria-required="true" disabled={isSaving} />
                  </FormControl>
                  <Button type="button" variant="outline" onClick={verifyUrl} disabled={isPending}>
                    {verification.isPending ? "验证中..." : "验证连接"}
                  </Button>
                </div>
                <FormDescription>填写转换服务的基础地址，末尾不带斜杠。验证检查连接与版本，不校验转换参数或完整订阅。</FormDescription>
                <FormMessage />
                <SubconverterVerificationResult result={verification.result} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="options"
            render={({ field }) => (
              <FormItem>
                <FormLabel>转换参数（可选）</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="insert=false&config=https%3A%2F%2Fexample.com%2Fconfig.ini&emoji=true" className="font-mono" rows={5} disabled={isSaving} />
                </FormControl>
                <FormDescription>使用 key=value&key=value 格式，不带开头的 ?。内容按原样保存并附加到订阅请求，已有编码和自定义参数会保留；留空则不附加参数。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSaving} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>设为默认</FormLabel>
                  <FormDescription>未指定转换器的用户在生成订阅时使用默认项，也会影响现有用户。此设置不会取消其他默认项；请确保只保留一个默认转换器。</FormDescription>
                </div>
              </FormItem>
            )}
          />
          {form.formState.errors.root?.message && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          )}
        </div>
        <FormActions isPending={isPending} onCancel={requestClose} pendingLabel={isSaving ? "保存中..." : "验证中..."} />
      </form>
    </Form>
  );
}
