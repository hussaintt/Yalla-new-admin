"use client";

import { Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import { FormField, FormInput } from "@/components/ui/form-field";
import { ApiError, normalizeApiError } from "@/lib/api/errors";
import { loginSchema, type LoginFormValues } from "./schema";

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function safeNextPath(next: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }

  return next;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const nextPath = useMemo(
    () => safeNextPath(searchParams.get("next")),
    [searchParams],
  );

  useEffect(() => {
    queryClient.clear();
  }, [queryClient]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: values.username.trim(), password: values.password }),
      });
      const payload = await parseResponse(response);

      if (!response.ok) {
        throw new ApiError(normalizeApiError(payload, response.status));
      }

      toast.success("تم تسجيل الدخول");
      queryClient.clear();
      router.replace(nextPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "تعذر تسجيل الدخول.";
      toast.error(message);
      if (error instanceof ApiError && error.statusCode === 401) {
        setError("password", { type: "server", message: "بيانات الدخول غير صحيحة" });
      }
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-ink-strong text-primary-foreground">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.32),transparent_28rem),radial-gradient(circle_at_80%_10%,rgba(14,165,233,0.20),transparent_24rem)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-10">
        <section className="grid w-full gap-10 lg:grid-cols-[1fr_440px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary-soft/30 bg-primary-soft/10 px-4 py-2 text-sm font-bold text-primary-soft">
              <Sparkles className="h-4 w-4" />
              إدارة يلا نيو
            </div>
            <h1 className="mt-5 max-w-2xl text-4xl font-black leading-tight lg:text-6xl">
              غرفة تحكم واحدة لكل السوق.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-sidebar-ink-muted">
              راقب المستخدمين والبائعين والوثائق والطلبات والمدفوعات والمحتوى من مكان واحد، بدون أن تتحول العمليات إلى صندوق أسلاك.
            </p>
            <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
              {["KYC", "Orders", "Billing"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-bold text-sidebar-ink backdrop-blur"
                >
                  {item}
                  <div className="mt-2 h-1.5 rounded-full bg-primary/60" />
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl shadow-overlay"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-ink-strong">تسجيل دخول الإدارة</h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  الجلسة محفوظة في ملفات تعريف ارتباط آمنة مع دعم للتجديد التلقائي.
                </p>
              </div>
            </div>

            <FormField
              label="اسم المستخدم / البريد الإلكتروني"
              required
              error={errors.username?.message}
              className="mt-7"
            >
              {(props) => (
                <span className="mt-2 flex h-12 items-center gap-2 rounded-2xl border border-border bg-muted px-3 transition focus-within:border-primary focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/10">
                  <Mail className="h-4 w-4 text-ink-muted" />
                  <FormInput
                    {...props}
                    type="text"
                    autoComplete="username"
                    dir="ltr"
                    placeholder="admin@example.com"
                    invalid={!!errors.username}
                    {...register("username")}
                  />
                </span>
              )}
            </FormField>

            <FormField
              label="كلمة المرور"
              required
              error={errors.password?.message}
              className="mt-4"
            >
              {(props) => (
                <span className="mt-2 flex h-12 items-center gap-2 rounded-2xl border border-border bg-muted px-3 transition focus-within:border-primary focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/10">
                  <Lock className="h-4 w-4 text-ink-muted" />
                  <FormInput
                    {...props}
                    type="password"
                    autoComplete="current-password"
                    dir="ltr"
                    placeholder="أدخل كلمة المرور"
                    invalid={!!errors.password}
                    {...register("password")}
                  />
                </span>
              )}
            </FormField>

            <Button
              type="submit"
              disabled={isSubmitting}
              size="lg"
              className="mt-7 h-12 w-full"
            >
              {isSubmitting ? "جار تسجيل الدخول..." : "تسجيل الدخول"}
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState label="جار تحميل صفحة الدخول" />}>
      <LoginForm />
    </Suspense>
  );
}
