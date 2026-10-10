"use client";

import { type ReactNode, useId } from "react";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface PopupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function PopupSheet({ open, onOpenChange, title, description, children }: PopupSheetProps) {
  const descriptionId = useId();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex h-[100dvh] !w-full !max-w-[100vw] flex-col gap-0 overflow-hidden p-4 sm:!w-[720px] sm:p-6"
        aria-describedby={description ? descriptionId : undefined}
      >
        <SheetHeader className="shrink-0 pr-6">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription id={descriptionId}>{description}</SheetDescription>}
        </SheetHeader>
        <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
