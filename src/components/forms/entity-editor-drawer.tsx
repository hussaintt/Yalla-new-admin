"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
} from "react-hook-form";
import { Loader2 } from "lucide-react";
import type { ZodType } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormField,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-field";

export type EditorFieldOption = { value: string; label: string };

export type EditorField<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  kind?: "text" | "number" | "email" | "tel" | "textarea" | "select";
  options?: EditorFieldOption[];
  required?: boolean;
  hint?: React.ReactNode;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  colSpan?: 1 | 2;
  rows?: number;
};

type EntityEditorDrawerProps<T extends FieldValues> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  schema: ZodType<T>;
  fields: EditorField<T>[];
  defaultValues: DefaultValues<T>;
  submitLabel?: string;
  pending?: boolean;
  onSubmit: (values: T) => void;
};

/**
 * Standardized, schema-driven entity editor rendered as an RTL right-side
 * slide-over on top of the shared Radix Dialog. Declare a zod `schema` plus a
 * `fields[]` config and wire `onSubmit` to a TanStack `useMutation` — that's
 * the whole pattern for create/edit forms across the admin panel.
 */
export function EntityEditorDrawer<T extends FieldValues>({
  open,
  onOpenChange,
  title,
  description,
  schema,
  fields,
  defaultValues,
  submitLabel = "حفظ",
  pending = false,
  onSubmit,
}: EntityEditorDrawerProps<T>) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<T>({
    resolver: zodResolver(
      schema as unknown as Parameters<typeof zodResolver>[0],
    ) as unknown as Resolver<T>,
    defaultValues,
  });

  // Re-seed the form whenever the drawer is (re)opened for a different row.
  React.useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
            <DialogTitle>{title}</DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>

          <div className="grid flex-1 gap-4 overflow-y-auto p-6 md:grid-cols-2">
            {fields.map((field) => {
              const error = errors[field.name]?.message as string | undefined;
              return (
                <FormField
                  key={field.name}
                  label={field.label}
                  required={field.required}
                  hint={field.hint}
                  error={error}
                  className={field.colSpan === 2 ? "md:col-span-2" : undefined}
                >
                  {(props) =>
                    field.kind === "textarea" ? (
                      <FormTextarea
                        {...props}
                        invalid={Boolean(error)}
                        rows={field.rows}
                        dir={field.dir}
                        placeholder={field.placeholder}
                        {...register(field.name)}
                      />
                    ) : field.kind === "select" ? (
                      <FormSelect
                        {...props}
                        invalid={Boolean(error)}
                        {...register(field.name)}
                      >
                        {field.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </FormSelect>
                    ) : (
                      <FormInput
                        {...props}
                        invalid={Boolean(error)}
                        type={field.kind ?? "text"}
                        dir={field.dir}
                        placeholder={field.placeholder}
                        {...register(field.name)}
                      />
                    )
                  }
                </FormField>
              );
            })}
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
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
