"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";

import { PopupSheet } from "@/components/popup-sheet";
import { Button } from "@/components/ui/button";
import { SubconverterForm } from "./subconverter-form";

export function CreateSubconverterDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加转换器
      </Button>

      <PopupSheet open={open} onOpenChange={setOpen} title="添加订阅转换器" description="填写服务地址并验证连接，默认转换参数已为你填入。">
        <SubconverterForm onSuccess={() => setOpen(false)} />
      </PopupSheet>
    </>
  );
}
