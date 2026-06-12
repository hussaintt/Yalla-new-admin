"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, MapPin, Navigation, Pencil, Plus, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { EntityEditorDrawer, type EditorField } from "@/components/forms/entity-editor-drawer";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/state/async-states";
import { StatusBadge } from "@/components/status/status-badge";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { localizedText } from "@/lib/formatters";

type LocationRecord = {
  id?: number | string;
  publicId?: string;
  code?: string;
  name?: { ar?: string; en?: string } | string;
  phoneCode?: string;
  currency?: string;
  countryId?: number | string;
  cityId?: number | string;
  postalCode?: string | null;
  isActive?: boolean;
  _count?: { cities?: number; areas?: number };
  country?: { name?: { ar?: string; en?: string } | string };
  city?: { name?: { ar?: string; en?: string } | string };
};

function i18nValue(value: unknown, locale: "ar" | "en"): string {
  if (value && typeof value === "object") {
    const localized = (value as Record<string, unknown>)[locale];
    return typeof localized === "string" ? localized : "";
  }
  return locale === "ar" && typeof value === "string" ? value : "";
}

function locationId(row: LocationRecord): string {
  return String(row.id ?? row.publicId ?? row.code ?? "");
}

const editSchema = z.object({
  nameAr: z.string().trim().min(1, "الاسم العربي مطلوب"),
  nameEn: z.string().trim().optional().or(z.literal("")),
  isActive: z.string().default("true"),
});

type EditValues = z.infer<typeof editSchema>;

const editFields: EditorField<EditValues>[] = [
  { name: "nameAr", label: "الاسم (عربي)", required: true },
  { name: "nameEn", label: "الاسم (إنجليزي)", dir: "ltr" },
  { name: "isActive", label: "الحالة", kind: "select", options: [{ value: "true", label: "نشط" }, { value: "false", label: "غير نشط" }], required: true },
];

const createCountrySchema = z.object({
  nameAr: z.string().trim().min(1, "الاسم العربي مطلوب"),
  nameEn: z.string().trim().min(1, "الاسم الإنجليزي مطلوب"),
  code: z.string().trim().min(2, "رمز الدولة مطلوب").max(2),
  phoneCode: z.string().trim().min(1, "رمز الهاتف مطلوب"),
  currency: z.string().trim().min(3, "رمز العملة مطلوب").max(3),
});

type CreateCountryValues = z.infer<typeof createCountrySchema>;

const createCountryFields: EditorField<CreateCountryValues>[] = [
  { name: "nameAr", label: "الاسم (عربي)", required: true, colSpan: 2 },
  { name: "nameEn", label: "الاسم (إنجليزي)", required: true, dir: "ltr", colSpan: 2 },
  { name: "code", label: "رمز الدولة (ISO)", required: true, placeholder: "EG", dir: "ltr" },
  { name: "phoneCode", label: "رمز الهاتف", required: true, placeholder: "+20", dir: "ltr" },
  { name: "currency", label: "رمز العملة", required: true, placeholder: "EGP", dir: "ltr" },
];

const createCitySchema = z.object({
  nameAr: z.string().trim().min(1, "الاسم العربي مطلوب"),
  nameEn: z.string().trim().min(1, "الاسم الإنجليزي مطلوب"),
  countryId: z.string().min(1, "الدولة مطلوبة"),
  isActive: z.string().default("true"),
});

type CreateCityValues = z.infer<typeof createCitySchema>;

const createAreaSchema = z.object({
  nameAr: z.string().trim().min(1, "الاسم العربي مطلوب"),
  nameEn: z.string().trim().min(1, "الاسم الإنجليزي مطلوب"),
  cityId: z.string().min(1, "المدينة مطلوبة"),
  postalCode: z.string().optional().default(""),
  isActive: z.string().default("true"),
});

type CreateAreaValues = z.infer<typeof createAreaSchema>;

export function LocationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"countries" | "cities" | "areas">("countries");
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationRecord | null>(null);

  const countriesPath = "/api/admin/admin/locations/countries";
  const citiesPath = "/api/admin/admin/locations/cities";
  const areasPath = "/api/admin/admin/locations/areas";

  const countriesQuery = useQuery({
    queryKey: [countriesPath],
    queryFn: () => adminApi<LocationRecord[]>(countriesPath),
  });
  const citiesQuery = useQuery({
    queryKey: [citiesPath],
    queryFn: () => adminApi<LocationRecord[]>(citiesPath),
  });
  const areasQuery = useQuery({
    queryKey: [areasPath],
    queryFn: () => adminApi<LocationRecord[]>(areasPath),
  });

  const countries = Array.isArray(countriesQuery.data) ? countriesQuery.data : [];
  const cities = Array.isArray(citiesQuery.data) ? citiesQuery.data : [];
  const areas = Array.isArray(areasQuery.data) ? areasQuery.data : [];

  const updateLocation = useMutation({
    mutationFn: (values: EditValues) => {
      if (!selectedLocation) throw new Error("No location selected");
      const id = locationId(selectedLocation);
      return adminApi(adminPaths.locationDetail(activeTab, id), {
        method: "PATCH",
        body: { name: { ar: values.nameAr, en: values.nameEn || undefined }, isActive: values.isActive === "true" },
      });
    },
    onSuccess: async () => {
      toast.success("تم تحديث الموقع بنجاح");
      setEditDrawerOpen(false);
      setSelectedLocation(null);
      await invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر تحديث الموقع"),
  });

  const createCountry = useMutation({
    mutationFn: (values: CreateCountryValues) =>
      adminApi(countriesPath, {
        method: "POST",
        body: { code: values.code.toUpperCase(), name: { ar: values.nameAr, en: values.nameEn }, phoneCode: values.phoneCode, currency: values.currency.toUpperCase() },
      }),
    onSuccess: async () => {
      toast.success("تم إضافة الدولة بنجاح");
      setCreateDrawerOpen(false);
      await invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إضافة الدولة"),
  });

  const createCity = useMutation({
    mutationFn: (values: CreateCityValues) =>
      adminApi(citiesPath, {
        method: "POST",
        body: { countryId: Number(values.countryId), name: { ar: values.nameAr, en: values.nameEn }, isActive: values.isActive === "true" },
      }),
    onSuccess: async () => {
      toast.success("تم إضافة المدينة بنجاح");
      setCreateDrawerOpen(false);
      await invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إضافة المدينة"),
  });

  const createArea = useMutation({
    mutationFn: (values: CreateAreaValues) =>
      adminApi(areasPath, {
        method: "POST",
        body: { cityId: Number(values.cityId), name: { ar: values.nameAr, en: values.nameEn }, postalCode: values.postalCode || undefined, isActive: values.isActive === "true" },
      }),
    onSuccess: async () => {
      toast.success("تم إضافة المنطقة بنجاح");
      setCreateDrawerOpen(false);
      await invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر إضافة المنطقة"),
  });

  const syncEgypt = useMutation({
    mutationFn: () =>
      adminApi("/api/admin/admin/locations/egypt/sync", { method: "POST", body: {} }),
    onSuccess: async () => {
      toast.success("تم استيراد بيانات مصر بنجاح (المحافظات والمدن)");
      await invalidateAll();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذر استيراد بيانات مصر"),
  });

  async function invalidateAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [countriesPath] }),
      queryClient.invalidateQueries({ queryKey: [citiesPath] }),
      queryClient.invalidateQueries({ queryKey: [areasPath] }),
    ]);
  }

  function handleEdit(row: LocationRecord) {
    setSelectedLocation(row);
    setEditDrawerOpen(true);
  }

  function parentName(row: LocationRecord, parentList: LocationRecord[], key: "countryId" | "cityId") {
    const parentId = row[key];
    if (!parentId) return "—";
    const parent = parentList.find((p) => String(p.id) === String(parentId));
    if (parent) return localizedText(parent.name, String(parentId), "ar");
    return String(parentId);
  }

  const createCityFields: EditorField<CreateCityValues>[] = [
    { name: "nameAr", label: "الاسم (عربي)", required: true, colSpan: 2 },
    { name: "nameEn", label: "الاسم (إنجليزي)", required: true, dir: "ltr", colSpan: 2 },
    {
      name: "countryId",
      label: "الدولة",
      kind: "select",
      required: true,
      options: countries.map((c) => ({ value: String(c.id), label: localizedText(c.name, String(c.code ?? c.id), "ar") })),
    },
    { name: "isActive", label: "الحالة", kind: "select", options: [{ value: "true", label: "نشط" }, { value: "false", label: "غير نشط" }] },
  ];

  const createAreaFields: EditorField<CreateAreaValues>[] = [
    { name: "nameAr", label: "الاسم (عربي)", required: true, colSpan: 2 },
    { name: "nameEn", label: "الاسم (إنجليزي)", required: true, dir: "ltr", colSpan: 2 },
    {
      name: "cityId",
      label: "المحافظة",
      kind: "select",
      required: true,
      options: cities.map((c) => ({ value: String(c.id), label: localizedText(c.name, String(c.id), "ar") })),
    },
    { name: "postalCode", label: "الرمز البريدي", dir: "ltr" },
    { name: "isActive", label: "الحالة", kind: "select", options: [{ value: "true", label: "نشط" }, { value: "false", label: "غير نشط" }] },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="المواقع الجغرافية"
        description="إدارة الدول والمدن والمناطق الجغرافية لتحديد نطاق التوصيل وعمولات الشحن."
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={syncEgypt.isPending}
            onClick={() => syncEgypt.mutate()}
          >
            <RefreshCw className={`me-1.5 size-4 ${syncEgypt.isPending ? "animate-spin" : ""}`} />
            استيراد بيانات مصر
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <KpiCard icon={Globe} tone="blue" label="الدول" value={countriesQuery.isLoading ? "..." : countries.length} />
        <KpiCard icon={MapPin} tone="teal" label="المحافظات" value={citiesQuery.isLoading ? "..." : cities.length} />
        <KpiCard icon={Navigation} tone="purple" label="المدن" value={areasQuery.isLoading ? "..." : areas.length} />
      </section>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "countries" | "cities" | "areas")} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="countries">الدول ({countries.length})</TabsTrigger>
          <TabsTrigger value="cities">المحافظات ({cities.length})</TabsTrigger>
          <TabsTrigger value="areas">المدن ({areas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="countries" className="space-y-4">
          <SectionCard
            title="قائمة الدول"
            description="الدول المسجلة في النظام مع رموزها وعملاتها."
            actions={
              <Button type="button" variant="primary" onClick={() => setCreateDrawerOpen(true)}>
                <Plus className="me-1.5 size-4" />
                إضافة دولة
              </Button>
            }
          >
            {countriesQuery.isLoading ? (
              <LoadingState label="جار تحميل الدول..." />
            ) : countriesQuery.isError ? (
              <ErrorState message={countriesQuery.error.message} />
            ) : countries.length === 0 ? (
              <EmptyState title="لا توجد دول مضافة" description="ابدأ بإضافة دولة أو استخدم زر استيراد بيانات مصر." />
            ) : (
              <CursorDataTable
                data={countries}
                getRowKey={(row) => locationId(row)}
                columns={[
                  { id: "code", header: "الرمز", cell: (row) => <span className="font-mono text-xs font-semibold text-ink-strong">{String(row.code ?? row.id)}</span> },
                  {
                    id: "name", header: "الاسم", cell: (row) => (
                      <div>
                        <div className="font-bold text-ink-strong">{localizedText(row.name, String(row.code ?? row.id), "ar")}</div>
                        {typeof row.name === "object" && row.name?.en ? <div className="text-xs text-ink-muted">{row.name.en}</div> : null}
                      </div>
                    ),
                  },
                  { id: "phone", header: "رمز الهاتف", cell: (row) => <span dir="ltr" className="text-sm text-ink-strong">{String(row.phoneCode ?? "-")}</span> },
                  { id: "currency", header: "العملة", cell: (row) => <span className="font-mono text-xs text-ink-strong">{String(row.currency ?? "-")}</span> },
                  { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={row.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
                  {
                    id: "actions", header: "إجراءات", cell: (row) => (
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleEdit(row)}>
                        <Pencil className="me-1 size-3.5" /> تعديل
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="cities" className="space-y-4">
          <SectionCard
            title="قائمة المحافظات"
            description="المحافظات المسجلة تحت كل دولة."
            actions={
              <Button type="button" variant="primary" onClick={() => setCreateDrawerOpen(true)}>
                <Plus className="me-1.5 size-4" />
                إضافة مدينة
              </Button>
            }
          >
            {citiesQuery.isLoading ? (
              <LoadingState label="جار تحميل المدن..." />
            ) : citiesQuery.isError ? (
              <ErrorState message={citiesQuery.error.message} />
            ) : cities.length === 0 ? (
              <EmptyState title="لا توجد مدن مضافة" description="ابدأ بإضافة مدينة أو استخدم زر استيراد بيانات مصر." />
            ) : (
              <CursorDataTable
                data={cities}
                getRowKey={(row) => locationId(row)}
                columns={[
                  { id: "id", header: "المعرف", cell: (row) => <span className="font-mono text-xs font-semibold text-ink-strong">{locationId(row)}</span> },
                  {
                    id: "name", header: "الاسم", cell: (row) => (
                      <div>
                        <div className="font-bold text-ink-strong">{localizedText(row.name, String(row.id), "ar")}</div>
                        {typeof row.name === "object" && row.name?.en ? <div className="text-xs text-ink-muted">{row.name.en}</div> : null}
                      </div>
                    ),
                  },
                  { id: "country", header: "الدولة", cell: (row) => parentName(row, countries, "countryId") },
                  { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={row.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
                  {
                    id: "actions", header: "إجراءات", cell: (row) => (
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleEdit(row)}>
                        <Pencil className="me-1 size-3.5" /> تعديل
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="areas" className="space-y-4">
          <SectionCard
            title="قائمة المناطق"
            description="المناطق الفرعية تحت كل مدينة."
            actions={
              <Button type="button" variant="primary" onClick={() => setCreateDrawerOpen(true)}>
                <Plus className="me-1.5 size-4" />
                إضافة منطقة
              </Button>
            }
          >
            {areasQuery.isLoading ? (
              <LoadingState label="جار تحميل المناطق..." />
            ) : areasQuery.isError ? (
              <ErrorState message={areasQuery.error.message} />
            ) : areas.length === 0 ? (
              <EmptyState title="لا توجد مناطق مضافة" description="ابدأ بإضافة منطقة تحت مدينة." />
            ) : (
              <CursorDataTable
                data={areas}
                getRowKey={(row) => locationId(row)}
                columns={[
                  { id: "id", header: "المعرف", cell: (row) => <span className="font-mono text-xs font-semibold text-ink-strong">{locationId(row)}</span> },
                  {
                    id: "name", header: "المدينة", cell: (row) => (
                      <div>
                        <div className="font-bold text-ink-strong">{localizedText(row.name, String(row.id), "ar")}</div>
                        {typeof row.name === "object" && row.name?.en ? <div className="text-xs text-ink-muted">{row.name.en}</div> : null}
                      </div>
                    ),
                  },
                  { id: "city", header: "المحافظة", cell: (row) => parentName(row, cities, "cityId") },
                  { id: "postal", header: "الرمز البريدي", cell: (row) => String(row.postalCode ?? "-") },
                  { id: "status", header: "الحالة", cell: (row) => <StatusBadge status={row.isActive === false ? "INACTIVE" : "ACTIVE"} /> },
                  {
                    id: "actions", header: "إجراءات", cell: (row) => (
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleEdit(row)}>
                        <Pencil className="me-1 size-3.5" /> تعديل
                      </Button>
                    ),
                  },
                ]}
              />
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Edit drawer (shared across all tabs) */}
      <EntityEditorDrawer<EditValues>
        open={editDrawerOpen}
        onOpenChange={setEditDrawerOpen}
        title="تعديل اسم وحالة الموقع"
        description="يرجى ملء الحقول لتحديث بيانات الموقع الجغرافي."
        schema={editSchema}
        pending={updateLocation.isPending}
        defaultValues={{
          nameAr: i18nValue(selectedLocation?.name, "ar"),
          nameEn: i18nValue(selectedLocation?.name, "en"),
          isActive: selectedLocation?.isActive === false ? "false" : "true",
        }}
        fields={editFields}
        onSubmit={(values) => updateLocation.mutate(values)}
      />

      {/* Create drawers per tab */}
      {activeTab === "countries" ? (
        <EntityEditorDrawer<CreateCountryValues>
          open={createDrawerOpen}
          onOpenChange={setCreateDrawerOpen}
          title="إضافة دولة جديدة"
          description="أدخل بيانات الدولة الجغرافية."
          schema={createCountrySchema}
          pending={createCountry.isPending}
          defaultValues={{ nameAr: "", nameEn: "", code: "", phoneCode: "", currency: "" }}
          fields={createCountryFields}
          onSubmit={(values) => createCountry.mutate(values)}
        />
      ) : activeTab === "cities" ? (
        <EntityEditorDrawer<CreateCityValues>
          open={createDrawerOpen}
          onOpenChange={setCreateDrawerOpen}
          title="إضافة مدينة جديدة"
          description="اختر الدولة ثم أدخل اسم المدينة."
          schema={createCitySchema}
          pending={createCity.isPending}
          defaultValues={{ nameAr: "", nameEn: "", countryId: "", isActive: "true" }}
          fields={createCityFields}
          onSubmit={(values) => createCity.mutate(values)}
        />
      ) : (
        <EntityEditorDrawer<CreateAreaValues>
          open={createDrawerOpen}
          onOpenChange={setCreateDrawerOpen}
          title="إضافة منطقة جديدة"
          description="اختر المدينة ثم أدخل اسم المنطقة."
          schema={createAreaSchema}
          pending={createArea.isPending}
          defaultValues={{ nameAr: "", nameEn: "", cityId: "", postalCode: "", isActive: "true" }}
          fields={createAreaFields}
          onSubmit={(values) => createArea.mutate(values)}
        />
      )}
    </div>
  );
}
