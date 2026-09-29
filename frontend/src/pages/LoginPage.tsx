/**
 * The §7.2.1 login screen, rebuilt to the
 * `login_screen_variant_a_split_trust_badge` composition (Phase 12): a
 * max-w-4xl dual-panel card — left trust/context column, right sign-in form —
 * on an ambient dot-grid background.
 *
 * D-01 repaint: the composition's stale v1 brand/font vocabulary is
 * transposed to the v2 token system (brand = sky, UI = Fira Sans); the v1
 * mock fiction is NOT copied:
 * - the fake "Over 1,248 candidates" live metric → the honest, non-numeric
 *   community line the shipped copy already uses;
 * - "End-to-end encrypted candidate privacy" → the real non-affiliation /
 *   privacy posture (privacy policy link);
 * - the "v2.4" version chip (no version fiction — 9.5's ledger);
 * - the pre-filled demo credentials and the shown error state.
 *
 * Behavior contracts (9.5 reconciled, unchanged): INVALID_CREDENTIALS /
 * RATE_LIMITED (Retry-After countdown) / ACCOUNT_SUSPENDED map to distinct
 * strips; unverified accounts route to /verify-email-pending; `next` is
 * honored and forced to start with "/".
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import type { ApiError } from "@/api/errors";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { ErrorStrip } from "@/pages/authCard";
import { Disclaimer } from "@/components/Disclaimer";

const INVALID_CREDENTIALS_TEXT = "Invalid email or password.";
const SUSPENDED_TEXT =
  "This account has been suspended. Contact support if you believe this is a mistake.";

function rateLimitText(retryAfter: number): string {
  return `Too many attempts. Try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`;
}

/** The composition's left trust column, repainted to v2 with honest copy. */
function TrustPanel() {
  return (
    <div className="flex flex-col justify-between border-b border-slate-200/70 bg-gradient-to-br from-brand-50/70 via-slate-50 to-brand-50/40 p-8 sm:p-10 md:w-5/12 md:border-b-0 md:border-r">
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm">
            <ShieldGlyph className="h-5 w-5" />
          </div>
          <div>
            <span className="inline-block rounded bg-brand-100/70 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
              TJT Platform
            </span>
            <h2 className="mt-0.5 text-base font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100">
              TCS Joining Tracker
            </h2>
          </div>
        </div>

        <div className="mt-10 space-y-4">
          <h3 className="text-xl font-bold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
            Keep your onboarding journey transparent &amp; on track.
          </h3>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Monitor offer letters, batch onboarding schedules, and peer joining
            milestones in real time with peer-verified community updates.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-3.5 rounded-xl border border-brand-100/80 bg-white/80 p-3.5 shadow-sm backdrop-blur-sm dark:border-brand-900 dark:bg-slate-800/80">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-100 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <UsersGlyph className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                A community of candidates
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Tracking joinings &amp; dispatches together
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-8 flex items-center gap-2 border-t border-slate-200/60 pt-6 text-xs font-medium text-slate-500 dark:text-slate-400">
        <ShieldGlyph className="h-4 w-4 shrink-0 text-emerald-600" />
        <span>
          Independent and community-run — see our{" "}
          <Link to="/privacy" className="underline hover:text-slate-700 dark:hover:text-slate-300">
            privacy policy
          </Link>
          .
        </span>
      </div>
    </div>
  );
}

function ShieldGlyph({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function UsersGlyph({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retrySeconds, setRetrySeconds] = useState<number | null>(null);

  // RATE_LIMITED: tick the countdown down to zero, then re-enable submit.
  useEffect(() => {
    if (retrySeconds === null || retrySeconds <= 0) return;
    const timer = window.setTimeout(() => setRetrySeconds((s) => (s === null ? null : s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  const next = searchParams.get("next") ?? "/dashboard";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || retrySeconds !== null) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const loggedIn = await login(email, password);
      // §7.2: unverified accounts never reach the dashboard.
      if (!loggedIn.is_verified) {
        navigate("/verify-email-pending", { replace: true });
        return;
      }
      navigate(next.startsWith("/") ? next : "/dashboard", { replace: true });
    } catch (error) {
      const apiError = error as ApiError;
      if (apiError?.code === "RATE_LIMITED") {
        setRetrySeconds(apiError.retryAfter ?? 30);
        setErrorMessage(rateLimitText(apiError.retryAfter ?? 30));
      } else if (apiError?.code === "ACCOUNT_SUSPENDED") {
        setErrorMessage(SUSPENDED_TEXT);
      } else {
        setErrorMessage(INVALID_CREDENTIALS_TEXT);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const locked = retrySeconds !== null && retrySeconds > 0;

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-slate-50 dark:bg-slate-900">
      {/* The composition's ambient dot-grid + glow, pointer-events-none. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-45"
        style={{ backgroundImage: "radial-gradient(rgb(203 213 225) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-brand-100/40 via-slate-50/20 to-transparent" />

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6 md:py-14">
        <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/70 transition-all md:flex-row dark:border-slate-700 dark:bg-slate-800 dark:shadow-slate-900/50">
          <TrustPanel />

          <div className="flex flex-col justify-between bg-white p-8 sm:p-10 md:w-7/12 dark:bg-slate-800">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md border border-brand-100 bg-brand-50 px-2 py-0.5 text-[11px] font-semibold tracking-tight text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
                  Secure Sign In
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px] sm:leading-tight dark:text-slate-50">
                Welcome back to TJT Tracker
              </h1>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Sign in to access your recruitment timeline, peer milestones, and batch updates.
              </p>

              <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                  >
                    Email address
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline dark:text-brand-400"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {errorMessage !== null && <ErrorStrip message={errorMessage} />}

                <div className="pt-1.5">
                  <Button type="submit" variant="primary" fullWidth loading={submitting} disabled={locked}>
                    {locked ? `Wait ${retrySeconds}s` : "Sign in"}
                  </Button>
                </div>
              </form>

              <div className="relative my-5" aria-hidden="true">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:bg-slate-800">
                    or
                  </span>
                </div>
              </div>

              <Link
                to="/register"
                className="flex h-11 min-h-[44px] items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-all hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Create an account
              </Link>
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-slate-400 dark:text-slate-500">
              By continuing you agree to our{" "}
              <Link to="/terms" className="underline transition-colors hover:text-slate-700 dark:hover:text-slate-300">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline transition-colors hover:text-slate-700 dark:hover:text-slate-300">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full px-6 pb-6 pt-2">
        <div className="mx-auto max-w-xl text-center">
          <Disclaimer variant="footer" />
        </div>
      </footer>

      {user !== null && <span className="hidden">{user.email}</span>}
    </div>
  );
}
