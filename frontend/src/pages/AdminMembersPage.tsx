import { useCallback, useEffect, useState } from "react";
import { Mail, UsersRound } from "lucide-react";

import { listAdminMembers } from "@/api/chat";
import type { AdminMember } from "@/types/chat";

function displayValue(value: string | null): string {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminMembersPage() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(false);
    try {
      const response = await listAdminMembers(page);
      setMembers(response.results);
      setPageCount(Math.max(1, Math.ceil(response.count / 20)));
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-brand-700 dark:bg-sky-950/60 dark:text-brand-300">
          <UsersRound className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Members</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Active accounts and their candidate profile details.
          </p>
        </div>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400" role="status">Loading members…</div>
        ) : loadError ? (
          <div className="p-6 text-sm text-rose-700 dark:text-rose-300" role="alert">
            Could not load members. Please try again.
            <button type="button" onClick={() => void loadMembers()} className="ml-2 font-semibold underline">
              Retry
            </button>
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No active members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Hiring type</th>
                  <th className="px-4 py-3 font-semibold">Region</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{member.display_name}</div>
                      <a href={`mailto:${member.email}`} className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300">
                        <Mail className="h-3 w-3" aria-hidden="true" />
                        {member.email}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{member.batch ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{displayValue(member.hiring_type)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{member.region ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{displayValue(member.current_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && !loadError && pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Page {page} of {pageCount}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => current - 1)}
                disabled={page <= 1}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= pageCount}
                className="rounded-md border border-slate-200 px-3 py-1.5 font-medium text-slate-700 disabled:opacity-40 dark:border-slate-600 dark:text-slate-200"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
