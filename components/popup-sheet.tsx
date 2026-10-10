"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface PopupSheetFormState {
  isDirty: boolean;
  isPending: boolean;
}

const emptyFormState: PopupSheetFormState = { isDirty: false, isPending: false };
const PopupSheetFormContext = createContext<{
  updateFormState: (state: PopupSheetFormState) => void;
  requestClose: () => void;
} | null>(null);

export function usePopupSheetFormState({ isDirty, isPending }: PopupSheetFormState) {
  const context = useContext(PopupSheetFormContext);
  const updateFormState = context?.updateFormState;
  useEffect(() => {
    updateFormState?.({ isDirty, isPending });
  }, [updateFormState, isDirty, isPending]);
  useEffect(() => () => updateFormState?.(emptyFormState), [updateFormState]);
  return context?.requestClose;
}

interface PopupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

export function PopupSheet({ open, onOpenChange, title, description, children }: PopupSheetProps) {
  const descriptionId = useId();
  const formStateRef = useRef(emptyFormState);
  const [formState, setFormState] = useState(emptyFormState);
  const [confirmClose, setConfirmClose] = useState(false);
  const updateFormState = useCallback((state: PopupSheetFormState) => {
    formStateRef.current = state;
    setFormState(state);
    if (!state.isDirty && !state.isPending) setConfirmClose(false);
  }, []);
  const requestClose = useCallback(() => {
    if (formStateRef.current.isPending) return;
    if (formStateRef.current.isDirty) {
      setConfirmClose(true);
    } else {
      onOpenChange(false);
    }
  }, [onOpenChange]);
  const context = useMemo(() => ({ updateFormState, requestClose }), [updateFormState, requestClose]);

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) onOpenChange(true);
          else requestClose();
        }}
      >
        <SheetContent
          className={cn("flex h-[100dvh] !w-full !max-w-[100vw] flex-col gap-0 overflow-hidden p-4 sm:!w-[720px] sm:p-6", formState.isPending && "[&>button]:hidden")}
          aria-describedby={description ? descriptionId : undefined}
          onEscapeKeyDown={(event) => {
            if (formStateRef.current.isPending) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (formStateRef.current.isPending) event.preventDefault();
          }}
        >
          <SheetHeader className="shrink-0 pr-6">
            <SheetTitle>{title}</SheetTitle>
            {description && <SheetDescription id={descriptionId}>{description}</SheetDescription>}
          </SheetHeader>
          <PopupSheetFormContext.Provider value={context}>
            <div className="mt-6 min-h-0 flex-1 overflow-y-auto overscroll-contain py-1">{children}</div>
          </PopupSheetFormContext.Provider>
        </SheetContent>
      </Sheet>
      <AlertDialog open={open && confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>放弃未保存的更改？</AlertDialogTitle>
            <AlertDialogDescription>关闭后，当前填写的内容将不会保存。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={formState.isPending}>继续编辑</AlertDialogCancel>
            <AlertDialogAction
              disabled={formState.isPending}
              onClick={() => {
                if (formStateRef.current.isPending) return;
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              放弃更改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
