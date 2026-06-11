"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { CursorPager } from "@/components/data-table/cursor-pager";
import { TableToolbar } from "@/components/data-table/table-toolbar";
import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { TableSkeleton } from "@/components/state/table-skeleton";
import { ErrorState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { FormField, FormInput } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";
import { adminApi } from "@/lib/api/admin-client";
import { withQuery } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import type { AdminUserRow, Role, UserPage } from "@/lib/api/types";
import { formatDate, formatName, roleLabel } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { createRoleSchema, type CreateRoleFormValues } from "./schema";

const userStatuses = [
  { label: "قيد الانتظار", value: "PENDING" },
  { label: "نشط", value: "ACTIVE" },
  { label: "موقوف", value: "SUSPENDED" },
  { label: "محذوف", value: "DELETED" },
];

function roleNames(user: AdminUserRow) {
  return (user.roles ?? []).map(roleLabel).filter(Boolean);
}

function userRoleId(role: unknown) {
  if (!role || typeof role !== "object") return undefined;
  const record = role as Record<string, unknown>;
  if (typeof record.roleId === "number") return record.roleId;
  if (record.role && typeof record.role === "object") {
    const nested = record.role as Record<string, unknown>;
    if (typeof nested.id === "number") return nested.id;
  }
  return undefined;
}

function RoleAssignment({
  user,
  roles,
}: {
  user: AdminUserRow;
  roles: Role[];
}) {
  const queryClient = useQueryClient();
  const [roleId, setRoleId] = useState("");

  const assignRole = useMutation({
    mutationFn: () =>
      adminApi("/api/admin/roles/assign", {
        method: "POST",
        body: { userId: user.id, roleId: Number(roleId) },
      }),
    onSuccess: async () => {
      toast.success("تم تعيين الدور");
      setRoleId("");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تعيين الدور");
    },
  });

  const revokeRole = useMutation({
    mutationFn: (nextRoleId: number) =>
      adminApi(`/api/admin/roles/users/${user.id}/roles/${nextRoleId}`, {
        method: "DELETE",
      }),
    onSuccess: async () => {
      toast.success("تم حذف الدور");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر حذف الدور");
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {(user.roles ?? []).map((role, index) => {
          const label = roleLabel(role);
          const id = userRoleId(role);
          return (
            <span
              key={`${label}-${index}`}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-semibold text-ink-strong"
            >
              {label}
              {id && label !== "ADMIN" ? (
                <button
                  type="button"
                  onClick={() => revokeRole.mutate(id)}
                  className="text-ink-soft transition hover:text-destructive"
                  title="حذف الدور"
                >
                  ×
                </button>
              ) : null}
            </span>
          );
        })}
      </div>
      <div className="flex gap-2">
        <select
          value={roleId}
          onChange={(event) => setRoleId(event.target.value)}
          className="h-8 min-w-32 rounded-md border border-border bg-card px-2 text-xs text-ink-strong outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
        >
          <option value="">تعيين دور</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!roleId || assignRole.isPending}
          onClick={() => assignRole.mutate()}
        >
          إضافة
        </Button>
      </div>
    </div>
  );
}

function CreateRoleForm() {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { name: "", description: "" },
  });

  const createRole = useMutation({
    mutationFn: (values: CreateRoleFormValues) =>
      adminApi<Role>("/api/admin/roles", {
        method: "POST",
        body: { name: values.name, description: values.description || undefined },
      }),
    onSuccess: async () => {
      toast.success("تم إنشاء الدور");
      reset();
      await queryClient.invalidateQueries({ queryKey: queryKeys.roles });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر إنشاء الدور");
    },
  });

  return (
    <SectionCard
      title="إنشاء دور جديد"
      description="أضف دورًا للنظام ثم عيّنه للمستخدمين من الجدول."
    >
      <form
        onSubmit={handleSubmit((values) => createRole.mutate(values))}
        className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
      >
        <FormField label="اسم الدور" required error={errors.name?.message}>
          {(props) => (
            <FormInput
              {...props}
              minLength={2}
              required
              dir="ltr"
              placeholder="SUPPORT_AGENT"
              invalid={!!errors.name}
              {...register("name")}
            />
          )}
        </FormField>
        <FormField label="الوصف" error={errors.description?.message}>
          {(props) => (
            <FormInput
              {...props}
              placeholder="وصف اختياري للدور"
              invalid={!!errors.description}
              {...register("description")}
            />
          )}
        </FormField>
        <Button
          type="submit"
          size="lg"
          disabled={createRole.isPending}
          className="h-10"
        >
          <Plus className="h-4 w-4" />
          إنشاء دور
        </Button>
      </form>
    </SectionCard>
  );
}

type PendingUserAction = {
  userId: string;
  userLabel: string;
  status: "ACTIVE" | "SUSPENDED";
};

export default function UsersPage() {
  const searchParams = useSearchParams();
  const [pendingAction, setPendingAction] = useState<PendingUserAction | null>(null);
  const queryParams = {
    status: searchParams.get("status") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: "20",
  };
  const queryClient = useQueryClient();

  const users = useQuery({
    queryKey: queryKeys.users(queryParams),
    queryFn: () =>
      adminApi<UserPage>(withQuery("/api/admin/admin/users", queryParams)),
  });

  const roles = useQuery({
    queryKey: queryKeys.roles,
    queryFn: () => adminApi<Role[]>("/api/admin/roles"),
  });

  const updateStatus = useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: string;
      reason?: string;
    }) =>
      adminApi(`/api/admin/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status, reason },
      }),
    onSuccess: async () => {
      toast.success("تم تحديث حالة المستخدم");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.overview(30) });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث المستخدم");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="المسؤولون"
        description="إدارة حسابات مسؤولي النظام وأدوارهم وصلاحياتهم وإيقاف أو إعادة تنشيط الحسابات."
        actions={
          <Link
            href="/users/create"
            className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90"
          >
            <Plus className="size-4" />
            إنشاء مسؤول
          </Link>
        }
      />

      <CreateRoleForm />

      <TableToolbar
        statusOptions={userStatuses}
      />

      {users.isLoading || roles.isLoading ? (
        <TableSkeleton />
      ) : users.isError ? (
        <ErrorState message={users.error.message} />
      ) : roles.isError ? (
        <ErrorState message={roles.error.message} />
      ) : (
        <>
          <CursorDataTable
            data={(users.data?.data ?? []).filter((user) => user.roles && user.roles.length > 0)}
            getRowKey={(user) => user.publicId}
            columns={[
              {
                id: "user",
                header: "المستخدم",
                cell: (user) => (
                  <div>
                    <div className="flex items-center gap-1">
                      <Link href={`/users/${user.publicId}`} className="font-medium text-primary hover:underline">
                        {formatName(user)}
                      </Link>
                      <CopyButton value={user.publicId} />
                    </div>
                    <div className="text-xs text-ink-muted">{user.email}</div>
                    <div className="text-xs text-ink-muted">{user.phone ?? "-"}</div>
                  </div>
                ),
              },
              {
                id: "status",
                header: "الحالة",
                cell: (user) => <StatusBadge status={user.status} />,
              },
              {
                id: "roles",
                header: "الأدوار",
                cell: (user) => (
                  <RoleAssignment user={user} roles={roles.data ?? []} />
                ),
              },
              {
                id: "activity",
                header: "النشاط",
                cell: (user) => (
                  <div className="text-sm text-ink-strong">
                    <div>تم الإنشاء {formatDate(user.createdAt)}</div>
                    <div>آخر دخول {formatDate(user.lastLoginAt)}</div>
                    <div>{roleNames(user).length} أدوار</div>
                  </div>
                ),
              },
              {
                id: "actions",
                header: "إجراءات",
                cell: (user) => {
                  const nextStatus =
                    user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
                  return (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={updateStatus.isPending}
                      onClick={() =>
                        setPendingAction({
                          userId: user.publicId,
                          userLabel: user.email ?? user.publicId,
                          status: nextStatus,
                        })
                      }
                      className={cn(
                        nextStatus === "SUSPENDED"
                          ? "border-destructive/30 text-destructive hover:bg-destructive-soft"
                          : "border-success/30 text-success hover:bg-success-soft",
                      )}
                    >
                      {nextStatus === "SUSPENDED" ? "إيقاف" : "إعادة تنشيط"}
                    </Button>
                  );
                },
              },
            ]}
          />
          <CursorPager
            nextCursor={users.data?.nextCursor}
            hasMore={users.data?.hasMore}
          />
        </>
      )}

      <ActionDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.status === "SUSPENDED" ? "إيقاف المستخدم" : "إعادة تنشيط المستخدم"}
        description={
          pendingAction
            ? `${pendingAction.status === "SUSPENDED" ? "سيتم إيقاف" : "سيتم إعادة تنشيط"} ${pendingAction.userLabel}.`
            : ""
        }
        confirmLabel={pendingAction?.status === "SUSPENDED" ? "إيقاف" : "إعادة تنشيط"}
        variant={pendingAction?.status === "SUSPENDED" ? "danger" : "success"}
        requireReason={pendingAction?.status === "SUSPENDED"}
        disabled={updateStatus.isPending}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => {
          if (!pendingAction) return;
          updateStatus.mutate(
            { userId: pendingAction.userId, status: pendingAction.status },
            { onSettled: () => setPendingAction(null) },
          );
        }}
      />
    </div>
  );
}
