import { redirect } from "next/navigation";
import { getUser } from "@/server/services/authentication-service";
import { ScalarDocs } from "./scalar-docs";

export default async function ApiReferencePage() {
  if (!(await getUser())) redirect("/login");
  return <ScalarDocs />;
}
