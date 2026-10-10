"use client";

import { AlertCircle, CheckCircle2, Download, FileJson, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { exportDataSchema, getImportPreview } from "@/lib/export-data";
import type { ExportData } from "@/server/services/export-service";
import { api } from "@/utils/api";

export default function ExportPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInFlight = useRef(false);
  const fileReadInFlight = useRef(false);
  const [importing, setImporting] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [skipExisting, setSkipExisting] = useState(true);
  const [previewData, setPreviewData] = useState<ExportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);

  // 使用TRPC mutations
  const exportQuery = api.export.exportAll.useQuery(undefined, { enabled: false });
  const importMutation = api.export.importAll.useMutation({
    gcTime: 0,
    onSuccess: async (result) => {
      if (!result.success) return;
      setImportedFileName(fileName);
      setShowPreview(false);
      setPreviewData(null);
      setFileName(null);
      setImportError(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
      await Promise.allSettled([
        utils.user.invalidate(),
        utils.node.invalidate(),
        utils.nodeClient.invalidate(),
        utils.subconverter.invalidate(),
        utils.clashConfig.invalidate(),
        utils.subscription.invalidate(),
        utils.export.invalidate(),
      ]);
      toast.success("数据导入成功");
    },
    onError: () => {
      setImportError("导入失败，已保留所选文件和导入选项。请检查记录是否存在冲突，或稍后重试。");
      toast.error("数据导入失败，已保留所选文件");
    },
  });
  const isImportPending = importing || importMutation.isPending;
  const preview = previewData ? getImportPreview(previewData) : [];
  const totalRecords = preview.reduce((total, resource) => total + resource.count, 0);

  const handleExport = async () => {
    try {
      setExporting(true);
      const data = await exportQuery.refetch();

      if (data.error) {
        throw new Error(data.error.message);
      }

      if (!data.data) {
        throw new Error("无法获取导出数据");
      }

      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sub-box-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("数据导出成功");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || fileReadInFlight.current || importInFlight.current) return;

    setFileName(file.name);
    setPreviewData(null);
    setFileError(null);
    setImportError(null);
    setImportedFileName(null);
    if (!file.name.toLowerCase().endsWith(".json")) {
      setFileError("请选择 JSON 格式的文件");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("文件大小超过限制（10MB）");
      return;
    }

    fileReadInFlight.current = true;
    setReadingFile(true);
    try {
      const content = await file.text();
      let data: unknown;
      try {
        data = JSON.parse(content);
      } catch {
        setFileError("文件不是有效的 JSON，请选择正确的导出文件");
        return;
      }
      const result = exportDataSchema.safeParse(data);
      if (!result.success) {
        setFileError("文件内容不符合 Sub Box 导出格式，请使用完整的导出文件");
        return;
      }
      setPreviewData(result.data);
      setShowPreview(true);
    } catch {
      setFileError("读取文件失败，请重新选择文件");
    } finally {
      fileReadInFlight.current = false;
      setReadingFile(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || importInFlight.current || readingFile) return;

    importInFlight.current = true;
    setImportError(null);
    setImporting(true);
    try {
      await importMutation.mutateAsync({
        data: previewData,
        options: {
          skipExisting,
        },
      });
    } catch {
      // 错误已由 mutation 展示，保留预览数据以便重试。
    } finally {
      importInFlight.current = false;
      setImporting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Export Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            数据导出
          </CardTitle>
          <CardDescription>导出所有数据，包括用户、节点、订阅转换器和 Clash 配置等</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExport} disabled={exporting || exportQuery.isFetching} className="w-full sm:w-auto">
            {exporting || exportQuery.isFetching ? "导出中..." : "导出数据"}
          </Button>
        </CardContent>
      </Card>

      {/* Import Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            数据导入
          </CardTitle>
          <CardDescription>从之前的导出文件中恢复数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>请确保导入的文件来自可信来源，导入操作可能会修改现有数据</AlertDescription>
          </Alert>

          {importedFileName && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="break-all">文件「{importedFileName}」导入成功，可前往对应页面查看数据。</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input ref={fileInputRef} type="file" accept=".json,application/json" onChange={handleFileSelect} disabled={readingFile || isImportPending} className="hidden" />
              <Button
                variant="outline"
                disabled={readingFile || isImportPending}
                className="w-full sm:w-auto"
                onClick={() => {
                  if (!fileInputRef.current) return;
                  fileInputRef.current.value = "";
                  fileInputRef.current.click();
                }}
              >
                <FileJson className="mr-2 h-4 w-4" />
                {readingFile ? "读取中..." : isImportPending ? "导入中..." : fileName ? "重新选择文件" : "选择导入文件"}
              </Button>
              {previewData && (
                <Button variant="outline" onClick={() => setShowPreview(true)} disabled={isImportPending}>
                  查看导入确认
                </Button>
              )}
            </div>
            {fileName && <p className="break-all text-sm text-muted-foreground">已选择：{fileName}</p>}
            {fileError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}
            {!fileName && <p className="text-sm text-muted-foreground">支持 JSON 文件，最大 10MB。选择后可核对记录数量和导入规则。</p>}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog
        open={showPreview}
        onOpenChange={(open) => {
          if (!importInFlight.current && !isImportPending) setShowPreview(open);
        }}
      >
        <DialogContent
          className={`max-w-2xl max-h-[90dvh] overflow-y-auto ${isImportPending ? "[&>button]:hidden" : ""}`}
          onEscapeKeyDown={(event) => {
            if (importInFlight.current || isImportPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (importInFlight.current || isImportPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>确认导入数据</DialogTitle>
            <DialogDescription>请核对文件和导入规则，建议先导出当前数据作为备份。</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <dl className="text-sm">
              <dt className="text-muted-foreground">文件</dt>
              <dd className="mt-1 break-all font-medium">{fileName}</dd>
            </dl>
            <div className="space-y-2">
              <p className="text-sm font-medium">文件中共 {totalRecords} 条记录</p>
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {preview.map((resource) => (
                  <div key={resource.key} className="rounded-md border p-3">
                    <dt className="text-sm text-muted-foreground">{resource.label}</dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums">{resource.count}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-muted-foreground">以上为文件中的记录数，实际导入数量取决于已有数据和所选规则。</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="skip-existing" checked={skipExisting} onCheckedChange={setSkipExisting} disabled={isImportPending} />
              <Label htmlFor="skip-existing">导入时跳过已存在的数据</Label>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>
                  {skipExisting
                    ? "用户、节点、节点客户端、订阅转换器和 Clash 配置按 ID 跳过已有记录；用户客户端关联按用户 ID 与节点客户端 ID 的组合跳过。其余记录会尝试插入。"
                    : "关闭跳过后，将尝试添加全部记录，不会覆盖已有数据。"}
                </p>
                <p>文件内重复记录、已有订阅密钥或 Clash 配置 key 等冲突仍可能导致导入失败。</p>
              </AlertDescription>
            </Alert>
            {importError && (
              <Alert variant="destructive" role="alert">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isImportPending}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={!previewData || isImportPending}>
              {isImportPending ? "导入中..." : "确认导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
