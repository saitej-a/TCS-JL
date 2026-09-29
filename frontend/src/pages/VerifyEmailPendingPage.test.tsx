/**
 * VerifyEmailPendingPage tests (9.5.1 D-11): the resend address is a real
 * in-card field prefilled from router state — not a window.prompt — and the
 * cooldown / rate-limit behaviour survives the rework.
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
  it("prefills the email field from router state (RegisterPage's handoff)", () => {
    renderAt({ email: "cand@example.com" });
    const field = screen.getByLabelText("Registered email address") as HTMLInputElement;
    expect(field.value).toBe("cand@example.com");
  });

  it("starts empty without router state and stays editable", async () => {
    const user = userEvent.setup();
    renderAt();
    const field = screen.getByLabelText("Registered email address") as HTMLInputElement;
    expect(field.value).toBe("");
    await user.type(field, "late@example.com");
    expect(field.value).toBe("late@example.com");
  });

  it("resends using the field's current value and shows the success state", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([
      {
        url: "/auth/verification/resend/",
        respond: () => ({ status: 204, data: null }),
      },
    ]);
    renderAt({ email: "cand@example.com" });
    await user.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Verification email sent.");
    });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].data))).toMatchObject({ email: "cand@example.com" });
    // The cooldown engages immediately after a successful resend.
    expect(screen.getByRole("button", { name: /Resend available in/ })).toBeDisabled();
  });

  it("uses the edited address when the user corrects the prefill", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([
      {
        url: "/auth/verification/resend/",
        respond: () => ({ status: 204, data: null }),
      },
    ]);
    renderAt({ email: "wrong@example.com" });
    const field = screen.getByLabelText("Registered email address");
    await user.clear(field);
    await user.type(field, "right@example.com");
    await user.click(screen.getByRole("button", { name: "Resend verification email" }));
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Verification email sent.");
    });
    expect(JSON.parse(String(calls[0].data))).toMatchObject({ email: "right@example.com" });
  });

  it("shows the rate-limit strip and the 30s cooldown on RATE_LIMITED", async () => {
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
        "Please wait before requesting another email.",
      );
    });
    expect(screen.getByRole("button", { name: "Resend available in 30s" })).toBeDisabled();
  });

  it("keeps the resend disabled while the field is empty", async () => {
    renderAt();
    expect(screen.getByRole("button", { name: "Resend verification email" })).toBeDisabled();
  });
});
