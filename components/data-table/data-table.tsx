"use client";

import { type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, type SortingState, useReactTable, type VisibilityState } from "@tanstack/react-table";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData extends { id: string }> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  expandedContent?: (item: TData) => React.ReactNode;
  expandedTitle?: (item: TData) => string;
  enableColumnVisibility?: boolean;
  enableGlobalSearch?: boolean;
  getItemCount?: (item: TData) => number;
  defaultExpanded?: boolean;
  defaultSorting?: SortingState;
  className?: string;
}

export function DataTable<TData extends { id: string }>({
  columns,
  data,
  expandedContent,
  expandedTitle,
  defaultExpanded = false,
  enableColumnVisibility = false,
  enableGlobalSearch = false,
  defaultSorting = [],
  className,
  getItemCount,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSorting);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      return new Set(data.map((item) => item.id));
    }
    if (getItemCount) {
      return new Set(data.filter((item) => getItemCount(item) > 0).map((item) => item.id));
    }
    return new Set();
  });
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnVisibility,
      globalFilter,
    },
    enableHiding: enableColumnVisibility,
  });

  const toggleExpand = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const hasToolbar = enableGlobalSearch || enableColumnVisibility;

  return (
    <div className={cn("space-y-4", !hasToolbar && "space-y-0", className)}>
      {hasToolbar && (
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            {enableGlobalSearch && (
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input placeholder="搜索..." value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="h-8 w-[150px] lg:w-[250px]" />
              </div>
            )}
          </div>
          {enableColumnVisibility && <DataTableViewOptions table={table} />}
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {expandedContent && <TableHead className="w-[50px]" />}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => [
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(expandedContent && "cursor-pointer hover:bg-muted/50", expandedRows.has(row.original.id) && "bg-muted/50")}
                  onClick={() => expandedContent && toggleExpand(row.original.id)}
                >
                  {expandedContent && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(row.original.id);
                          }}
                        >
                          {expandedRows.has(row.original.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="sr-only">展开</span>
                        </Button>
                        {getItemCount && <span className="text-sm text-muted-foreground">{getItemCount(row.original)}</span>}
                      </div>
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      onClick={(e) => {
                        if (cell.column.id === "actions") {
                          e.stopPropagation();
                        }
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>,
                expandedContent && expandedRows.has(row.original.id) && (
                  <TableRow key={`${row.id}-expanded`}>
                    <TableCell colSpan={columns.length + 1} className="p-0">
                      {expandedTitle && (
                        <div className="pl-20 pr-2 py-2 font-medium text-lg mt-2">{typeof expandedTitle === "function" ? expandedTitle(row.original) : expandedTitle}</div>
                      )}
                      <div className={cn("pl-20 pr-2 pb-4", !expandedTitle && "pt-2")}>{expandedContent(row.original)}</div>
                    </TableCell>
                  </TableRow>
                ),
              ])
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length + (expandedContent ? 1 : 0)} className="h-24 text-center">
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
