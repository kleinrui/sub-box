"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { api } from "@/utils/api";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // 使用TRPC登录mutation
  const loginMutation = api.auth.login.useMutation({
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "用户名或密码错误");
    },
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      await loginMutation.mutateAsync({ username, password });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>请输入管理员用户名和密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="username">用户名</Label>
                <Input id="username" name="username" type="text" required disabled={isLoading || loginMutation.isPending} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">密码</Label>
                <Input id="password" name="password" type="password" required disabled={isLoading || loginMutation.isPending} />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading || loginMutation.isPending}>
                {isLoading || loginMutation.isPending ? "登录中..." : "登录"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
