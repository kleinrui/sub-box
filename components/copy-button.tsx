"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

interface CopyButtonProps {
  value: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}

export function CopyButton({ value, label = "复制订阅", disabled, className, variant = "outline", size = "sm" }: CopyButtonProps) {
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const copied = copiedValue === value;

  useEffect(() => {
    if (copiedValue === null) return;
    const timer = setTimeout(() => setCopiedValue(null), 2000);
    return () => clearTimeout(timer);
  }, [copiedValue]);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || !value}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopiedValue(value);
          toast.success("已复制到剪贴板");
        } catch {
          toast.error("复制失败，请展开内容后手动复制");
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      <span aria-live="polite">{copied ? "已复制" : label}</span>
    </Button>
  );
}
