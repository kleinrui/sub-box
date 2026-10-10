"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";

import { PopupSheet } from "@/components/popup-sheet";
import { Button } from "@/components/ui/button";
import { ClashConfigForm } from "./clash-config-form";

export function CreateClashConfigDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加配置
      </Button>

      <PopupSheet open={open} onOpenChange={setOpen} title="添加 Clash 配置" description="填写基本信息，再添加需要合并的全局配置和规则。">
        <ClashConfigForm onSuccess={() => setOpen(false)} />
      </PopupSheet>
    </>
  );
}
