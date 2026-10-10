"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

const loginSchema = z.object({ username: z.string().min(1, "请输入用户名"), password: z.string().min(1, "请输入密码") });

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const submitting = useRef(false);
  const form = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { username: "", password: "" } });
  const loginMutation = api.auth.login.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (error) => {
      const message =
        error.data?.code === "UNAUTHORIZED"
          ? "用户名或密码不正确，请重新输入。"
          : error.message.includes("temporarily blocked")
            ? "尝试次数过多，请稍后再试。"
            : "登录失败，请检查连接后重试。";
      form.setError("root", { message });
    },
  });
  const isPending = form.formState.isSubmitting || loginMutation.isPending;
  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (submitting.current) return;
    submitting.current = true;
    form.clearErrors("root");
    try {
      await loginMutation.mutateAsync(values);
    } catch {
      /* 保留表单输入和可见错误，以便重试。 */
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <div className="flex items-center justify-center gap-2 text-lg font-semibold">
        <Box className="h-6 w-6 text-primary" aria-hidden="true" />
        Sub Box
      </div>
      <Card>
        <CardHeader className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">管理员登录</h1>
          <CardDescription>登录后管理节点、用户和订阅。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>用户名</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="username" autoCapitalize="none" spellCheck={false} aria-required="true" disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>密码</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input {...field} type={showPassword ? "text" : "password"} autoComplete="current-password" aria-required="true" disabled={isPending} className="pr-11" />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        disabled={isPending}
                        aria-label={showPassword ? "隐藏密码" : "显示密码"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root?.message && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "登录中..." : "登录"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
