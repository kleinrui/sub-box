import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CollapseDisplayProps {
  url: string;
  maxLength?: number;
}

export function CollapseDisplay({ url, maxLength = 50 }: CollapseDisplayProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const displayUrl = url.length > maxLength ? `${url.slice(0, maxLength)}...` : url;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("已复制到剪贴板");
    } catch (error) {
      toast("复制失败", {
        description: (error as Error).message,
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip open={url.length > maxLength ? showTooltip : false}>
          <TooltipTrigger className="truncate text-left" onMouseEnter={() => setShowTooltip(true)} onMouseLeave={() => setShowTooltip(false)}>
            {displayUrl}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-[400px] break-all">{url}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={copyToClipboard}>
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        <span className="sr-only">复制</span>
      </Button>
    </div>
  );
}

export type { CollapseDisplayProps };
