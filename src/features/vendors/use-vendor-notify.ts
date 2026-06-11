"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import type { VendorNotifyPayload, VendorNotifyResponse } from "@/lib/api/types";

export function useVendorNotify(vendorId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: VendorNotifyPayload) =>
      adminApi<VendorNotifyResponse>(adminPaths.vendorNotify(vendorId), {
        method: "POST",
        body: payload,
      }),
    onSuccess: async (data) => {
      toast.success(`تم إرسال الإشعار إلى ${data.notifiedUsersCount} مستخدم`);
      await queryClient.invalidateQueries({ queryKey: queryKeysForVendor(vendorId) });
      await queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "تعذر إرسال الإشعار",
      );
    },
  });
}

function queryKeysForVendor(vendorId: string) {
  return ["vendors", vendorId];
}
