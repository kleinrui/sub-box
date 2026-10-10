import document from "@/public/openapi.json";

/** 公开接口契约，不读取数据库或返回凭据。相对 servers URL 适用于任意部署域名。 */
export function GET() {
  return Response.json(document, { headers: { "Cache-Control": "public, max-age=300" } });
}
