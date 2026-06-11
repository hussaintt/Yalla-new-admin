"use client";

import { cn } from "@/lib/utils";

export function CursorDataTable<TData>({
  columns,
  data,
  emptyLabel = "لا توجد بيانات.",
  getRowKey,
}: {
  columns: Array<{
    id: string;
    header: React.ReactNode;
    cell: (row: TData) => React.ReactNode;
    className?: string;
  }>;
  data: TData[];
  emptyLabel?: string;
  getRowKey?: (row: TData, index: number) => string | number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-end text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs font-bold uppercase tracking-wide text-ink-muted backdrop-blur">
            <tr>
              {columns.map((column) => (
                <th key={column.id} className={cn("whitespace-nowrap px-4 py-3", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {data.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-12 text-center text-sm font-medium text-ink-muted"
                  colSpan={columns.length}
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey?.(row, rowIndex) ?? rowIndex}
                  className="transition-colors hover:bg-muted/60"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={cn("px-4 py-3 align-middle text-ink-strong", column.className)}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
