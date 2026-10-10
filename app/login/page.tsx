import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { api } from "@/server/api/trpc-server";

export default async function Page() {
  const user = await api.auth.getUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="w-full max-w-sm">
      <LoginForm />
    </div>
  );
}
