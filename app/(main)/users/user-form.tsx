"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subconverter, User } from "@/types";
import { api } from "@/utils/api";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subscriptionKey: z.string().min(1, "Subscription Key is required"),
  subconverterId: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UserFormProps {
  user?: User;
  subconverters: Subconverter[];
  onSubmitSuccess?: () => void;
}

export function UserForm({ user, subconverters, onSubmitSuccess }: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 使用trpc mutations
  const createUser = api.user.create.useMutation({
    onSuccess: () => {
      toast.success("用户创建成功");
      router.refresh();
      onSubmitSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateUser = api.user.update.useMutation({
    onSuccess: () => {
      toast.success("用户更新成功");
      router.refresh();
      onSubmitSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: user?.name || "",
      subscriptionKey: user?.subscriptionKey || "",
      subconverterId: user?.subconverterId || null,
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (user) {
        // 更新用户
        await updateUser.mutateAsync({
          id: user.id,
          data: values,
        });
      } else {
        // 创建新用户
        await createUser.mutateAsync(values);
      }
    } catch (_error) {
      // 错误在mutation的onError中处理
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="输入用户名称" {...field} />
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
              <FormLabel>订阅密钥</FormLabel>
              <FormControl>
                <Input placeholder="输入唯一的订阅密钥" {...field} />
              </FormControl>
              <FormDescription>用户订阅链接中的唯一标识</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subconverterId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>使用的订阅转换器</FormLabel>
              <FormControl>
                <Select onValueChange={(value) => field.onChange(value === "null" ? null : value)} value={field.value || "null"}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择订阅转换器" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="null">使用默认转换器</SelectItem>
                    {subconverters.map((subconverter) => (
                      <SelectItem key={subconverter.id} value={subconverter.id}>
                        {subconverter.url}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>留空则使用默认转换器</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || createUser.isPending || updateUser.isPending}>
            {isSubmitting || createUser.isPending || updateUser.isPending ? "提交中..." : user ? "保存更改" : "创建用户"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
