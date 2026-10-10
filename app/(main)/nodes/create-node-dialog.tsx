"use client";

import { PlusCircle } from "lucide-react";
import { useState } from "react";

import { PopupSheet } from "@/components/popup-sheet";
import { Button } from "@/components/ui/button";
import { NodeForm } from "./node-form";

export function CreateNodeDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <PlusCircle className="mr-2 h-4 w-4" />
        添加节点
      </Button>

      <PopupSheet open={open} onOpenChange={setOpen} title="添加节点">
        <NodeForm onSuccess={() => setOpen(false)} />
      </PopupSheet>
    </>
  );
}
