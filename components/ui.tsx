import type { ReactNode } from "react";

export function Section({
  kicker,
  title,
  aside,
  children,
  className = "",
}: {
  kicker?: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          {kicker && <p className="kicker mb-1">{kicker}</p>}
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({
  kicker,
  title,
  lede,
  aside,
}: {
  kicker: string;
  title: string;
  lede?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-xl">
        <p className="kicker mb-1.5">{kicker}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink lg:text-[28px]">{title}</h1>
        {lede && <p className="mt-2 text-sm leading-relaxed text-dim">{lede}</p>}
      </div>
      {aside}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
      <p className="font-medium text-ink">{title}</p>
      <p className="max-w-sm text-sm text-muted">{body}</p>
      {action}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            value === o.value ? "bg-surface2 text-ink" : "text-muted hover:text-dim"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-line-soft bg-surface/60 px-3 py-2 font-mono text-[10.5px] leading-relaxed text-muted">
      {children}
    </p>
  );
}
