"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { type Subconverter } from "@/types";
import { api } from "@/utils/api";

// 确保与后端API schema定义一致
const formSchema = z.object({
  url: z
    .string()
    .url("请输入有效的URL")
    .refine((url) => !url.endsWith("/"), "URL 末尾不能有斜杠"),
  options: z
    .string()
    .refine((str) => {
      try {
        new URLSearchParams(str);
        return true;
      } catch {
        return false;
      }
    }, "请输入有效的 URL 参数格式"),
  isDefault: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface SubconverterFormProps {
  subconverter?: Subconverter;
  onSuccess?: () => void;
}

export function SubconverterForm({ subconverter, onSuccess }: SubconverterFormProps) {
  const router = useRouter();
  // 使用TRPC mutations
  const createSubconverterMutation = api.subconverter.create.useMutation({
    onSuccess: () => {
      toast.success("创建成功");
      router.refresh();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });

  const updateSubconverterMutation = api.subconverter.update.useMutation({
    onSuccess: () => {
      toast.success("更新成功");
      router.refresh();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const verifyUrlMutation = api.subconverter.verifyUrl.useMutation({
    onSuccess: (data) => {
      toast.success(`验证成功: ${data}`);
    },
    onError: (error) => {
      toast.error(`验证失败: ${error.message}`);
    },
  });

  const defaultOptions = "insert=false&config=https%3A%2F%2Fraw.githubusercontent.com%2FACL4SSR%2FACL4SSR%2Fmaster%2FClash%2Fconfig%2FACL4SSR_Online_Full_NoAuto.ini&emoji=true&list=false&xudp=false&udp=false&tfo=false&expand=true&scv=false&fdn=false&new_name=true";

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: subconverter?.url ?? "",
      options: subconverter?.options ?? defaultOptions,
      isDefault: subconverter?.isDefault ?? false,
    },
  });

  function onSubmit(formData: FormData) {
        if (subconverter) {
      updateSubconverterMutation.mutate({
        id: subconverter.id,
        data: formData,
      });
        } else {
      createSubconverterMutation.mutate(formData);
        }
  }

  async function verifyUrl() {
    // 先验证表单
    const result = await form.trigger("url");
    if (!result) {
      return;
    }

    const url = form.getValues("url");
    verifyUrlMutation.mutate(url);
  }

  const isPending = createSubconverterMutation.isPending || 
                  updateSubconverterMutation.isPending || 
                  verifyUrlMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input {...field} placeholder="https://example.com" />
                </FormControl>
                <Button type="button" variant="outline" onClick={verifyUrl} disabled={isPending}>
                  {verifyUrlMutation.isPending ? "验证中..." : "验证"}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="options"
          render={({ field }) => (
            <FormItem>
              <FormLabel>选项</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="insert=false&config=https%3A%2F%2Fexample.com%2Fconfig.ini&emoji=true" className="font-mono" rows={5} />
              </FormControl>
              <FormDescription>请输入 URL 参数格式的选项，例如：key1=value1&key2=value2</FormDescription>
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
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>设为默认</FormLabel>
                <FormDescription>设为默认后，新用户将自动使用此转换器</FormDescription>
              </div>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isPending}>
          {createSubconverterMutation.isPending || updateSubconverterMutation.isPending ? "保存中..." : "保存"}
        </Button>
      </form>
    </Form>
  );
}
