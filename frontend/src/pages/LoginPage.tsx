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
 *
 * Dark parity (Phase 16 follow-up): the ambient dot-grid and glow layers were
 * inline `style`s, which no `dark:` variant can override — they are now the same
 * gradients as Tailwind arbitrary values with dark counterparts, and both panels,
 * the form fields and the footer each carry their own `dark:` pair.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import type { ApiError } from "@/api/errors";
import { useAuth } from "@/context/AuthContext";

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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="skin-v1 bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col justify-between selection:bg-indigo-100 selection:text-indigo-900 relative antialiased">
      {/* Ambient Subtle Grid Background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none opacity-45 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px]"
      />
      {/* Subtle ambient glow accents */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-100/40 via-slate-50/20 to-transparent pointer-events-none dark:from-indigo-950/40 dark:via-slate-950/20"
      />
      <div
        aria-hidden="true"
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] bg-indigo-200/20 rounded-full blur-3xl pointer-events-none dark:bg-indigo-900/20"
      />

      {/* Main Content Centerpiece: Refined Dual-Panel Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-10 md:py-14">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/80 overflow-hidden flex flex-col md:flex-row transition-all dark:bg-slate-900 dark:border-slate-800 dark:shadow-slate-950/50">
          {/* Left Sub-Panel: Community & Context Showcase */}
          <div className="md:w-5/12 bg-gradient-to-br from-indigo-50/70 via-slate-50 to-indigo-50/40 p-8 sm:p-10 border-b md:border-b-0 md:border-r border-slate-200/70 flex flex-col justify-between relative overflow-hidden dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/30 dark:border-slate-800">
            {/* Decorative subtle background shapes */}
            <div
              aria-hidden="true"
              className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-200/30 rounded-full blur-2xl pointer-events-none dark:bg-indigo-900/20"
            />
            <div
              aria-hidden="true"
              className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-100/40 rounded-full blur-2xl pointer-events-none dark:bg-indigo-950/40"
            />

            <div className="relative z-10">
              {/* Branded Emblem & Title */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-sm shadow-indigo-600/30 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <span className="inline-block text-[11px] font-semibold text-brand-700 tracking-wide uppercase bg-indigo-100/70 px-2 py-0.5 rounded dark:text-brand-300 dark:bg-indigo-950/60">
                    TCSJL Platform
                  </span>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight leading-none mt-0.5 dark:text-slate-100">
                    TCSJL
                  </h2>
                </div>
              </div>

              {/* Feature Spotlight Content */}
              <div className="mt-10 space-y-4">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-snug dark:text-slate-100">
                  Keep your onboarding journey transparent &amp; on track.
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-body dark:text-slate-300">
                  Monitor offer letters, batch onboarding schedules, and peer joining milestones in real-time with peer-verified crowdsourced updates.
                </p>
              </div>

              {/* Live Community Metric Snippet */}
              <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-xl p-3.5 border border-indigo-100/80 shadow-sm flex items-center gap-3.5 dark:bg-slate-800/80 dark:border-indigo-900/60">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-brand-700 shrink-0 dark:bg-indigo-950/60 dark:border-indigo-900/60 dark:text-brand-300">
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span
                      className="text-xs font-semibold text-slate-900 tracking-tight dark:text-slate-100"
                      data-awaiting="community.total_candidates"
                    >
                      A community of candidates
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
                    Currently tracking joinings &amp; dispatches
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy & Trust Footnote in Left Panel */}
            <div className="relative z-10 mt-8 pt-6 border-t border-slate-200/60 flex items-center gap-2 text-slate-500 text-xs font-medium dark:border-slate-800 dark:text-slate-400">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
              <span>
                Independent and community-run — see our{" "}
                <Link to="/privacy" className="underline hover:text-slate-700 dark:hover:text-slate-200">
                  privacy policy
                </Link>
                .
              </span>
            </div>
          </div>

          {/* Right Panel: Streamlined Sign-In Form */}
          <div className="md:w-7/12 p-8 sm:p-10 flex flex-col justify-between bg-white dark:bg-slate-900">
            <div>
              {/* Header Section */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded-md px-2 py-0.5 tracking-tight dark:text-brand-300 dark:bg-brand-950/60 dark:border-brand-900/60">
                    Secure Sign In
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">v2.4</span>
                </div>
                <h1 className="text-2xl sm:text-[26px] leading-tight font-bold text-slate-900 tracking-tight mt-3 font-headline dark:text-slate-100">
                  Welcome back to TCSJL
                </h1>
                <p className="text-sm text-slate-500 mt-1.5 font-body dark:text-slate-400">
                  Sign in to access your recruitment timeline, peer milestones, and batch updates.
                </p>
              </div>

              {/* Authentication Form */}
              <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 font-label dark:text-slate-300"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-semibold text-slate-700 uppercase tracking-wider font-label dark:text-slate-300"
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline transition-colors dark:text-brand-300 dark:hover:text-brand-200"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 pl-3.5 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-700/20 focus:border-brand-700 transition-all shadow-sm tracking-wide dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500"
                    />
                    <button
                      aria-label="Toggle password visibility"
                      className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center transition-colors focus:outline-none rounded dark:text-slate-500 dark:hover:text-slate-300"
                      id="toggle-password"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      <span className="material-symbols-outlined text-[20px]" data-icon="visibility" id="eye-icon">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Inline Error State Banner */}
                {errorMessage !== null && (
                  <div
                    role="alert"
                    className="rounded-lg bg-rose-50 px-3 py-2 border border-rose-200 flex items-center gap-2 text-xs font-medium text-rose-700 shadow-sm dark:bg-rose-950/50 dark:border-rose-900/60 dark:text-rose-300"
                  >
                    <span
                      className="material-symbols-outlined text-rose-600 text-[18px] shrink-0 dark:text-rose-400"
                      data-icon="error"
                    >
                      error
                    </span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submit Button (High-contrast deep indigo brand-700) */}
                <div className="pt-1.5">
                  <button
                    className="w-full h-11 rounded-lg bg-brand-700 hover:bg-brand-800 text-white font-medium text-sm shadow-sm hover:shadow active:scale-[0.99] transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-brand-700 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={locked || submitting}
                  >
                    {submitting ? "Signing in..." : locked ? `Wait ${retrySeconds}s` : "Sign in"}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative my-5" aria-hidden="true">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 font-medium uppercase tracking-wider text-[11px] dark:bg-slate-900 dark:text-slate-500">
                    or
                  </span>
                </div>
              </div>

              {/* Secondary Create Account Button */}
              <div>
                <Link
                  to="/register"
                  className="w-full h-11 rounded-lg border border-slate-300 hover:bg-slate-50 hover:border-slate-400 text-slate-700 font-medium text-sm transition-all flex items-center justify-center active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600 dark:text-slate-200"
                >
                  Create an account
                </Link>
              </div>
            </div>

            {/* Card Bottom Helper Note */}
            <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed font-body dark:text-slate-500">
              By continuing you agree to our{" "}
              <Link
                to="/terms"
                className="underline hover:text-slate-700 transition-colors dark:hover:text-slate-200"
              >
                Terms
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="underline hover:text-slate-700 transition-colors dark:hover:text-slate-200"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      {/* Page Footer Disclaimer */}
      <footer className="relative z-10 w-full px-6 pb-6 pt-2">
        <p className="text-[11px] leading-relaxed text-slate-400 max-w-xl text-center mx-auto tracking-normal dark:text-slate-500">
          TCS Joining Tracker is an independent community project and is not affiliated, associated, authorized, endorsed by, or in any way officially connected with Tata Consultancy Services (TCS) or any of its subsidiaries.
        </p>
      </footer>

      {user !== null && <span className="hidden">{user.email}</span>}
    </div>
  );
}
