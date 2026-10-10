"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PopupSheet } from "@/components/popup-sheet";
import { Button } from "@/components/ui/button";
import { NodeForm } from "./node-form";

export function CreateNodeDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加节点
      </Button>

      <PopupSheet open={open} onOpenChange={setOpen} title="添加节点" description="填写节点基本信息，保存后进入节点详情，继续添加客户端。">
        <NodeForm
          onSuccess={(savedNode) => {
            setOpen(false);
            router.push(`/nodes?node=${encodeURIComponent(savedNode.id)}`);
          }}
        />
      </PopupSheet>
    </>
  );
}
