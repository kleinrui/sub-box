"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type * as z from "zod";

import { FormActions } from "@/components/form-actions";
import { usePopupSheetFormState } from "@/components/popup-sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateSubscriptionKey, userFormSchema } from "@/lib/resource-form";
import type { Subconverter, User } from "@/types";
import { api } from "@/utils/api";

type FormValues = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User;
  subconverters: Subconverter[];
  onSubmitSuccess?: (savedUser: User) => void;
}

export function UserForm({ user, subconverters, onSubmitSuccess }: UserFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const savingRef = useRef(false);
  const initializedKeyRef = useRef(false);
  const createUser = api.user.create.useMutation();
  const updateUser = api.user.update.useMutation();

  const form = useForm<FormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: user?.name || "",
      subscriptionKey: user?.subscriptionKey || "",
      subconverterId: user?.subconverterId || null,
    },
  });
  const isPending = form.formState.isSubmitting || createUser.isPending || updateUser.isPending;
  const requestClose = usePopupSheetFormState({ isDirty: form.formState.isDirty, isPending });
  const subscriptionKey = form.watch("subscriptionKey");

  useEffect(() => {
    if (user || initializedKeyRef.current) return;
    initializedKeyRef.current = true;
    // 客户端挂载后生成，并设为初始值，不触发未保存修改确认。
    form.resetField("subscriptionKey", { defaultValue: generateSubscriptionKey() });
  }, [form, user]);

  async function onSubmit(values: FormValues) {
    if (savingRef.current) return;
    savingRef.current = true;
    form.clearErrors("root");
    try {
      const savedUser = user ? await updateUser.mutateAsync({ id: user.id, data: values }) : await createUser.mutateAsync(values);
      await Promise.allSettled([utils.user.invalidate(), utils.nodeClient.invalidate()]);
      router.refresh();
      toast.success(user ? "用户更新成功" : "用户创建成功");
      form.reset({ name: savedUser.name, subscriptionKey: savedUser.subscriptionKey, subconverterId: savedUser.subconverterId });
      onSubmitSuccess?.(savedUser);
    } catch {
      const message = "保存失败，请检查订阅密钥是否已被其他用户使用，或稍后重试。";
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
                <FormLabel>用户名（必填）</FormLabel>
                <FormControl>
                  <Input placeholder="例如：我的手机" {...field} aria-required="true" disabled={isPending} />
                </FormControl>
                <FormDescription>此名称仅用于标识用户，不是登录用户名</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="subscriptionKey"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-2">
                  <FormLabel>订阅密钥（必填）</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => form.setValue("subscriptionKey", generateSubscriptionKey(), { shouldDirty: true, shouldValidate: true })}
                  >
                    重新生成
                  </Button>
                </div>
                <FormControl>
                  <Input placeholder="自动生成后可手动编辑" {...field} aria-required="true" disabled={isPending} className="font-mono" />
                </FormControl>
                <FormDescription>订阅链接中的唯一标识，请妥善保管。可使用自动生成的随机值，也可手动填写唯一密钥。</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {user && subscriptionKey !== user.subscriptionKey && (
            <Alert variant="destructive">
              <AlertDescription>保存新的订阅密钥后，旧订阅链接将立即失效，请为使用该用户的客户端更新订阅链接。</AlertDescription>
            </Alert>
          )}
          <FormField
            control={form.control}
            name="subconverterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>订阅转换器（可选）</FormLabel>
                <Select onValueChange={(value) => field.onChange(value === "null" ? null : value)} value={field.value || "null"} disabled={isPending}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择订阅转换器" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="null">使用默认转换器</SelectItem>
                    {subconverters.map((subconverter) => (
                      <SelectItem key={subconverter.id} value={subconverter.id}>
                        {subconverter.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>选择“使用默认转换器”即可，无需指定独立的转换器。</FormDescription>
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
