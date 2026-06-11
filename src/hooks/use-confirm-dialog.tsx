"use client";

import { useCallback, useRef, useState } from "react";

import { ActionDialog } from "@/components/modals/action-dialog";

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "danger" | "success";
  requireReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
};

export type ConfirmResult =
  | { confirmed: true; reason?: string }
  | { confirmed: false };

type Resolver = (value: ConfirmResult) => void;

const INITIAL_OPTIONS: ConfirmOptions = {
  title: "",
  description: "",
};

export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>(INITIAL_OPTIONS);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setOptions(next);
    setOpen(true);
    return new Promise<ConfirmResult>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback(
    (result: ConfirmResult) => {
      setOpen(false);
      const resolve = resolverRef.current;
      resolverRef.current = null;
      resolve?.(result);
    },
    [],
  );

  const element = (
    <ActionDialog
      open={open}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel ?? "تأكيد"}
      variant={options.variant ?? "default"}
      requireReason={options.requireReason ?? false}
      reasonLabel={options.reasonLabel}
      reasonPlaceholder={options.reasonPlaceholder}
      onCancel={() => close({ confirmed: false })}
      onConfirm={(reason) => close({ confirmed: true, reason })}
    />
  );

  return { confirm, element };
}
