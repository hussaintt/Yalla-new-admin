"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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

const schema = z.object({
  firstName: z.string().trim().min(1, "الاسم الأول مطلوب"),
  lastName: z.string().trim().min(1, "اسم العائلة مطلوب"),
  email: z.string().trim().email("بريد إلكتروني غير صالح"),
  password: z
    .string()
    .min(8, "8 أحرف على الأقل")
    .regex(/[A-Z]/, "حرف كبير واحد على الأقل")
    .regex(/[0-9]/, "رقم واحد على الأقل"),
});

type FormValues = z.infer<typeof schema>;

export function CreateAdminUserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
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
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: AdminUserCreatePayload) =>
      adminApi<AdminUserCreateResponse>(adminPaths.adminUsers(), {
        method: "POST",
        body: payload,
      }),
    onSuccess: async (data) => {
      toast.success(`تم إنشاء المشرف ${data.email}`);
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/admins");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "تعذر إنشاء المشرف";
      toast.error(message);
      if (error instanceof ApiError && error.statusCode === 409) {
        setError("email", { type: "server", message: "البريد مستخدم بالفعل" });
      }
    },
  });

  function onSubmit(values: FormValues) {
    mutation.mutate({ ...values, roles: ["MODERATOR"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إنشاء مشرف جديد"
        description="إضافة مشرف جديد بصلاحيات محدودة: إدارة البانرات، مراجعة KYC، المنتجات، والمتاجر."
      />

      <SectionCard
        title="بيانات الحساب"
        description="سيُسمح للمشرف بتسجيل الدخول إلى لوحة الإدارة فور إنشائه بصلاحيات مشرف محدودة."
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

          <div className="md:col-span-2 rounded-xl border border-primary/20 bg-primary-soft/30 px-4 py-3">
            <div className="text-sm font-bold text-primary">الدور: مشرف (Moderator)</div>
            <p className="mt-1 text-xs text-ink-muted">
              سيتمكن المشرف من: إدارة البانرات الإعلانية، مراجعة طلبات KYC والموافقة عليها، مراجعة المنتجات والمتاجر.
            </p>
          </div>

          <div className="md:col-span-2 flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admins")}
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
                "إنشاء المشرف"
              )}
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
