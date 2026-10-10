"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface FormActionsProps {
  isPending: boolean;
  onCancel?: () => void;
  submitLabel?: string;
  pendingLabel?: string;
  submitDisabled?: boolean;
  children?: ReactNode;
}

export function FormActions({ isPending, onCancel, submitLabel = "保存", pendingLabel = "保存中...", submitDisabled, children }: FormActionsProps) {
  return (
    <div className="sticky bottom-0 z-10 mt-auto flex shrink-0 justify-end gap-2 border-t bg-background py-3">
      {children && <div className="mr-auto flex items-center gap-2">{children}</div>}
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending} className="flex-1 sm:flex-none">
          取消
        </Button>
      )}
      <Button type="submit" disabled={isPending || submitDisabled} className="flex-1 sm:flex-none">
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </div>
  );
}
