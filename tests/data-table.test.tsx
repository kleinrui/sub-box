import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable } from "../components/data-table/data-table";

const columns = [
  { accessorKey: "id", header: "ID" },
  { accessorKey: "name", header: "名称" },
];
const data = [{ id: "item", name: "测试节点" }];

test("客户端数量不会使列表默认展开，SSR 不依赖 sessionStorage", () => {
  const markup = renderToStaticMarkup(<DataTable columns={columns} data={data} storageKey="table" getItemCount={() => 3} expandedContent={() => <span>客户端详情内容</span>} />);
  assert.ok(markup.includes('aria-expanded="false"'));
  assert.ok(markup.includes('aria-label="展开客户端详情"'));
  assert.ok(!markup.includes("客户端详情内容"));
});

test("显式默认展开仍兼容，展开内容和空态跨越实际可见列", () => {
  const expanded = renderToStaticMarkup(
    <DataTable columns={columns} data={data} defaultExpanded defaultColumnVisibility={{ id: false }} expandedContent={() => <span>客户端详情内容</span>} />
  );
  assert.ok(expanded.includes('aria-expanded="true"'));
  assert.ok(expanded.includes('aria-label="收起客户端详情"'));
  assert.ok(expanded.includes('colSpan="2"'));

  const empty = renderToStaticMarkup(<DataTable columns={columns} data={[]} defaultColumnVisibility={{ id: false }} emptyTitle="尚未添加节点" />);
  assert.ok(empty.includes('colSpan="1"'));
  assert.ok(empty.includes("尚未添加节点"));
});
