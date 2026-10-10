import { api } from "@/server/api/trpc-server";
import { AiApiView } from "./ai-api-view";

export default async function AiApiPage() {
  return <AiApiView tokens={await api.apiToken.list()} now={Date.now()} />;
}
