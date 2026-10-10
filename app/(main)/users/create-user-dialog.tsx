"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Subconverter } from "@/types";
import { UserForm } from "./user-form";

interface CreateUserDialogProps {
  subconverters: Subconverter[];
}

export function CreateUserDialog({ subconverters }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加用户
      </Button>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>创建新用户</DialogTitle>
        </DialogHeader>
        <UserForm onSubmitSuccess={() => setOpen(false)} subconverters={subconverters} />
      </DialogContent>
    </Dialog>
  );
}
