"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { CursorDataTable } from "@/components/data-table/cursor-data-table";
import { PageHeader } from "@/components/layout/page-header";
import { ErrorState, LoadingState } from "@/components/state/async-states";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status/status-badge";
import { EntityEditorDrawer } from "@/components/forms/entity-editor-drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { adminApi } from "@/lib/api/admin-client";
import { adminPaths } from "@/lib/api/paths";
import { localizedText } from "@/lib/formatters";

const locationSchema = z.object({
  name: z.object({
    ar: z.string().trim().min(1, "الاسم العربي مطلوب"),
    en: z.string().trim().optional().or(z.literal("")),
  }),
  isActive: z.string().default("true"),
});

type LocationValues = z.infer<typeof locationSchema>;

type LocationRecord = {
  id?: string;
  publicId?: string;
  code?: string;
  name?: {
    ar?: string;
    en?: string;
  } | string;
  countryId?: string;
  cityId?: string;
  isActive?: boolean;
};

function i18nValue(value: unknown, locale: "ar" | "en"): string {
  if (value && typeof value === "object") {
    const localized = (value as Record<string, unknown>)[locale];
    return typeof localized === "string" ? localized : "";
  }
  return locale === "ar" && typeof value === "string" ? value : "";
}

export function LocationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"countries" | "cities" | "areas">("countries");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationRecord | null>(null);

  // Fetch list of locations for active tab
  const listPath = `/api/admin/admin/locations/${activeTab}`;
  const locationsQuery = useQuery({
    queryKey: [listPath],
    queryFn: () => adminApi<LocationRecord[]>(listPath),
  });

  const updateLocation = useMutation({
    mutationFn: (values: LocationValues) => {
      if (!selectedLocation) throw new Error("No location selected");
      const id = String(selectedLocation.id ?? selectedLocation.publicId ?? selectedLocation.code);
      const url = adminPaths.locationDetail(activeTab, id);
      
      const body = {
        name: values.name,
        isActive: values.isActive === "true",
      };

      return adminApi(url, {
        method: "PATCH",
        body,
      });
    },
    onSuccess: async () => {
      toast.success("تم تحديث الموقع بنجاح");
      setDrawerOpen(false);
      setSelectedLocation(null);
      await queryClient.invalidateQueries({ queryKey: [listPath] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث الموقع");
    },
  });

  const handleEdit = (row: LocationRecord) => {
    setSelectedLocation(row);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="المواقع الجغرافية"
        description="إدارة الدول والمدن والمناطق الجغرافية لتحديد نطاق التوصيل وعمولات الشحن."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "countries" | "cities" | "areas")} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="countries">الدول</TabsTrigger>
          <TabsTrigger value="cities">المدن</TabsTrigger>
          <TabsTrigger value="areas">المناطق</TabsTrigger>
        </TabsList>

        {["countries", "cities", "areas"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <SectionCard
              title={tab === "countries" ? "قائمة الدول" : tab === "cities" ? "قائمة المدن" : "قائمة المناطق"}
              description="تحديث التسميات وحالة التفعيل للمواقع الجغرافية."
            >
              {locationsQuery.isLoading ? (
                <LoadingState label="جار تحميل المواقع الجغرافية..." />
              ) : locationsQuery.isError ? (
                <ErrorState message={locationsQuery.error.message} />
              ) : !locationsQuery.data || locationsQuery.data.length === 0 ? (
                <div className="grid place-items-center py-10 text-sm text-ink-muted">
                  لا توجد مواقع جغرافية مضافة في هذا القسم.
                </div>
              ) : (
                <CursorDataTable
                  data={locationsQuery.data}
                  getRowKey={(row) => String(row.id ?? row.publicId ?? row.code)}
                  columns={[
                    {
                      id: "code",
                      header: "الرمز / المعرف",
                      cell: (row) => (
                        <span className="font-mono text-xs font-semibold text-ink-strong">
                          {String(row.code ?? row.publicId ?? row.id)}
                        </span>
                      ),
                    },
                    {
                      id: "name",
                      header: "الاسم",
                      cell: (row) => (
                        <div>
                          <div className="font-bold text-ink-strong">
                            {localizedText(row.name, String(row.code ?? row.id), "ar")}
                          </div>
                          {typeof row.name === "object" && row.name?.en ? (
                            <div className="text-xs text-ink-muted">{row.name.en}</div>
                          ) : null}
                        </div>
                      ),
                    },
                    {
                      id: "parent",
                      header: tab === "cities" ? "الدولة التابعة" : tab === "areas" ? "المدينة التابعة" : "النطاق",
                      cell: (row) => (
                        <span className="text-sm text-ink-strong">
                          {tab === "cities" ? String(row.countryId ?? "—") : tab === "areas" ? String(row.cityId ?? "—") : "دولي"}
                        </span>
                      ),
                    },
                    {
                      id: "status",
                      header: "الحالة",
                      cell: (row) => (
                        <StatusBadge status={row.isActive === false ? "INACTIVE" : "ACTIVE"} />
                      ),
                    },
                    {
                      id: "actions",
                      header: "إجراءات",
                      cell: (row) => (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(row)}
                        >
                          <Pencil className="me-1 size-3.5" />
                          تعديل
                        </Button>
                      ),
                    },
                  ]}
                />
              )}
            </SectionCard>
          </TabsContent>
        ))}
      </Tabs>

      <EntityEditorDrawer<LocationValues>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selectedLocation ? `تعديل اسم وحالة الموقع` : `إضافة موقع`}
        description="يرجى ملء الحقول لتحديث بيانات الموقع الجغرافي."
        schema={locationSchema}
        pending={updateLocation.isPending}
        defaultValues={{
          name: {
            ar: i18nValue(selectedLocation?.name, "ar"),
            en: i18nValue(selectedLocation?.name, "en"),
          },
          isActive: selectedLocation?.isActive === false ? "false" : "true",
        }}
        fields={[
          { name: "name.ar", label: "الاسم (عربي)", required: true },
          { name: "name.en", label: "الاسم (إنجليزي)", dir: "ltr" },
          {
            name: "isActive",
            label: "الحالة",
            kind: "select",
            options: [
              { value: "true", label: "نشط" },
              { value: "false", label: "غير نشط" },
            ],
            required: true,
          },
        ]}
        onSubmit={(values) => updateLocation.mutate(values)}
      />
    </div>
  );
}
