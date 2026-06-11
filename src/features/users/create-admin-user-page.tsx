"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";
import { SectionCard } from "@/components/ui/section-card";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import type {
  AdminUserCreatePayload,
  AdminUserCreateResponse,
} from "@/lib/api/types";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const AVAILABLE_ROLES = [
  { value: "ADMIN", label: "مدير" },
  { value: "SUPER_ADMIN", label: "مدير عام" },
  { value: "STAFF_ADMIN", label: "موظف إدارة" },
  { value: "OWNER", label: "مالك" },
] as const;

const schema = z.object({
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "اسم العائلة مطلوب"),
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "8 أحرف على الأقل")
    .regex(/[A-Z]/, "حرف كبير واحد على الأقل")
    .regex(/[0-9]/, "رقم واحد على الأقل"),
  roles: z
    .array(z.string())
    .min(1, "اختر دوراً واحداً على الأقل"),
});

type FormValues = z.infer<typeof schema>;

export function CreateAdminUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    control,
    handleSubmit,
    register,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      roles: ["ADMIN"],
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: AdminUserCreatePayload) =>
      adminApi<AdminUserCreateResponse>(adminPaths.adminUsers(), {
        method: "POST",
        body: payload,
      }),
    onSuccess: async (data) => {
      toast.success(`تم إنشاء المستخدم ${data.email}`);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/users");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر إنشاء المستخدم";
      toast.error(message);
      if (error instanceof ApiError && error.statusCode === 409) {
        setError("email", { type: "server", message: "البريد مستخدم بالفعل" });
      }
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate(values);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إنشاء مستخدم إداري"
        description="إضافة مستخدم جديد إلى نظام إدارة المنصة بدور وصلاحيات محددة."
      />

      <SectionCard
        title="بيانات الحساب"
        description="سيُسمح للمستخدم الجديد بتسجيل الدخول إلى لوحة الإدارة فور إنشائه."
      >
        {mutation.isError && !(mutation.error instanceof ApiError) ? (
          <ErrorState message={(mutation.error as Error).message} />
        ) : null}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 md:grid-cols-2"
        >
          <FormField label="الاسم الأول" required error={errors.firstName?.message}>
            {(props) => (
              <FormInput
                {...props}
                autoComplete="given-name"
                {...register("firstName")}
              />
            )}
          </FormField>

          <FormField label="اسم العائلة" required error={errors.lastName?.message}>
            {(props) => (
              <FormInput
                {...props}
                autoComplete="family-name"
                {...register("lastName")}
              />
            )}
          </FormField>

          <FormField label="البريد الإلكتروني" required error={errors.email?.message}>
            {(props) => (
              <FormInput
                {...props}
                type="email"
                autoComplete="email"
                dir="ltr"
                {...register("email")}
              />
            )}
          </FormField>

          <FormField
            label="كلمة المرور"
            required
            error={errors.password?.message}
            hint="8 أحرف على الأقل، حرف كبير واحد، ورقم واحد"
          >
            {(props) => (
              <FormInput
                {...props}
                type="password"
                autoComplete="new-password"
                dir="ltr"
                {...register("password")}
              />
            )}
          </FormField>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-bold text-ink-strong">
              الأدوار
              <span className="text-destructive ms-1">*</span>
            </label>
            <Controller
              name="roles"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_ROLES.map((role) => {
                    const checked = field.value.includes(role.value);
                    return (
                      <label
                        key={role.value}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition",
                          checked
                            ? "border-primary bg-primary-soft text-primary"
                            : "border-border bg-card text-ink-muted hover:border-primary/50",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={checked}
                          onChange={(event) => {
                            if (event.target.checked) {
                              field.onChange([...field.value, role.value]);
                            } else {
                              field.onChange(
                                field.value.filter((v) => v !== role.value),
                              );
                            }
                          }}
                        />
                        {role.label}
                      </label>
                    );
                  })}
                </div>
              )}
            />
            {errors.roles?.message ? (
              <p className="text-xs text-destructive">{errors.roles.message}</p>
            ) : null}
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/users")}
              disabled={isSubmitting || mutation.isPending}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
            >
              {mutation.isPending ? (
                <LoadingState label="جار الإنشاء" />
              ) : (
                "إنشاء المستخدم"
              )}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
