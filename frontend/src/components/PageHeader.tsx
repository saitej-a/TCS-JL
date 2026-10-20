import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Shared architectural page header (DESIGN.md / `app-screens.md §4`):
 * Flat surface with a 1px structural border, sentence-case 24px title,
 * and right-aligned primary action.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
}: PageHeaderProps): React.ReactElement {
  return (
    <header
      className={`flex flex-col justify-between gap-4 rounded-[10px] border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center ${className}`}
    >
      <div className="min-w-0 space-y-1">
        {eyebrow && <div className="mb-1 flex flex-wrap items-center gap-2">{eyebrow}</div>}
        <h1 className="font-headline text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {description && (
          <p className="text-xs font-normal text-slate-600 dark:text-slate-400 sm:text-sm">
            {description}
          </p>
        )}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
