"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField, FormInput, FormSelect } from "@/components/ui/form-field";

import {
  generateCouponCode,
  promotionFormSchema,
  promotionToFormValues,
  type PromotionFormValues,
} from "./schema";
import type { Promotion } from "./types";

type PromotionEditorDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promotion: Promotion | null;
  pending?: boolean;
  onSubmit: (values: PromotionFormValues) => void;
};

/**
 * Create/edit drawer for coupons. Hand-rolled (instead of EntityEditorDrawer)
 * because the value fields depend on the selected discount type.
 */
export function PromotionEditorDrawer({
  open,
  onOpenChange,
  promotion,
  pending = false,
  onSubmit,
}: PromotionEditorDrawerProps) {
  const isEdit = Boolean(promotion);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: promotionToFormValues(promotion),
  });

  const discountType = watch("discountType");

  // Re-seed the form whenever the drawer is (re)opened for a different row.
  React.useEffect(() => {
    if (open) reset(promotionToFormValues(promotion));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, promotion?.publicId]);

  const fieldError = (name: keyof PromotionFormValues) =>
    errors[name]?.message as string | undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent
        dir="rtl"
        className="top-0 right-0 left-auto h-dvh max-h-dvh w-full max-w-md translate-x-0 translate-y-0 gap-0 rounded-none rounded-s-2xl p-0"
      >
        <form
          onSubmit={handleSubmit((values) => onSubmit(values))}
          className="flex h-full flex-col"
        >
          <DialogHeader className="border-b border-border p-6 pt-12">
            <DialogTitle>{isEdit ? "تعديل الكوبون" : "إنشاء كوبون جديد"}</DialogTitle>
            <DialogDescription>
              حدد نوع الخصم وقيمته وعدد مرات الاستخدام وفترة الصلاحية.
            </DialogDescription>
          </DialogHeader>

          <div className="grid flex-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
            <FormField
              label="كود الكوبون"
              required
              error={fieldError("code")}
              hint="هذا هو الكود الذي يدخله العميل عند الدفع."
              className="md:col-span-2"
            >
              {(props) => (
                <div className="flex items-center gap-2">
                  <FormInput
                    {...props}
                    invalid={Boolean(fieldError("code"))}
                    dir="ltr"
                    placeholder="SAVE10"
                    className="font-mono uppercase"
                    {...register("code")}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      setValue("code", generateCouponCode(), {
                        shouldValidate: true,
                      })
                    }
                  >
                    <Wand2 className="me-1 size-3.5" />
                    توليد
                  </Button>
                </div>
              )}
            </FormField>

            <FormField label="الاسم (عربي)" required error={fieldError("nameAr")}>
              {(props) => (
                <FormInput
                  {...props}
                  invalid={Boolean(fieldError("nameAr"))}
                  placeholder="خصم الافتتاح"
                  {...register("nameAr")}
                />
              )}
            </FormField>

            <FormField label="الاسم (إنجليزي)" error={fieldError("nameEn")}>
              {(props) => (
                <FormInput
                  {...props}
                  invalid={Boolean(fieldError("nameEn"))}
                  dir="ltr"
                  placeholder="Opening discount"
                  {...register("nameEn")}
                />
              )}
            </FormField>

            <FormField
              label="نوع الخصم"
              required
              error={fieldError("discountType")}
              className="md:col-span-2"
            >
              {(props) => (
                <FormSelect
                  {...props}
                  invalid={Boolean(fieldError("discountType"))}
                  {...register("discountType")}
                >
                  <option value="PERCENTAGE">نسبة مئوية %</option>
                  <option value="FIXED">مبلغ ثابت</option>
                  <option value="FREE_SHIPPING">شحن مجاني</option>
                </FormSelect>
              )}
            </FormField>

            {discountType === "PERCENTAGE" ? (
              <>
                <FormField
                  label="نسبة الخصم %"
                  required
                  error={fieldError("percentValue")}
                >
                  {(props) => (
                    <FormInput
                      {...props}
                      invalid={Boolean(fieldError("percentValue"))}
                      type="number"
                      dir="ltr"
                      min={1}
                      max={100}
                      step="0.5"
                      placeholder="10"
                      {...register("percentValue")}
                    />
                  )}
                </FormField>
                <FormField
                  label="أقصى قيمة للخصم (ج.م)"
                  error={fieldError("maxDiscountEgp")}
                  hint="اتركه فارغاً بدون حد أقصى."
                >
                  {(props) => (
                    <FormInput
                      {...props}
                      invalid={Boolean(fieldError("maxDiscountEgp"))}
                      type="number"
                      dir="ltr"
                      min={1}
                      step="0.01"
                      placeholder="50"
                      {...register("maxDiscountEgp")}
                    />
                  )}
                </FormField>
              </>
            ) : null}

            {discountType === "FIXED" ? (
              <FormField
                label="قيمة الخصم (ج.م)"
                required
                error={fieldError("amountEgp")}
                className="md:col-span-2"
              >
                {(props) => (
                  <FormInput
                    {...props}
                    invalid={Boolean(fieldError("amountEgp"))}
                    type="number"
                    dir="ltr"
                    min={1}
                    step="0.01"
                    placeholder="50"
                    {...register("amountEgp")}
                  />
                )}
              </FormField>
            ) : null}

            <FormField
              label="الحد الأدنى لقيمة الطلب (ج.م)"
              error={fieldError("minSubtotalEgp")}
              hint="اتركه فارغاً بدون حد أدنى."
            >
              {(props) => (
                <FormInput
                  {...props}
                  invalid={Boolean(fieldError("minSubtotalEgp"))}
                  type="number"
                  dir="ltr"
                  min={0}
                  step="0.01"
                  placeholder="200"
                  {...register("minSubtotalEgp")}
                />
              )}
            </FormField>

            <FormField
              label="عدد مرات الاستخدام الكلي"
              error={fieldError("usageLimitTotal")}
              hint="إجمالي مرات استخدام الكوبون على المنصة. فارغ = غير محدود."
            >
              {(props) => (
                <FormInput
                  {...props}
                  invalid={Boolean(fieldError("usageLimitTotal"))}
                  type="number"
                  dir="ltr"
                  min={1}
                  placeholder="100"
                  {...register("usageLimitTotal")}
                />
              )}
            </FormField>

            <FormField
              label="حد الاستخدام لكل عميل"
              error={fieldError("usageLimitPerUser")}
              hint="فارغ = غير محدود."
            >
              {(props) => (
                <FormInput
                  {...props}
                  invalid={Boolean(fieldError("usageLimitPerUser"))}
                  type="number"
                  dir="ltr"
                  min={1}
                  placeholder="1"
                  {...register("usageLimitPerUser")}
                />
              )}
            </FormField>

            <FormField label="الحالة" required error={fieldError("status")}>
              {(props) => (
                <FormSelect
                  {...props}
                  invalid={Boolean(fieldError("status"))}
                  {...register("status")}
                >
                  <option value="ACTIVE">نشط</option>
                  <option value="DRAFT">مسودة</option>
                  <option value="CANCELLED">ملغي</option>
                </FormSelect>
              )}
            </FormField>

            <FormField
              label="بداية الصلاحية"
              required
              error={fieldError("validFrom")}
            >
              {(props) => (
                <FormInput
                  {...props}
                  invalid={Boolean(fieldError("validFrom"))}
                  type="datetime-local"
                  dir="ltr"
                  {...register("validFrom")}
                />
              )}
            </FormField>

            <FormField
              label="نهاية الصلاحية"
              error={fieldError("validUntil")}
              hint="اتركه فارغاً ليبقى الكوبون صالحاً بدون تاريخ انتهاء."
            >
              {(props) => (
                <FormInput
                  {...props}
                  invalid={Boolean(fieldError("validUntil"))}
                  type="datetime-local"
                  dir="ltr"
                  {...register("validUntil")}
                />
              )}
            </FormField>
          </div>

          <DialogFooter className="border-t border-border p-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isEdit ? "حفظ التعديلات" : "إنشاء الكوبون"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
