import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Skeleton, SkeletonCard } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";

/**
 * 9.5 Task 8: the /admin role guard (04 §113). Requires authentication AND
 * the caller's own `is_staff` — a non-moderator who deep-links /admin/* is
 * redirected away, so the data never renders (the plan's acceptance rule).
 *
 * Server-side enforcement remains authoritative: this guard only stops the
 * client from rendering surfaces the API would 403 anyway. While `booting`
 * (silent refresh in flight) render a skeleton — never a redirect, matching
 * RequireAuth's D1 reload rule.
 */
export function RequireStaff() {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "booting") {
    return (
      <div className="space-y-4 p-6" aria-busy="true" aria-live="polite">
        <Skeleton className="h-8 w-64" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (status === "anonymous") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (user !== null && !user.is_staff) {
    // Not a moderator: do NOT render the route's element at all. /dashboard
    // is the least surprising landing for a candidate who followed a stale link.
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
