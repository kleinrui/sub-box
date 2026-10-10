import { api } from "@/server/api/trpc-server";
import { UsersView } from "./users-view";

export default async function UsersPage() {
  const [users, subconverters] = await Promise.all([api.user.getAll(), api.subconverter.getAll()]);

  return <UsersView users={users} subconverters={subconverters} />;
}
