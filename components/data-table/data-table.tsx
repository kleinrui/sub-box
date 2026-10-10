"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { clampDataTablePageIndex, DATA_TABLE_PAGE_SIZES, type DataTableState, readDataTableState, saveDataTableState } from "@/lib/data-table-state";
import { cn } from "@/lib/utils";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData extends { id: string }> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  expandedContent?: (item: TData) => ReactNode;
  expandedTitle?: (item: TData) => string;
  enableColumnVisibility?: boolean;
  enableGlobalSearch?: boolean;
  searchPlaceholder?: string;
  getSearchText?: (item: TData) => string;
  getItemCount?: (item: TData) => number;
  defaultExpanded?: boolean;
  defaultSorting?: SortingState;
  defaultColumnVisibility?: VisibilityState;
  storageKey?: string;
  toolbar?: ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  isLoading?: boolean;
  enablePagination?: boolean;
  paginationResetKey?: string | number;
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
  searchPlaceholder = "搜索...",
  getSearchText,
  defaultSorting = [],
  defaultColumnVisibility = {},
  storageKey,
  toolbar,
  emptyTitle = "暂无数据",
  emptyDescription,
  emptyAction,
  isLoading = false,
  enablePagination = false,
  paginationResetKey,
  className,
  getItemCount,
}: DataTableProps<TData>) {
  const [defaults] = useState<DataTableState>(() => ({
    sorting: defaultSorting,
    columnVisibility: defaultColumnVisibility,
    globalFilter: "",
    pagination: { pageIndex: 0, pageSize: 25 },
  }));
  const [tableState, setTableState] = useState(defaults);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | undefined | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(() => new Set(defaultExpanded ? data.map((item) => item.id) : []));
  const previousPaginationResetKey = useRef(paginationResetKey);

  const table = useReactTable({
    data,
    columns,
    getRowId: (item) => item.id,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    autoResetPageIndex: false,
    onSortingChange: (updater) => setTableState((previous) => ({ ...previous, sorting: typeof updater === "function" ? updater(previous.sorting) : updater })),
    onColumnVisibilityChange: (updater) =>
      setTableState((previous) => ({ ...previous, columnVisibility: typeof updater === "function" ? updater(previous.columnVisibility) : updater })),
    onGlobalFilterChange: (updater) =>
      setTableState((previous) => ({
        ...previous,
        globalFilter: typeof updater === "function" ? updater(previous.globalFilter) : updater,
        pagination: { ...previous.pagination, pageIndex: 0 },
      })),
    onPaginationChange: (updater) => setTableState((previous) => ({ ...previous, pagination: typeof updater === "function" ? updater(previous.pagination) : updater })),
    globalFilterFn: getSearchText ? (row, _columnId, value: string) => getSearchText(row.original).toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()) : "auto",
    getColumnCanGlobalFilter: getSearchText ? () => true : undefined,
    state: tableState,
    enableHiding: enableColumnVisibility,
  });

  // 首次客户端挂载后再读取，保持 SSR 与初次渲染一致；读取完成前不写入默认状态。
  useEffect(() => {
    let restored = defaults;
    if (storageKey) {
      try {
        restored = readDataTableState(
          window.sessionStorage,
          storageKey,
          defaults,
          table.getAllLeafColumns().map((column) => column.id)
        );
      } catch {
        // 部分浏览器环境不允许访问 sessionStorage。
      }
    }
    setTableState(restored);
    setLoadedStorageKey(storageKey);
  }, [defaults, storageKey, table]);

  useEffect(() => {
    if (!storageKey || loadedStorageKey !== storageKey) return;
    try {
      saveDataTableState(window.sessionStorage, storageKey, tableState);
    } catch {
      // 存储不可用时只使用当前页面状态。
    }
  }, [loadedStorageKey, storageKey, tableState]);

  useEffect(() => {
    if (previousPaginationResetKey.current === paginationResetKey) return;
    previousPaginationResetKey.current = paginationResetKey;
    setTableState((previous) => ({ ...previous, pagination: { ...previous.pagination, pageIndex: 0 } }));
  }, [paginationResetKey]);

  const resultCount = table.getFilteredRowModel().rows.length;
  const { pagination, globalFilter } = tableState;

  useEffect(() => {
    if (!enablePagination || isLoading || loadedStorageKey !== storageKey) return;
    setTableState((previous) => {
      const pageIndex = clampDataTablePageIndex(previous.pagination.pageIndex, resultCount, previous.pagination.pageSize);
      return pageIndex === previous.pagination.pageIndex ? previous : { ...previous, pagination: { ...previous.pagination, pageIndex } };
    });
  }, [enablePagination, isLoading, loadedStorageKey, resultCount, storageKey]);

  const toggleExpand = (id: string) => {
    setExpandedRows((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasToolbar = enableGlobalSearch || enableColumnVisibility || Boolean(toolbar);
  const visibleColumnCount = Math.max(1, table.getVisibleLeafColumns().length + (expandedContent ? 1 : 0));
  const searchHasNoResults = Boolean(globalFilter.trim()) && data.length > 0;
  const start = resultCount ? pagination.pageIndex * pagination.pageSize + 1 : 0;
  const end = Math.min((pagination.pageIndex + 1) * pagination.pageSize, resultCount);
  const pageCount = Math.max(1, table.getPageCount());

  return (
    <div className={cn("min-w-0 max-w-full space-y-4", !hasToolbar && !enablePagination && "space-y-0", className)} aria-busy={isLoading}>
      {hasToolbar && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {enableGlobalSearch && (
            <div className="relative min-w-0 basis-full sm:basis-auto sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={globalFilter}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
                className="h-8 w-full pl-8 pr-8"
              />
              {globalFilter && (
                <Button variant="ghost" size="icon" className="absolute right-0 top-0 h-8 w-8" onClick={() => table.setGlobalFilter("")} aria-label="清除搜索">
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          )}
          {toolbar}
          {enableColumnVisibility && (
            <div className="ml-auto">
              <DataTableViewOptions table={table} />
            </div>
          )}
        </div>
      )}
      <div className="min-w-0 max-w-full overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {expandedContent && (
                  <TableHead className="w-[50px]">
                    <span className="sr-only">客户端详情</span>
                  </TableHead>
                )}
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => [
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className={cn(expandedRows.has(row.original.id) && "bg-muted/50")}>
                  {expandedContent && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleExpand(row.original.id)}
                          aria-expanded={expandedRows.has(row.original.id)}
                          aria-label={expandedRows.has(row.original.id) ? "收起客户端详情" : "展开客户端详情"}
                        >
                          {expandedRows.has(row.original.id) ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                        </Button>
                        {getItemCount && <span className="text-sm text-muted-foreground">{getItemCount(row.original)}</span>}
                      </div>
                    </TableCell>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>,
                expandedContent && expandedRows.has(row.original.id) && (
                  <TableRow key={`${row.id}-expanded`}>
                    <TableCell colSpan={visibleColumnCount} className="p-0">
                      {expandedTitle && <div className="mt-2 px-4 py-2 text-lg font-medium sm:pl-20">{expandedTitle(row.original)}</div>}
                      <div className={cn("min-w-0 px-4 pb-4 sm:pl-20", !expandedTitle && "pt-2")}>{expandedContent(row.original)}</div>
                    </TableCell>
                  </TableRow>
                ),
              ])
            ) : (
              <TableRow>
                <TableCell colSpan={visibleColumnCount} className="h-40 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-2 py-4">
                    <p className="font-medium">{isLoading ? "正在加载..." : searchHasNoResults ? "没有找到匹配的结果" : emptyTitle}</p>
                    {!isLoading && (searchHasNoResults || emptyDescription) && (
                      <p className="text-sm text-muted-foreground">{searchHasNoResults ? "试试其他关键词，或清除搜索查看全部数据。" : emptyDescription}</p>
                    )}
                    {!isLoading &&
                      (searchHasNoResults ? (
                        <Button variant="outline" size="sm" onClick={() => table.setGlobalFilter("")}>
                          清除搜索
                        </Button>
                      ) : (
                        emptyAction
                      ))}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {enablePagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground" aria-live="polite">
            {resultCount ? `显示 ${start}–${end} 条，共 ${resultCount} 条` : "共 0 条"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={String(pagination.pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
              <SelectTrigger className="h-8 w-[110px]" aria-label="每页条数">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TABLE_PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    每页 {size} 条
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="whitespace-nowrap">
              第 {Math.min(pagination.pageIndex + 1, pageCount)} / {pageCount} 页
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={isLoading || !table.getCanPreviousPage()} onClick={() => table.previousPage()} aria-label="上一页">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={isLoading || !table.getCanNextPage()} onClick={() => table.nextPage()} aria-label="下一页">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
