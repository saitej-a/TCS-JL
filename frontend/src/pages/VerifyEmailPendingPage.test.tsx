/**
 * VerifyEmailPendingPage tests (9.5.1 D-11): the address the link went to is
 * shown inline as the composition's pill (never a masked stand-in), and when the
 * caller supplies no address the resend target becomes a real in-card field —
 * not a window.prompt. The cooldown / rate-limit behaviour survives the rework.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { VerifyEmailPendingPage } from "@/pages/VerifyEmailPendingPage";
import { scriptAdapter } from "@/test/axiosTestHelper";

function renderAt(state?: { email?: string }) {
  return render(
    <MemoryRouter
      initialEntries={[
        { pathname: "/verify-email-pending", state },
      ]}
    >
      <Routes>
        <Route path="/verify-email-pending" element={<VerifyEmailPendingPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("VerifyEmailPendingPage", () => {
  it("names the address the link went to in the composition's inline pill", () => {
    renderAt({ email: "cand@example.com" });
    expect(screen.getByText("cand@example.com")).toBeInTheDocument();
    // With a known address there is nothing to correct, so no field is offered.
    expect(screen.queryByLabelText("Registered email address")).not.toBeInTheDocument();
  });

  it("falls back to a real editable field when no address was handed over", async () => {
    const user = userEvent.setup();
    renderAt();
    const field = screen.getByLabelText("Registered email address") as HTMLInputElement;
    expect(field.value).toBe("");
    await user.type(field, "late@example.com");
    expect(field.value).toBe("late@example.com");
  });

  it("reveals the correction field on demand and resends to the edited address", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([
      {
        url: "/auth/verification/resend/",
        respond: () => ({ status: 204, data: null }),
      },
    ]);
    renderAt({ email: "wrong@example.com" });
    await user.click(screen.getByRole("button", { name: "Use a different address" }));
    const field = screen.getByLabelText("Registered email address");
    await user.clear(field);
    await user.type(field, "right@example.com");
    await user.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("A fresh link is on its way.");
    });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].data))).toMatchObject({ email: "right@example.com" });
    // The cooldown engages immediately after a successful resend.
    expect(screen.getByRole("button", { name: /Resend available in/ })).toBeDisabled();
  });

  it("shows the composition's rate-limit banner and the 30s cooldown on RATE_LIMITED", async () => {
    const user = userEvent.setup();
    scriptAdapter([
      {
        url: "/auth/verification/resend/",
        respond: () => ({
          status: 429,
          data: { error: { code: "RATE_LIMITED", message: "Too many requests." } },
        }),
      },
    ]);
    renderAt({ email: "cand@example.com" });
    await user.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Too many requests. Please wait a moment before trying again.",
      );
    });
    expect(screen.getByRole("button", { name: "Resend available in 30s" })).toBeDisabled();
  });

  it("keeps the resend disabled while the field is empty", async () => {
    renderAt();
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeDisabled();
  });
});
