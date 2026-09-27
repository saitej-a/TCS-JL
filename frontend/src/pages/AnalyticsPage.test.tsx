/**
 * AnalyticsPage tests (§7.9, Task 6).
 *
 * The `fails_when` conditions of the plan are asserted directly: no suppressed
 * block renders a number, the disclaimer is the content module's string (not a
 * second copy), the filters actually reach the endpoint, and the wait-time
 * section never invents values for a suppressed metric.
 *
 * The adapter is a URL-routed fake (not the sequential script helper): this page
 * issues several independent reads on mount and a second wave on filter change,
 * so order-independence is what the assertions need. Still D8-compliant — the
 * axios instance's adapter is swapped, no mocking dependency.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import type { AxiosAdapter, AxiosRequestConfig } from "axios";

import { apiClient } from "@/api/client";
import { ANALYTICS_DISCLAIMER } from "@/content/disclaimer";
import {
  AnalyticsPage,
  INSUFFICIENT_DATA,
  waitTimeRowCopy,
} from "@/pages/AnalyticsPage";
import { AuthProvider } from "@/context/AuthContext";

const META = { data_source: "COMMUNITY_REPORTED", disclaimer: "not official TCS data" };

const WAIT_OK = {
  ...META,
  suppressed: false,
  baseline: "READINESS_SURVEY",
  baseline_source_counts: { READINESS_SURVEY_EVENT: 30 },
  sample_size: 30,
  average_days: 47.5,
  median_days: 45,
  min_days: 20,
  max_days: 90,
  generated_at: "2026-09-20T10:00:00Z",
};

const OVERVIEW_OK = {
  ...META,
  suppressed: false,
  total_candidates: 1248,
  waiting_for_joining_letter: 412,
  joining_letters_reported: 320,
  joined_reported: 85,
  wait_times: {
    offer_to_joining_letter: { ...WAIT_OK, baseline: "OFFER_LETTER" },
    survey_to_joining_letter: WAIT_OK,
  },
  generated_at: "2026-09-20T10:00:00Z",
};

const OVERVIEW_SUPPRESSED = {
  ...META,
  suppressed: true,
  message: "Not enough community data to display this breakdown.",
};

const BATCHES_OK = {
  ...META,
  suppressed: false,
  total_in_cohort: 1248,
  generated_at: "2026-09-20T10:00:00Z",
  results: [
    { batch: "2025", candidate_count: 700, waiting_for_joining_letter: 200, joining_letter_reported: 150 },
    { batch: "2024", candidate_count: 548, waiting_for_joining_letter: 212, joining_letter_reported: 170 },
  ],
};

const STREAMS_OK = {
  ...META,
  suppressed: false,
  total_in_cohort: 1248,
  generated_at: "2026-09-20T10:00:00Z",
  results: [
    { hiring_type: "DIGITAL", candidate_count: 800, waiting_for_joining_letter: 300, joining_letter_reported: 200 },
    { hiring_type: "PRIME", candidate_count: 448, waiting_for_joining_letter: 112, joining_letter_reported: 120 },
  ],
};

const REGIONS_OK = {
  ...META,
  suppressed: false,
  total_in_cohort: 1248,
  generated_at: "2026-09-20T10:00:00Z",
  results: [
    { region: "Hyderabad", candidate_count: 600, waiting_for_joining_letter: 200, joining_letter_reported: 150 },
    { region: "Chennai", candidate_count: 648, waiting_for_joining_letter: 212, joining_letter_reported: 170 },
  ],
};

const DISTRIBUTION_OK = {
  ...META,
  suppressed: false,
  total_in_cohort: 1248,
  generated_at: "2026-09-20T10:00:00Z",
  results: [
    { status_group: "WAITING_FOR_JL", label: "Waiting for JL", candidate_count: 412, share: 33.0 },
    { status_group: "JL_RECEIVED", label: "JL Received", candidate_count: 320, share: 25.6 },
    { status_group: "JOINED", label: "Joined TCS", candidate_count: 85, share: 6.8 },
  ],
};

const DISTRIBUTION_SUPPRESSED = {
  ...META,
  suppressed: true,
  message: "Not enough community data to display this breakdown.",
};

interface Route {
  url: string;
  /** Consumed in order; the last entry repeats. */
  answers: Array<{ status: number; data?: unknown }>;
}

function routeAdapter(routes: Route[]): { calls: AxiosRequestConfig[] } {
  const calls: AxiosRequestConfig[] = [];
  const cursors = new Map<string, number>();
  const adapter: AxiosAdapter = (config) => {
    calls.push(config);
    const url = String(config.url);
    const route = routes.find((candidate) => url.includes(candidate.url));
    if (route === undefined) {
      return Promise.reject(new Error(`unrouted request: ${url}`));
    }
    const index = cursors.get(route.url) ?? 0;
    const answer = route.answers[Math.min(index, route.answers.length - 1)];
    cursors.set(route.url, index + 1);
    const response = {
      data: answer.data,
      status: answer.status,
      statusText: "",
      headers: {},
      config,
      request: {},
    };
    if (answer.status >= 200 && answer.status < 300) {
      return Promise.resolve(response);
    }
    const error = new Error(`Request failed with status code ${answer.status}`) as Error & {
      config: unknown;
      response: unknown;
      isAxiosError: boolean;
    };
    error.config = config;
    error.response = response;
    error.isAxiosError = true;
    return Promise.reject(error);
  };
  apiClient.defaults.adapter = adapter;
  return { calls };
}

function renderPage(): ReturnType<typeof render> {
  const tree: ReactElement = (
    <MemoryRouter>
      <AuthProvider>
        <AnalyticsPage />
      </AuthProvider>
    </MemoryRouter>
  );
  return render(tree);
}

function defaultRoutes(extra: Route[] = []): Route[] {
  return [
    { url: "/analytics/overview/", answers: [{ status: 200, data: OVERVIEW_OK }] },
    { url: "/analytics/status-distribution/", answers: [{ status: 200, data: DISTRIBUTION_OK }] },
    { url: "/analytics/hiring-types/", answers: [{ status: 200, data: STREAMS_OK }] },
    { url: "/analytics/batches/", answers: [{ status: 200, data: BATCHES_OK }] },
    { url: "/analytics/regions/", answers: [{ status: 200, data: REGIONS_OK }] },
    ...extra,
  ];
}

afterEach(() => {
  localStorage.clear();
});

describe("§7.9 AnalyticsPage", () => {
  it("renders the spec copy and the content module's disclaimer", async () => {
    routeAdapter(defaultRoutes());
    renderPage();

    expect(
      screen.getByRole("heading", { name: "COMMUNITY RECRUITMENT BENCHMARKS & ANALYTICS" }),
    ).toBeInTheDocument();
    // UI-04: the string is the constant, not a re-typed copy.
    expect(screen.getByText(ANALYTICS_DISCLAIMER)).toBeInTheDocument();
    // The always-visible suppression notice.
    expect(screen.getByText("🛡️ PRIVACY SUPPRESSION NOTICE:")).toBeInTheDocument();
    expect(
      screen.getByText(
        "To prevent identification of individual candidates, data breakdowns with fewer than 5 submissions are automatically suppressed.",
      ),
    ).toBeInTheDocument();

    // The page settles on its real payloads (not left in skeleton state).
    expect(await screen.findByTestId("kpi-grid")).toBeInTheDocument();
  });

  it("renders the four KPI values from the real overview payload", async () => {
    routeAdapter(defaultRoutes());
    renderPage();

    const grid = await screen.findByTestId("kpi-grid");
    expect(within(grid).getByText("1248")).toBeInTheDocument();
    expect(within(grid).getByText("412")).toBeInTheDocument();
    expect(within(grid).getByText("320")).toBeInTheDocument();
    expect(within(grid).getByText("85")).toBeInTheDocument();
    expect(within(grid).getByText("Total Candidates")).toBeInTheDocument();
  });

  it("renders the stream share bars and the distribution stacked bar + legend", async () => {
    routeAdapter(defaultRoutes());
    renderPage();

    // Share bars are computed from the row against the payload's own cohort.
    const digitalBar = await screen.findByTestId("stream-bar-DIGITAL");
    expect(digitalBar.style.width).toBe(`${((800 / 1248) * 100).toFixed(1)}%`);

    const segments = await screen.findAllByTestId(/^distribution-segment-/);
    expect(segments).toHaveLength(3);
    expect(screen.getByTestId("distribution-segment-WAITING_FOR_JL").style.width).toBe("33%");

    const legend = screen.getByTestId("distribution-legend");
    expect(within(legend).getByText("JL Received")).toBeInTheDocument();
    expect(within(legend).getByText("(25.6%)")).toBeInTheDocument();
  });

  it("renders the wait-time rows with the spec's Average/Range copy", async () => {
    routeAdapter(defaultRoutes());
    renderPage();

    const row = await screen.findByTestId("wait-survey_to_joining_letter");
    expect(within(row).getByText(waitTimeRowCopy(47.5, 20, 90))).toBeInTheDocument();
    expect(screen.getByTestId("wait-offer_to_joining_letter")).toBeInTheDocument();
  });

  it("renders insufficient-data copy and no numbers when the overview is suppressed", async () => {
    routeAdapter([
      { url: "/analytics/overview/", answers: [{ status: 200, data: OVERVIEW_SUPPRESSED }] },
      { url: "/analytics/status-distribution/", answers: [{ status: 200, data: DISTRIBUTION_SUPPRESSED }] },
      { url: "/analytics/hiring-types/", answers: [{ status: 200, data: STREAMS_OK }] },
      { url: "/analytics/batches/", answers: [{ status: 200, data: BATCHES_OK }] },
      { url: "/analytics/regions/", answers: [{ status: 200, data: REGIONS_OK }] },
    ]);
    renderPage();

    // The KPI grid is replaced by the copy — never zeros. (The KPI block, the
    // wait-times block and the distribution block each render it; they land in
    // separate ticks, so wait for all three rather than for the first.)
    await waitFor(() => {
      expect(screen.getAllByText(INSUFFICIENT_DATA).length).toBeGreaterThanOrEqual(3);
    });
    expect(screen.queryByTestId("kpi-grid")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    // Both wait-time rows are suppressed with the same copy, not zeros.
    expect(screen.queryByText(/^Average /)).not.toBeInTheDocument();
    // The distribution block is independently suppressed.
    expect(screen.queryByTestId("distribution-bar")).not.toBeInTheDocument();
  });

  it("keeps KPIs when only the distribution block is suppressed", async () => {
    routeAdapter([
      { url: "/analytics/overview/", answers: [{ status: 200, data: OVERVIEW_OK }] },
      { url: "/analytics/status-distribution/", answers: [{ status: 200, data: DISTRIBUTION_SUPPRESSED }] },
      { url: "/analytics/hiring-types/", answers: [{ status: 200, data: STREAMS_OK }] },
      { url: "/analytics/batches/", answers: [{ status: 200, data: BATCHES_OK }] },
      { url: "/analytics/regions/", answers: [{ status: 200, data: REGIONS_OK }] },
    ]);
    renderPage();

    expect(await screen.findByTestId("kpi-grid")).toBeInTheDocument();
    expect(screen.getByText("1248")).toBeInTheDocument();
    expect(await screen.findByText(INSUFFICIENT_DATA)).toBeInTheDocument();
    expect(screen.queryByTestId("distribution-bar")).not.toBeInTheDocument();
  });

  it("never invents a wait-time value when one metric is suppressed", async () => {
    routeAdapter([
      {
        url: "/analytics/overview/",
        answers: [
          {
            status: 200,
            data: {
              ...OVERVIEW_OK,
              wait_times: {
                offer_to_joining_letter: {
                  ...META,
                  suppressed: true,
                  message: "Not enough community data to display this breakdown.",
                },
                survey_to_joining_letter: WAIT_OK,
              },
            },
          },
        ],
      },
      { url: "/analytics/status-distribution/", answers: [{ status: 200, data: DISTRIBUTION_OK }] },
      { url: "/analytics/hiring-types/", answers: [{ status: 200, data: STREAMS_OK }] },
      { url: "/analytics/batches/", answers: [{ status: 200, data: BATCHES_OK }] },
      { url: "/analytics/regions/", answers: [{ status: 200, data: REGIONS_OK }] },
    ]);
    renderPage();

    const suppressedRow = await screen.findByTestId("wait-offer_to_joining_letter");
    expect(within(suppressedRow).getByText(INSUFFICIENT_DATA)).toBeInTheDocument();
    // The other metric still reports its real numbers.
    const okRow = screen.getByTestId("wait-survey_to_joining_letter");
    expect(within(okRow).getByText(waitTimeRowCopy(47.5, 20, 90))).toBeInTheDocument();
  });

  it("refetches the distribution with the selected filter as a query param", async () => {
    const { calls } = routeAdapter(
      defaultRoutes([
        {
          url: "/analytics/status-distribution/",
          answers: [{ status: 200, data: DISTRIBUTION_OK }],
        },
      ]),
    );
    renderPage();

    // The batch select only offers the values the whitelist endpoint returned.
    const batchSelect = await screen.findByLabelText("Batch:");
    await waitFor(() => {
      expect(within(batchSelect).getByText("2025")).toBeInTheDocument();
    });

    await userEvent.selectOptions(batchSelect, "2025");

    await waitFor(() => {
      const filtered = calls.filter(
        (call) =>
          String(call.url).includes("/analytics/status-distribution/") &&
          (call.params as Record<string, unknown> | undefined)?.batch === "2025",
      );
      expect(filtered).toHaveLength(1);
    });
    // The stream band narrows by batch but never by the stream filter itself.
    const bandCall = calls.filter((call) => String(call.url).includes("/analytics/hiring-types/")).at(-1);
    expect((bandCall?.params as Record<string, unknown> | undefined)?.batch).toBe("2025");
    expect((bandCall?.params as Record<string, unknown> | undefined)?.hiring_type).toBeUndefined();
  });

  it("shows the named-parameter error for a 400 invalid filter", async () => {
    // One route whose queue answers the mount read and then 400s the refetch.
    routeAdapter([
      {
        url: "/analytics/status-distribution/",
        answers: [
          { status: 200, data: DISTRIBUTION_OK },
          {
            status: 400,
            data: {
              error: "invalid_filter",
              detail: "Invalid value for 'batch'; expected one of 2024, 2025, 2026",
              param: "batch",
            },
          },
        ],
      },
      { url: "/analytics/overview/", answers: [{ status: 200, data: OVERVIEW_OK }] },
      { url: "/analytics/hiring-types/", answers: [{ status: 200, data: STREAMS_OK }] },
      { url: "/analytics/batches/", answers: [{ status: 200, data: BATCHES_OK }] },
      { url: "/analytics/regions/", answers: [{ status: 200, data: REGIONS_OK }] },
    ]);
    renderPage();

    const batchSelect = await screen.findByLabelText("Batch:");
    await waitFor(() => {
      expect(within(batchSelect).getByText("2024")).toBeInTheDocument();
    });
    // Let the mount read settle first: the debounce means a filter change this
    // early would replace the initial request instead of following it.
    await screen.findByTestId("distribution-bar");

    await userEvent.selectOptions(batchSelect, "2024");

    const strip = await screen.findByTestId("filter-error");
    expect(strip).toHaveAttribute("role", "alert");
    expect(strip).toHaveTextContent("Invalid value for 'batch'");
    // No fabricated block survives a rejected filter.
    expect(screen.queryByTestId("distribution-bar")).not.toBeInTheDocument();
  });

  it("keeps the responsive/overflow backstops the UI-SPEC holds out", async () => {
    routeAdapter(defaultRoutes());
    renderPage();

    // KPI cards: 1 column on the smallest screens, 2×2 at sm, 4 across at lg.
    const grid = await screen.findByTestId("kpi-grid");
    expect(grid.className).toContain("grid-cols-1");
    expect(grid.className).toContain("sm:grid-cols-2");
    expect(grid.className).toContain("lg:grid-cols-4");

    // The legend wraps rather than overflowing; the stacked bar clips its
    // segments rather than letting them push the card wider than its column.
    const legend = await screen.findByTestId("distribution-legend");
    expect(legend.className).toContain("flex-wrap");
    expect(screen.getByTestId("distribution-bar").className).toContain("overflow-hidden");
  });
});
