/**
 * VerifyEmailActionPage tests (§7.2.4): visiting /verify-email/:token calls the
 * verify endpoint exactly once and renders exactly one outcome. Failure echoes
 * the attempted token in a wrapping-safe pill (9.5.1 D-7) and offers a new email
 * rather than a dead end.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { VerifyEmailActionPage } from "@/pages/VerifyEmailActionPage";
import { scriptAdapter } from "@/test/axiosTestHelper";

const LONG_TOKEN =
  "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6-this-is-deliberately-long";

function renderAction(token = "tok-valid-1") {
  return render(
    <MemoryRouter initialEntries={[`/verify-email/${token}`]}>
      <Routes>
        <Route path="/verify-email/:token" element={<VerifyEmailActionPage />} />
        <Route path="/login" element={<p>login-here</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VerifyEmailActionPage", () => {
  it("shows the pending state first, then the success panel on 204", async () => {
    const { calls } = scriptAdapter([
      {
        url: "/auth/verification/verify/",
        respond: () => ({ status: 204, data: null }),
      },
    ]);
    renderAction("tok-valid-1");
    expect(screen.getByRole("status")).toHaveTextContent(
      "One moment while we confirm your verification link.",
    );
    await waitFor(() => {
      expect(screen.getByText("Your email is verified")).toBeInTheDocument();
    });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].data))).toMatchObject({ token: "tok-valid-1" });
  });

  it("renders the failure panel and echoes the attempted token on rejection", async () => {
    scriptAdapter([
      {
        url: "/auth/verification/verify/",
        respond: () => ({
          status: 400,
          data: { error: { code: "TOKEN_INVALID", message: "Link is invalid or has expired." } },
        }),
      },
    ]);
    renderAction(LONG_TOKEN);
    await waitFor(() => {
      expect(screen.getByText("We could not verify that link")).toBeInTheDocument();
    });
    const pill = screen.getByTestId("attempted-token");
    expect(pill).toHaveTextContent(LONG_TOKEN);
    expect(pill.className).toContain("overflow-wrap:anywhere");
    expect(pill.className).not.toContain("word-break");
    expect(screen.getByRole("link", { name: "Request a new email" })).toBeInTheDocument();
  });

  it("calls the verify endpoint only once even if the token prop is stable", async () => {
    const { calls } = scriptAdapter([
      {
        url: "/auth/verification/verify/",
        respond: () => ({ status: 204, data: null }),
      },
    ]);
    const { rerender } = renderAction("tok-once");
    await waitFor(() => {
      expect(screen.getByText("Your email is verified")).toBeInTheDocument();
    });
    rerender(
      <MemoryRouter initialEntries={["/verify-email/tok-once"]}>
        <Routes>
          <Route path="/verify-email/:token" element={<VerifyEmailActionPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(calls).toHaveLength(1);
  });
});
