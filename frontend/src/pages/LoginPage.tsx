/**
 * The §7.2.1 login screen (Phase 4 Anti-Slop Overhaul):
 * Built on the shared `AuthSplitFrame` 2-column architectural layout pairing
 * a live anonymized candidate timeline specimen (`data-ui`) on the left with
 * the sign-in form on the right.
 *
 * Behavior contracts preserved:
 * - INVALID_CREDENTIALS / RATE_LIMITED (Retry-After countdown) /
 *   ACCOUNT_SUSPENDED map to distinct alert strips;
 * - unverified accounts route to `/verify-email-pending`;
 * - `next` query parameter is honored and forced to start with `/`.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import type { ApiError } from "@/api/errors";
import { Input } from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { AuthSplitFrame, ErrorStrip } from "@/pages/authCard";

const INVALID_CREDENTIALS_TEXT = "Invalid email or password.";
const SUSPENDED_TEXT =
  "This account has been suspended. Contact support if you believe this is a mistake.";

function rateLimitText(retryAfter: number): string {
  return `Too many attempts. Try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`;
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
    const timer = window.setTimeout(
      () => setRetrySeconds((s) => (s === null ? null : s - 1)),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  const next = searchParams.get("next") ?? "/dashboard";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting || (retrySeconds !== null && retrySeconds > 0)) return;
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
    <>
      <AuthSplitFrame
        title="Welcome back to TCSJL"
        subtitle="Sign in to access your recruitment timeline, peer milestones, and batch updates."
        footerNote={
          <p className="text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            By continuing you agree to our{" "}
            <Link
              to="/terms"
              className="underline underline-offset-2 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              to="/privacy"
              className="underline underline-offset-2 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
            >
              Privacy Policy
            </Link>
            .
          </p>
        }
      >
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Email address
            </label>
            <Input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@domain.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-brand-700 transition-colors hover:text-brand-800 hover:underline dark:text-brand-300 dark:hover:text-brand-200"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {errorMessage !== null && <ErrorStrip message={errorMessage} />}

          <div className="pt-1.5">
            <button
              className="flex h-11 w-full items-center justify-center rounded-lg bg-brand-700 text-sm font-medium text-white transition-[background-color,transform] duration-150 hover:bg-brand-800 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={locked || submitting}
            >
              {submitting ? (
                "Signing in..."
              ) : locked ? (
                <span className="tabular-nums">Wait {retrySeconds}s</span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>

        <div className="relative my-5" aria-hidden="true">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-3 text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              or
            </span>
          </div>
        </div>

        <div>
          <Link
            to="/register"
            className="flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 transition-[background-color,border-color,transform] duration-150 hover:border-slate-400 hover:bg-slate-50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            Create an account
          </Link>
        </div>
      </AuthSplitFrame>

      {user !== null && <span className="hidden">{user.email}</span>}
    </>
  );
}
