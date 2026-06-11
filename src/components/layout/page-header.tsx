export function PageHeader({
  title,
  description,
  actions,
  date,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  date?: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-3 h-1.5 w-16 rounded-full bg-primary" />
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-strong md:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-4xl text-sm leading-7 text-ink-muted">
              {description}
            </p>
          ) : null}
          {date ? (
            <div className="mt-3 text-[11px] text-ink-muted">{date}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
