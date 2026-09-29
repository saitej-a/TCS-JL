/**
 * ErrorPanels tests (9.5 Task 10):
 * - 404 panel: requested path rendered in mono, home link present.
 * - 500 panel: the reference id shown is the same one logged (acceptance
 *   criterion); copy button uses the clipboard; technical detail collapses.
 * - SectionRetry: fires onRetry and disables while retrying.
 * - ErrorBoundary integration: a forced render throw is caught; the console
 *   log line carries the identical reference id the panel displays.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, afterEach } from "vitest";

import {
  NotFoundPanel,
  SectionRetry,
  ServerErrorPanel,
} from "@/components/ErrorPanels";
import { ErrorBoundary } from "@/components/ErrorBoundary";

function ThrowingChild(): never {
  throw new Error("boom: forced render throw");
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalClipboard !== undefined) {
    Object.defineProperty(navigator, "clipboard", originalClipboard);
  } else {
    // jsdom lacks clipboard entirely — drop the test double.
    Reflect.deleteProperty(navigator, "clipboard");
  }
});

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, "clipboard");

function fakeClipboard(impl: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: impl },
    configurable: true,
  });
}

describe("NotFoundPanel", () => {
  it("shows the requested path in mono", () => {
    render(<NotFoundPanel path="/dashboard/typo" />);
    expect(screen.getByTestId("not-found-panel")).toBeInTheDocument();
    expect(screen.getByTestId("not-found-path")).toHaveTextContent("/dashboard/typo");
    expect(screen.getByTestId("not-found-path")).toHaveClass("font-mono");
  });

  it("links home", () => {
    render(<NotFoundPanel path="/nope" />);
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });
});

describe("ServerErrorPanel", () => {
  it("renders the reference id and toggles the copied state", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue(undefined);
    fakeClipboard(writeText);
    render(<ServerErrorPanel referenceId="E-TEST-123456" detail="boom stack" />);
    expect(screen.getByTestId("reference-id")).toHaveTextContent("E-TEST-123456");
    await user.click(screen.getByTestId("copy-reference"));
    expect(writeText).toHaveBeenCalledWith("E-TEST-123456");
    expect(screen.getByTestId("copy-reference")).toHaveTextContent("Copied");
    // The technical detail is collapsed by default, present in the DOM.
    expect(screen.getByTestId("error-detail")).toBeInTheDocument();
  });

  it("renders 11 §4.2's verbatim copy", () => {
    render(<ServerErrorPanel referenceId="E-X" />);
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reload Application" }),
    ).toBeInTheDocument();
  });

  it("survives a denied clipboard without crashing", async () => {
    const user = userEvent.setup();
    fakeClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<ServerErrorPanel referenceId="E-X" />);
    await user.click(screen.getByTestId("copy-reference"));
    expect(screen.getByTestId("reference-id")).toHaveTextContent("E-X");
  });
});

describe("SectionRetry", () => {
  it("fires onRetry and shows the retrying state", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<SectionRetry onRetry={onRetry} />);
    await user.click(screen.getByTestId("section-retry-button"));
    expect(onRetry).toHaveBeenCalledTimes(1);
    rerender(<SectionRetry onRetry={onRetry} retrying />);
    expect(screen.getByTestId("section-retry-button")).toBeDisabled();
    expect(screen.getByTestId("section-retry-button")).toHaveTextContent("Retrying…");
  });
});

describe("ErrorBoundary (Task 10 upgrade)", () => {
  it("logs the same reference id the panel shows", async () => {
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    const shown = screen.getByTestId("reference-id").textContent ?? "";
    expect(shown).toMatch(/^E-/);
    // React logs its own internal lines alongside ours; the acceptance
    // criterion is that the logged set contains the displayed id.
    expect(
      logSpy.mock.calls.some((call) => String(call[0]).includes(shown)),
    ).toBe(true);
  });

  it("keeps 11 §4.2's copy and the reload control", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload Application" })).toBeInTheDocument();
  });

  it("recovers on a genuine remount (fresh boundary instance)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <ErrorBoundary key="crashed">
        <ThrowingChild />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("server-error-panel")).toBeInTheDocument();
    // A key change remounts the boundary with clean state — the same thing a
    // route change does in the app.
    rerender(
      <ErrorBoundary key="recovered">
        <div data-testid="fine">all good</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("fine")).toBeInTheDocument();
  });
});
