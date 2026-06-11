"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type FormFieldChildProps = {
  id: string;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
};

type FormFieldOwnProps = {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  id?: string;
  children: (props: FormFieldChildProps) => React.ReactNode;
};

export function FormField({
  label,
  hint,
  error,
  required,
  className,
  id,
  children,
}: FormFieldOwnProps) {
  const reactId = React.useId();
  const fieldId = id ?? reactId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={fieldId}
        className="block text-sm font-bold text-ink-strong"
      >
        {label}
        {required ? <span className="text-destructive ms-1">*</span> : null}
      </label>
      {children({
        id: fieldId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-semibold text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const baseInputClassName =
  "h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-ink-strong outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-50";

export function FormInput({
  className,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      className={cn(
        baseInputClassName,
        invalid && "border-destructive focus:border-destructive focus:ring-destructive/10",
        className,
      )}
      {...props}
    />
  );
}

export function FormTextarea({
  className,
  invalid,
  rows = 4,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      rows={rows}
      className={cn(
        "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink-strong outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:opacity-50 resize-y",
        invalid && "border-destructive focus:border-destructive focus:ring-destructive/10",
        className,
      )}
      {...props}
    />
  );
}

export function FormSelect({
  className,
  invalid,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      className={cn(
        baseInputClassName,
        "pe-8",
        invalid && "border-destructive focus:border-destructive focus:ring-destructive/10",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
