import type { PaginationState, SortingState, VisibilityState } from "@tanstack/react-table";

export interface DataTableState {
  sorting: SortingState;
  columnVisibility: VisibilityState;
  globalFilter: string;
  pagination: PaginationState;
}

export const DATA_TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function restoreDataTableState(serialized: string | null, defaults: DataTableState, columnIds: readonly string[]): DataTableState {
  if (!serialized) return defaults;

  try {
    const stored: unknown = JSON.parse(serialized);
    if (!isRecord(stored) || stored.version !== 1) return defaults;

    const validColumnIds = new Set(columnIds);
    const sorting = Array.isArray(stored.sorting)
      ? stored.sorting.flatMap((item) =>
          isRecord(item) && typeof item.id === "string" && validColumnIds.has(item.id) && typeof item.desc === "boolean" ? [{ id: item.id, desc: item.desc }] : []
        )
      : defaults.sorting;
    const columnVisibility = { ...defaults.columnVisibility };
    if (isRecord(stored.columnVisibility)) {
      for (const [id, visible] of Object.entries(stored.columnVisibility)) {
        if (validColumnIds.has(id) && typeof visible === "boolean") columnVisibility[id] = visible;
      }
    }

    const storedPagination = isRecord(stored.pagination) ? stored.pagination : {};
    const pageIndex =
      typeof storedPagination.pageIndex === "number" && Number.isSafeInteger(storedPagination.pageIndex) && storedPagination.pageIndex >= 0
        ? storedPagination.pageIndex
        : defaults.pagination.pageIndex;
    const pageSize =
      typeof storedPagination.pageSize === "number" && DATA_TABLE_PAGE_SIZES.some((size) => size === storedPagination.pageSize)
        ? storedPagination.pageSize
        : defaults.pagination.pageSize;

    return {
      sorting,
      columnVisibility,
      globalFilter: typeof stored.globalFilter === "string" && stored.globalFilter.length <= 1000 ? stored.globalFilter : defaults.globalFilter,
      pagination: { pageIndex, pageSize },
    };
  } catch {
    return defaults;
  }
}

export function readDataTableState(storage: Pick<Storage, "getItem"> | undefined, key: string, defaults: DataTableState, columnIds: readonly string[]): DataTableState {
  try {
    return restoreDataTableState(storage?.getItem(key) ?? null, defaults, columnIds);
  } catch {
    return defaults;
  }
}

export function saveDataTableState(storage: Pick<Storage, "setItem"> | undefined, key: string, state: DataTableState): void {
  try {
    // 只保存界面状态，不保存列表记录、订阅链接、客户端 URL 或密钥。
    storage?.setItem(
      key,
      JSON.stringify({
        version: 1,
        sorting: state.sorting,
        columnVisibility: state.columnVisibility,
        globalFilter: state.globalFilter,
        pagination: state.pagination,
      })
    );
  } catch {
    // 浏览器禁用存储或达到容量限制时，列表仍可正常使用。
  }
}

export function clampDataTablePageIndex(pageIndex: number, rowCount: number, pageSize: number): number {
  return Math.min(pageIndex, Math.max(0, Math.ceil(rowCount / pageSize) - 1));
}
