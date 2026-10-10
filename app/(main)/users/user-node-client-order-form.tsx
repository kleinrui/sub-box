"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Node as DbNode, NodeClient } from "@/types";
import { api } from "@/utils/api";

type NodeClientWithUsers = NodeClient & { users: { userId: string; enable: boolean; order: number }[] };

interface SortableItemProps {
  id: string;
  url: string;
  nodeName?: string;
}

function SortableItem({ id, url, nodeName }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-3 mb-2 cursor-move hover:bg-accent">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners}>
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium">{nodeName || `Client ${id.slice(-6)}`}</div>
            <div className="text-sm text-muted-foreground truncate">{url}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

interface UserNodeClientOrderFormProps {
  userId: string;
  items: NodeClientWithUsers[];
  nodes: DbNode[];
  onSuccess?: () => void;
}

export function UserNodeClientOrderForm({ userId, items, nodes, onSuccess }: UserNodeClientOrderFormProps) {
  const router = useRouter();

  // 使用TRPC mutation
  const updateUserClientOptionMutation = api.nodeClient.updateUserClientOption.useMutation({
    onSuccess: () => {
      // 成功处理在handleSave中统一处理
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });

  const [localItems, setLocalItems] = useState(
    [...items].sort((a, b) => {
      const aUserOption = a.users.find((user) => user.userId === userId);
      const bUserOption = b.users.find((user) => user.userId === userId);
      return (aUserOption?.order ?? 0) - (bUserOption?.order ?? 0);
    })
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleSave() {
    try {
      await Promise.all(
        localItems.map((item, index) => {
          const userOption = item.users.find((user) => user.userId === userId);
          if (!userOption) return Promise.resolve();
          return updateUserClientOptionMutation.mutateAsync({
            nodeClientId: item.id,
            userId: userId,
            data: {
              order: index,
            },
          });
        })
      );
      toast.success("保存成功");
      router.refresh();
      onSuccess?.();
    } catch (error) {
      toast.error(`保存失败: ${(error as Error).message}`);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localItems.findIndex((item) => item.id === active.id);
    const newIndex = localItems.findIndex((item) => item.id === over.id);
    setLocalItems(arrayMove(localItems, oldIndex, newIndex));
  }

  const isPending = updateUserClientOptionMutation.isPending;

  return (
    <div className="space-y-4">
      <div className="max-h-[calc(100vh-150px)] overflow-y-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {localItems.map((item) => {
              const node = nodes.find((n) => n.id === item.nodeId);
              return <SortableItem key={item.id} id={item.id} url={item.url} nodeName={node?.name} />;
            })}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={() => onSuccess?.()} variant="outline">
          取消
        </Button>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "保存中..." : "保存"}
        </Button>
      </div>
    </div>
  );
}
