import type { ReactNode } from "react";

interface PageHeadingProps {
  title: string;
  description?: string;
  count?: number;
  actions?: ReactNode;
}

export function PageHeading({ title, description, count, actions }: PageHeadingProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {count !== undefined && <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-medium tabular-nums text-muted-foreground">{count}</span>}
        </div>
        {description && <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
