"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Subconverter, User } from "@/types";
import { CreateUserDialog } from "./create-user-dialog";
import { UserTable } from "./user-table";

interface UsersViewProps {
  users: User[];
  subconverters: Subconverter[];
}

export function UsersView({ users, subconverters }: UsersViewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center space-y-0 pb-4">
        <div className="flex items-center gap-4">
          <CardTitle>用户管理 ({users.length})</CardTitle>
          <CreateUserDialog subconverters={subconverters} />
        </div>
      </CardHeader>
      <CardContent>
        <UserTable users={users} subconverters={subconverters} />
      </CardContent>
    </Card>
  );
}
