"use client";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            用户管理 <span className="text-base font-normal text-muted-foreground">({users.length})</span>
          </h1>
          <p className="text-sm text-muted-foreground">查看客户端使用情况，管理用户的订阅链接和转换器。</p>
        </div>
        <CreateUserDialog subconverters={subconverters} />
      </div>
      <UserTable users={users} subconverters={subconverters} />
    </div>
  );
}
