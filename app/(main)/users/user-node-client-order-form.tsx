"use client";

import { closestCenter, DndContext, type DragEndEvent, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { FormActions } from "@/components/form-actions";
import { usePopupSheetFormState } from "@/components/popup-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Node as DbNode, NodeClient } from "@/types";
import { api } from "@/utils/api";

type NodeClientWithUsers = NodeClient & { users: { userId: string; enable: boolean; order: number }[] };

interface SortableItemProps {
  id: string;
  url: string;
  nodeName?: string;
  index: number;
  total: number;
  isPending: boolean;
  onMove: (from: number, to: number) => void;
}

function SortableItem({ id, url, nodeName, index, total, isPending, onMove }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: isPending });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 1 : 0 };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-3 hover:bg-accent">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            disabled={isPending}
            aria-label={`拖动调整第 ${index + 1} 个客户端的顺序`}
            className="flex h-8 w-8 shrink-0 touch-none items-center justify-center rounded-md cursor-grab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {index + 1}. {nodeName || `客户端 ${id.slice(-6)}`}
            </div>
            <div className="truncate text-sm text-muted-foreground">{url}</div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isPending || index === 0}
              onClick={() => onMove(index, index - 1)}
              aria-label={`将第 ${index + 1} 个客户端上移`}
            >
              <ChevronUp className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={isPending || index === total - 1}
              onClick={() => onMove(index, index + 1)}
              aria-label={`将第 ${index + 1} 个客户端下移`}
            >
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
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
  const utils = api.useUtils();
  const saving = useRef(false);
  const updateUserClientOptionMutation = api.nodeClient.updateUserClientOption.useMutation();
  const [initialItems] = useState(() =>
    [...items].sort((a, b) => {
      const aUserOption = a.users.find((user) => user.userId === userId);
      const bUserOption = b.users.find((user) => user.userId === userId);
      return (aUserOption?.order ?? 0) - (bUserOption?.order ?? 0);
    })
  );
  const [localItems, setLocalItems] = useState(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const isPending = isSaving || updateUserClientOptionMutation.isPending;
  const isDirty = localItems.some((item, index) => item.id !== initialItems[index]?.id);
  const requestClose = usePopupSheetFormState({ isDirty, isPending });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  async function handleSave() {
    if (saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setSaveError("");
    try {
      const results = await Promise.allSettled(
        localItems.map((item, index) => {
          const userOption = item.users.find((user) => user.userId === userId);
          if (!userOption) return Promise.resolve();
          return updateUserClientOptionMutation.mutateAsync({ nodeClientId: item.id, userId, data: { order: index } });
        })
      );
      await Promise.allSettled([utils.nodeClient.invalidate(), utils.node.getAllWithClients.invalidate()]);
      router.refresh();
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
      if (failures.length) {
        const firstError: unknown = failures[0]?.reason;
        const message = `${failures.length} 个客户端的顺序保存失败，已保留当前排序，请重试保存：${firstError instanceof Error ? firstError.message : "请稍后重试"}`;
        setSaveError(message);
        toast.error(message);
        return;
      }
      toast.success("客户端顺序已保存");
      onSuccess?.();
    } catch (error) {
      const message = `保存失败：${error instanceof Error ? error.message : "请重试"}`;
      setSaveError(message);
      toast.error(message);
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  function moveItem(from: number, to: number) {
    if (saving.current || from < 0 || to < 0 || to >= localItems.length) return;
    setLocalItems((previous) => arrayMove(previous, from, to));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    moveItem(
      localItems.findIndex((item) => item.id === active.id),
      localItems.findIndex((item) => item.id === over.id)
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
      className="flex min-h-full flex-col gap-4"
    >
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>保存仅更新当前用户订阅中的客户端顺序。</p>
        <p>可拖动手柄，或点击上移、下移。键盘操作：聚焦手柄后按空格开始，用方向键移动，再按空格完成。</p>
      </div>
      <div className="min-w-0 space-y-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          accessibility={{ screenReaderInstructions: { draggable: "按空格开始调整顺序，用方向键移动，再按空格完成；按 Escape 取消。" } }}
        >
          <SortableContext items={localItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {localItems.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                url={item.url}
                nodeName={nodes.find((node) => node.id === item.nodeId)?.name}
                index={index}
                total={localItems.length}
                isPending={isPending}
                onMove={moveItem}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {saveError && (
        <p role="alert" className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
          {saveError}
        </p>
      )}
      <FormActions isPending={isPending} onCancel={requestClose ?? onSuccess} submitDisabled={localItems.length === 0} />
    </form>
  );
}
