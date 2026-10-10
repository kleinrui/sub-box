"use client";

import { Link2, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { CollapseDisplay } from "@/components/collapse-display";
import { DateTime } from "@/components/date-time";
import { IdBadge } from "@/components/id-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User } from "@/types";

interface UserListProps {
  users: User[];
}

export function UserList({ users }: UserListProps) {
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  return (
    <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id}>
            <CardContent className="py-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-lg">{user.name}</div>
                    <IdBadge id={user.id} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DateTime date={user.createdAt} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">订阅链接：</span>
                  </div>
                  <div className="flex-1">
                    <CollapseDisplay url={`${baseUrl}/sub/${user.subscriptionKey}`} />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">转换器：</span>
                    {user.subconverterId ? <IdBadge id={user.subconverterId} /> : <Badge variant="outline">默认</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
