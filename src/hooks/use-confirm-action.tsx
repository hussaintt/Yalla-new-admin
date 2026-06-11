"use client";

import { useCallback } from "react";

import { useConfirmDialog, type ConfirmOptions, type ConfirmResult } from "@/hooks/use-confirm-dialog";

type ConfirmActionOptions = ConfirmOptions & {
  onConfirm: (reason?: string) => void;
};

export function useConfirmAction() {
  const { confirm, element } = useConfirmDialog();

  const run = useCallback(
    async (options: ConfirmActionOptions) => {
      const { onConfirm, ...dialogOptions } = options;
      const result: ConfirmResult = await confirm(dialogOptions);
      if (result.confirmed) onConfirm(result.reason);
      return result;
    },
    [confirm],
  );

  return { run, element };
}
