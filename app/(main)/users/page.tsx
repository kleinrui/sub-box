import { api } from "@/server/api/trpc-server";
import { UsersView } from "./users-view";

export default async function UsersPage() {
  const users = await api.user.getAll();
  const subconverters = await api.subconverter.getAll();

  return <UsersView users={users} subconverters={subconverters} />;
}
