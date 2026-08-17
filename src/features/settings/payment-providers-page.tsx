"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, LockKeyhole, Settings2, ShieldCheck, WalletCards } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { PageHeader } from "@/components/layout/page-header";
import { ActionDialog } from "@/components/modals/action-dialog";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { queryKeys } from "@/lib/api/query-keys";
import { cn } from "@/lib/utils";

type ProviderCode = "PAYMOB" | "KASHIER";

type PaymentProvider = {
  provider: ProviderCode;
  enabled: boolean;
  cardEnabled: boolean;
  walletEnabled: boolean;
  displayNameAr: string;
  descriptionAr: string;
  logoUrl: string | null;
  priority: number;
  language: "ar";
  configured: boolean;
  canActivate: boolean;
  integrationAvailable: boolean;
  usingEnvironmentFallback: boolean;
  credentialStatus: Record<string, boolean>;
  lastValidatedAt: string | null;
  updatedAt: string | null;
};

type ProviderPatch = {
  enabled: boolean;
  cardEnabled?: boolean;
  walletEnabled?: boolean;
  displayNameAr: string;
  descriptionAr: string;
  logoUrl: string | null;
  priority: number;
  language: "ar";
  credentials?: Record<string, string | number | null>;
  reason?: string;
};

const formSchema = z.object({
  enabled: z.boolean(),
  cardEnabled: z.boolean(),
  walletEnabled: z.boolean(),
  displayNameAr: z.string().trim().min(1, "الاسم مطلوب").max(120),
  descriptionAr: z.string().trim().min(1, "الوصف مطلوب").max(500),
  logoUrl: z.string().trim().max(2000),
  priority: z.string().regex(/^\d{1,4}$/, "الأولوية يجب أن تكون رقماً من 0 إلى 9999"),
  secretKey: z.string().trim(),
  publicKey: z.string().trim(),
  apiKey: z.string().trim(),
  hmacSecret: z.string().trim(),
  integrationIdCard: z.string().trim(),
  integrationIdWallet: z.string().trim(),
  merchantId: z.string().trim(),
  apiSecret: z.string().trim(),
  clearSecretKey: z.boolean(),
  clearPublicKey: z.boolean(),
  clearApiKey: z.boolean(),
  clearHmacSecret: z.boolean(),
  clearIntegrationIdCard: z.boolean(),
  clearIntegrationIdWallet: z.boolean(),
  clearMerchantId: z.boolean(),
  clearApiSecret: z.boolean(),
});

type ProviderFormValues = z.infer<typeof formSchema>;

export function PaymentProvidersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PaymentProvider | null>(null);
  const providers = useQuery({
    queryKey: queryKeys.paymentProviders,
    queryFn: () => adminApi<PaymentProvider[]>(adminPaths.paymentProviders()),
  });

  const save = useMutation({
    mutationFn: ({ provider, body }: { provider: ProviderCode; body: ProviderPatch }) =>
      adminApi<PaymentProvider>(adminPaths.paymentProvider(provider), {
        method: "PATCH",
        body,
      }),
    onSuccess: async () => {
      toast.success("تم حفظ إعدادات بوابة الدفع");
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.paymentProviders });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر حفظ الإعدادات"),
  });

  const validatePaymob = useMutation({
    mutationFn: () => adminApi(adminPaths.validatePaymob(), { method: "POST", body: {} }),
    onSuccess: async () => {
      toast.success("تم التحقق من مفتاح Paymob الإداري بنجاح");
      await queryClient.invalidateQueries({ queryKey: queryKeys.paymentProviders });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "تعذر التحقق من Paymob"),
  });

  if (providers.isLoading) return <LoadingState label="جار تحميل بوابات الدفع" />;
  if (providers.isError) return <ErrorState message={providers.error.message} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="بوابات الدفع"
        description="إدارة إعدادات الدفع الإنتاجية التي تظهر في متجري التجزئة والجملة. المفاتيح السرية مشفرة ولا يعاد عرضها."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <CodProviderCard />
        {(providers.data ?? []).map((provider) => (
          <ProviderCard
            key={provider.provider}
            provider={provider}
            onEdit={() => setEditing(provider)}
            onValidate={provider.provider === "PAYMOB" ? () => validatePaymob.mutate() : undefined}
            validating={validatePaymob.isPending}
          />
        ))}
      </div>

      <SectionCard
        title="ضوابط الأمان"
        description="هذه الصفحة متاحة لمالك المنصة والمسؤول الأعلى فقط. لا ترسل المفاتيح السرية إلى تطبيق الهاتف أو إلى سجلات النظام."
      >
        <div className="grid gap-3 text-sm text-ink-muted md:grid-cols-3">
          <SecurityPoint icon={LockKeyhole} text="تشفير المفاتيح داخل قاعدة البيانات" />
          <SecurityPoint icon={ShieldCheck} text="Paymob فقط متصل بالدفع حالياً" />
          <SecurityPoint icon={CheckCircle2} text="الدفع عند الاستلام يظل متاحاً دائماً" />
        </div>
      </SectionCard>

      {editing ? (
        <ProviderEditorDialog
          key={editing.provider}
          provider={editing}
          pending={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(body) => save.mutate({ provider: editing.provider, body })}
        />
      ) : null}
    </div>
  );
}

function CodProviderCard() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <ProviderLogo label="الدفع عند الاستلام" logoUrl={null} icon={WalletCards} />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black text-ink-strong">الدفع عند الاستلام</h2>
            <p className="mt-1 text-xs leading-5 text-ink-muted">الخيار الاحتياطي المتاح دائماً للعملاء.</p>
          </div>
          <StatusBadge tone="success">مفعّل</StatusBadge>
        </div>
        <Button type="button" variant="secondary" className="w-full" disabled>إعداد ثابت</Button>
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  onEdit,
  onValidate,
  validating,
}: {
  provider: PaymentProvider;
  onEdit: () => void;
  onValidate?: () => void;
  validating: boolean;
}) {
  const isKashier = provider.provider === "KASHIER";
  const tone = provider.enabled ? "success" : provider.canActivate ? "warning" : "muted";
  const status = isKashier
    ? "إعداد فقط"
    : provider.enabled
      ? "مفعّل"
      : provider.canActivate
        ? "جاهز للتفعيل"
        : "غير مكتمل";
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <ProviderLogo label={provider.displayNameAr} logoUrl={provider.logoUrl} icon={CreditCard} />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black text-ink-strong">{provider.displayNameAr}</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{provider.descriptionAr}</p>
          </div>
          <StatusBadge tone={tone}>{status}</StatusBadge>
        </div>
        {provider.provider === "PAYMOB" ? (
          <div className="flex gap-2 text-xs text-ink-muted">
            <span>البطاقات: {provider.cardEnabled ? "مفعلة" : "متوقفة"}</span>
            <span>•</span>
            <span>المحافظ: {provider.walletEnabled ? "مفعلة" : "متوقفة"}</span>
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            aria-label={`تعديل ${provider.displayNameAr}`}
            onClick={onEdit}
          >
            <Settings2 /> تعديل
          </Button>
          {onValidate ? (
            <Button type="button" className="flex-1" onClick={onValidate} disabled={validating || !provider.canActivate}>
              <ShieldCheck /> تحقق
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProviderLogo({ label, logoUrl, icon: Icon }: { label: string; logoUrl: string | null; icon: typeof CreditCard }) {
  return (
    <div className="flex h-40 items-center justify-center bg-white p-7 text-center">
      {logoUrl ? (
        <div
          role="img"
          aria-label={`شعار ${label}`}
          className="h-full w-full bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${JSON.stringify(logoUrl).slice(1, -1)})` }}
        />
      ) : (
        <div className="flex items-center gap-3 text-3xl font-black tracking-tight text-slate-800">
          <Icon className="size-10 text-primary" /> {label}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone: "success" | "warning" | "muted" }) {
  return (
    <span className={cn(
      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black",
      tone === "success" && "bg-success-soft text-success",
      tone === "warning" && "bg-warning-soft text-warning",
      tone === "muted" && "bg-muted text-ink-muted",
    )}>
      {children}
    </span>
  );
}

function SecurityPoint({ icon: Icon, text }: { icon: typeof LockKeyhole; text: string }) {
  return <div className="flex items-center gap-2 rounded-2xl bg-muted/40 p-3"><Icon className="text-primary" />{text}</div>;
}

function ProviderEditorDialog({
  provider,
  pending,
  onClose,
  onSave,
}: {
  provider: PaymentProvider;
  pending: boolean;
  onClose: () => void;
  onSave: (body: ProviderPatch) => void;
}) {
  const isPaymob = provider.provider === "PAYMOB";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<ProviderPatch | null>(null);
  const form = useForm<ProviderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      enabled: isPaymob ? provider.enabled : false,
      cardEnabled: provider.cardEnabled,
      walletEnabled: provider.walletEnabled,
      displayNameAr: provider.displayNameAr,
      descriptionAr: provider.descriptionAr,
      logoUrl: provider.logoUrl ?? "",
      priority: String(provider.priority),
      secretKey: "",
      publicKey: "",
      apiKey: "",
      hmacSecret: "",
      integrationIdCard: "",
      integrationIdWallet: "",
      merchantId: "",
      apiSecret: "",
      clearSecretKey: false,
      clearPublicKey: false,
      clearApiKey: false,
      clearHmacSecret: false,
      clearIntegrationIdCard: false,
      clearIntegrationIdWallet: false,
      clearMerchantId: false,
      clearApiSecret: false,
    },
  });
  const enabled = useWatch({ control: form.control, name: "enabled" });
  const cardEnabled = useWatch({ control: form.control, name: "cardEnabled" });
  const walletEnabled = useWatch({ control: form.control, name: "walletEnabled" });

  function prepare(values: ProviderFormValues) {
    const credentials: Record<string, string | number | null> = {};
    addSecret(credentials, "apiKey", values.apiKey, values.clearApiKey);
    if (isPaymob) {
      addSecret(credentials, "secretKey", values.secretKey, values.clearSecretKey);
      addSecret(credentials, "publicKey", values.publicKey, values.clearPublicKey);
      addSecret(credentials, "hmacSecret", values.hmacSecret, values.clearHmacSecret);
      addInteger(credentials, "integrationIdCard", values.integrationIdCard, values.clearIntegrationIdCard);
      addInteger(credentials, "integrationIdWallet", values.integrationIdWallet, values.clearIntegrationIdWallet);
    } else {
      addSecret(credentials, "merchantId", values.merchantId, values.clearMerchantId);
      addSecret(credentials, "apiSecret", values.apiSecret, values.clearApiSecret);
    }
    setPendingBody({
      enabled: isPaymob ? values.enabled : false,
      ...(isPaymob ? { cardEnabled: values.cardEnabled, walletEnabled: values.walletEnabled } : {}),
      displayNameAr: values.displayNameAr.trim(),
      descriptionAr: values.descriptionAr.trim(),
      logoUrl: values.logoUrl.trim() || null,
      priority: Number(values.priority),
      language: "ar",
      ...(Object.keys(credentials).length > 0 ? { credentials } : {}),
    });
    setConfirmOpen(true);
  }

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open && !confirmOpen) onClose(); }}>
        <DialogContent dir="rtl" className="max-h-[90vh] max-w-3xl overflow-y-auto text-right">
          <DialogHeader>
            <DialogTitle>إعداد {provider.displayNameAr}</DialogTitle>
            <DialogDescription>
              إعداد إنتاجي واحد. اترك حقل السر فارغاً للاحتفاظ بالقيمة المشفرة الحالية.
            </DialogDescription>
          </DialogHeader>

          <form id="provider-form" onSubmit={form.handleSubmit(prepare)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="الاسم الذي يظهر للعميل" error={form.formState.errors.displayNameAr?.message}>
                <input {...form.register("displayNameAr")} className={inputClass} />
              </FormField>
              <FormField label="الأولوية" error={form.formState.errors.priority?.message}>
                <input {...form.register("priority")} inputMode="numeric" dir="ltr" className={inputClass} />
              </FormField>
              <FormField label="لغة واجهة الدفع" hint="ملف إنتاجي واحد باللغة العربية">
                <input value="العربية" readOnly aria-readonly="true" className={inputClass} />
              </FormField>
              <FormField label="الوصف الذي يظهر للعميل" className="md:col-span-2" error={form.formState.errors.descriptionAr?.message}>
                <textarea {...form.register("descriptionAr")} rows={3} className={inputClass} />
              </FormField>
              <FormField label="رابط الشعار" className="md:col-span-2" hint="HTTPS أو مسار /uploads/">
                <input {...form.register("logoUrl")} dir="ltr" placeholder="https://..." className={inputClass} />
              </FormField>
            </div>

            {isPaymob ? (
              <div className="space-y-3 rounded-2xl border border-border p-4">
                <ToggleRow label="تفعيل Paymob" description="المفتاح الرئيسي للبطاقات والمحافظ" checked={enabled} onChange={(value) => form.setValue("enabled", value, { shouldDirty: true })} />
                <ToggleRow label="الدفع بالبطاقات" description="يحتاج Card Integration ID" checked={cardEnabled} onChange={(value) => form.setValue("cardEnabled", value, { shouldDirty: true })} />
                <ToggleRow label="الدفع بالمحافظ" description="يحتاج Wallet Integration ID" checked={walletEnabled} onChange={(value) => form.setValue("walletEnabled", value, { shouldDirty: true })} />
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              {isPaymob ? (
                <>
                  <SecretField label="Secret Key" name="secretKey" clearName="clearSecretKey" configured={provider.credentialStatus.secretKeyConfigured} form={form} />
                  <SecretField label="Public Key" name="publicKey" clearName="clearPublicKey" configured={provider.credentialStatus.publicKeyConfigured} form={form} />
                  <SecretField label="Management API Key" name="apiKey" clearName="clearApiKey" configured={provider.credentialStatus.apiKeyConfigured} form={form} />
                  <SecretField label="HMAC Secret" name="hmacSecret" clearName="clearHmacSecret" configured={provider.credentialStatus.hmacSecretConfigured} form={form} />
                  <SecretField label="Card Integration ID" name="integrationIdCard" clearName="clearIntegrationIdCard" configured={provider.credentialStatus.cardIntegrationConfigured} form={form} numeric />
                  <SecretField label="Wallet Integration ID" name="integrationIdWallet" clearName="clearIntegrationIdWallet" configured={provider.credentialStatus.walletIntegrationConfigured} form={form} numeric />
                </>
              ) : (
                <>
                  <SecretField label="Merchant ID" name="merchantId" clearName="clearMerchantId" configured={provider.credentialStatus.merchantIdConfigured} form={form} />
                  <SecretField label="API Key" name="apiKey" clearName="clearApiKey" configured={provider.credentialStatus.apiKeyConfigured} form={form} />
                  <SecretField label="API Secret" name="apiSecret" clearName="clearApiSecret" configured={provider.credentialStatus.apiSecretConfigured} form={form} />
                </>
              )}
            </div>
          </form>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
            <Button type="submit" form="provider-form" disabled={pending}>مراجعة وحفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionDialog
        open={confirmOpen}
        title="تأكيد حفظ إعدادات الدفع"
        description="سيؤثر حفظ إعدادات Paymob المفعلة على متجري التجزئة والجملة مباشرة. لن يتم عرض أي قيمة سرية بعد الحفظ."
        confirmLabel="حفظ الإعدادات"
        variant={pendingBody?.enabled ? "success" : "default"}
        requireReason
        reasonLabel="سبب التغيير"
        reasonPlaceholder="مثال: إضافة مفاتيح Paymob الإنتاجية الخاصة بالعميل"
        disabled={pending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(reason) => {
          if (!pendingBody) return;
          onSave({ ...pendingBody, reason });
        }}
      />
    </>
  );
}

function FormField({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block space-y-2 text-sm font-bold text-ink-strong", className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="block text-[11px] font-normal text-ink-muted">{hint}</span> : null}
      {error ? <span className="block text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-muted/40 p-3">
      <div><div className="text-sm font-black text-ink-strong">{label}</div><div className="text-xs text-ink-muted">{description}</div></div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

type SecretName = "secretKey" | "publicKey" | "apiKey" | "hmacSecret" | "integrationIdCard" | "integrationIdWallet" | "merchantId" | "apiSecret";
type ClearName = "clearSecretKey" | "clearPublicKey" | "clearApiKey" | "clearHmacSecret" | "clearIntegrationIdCard" | "clearIntegrationIdWallet" | "clearMerchantId" | "clearApiSecret";

function SecretField({ label, name, clearName, configured, form, numeric = false }: { label: string; name: SecretName; clearName: ClearName; configured?: boolean; form: UseFormReturn<ProviderFormValues>; numeric?: boolean }) {
  const clear = useWatch({ control: form.control, name: clearName });
  return (
    <FormField label={label} hint={configured ? "محفوظ ومشفر — أدخل قيمة جديدة للاستبدال" : "غير محفوظ"}>
      <input
        {...form.register(name)}
        type={numeric ? "text" : "password"}
        inputMode={numeric ? "numeric" : undefined}
        dir="ltr"
        disabled={clear}
        autoComplete="new-password"
        placeholder={configured ? "••••••••••••" : "مطلوب قبل التفعيل"}
        className={inputClass}
      />
      {configured ? (
        <span className="flex items-center gap-2 text-xs font-normal text-ink-muted">
          <input type="checkbox" {...form.register(clearName)} /> مسح القيمة المحفوظة
        </span>
      ) : null}
    </FormField>
  );
}

function addSecret(target: Record<string, string | number | null>, key: string, value: string, clear: boolean) {
  if (clear) target[key] = null;
  else if (value.trim()) target[key] = value.trim();
}

function addInteger(target: Record<string, string | number | null>, key: string, value: string, clear: boolean) {
  if (clear) target[key] = null;
  else if (value.trim()) target[key] = Number(value);
}

const inputClass = "w-full rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-sm font-normal text-ink-strong outline-none transition focus:border-primary focus:bg-card focus:ring-4 focus:ring-primary/10 disabled:opacity-50";
