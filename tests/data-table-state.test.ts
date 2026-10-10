import assert from "node:assert/strict";
import { test } from "node:test";
import { clampDataTablePageIndex, type DataTableState, readDataTableState, restoreDataTableState, saveDataTableState } from "../lib/data-table-state";

const defaults: DataTableState = {
  sorting: [{ id: "name", desc: false }],
  columnVisibility: { id: false, name: true },
  globalFilter: "",
  pagination: { pageIndex: 0, pageSize: 25 },
};
const columnIds = ["id", "name", "createdAt"];

test("会话状态恢复搜索、排序、列与页码，并保留新增列默认值", () => {
  const restored = restoreDataTableState(
    JSON.stringify({
      version: 1,
      sorting: [{ id: "createdAt", desc: true }],
      columnVisibility: { name: false },
      globalFilter: "香港",
      pagination: { pageIndex: 3, pageSize: 50 },
    }),
    defaults,
    columnIds
  );
  assert.deepEqual(restored, {
    sorting: [{ id: "createdAt", desc: true }],
    columnVisibility: { id: false, name: false },
    globalFilter: "香港",
    pagination: { pageIndex: 3, pageSize: 50 },
  });
});

test("无效 JSON、旧版本与无法使用的字段不会破坏列表", () => {
  for (const value of [null, "", "{broken", "null", "[]", JSON.stringify({ version: 0 }), JSON.stringify({ version: 2 })]) {
    assert.deepEqual(restoreDataTableState(value, defaults, columnIds), defaults);
  }
  const invalid = restoreDataTableState(
    JSON.stringify({
      version: 1,
      sorting: [{ id: "removed", desc: false }, { id: "name", desc: "false" }, null],
      columnVisibility: { removed: true, name: "false", id: true },
      globalFilter: { secret: "private" },
      pagination: { pageIndex: -1, pageSize: 100000 },
    }),
    defaults,
    columnIds
  );
  assert.deepEqual(invalid, { ...defaults, sorting: [], columnVisibility: { ...defaults.columnVisibility, id: true } });

  for (const pageIndex of [1.5, Number.MAX_SAFE_INTEGER + 1, "2"]) {
    assert.equal(restoreDataTableState(JSON.stringify({ version: 1, pagination: { pageIndex } }), defaults, columnIds).pagination.pageIndex, 0);
  }
});

test("存储不可用时安全回退，保存只包含界面状态", () => {
  assert.deepEqual(readDataTableState(undefined, "table", defaults, columnIds), defaults);
  assert.deepEqual(
    readDataTableState(
      {
        getItem: () => {
          throw new Error("disabled");
        },
      },
      "table",
      defaults,
      columnIds
    ),
    defaults
  );
  assert.doesNotThrow(() =>
    saveDataTableState(
      {
        setItem: () => {
          throw new Error("full");
        },
      },
      "table",
      defaults
    )
  );

  let serialized = "";
  const storage = {
    getItem: () => serialized,
    setItem: (_key: string, value: string) => {
      serialized = value;
    },
  };
  saveDataTableState(storage, "table", { ...defaults, data: [{ secret: "private-secret", url: "vless://private" }] } as DataTableState);
  assert.ok(!serialized.includes("private"));
  assert.deepEqual(Object.keys(JSON.parse(serialized)).sort(), ["columnVisibility", "globalFilter", "pagination", "sorting", "version"]);
  assert.deepEqual(readDataTableState(storage, "table", defaults, columnIds), defaults);
});

test("数据减少时收紧页码，未越界的页码保留，空列表回第一页", () => {
  assert.equal(clampDataTablePageIndex(3, 101, 25), 3);
  assert.equal(clampDataTablePageIndex(3, 75, 25), 2);
  assert.equal(clampDataTablePageIndex(3, 25, 25), 0);
  assert.equal(clampDataTablePageIndex(3, 0, 25), 0);
  assert.equal(clampDataTablePageIndex(1, 26, 25), 1);
});
