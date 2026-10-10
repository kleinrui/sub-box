"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PopupSheet } from "@/components/popup-sheet";
import { Button } from "@/components/ui/button";
import type { Subconverter } from "@/types";
import { UserForm } from "./user-form";

interface CreateUserDialogProps {
  subconverters: Subconverter[];
}

export function CreateUserDialog({ subconverters }: CreateUserDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加用户
      </Button>
      <PopupSheet open={open} onOpenChange={setOpen} title="添加用户" description="填写基本信息，保存后进入用户详情，继续配置客户端。">
        <UserForm
          onSubmitSuccess={(savedUser) => {
            setOpen(false);
            router.push(`/users?user=${encodeURIComponent(savedUser.id)}`);
          }}
          subconverters={subconverters}
        />
      </PopupSheet>
    </>
  );
}
