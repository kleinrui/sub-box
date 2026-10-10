"use client";

import { useId, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";

interface CollapseDisplayProps {
  url: string;
  maxLength?: number;
}

export function CollapseDisplay({ url, maxLength = 50 }: CollapseDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const truncated = url.length > maxLength;

  return (
    <div className="min-w-0 max-w-full space-y-2">
      <div className="flex min-w-0 items-center gap-1">
        <span className={`min-w-0 flex-1 font-mono text-xs select-all ${truncated ? "truncate" : "break-all"}`}>{truncated ? `${url.slice(0, maxLength)}…` : url}</span>
        {truncated && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 px-2"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? "收起" : "展开"}
          </Button>
        )}
        <CopyButton value={url} label="复制" variant="ghost" className="shrink-0 px-2" />
      </div>
      {expanded && (
        <p id={contentId} className="max-w-full break-all rounded-md bg-muted p-3 text-xs font-mono select-all">
          {url}
        </p>
      )}
    </div>
  );
}

export type { CollapseDisplayProps };
