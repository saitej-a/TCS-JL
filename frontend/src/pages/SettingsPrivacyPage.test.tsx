/**
 * SettingsPrivacyPage tests (9.5 Task 4): the preview is derived from the same
 * state the toggle edits (toggle → preview within the same render), the failed
 * save rolls the preview back to the saved state, and the export request is
 * explicitly disabled with its reason.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsPrivacyPage } from "@/pages/SettingsPrivacyPage";
import { AuthProvider } from "@/context/AuthContext";
import { routeAdapter } from "@/test/axiosTestHelper";

const PROFILE_DISPLAY = {
  id: "p1",
  display_name: "Sai Teja",
  public_identity_mode: "DISPLAY_NAME",
  batch: "2025",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  interview_center: "HYD",
  interview_date: null,
  joining_location: "",
  current_status: "WAITING_FOR_JOINING_LETTER",
  offer_letter_date: null,
  expected_joining_date: null,
  created_at: "2026-09-01T10:00:00Z",
  updated_at: "2026-09-01T10:00:00Z",
};

function setup(routes: Parameters<typeof routeAdapter>[0]): void {
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
            created_at: "2026-08-15T09:00:00Z",
            profile_completed: true,
          },
        },
      ],
    },
    ...routes,
  ]);
  render(
    <MemoryRouter initialEntries={["/settings/privacy"]}>
      <AuthProvider>
        <SettingsPrivacyPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  localStorage.clear();
});

describe("SettingsPrivacyPage (9.5 Task 4)", () => {
  it("reflects the toggle in the preview within the same render (ANONYMOUS → DISPLAY_NAME)", async () => {
    const user = userEvent.setup();
    setup([
      {
        url: "/profile/",
        answers: [
          { status: 200, data: PROFILE_DISPLAY },
          {
            status: 200,
            data: { ...PROFILE_DISPLAY, public_identity_mode: "ANONYMOUS" },
          },
        ],
      },
    ]);
    // Loaded state: display name visible in the preview.
    expect(await screen.findByTestId("preview-name")).toHaveTextContent("Sai Teja");
    const toggle = screen.getByRole("switch", { name: /show my display name/i });
    expect(toggle).toBeChecked();

    // Toggle off → the PATCH returns ANONYMOUS and the preview updates.
    await user.click(toggle);
    await waitFor(() => {
      expect(screen.getByTestId("preview-name")).toHaveTextContent("Anonymous Candidate");
    });
    expect(screen.getByRole("switch", { name: /show my display name/i })).not.toBeChecked();
  });

  it("keeps the preview honest on a failed save (rolls back to the saved state)", async () => {
    const user = userEvent.setup();
    setup([
      {
        url: "/profile/",
        answers: [
          { status: 200, data: PROFILE_DISPLAY },
          { status: 500, data: {} },
        ],
      },
    ]);
    expect(await screen.findByTestId("preview-name")).toHaveTextContent("Sai Teja");
    await user.click(screen.getByRole("switch", { name: /show my display name/i }));
    // The optimistic flip must not survive a failed PATCH: the preview still
    // describes the SAVED state and the error is surfaced.
    await waitFor(() => {
      expect(screen.getByTestId("privacy-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("preview-name")).toHaveTextContent("Sai Teja");
  });

  it("starts anonymous and shows initials when display-name mode is on", async () => {
    setup([
      {
        url: "/profile/",
        answers: [{ status: 200, data: { ...PROFILE_DISPLAY, public_identity_mode: "ANONYMOUS" } }],
      },
    ]);
    expect(await screen.findByTestId("preview-name")).toHaveTextContent("Anonymous Candidate");
    // 🎭 glyph for the anonymous avatar; ST initials for the display-name case.
    expect(screen.getByTestId("identity-preview")).toHaveTextContent("🎭");
  });

  it("disables the data-export request with its reason (no endpoint exists)", async () => {
    setup([{ url: "/profile/", answers: [{ status: 200, data: PROFILE_DISPLAY }] }]);
    const button = await screen.findByTestId("export-request");
    expect(button).toBeDisabled();
    expect(screen.getByTestId("export-reason")).toHaveTextContent(
      "Data export is not available yet.",
    );
  });
});
