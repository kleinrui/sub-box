import { NextResponse } from "next/server";
import { type ExportData, exportService, type ImportOptions } from "@/server/services/export-service";

export async function GET() {
  try {
    const data = await exportService.exportAll();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { data: ExportData; options: ImportOptions };
    await exportService.importAll(body.data, body.options);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Import failed:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
