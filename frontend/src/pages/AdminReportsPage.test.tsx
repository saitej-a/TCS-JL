/**
 * AdminReportsPage tests (9.5 Task 8):
 * - Role guard: a non-moderator who deep-links /admin never sees the data
 *   (RequireStaff redirects before render) — asserted here at the router level.
 * - PII rule (hard): the queue's DOM must contain no unmasked email/phone
 *   shapes; the sweep fails the test if one appears.
 * - Queue: counts on tabs, server severity order, filters, empty state,
 *   bulk export, and the review dialog's happy + failure paths.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminReportsPage, buildReportsCsv } from "@/pages/AdminReportsPage";
import { RequireStaff } from "@/routes/RequireStaff";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { routeAdapter } from "@/test/axiosTestHelper";
import { isMaskedEmail, isMaskedPhone } from "@/utils/mask";

const REPORT = {
  id: "6f1a2b3c-0000-4000-8000-000000000001",
  reason: "SCAM",
  status: "PENDING",
  post_id: "9c2d3e4f-0000-4000-8000-000000000002",
  comment_id: null,
  description: "Asked me to pay a fee for early joining.",
  created_at: "2026-09-20T10:00:00Z",
};

const REPORT_2 = {
  ...REPORT,
  id: "6f1a2b3c-0000-4000-8000-000000000003",
  reason: "OTHER",
  description: "Something else.",
  created_at: "2026-09-21T10:00:00Z",
};

function envelope(results: object[], total?: number) {
  return {
    count: total ?? results.length,
    next: null,
    previous: null,
    results,
  };
}

function setup(
  routes: Parameters<typeof routeAdapter>[0],
  opts: { isStaff?: boolean; withGuard?: boolean } = {},
): void {
  const { isStaff = true, withGuard = false } = opts;
  localStorage.setItem("tjt.refresh_token", "test-refresh");
  routeAdapter([
    {
      url: "/auth/token/refresh/",
      answers: [{ status: 200, data: { access: "a", refresh: "r" } }],
    },
    {
      url: "/me/",
      answers: [
        {
          status: 200,
          data: {
            id: "u1",
            email: "uat93@example.com",
            is_verified: true,
            is_staff: isStaff,
            created_at: "2026-08-15T09:00:00Z",
            profile_completed: true,
          },
        },
      ],
    },
    ...routes,
  ]);
  const page = <AdminReportsPage />;
  render(
    <MemoryRouter initialEntries={["/admin/moderation/reports"]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
          {withGuard ? (
            <Route element={<RequireStaff />}>
              <Route path="/admin/moderation/reports" element={page} />
            </Route>
          ) : (
            <Route path="/admin/moderation/reports" element={page} />
          )}
          <Route path="/dashboard" element={<div data-testid="dashboard-page">dashboard</div>} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
});

/** The hard PII rule: no unmasked email/phone shape may reach the DOM. */
function expectNoUnmaskedPii(): void {
  const text = document.body.textContent ?? "";
  const emailShape = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  for (const match of text.match(emailShape) ?? []) {
    if (!isMaskedEmail(match)) {
      throw new Error(`Unmasked email reached the DOM: ${match}`);
    }
  }
  const phoneShape = /(\+?\d[\d\s-]{7,}\d)/g;
  for (const match of text.match(phoneShape) ?? []) {
    if (/\d{4}/.test(match) && !isMaskedPhone(match)) {
      throw new Error(`Unmasked phone reached the DOM: ${match}`);
    }
  }
}

describe("AdminReportsPage (9.5 Task 8)", () => {
  it("redirects a non-moderator before rendering any queue data", async () => {
    setup([{ url: "/moderation/reports/", answers: [{ status: 200, data: envelope([REPORT]) }] }], {
      isStaff: false,
      withGuard: true,
    });
    // The guard navigates away without ever mounting the queue (wait for the
    // async auth boot to resolve first).
    await waitFor(
      () => {
        expect(screen.queryByTestId("admin-reports")).not.toBeInTheDocument();
        expect(screen.getByTestId("dashboard-page")).toBeInTheDocument();
      },
      { timeout: 4000 },
    );
  });

  it("renders the queue with counts, rows and no unmasked PII", async () => {
    setup([
      { url: "/moderation/reports/?status=PENDING", answers: [{ status: 200, data: envelope([REPORT, REPORT_2], 2) }] },
      { url: "/moderation/reports/?status=REVIEWED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=RESOLVED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=DISMISSED", answers: [{ status: 200, data: envelope([], 0) }] },
    ]);
    await screen.findByTestId("reports-list");
    expect(screen.getByTestId("count-PENDING")).toHaveTextContent("2");
    expect(screen.getAllByTestId("report-row")).toHaveLength(2);
    // Severity order first (server order): SCAM row leads.
    expect(screen.getAllByTestId("report-row")[0]).toHaveTextContent("Fraud or Fee Solicitation");
    expectNoUnmaskedPii();
  });

  it("shows the empty state when the queue is clear", async () => {
    setup([
      { url: "/moderation/reports/?status=PENDING", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=REVIEWED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=RESOLVED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=DISMISSED", answers: [{ status: 200, data: envelope([], 0) }] },
    ]);
    await screen.findByTestId("empty-state");
    expect(screen.getByText(/queue is clear/i)).toBeInTheDocument();
    expectNoUnmaskedPii();
  });

  it("filters by reason client-side without refetching", async () => {
    const user = userEvent.setup();
    setup([
      { url: "/moderation/reports/?status=PENDING", answers: [{ status: 200, data: envelope([REPORT, REPORT_2], 2) }] },
      { url: "/moderation/reports/?status=REVIEWED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=RESOLVED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=DISMISSED", answers: [{ status: 200, data: envelope([], 0) }] },
    ]);
    await screen.findByTestId("reports-list");
    await user.selectOptions(screen.getByTestId("reason-filter"), "SCAM");
    expect(screen.getAllByTestId("report-row")).toHaveLength(1);
    expect(screen.getAllByTestId("report-row")[0]).toHaveTextContent("Fraud or Fee Solicitation");
  });

  it("exports selected rows as CSV via a Blob download", async () => {
    const user = userEvent.setup();
    const originalCreate = (URL as unknown as { createObjectURL?: (b: Blob) => string })
      .createObjectURL;
    const originalRevoke = (URL as unknown as { revokeObjectURL?: (u: string) => void })
      .revokeObjectURL;
    const createSpy = vi.fn(() => "blob:mock");
    const revokeSpy = vi.fn();
    // jsdom implements neither createObjectURL nor revokeObjectURL.
    Object.defineProperty(URL, "createObjectURL", {
      value: createSpy,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: revokeSpy,
      configurable: true,
      writable: true,
    });
    const anchorSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    try {
      setup([
        { url: "/moderation/reports/?status=PENDING", answers: [{ status: 200, data: envelope([REPORT], 1) }] },
        { url: "/moderation/reports/?status=REVIEWED", answers: [{ status: 200, data: envelope([], 0) }] },
        { url: "/moderation/reports/?status=RESOLVED", answers: [{ status: 200, data: envelope([], 0) }] },
        { url: "/moderation/reports/?status=DISMISSED", answers: [{ status: 200, data: envelope([], 0) }] },
      ]);
      await screen.findByTestId("reports-list");
      expect(screen.getByTestId("export-csv")).toBeDisabled();
      await user.click(screen.getByTestId(`select-${REPORT.id}`));
      await user.click(screen.getByTestId("export-csv"));
      expect(anchorSpy).toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(revokeSpy).toHaveBeenCalledWith("blob:mock");
    } finally {
      if (originalCreate === undefined) {
        delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL;
      } else {
        Object.defineProperty(URL, "createObjectURL", {
          value: originalCreate,
          configurable: true,
          writable: true,
        });
      }
      if (originalRevoke === undefined) {
        delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL;
      } else {
        Object.defineProperty(URL, "revokeObjectURL", {
          value: originalRevoke,
          configurable: true,
          writable: true,
        });
      }
      anchorSpy.mockRestore();
    }
  });

  it("builds RFC-4180-safe CSV from the selected rows", () => {
    const csv = buildReportsCsv([REPORT as never]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("id,reason,status,created_at,description");
    expect(lines[1]).toContain(REPORT.id);
    expect(lines[1]).toContain('"Asked me to pay a fee for early joining."');
    // Quotes inside values are doubled per RFC 4180.
    const quoted = buildReportsCsv([
      { ...REPORT, description: 'He said "pay now"' } as never,
    ]);
    expect(quoted).toContain('"He said ""pay now"""');
  });

  it("records a review decision and moves the row's status", async () => {
    const user = userEvent.setup();
    setup([
      { url: "/moderation/reports/?status=PENDING", answers: [{ status: 200, data: envelope([REPORT], 1) }] },
      { url: "/moderation/reports/?status=REVIEWED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=RESOLVED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=DISMISSED", answers: [{ status: 200, data: envelope([], 0) }] },
      {
        url: `/moderation/reports/${REPORT.id}/review/`,
        answers: [
          { status: 200, data: { id: REPORT.id, status: "DISMISSED", action: "DISMISS" } },
        ],
      },
    ]);
    await screen.findByTestId("reports-list");
    await user.click(screen.getByTestId(`review-${REPORT.id}`));
    expect(screen.getByTestId("review-dialog")).toBeInTheDocument();
    await user.click(screen.getByTestId("review-submit"));
    await waitFor(() => {
      expect(screen.queryByTestId("review-dialog")).not.toBeInTheDocument();
    });
    expect(screen.getAllByTestId("report-row")[0]).toHaveTextContent("Dismissed");
  });

  it("surfaces a review failure without closing the dialog", async () => {
    const user = userEvent.setup();
    setup([
      { url: "/moderation/reports/?status=PENDING", answers: [{ status: 200, data: envelope([REPORT], 1) }] },
      { url: "/moderation/reports/?status=REVIEWED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=RESOLVED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: "/moderation/reports/?status=DISMISSED", answers: [{ status: 200, data: envelope([], 0) }] },
      { url: `/moderation/reports/${REPORT.id}/review/`, answers: [{ status: 400, data: {} }] },
    ]);
    await screen.findByTestId("reports-list");
    await user.click(screen.getByTestId(`review-${REPORT.id}`));
    await user.click(screen.getByTestId("review-submit"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be recorded/i);
    expect(screen.getByTestId("review-dialog")).toBeInTheDocument();
  });
});
