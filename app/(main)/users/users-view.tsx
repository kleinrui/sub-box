"use client";

import { PageHeading } from "@/components/page-heading";
import type { Subconverter, User } from "@/types";
import { CreateUserDialog } from "./create-user-dialog";
import { UserTable } from "./user-table";

interface UsersViewProps {
  users: User[];
  subconverters: Subconverter[];
}

export function UsersView({ users, subconverters }: UsersViewProps) {
  return (
    <div className="space-y-6">
      <PageHeading
        title="用户管理"
        count={users.length}
        description="查看客户端使用情况，管理用户的订阅链接和转换器。"
        actions={<CreateUserDialog subconverters={subconverters} />}
      />
      <UserTable users={users} subconverters={subconverters} />
    </div>
  );
}
