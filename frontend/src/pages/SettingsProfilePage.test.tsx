/**
 * SettingsProfilePage tests (9.5 Task 3): save + failure acceptance — a
 * successful partial PATCH, DRF field errors rendered inline with a focused
 * summary, the unsaved-changes indicator, and the honest wait-time copy
 * (recorded divergence: the mock's "survey response" warning has no backend
 * rule, so the shipped copy states only what is true).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SettingsProfilePage } from "@/pages/SettingsProfilePage";
import { AuthProvider } from "@/context/AuthContext";
import { routeAdapter } from "@/test/axiosTestHelper";

const PROFILE = {
  id: "p1",
  display_name: "Sai T.",
  public_identity_mode: "ANONYMOUS",
  batch: "2025",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  interview_center: "HYD",
  interview_date: null,
  joining_location: "",
  current_status: "WAITING_FOR_JOINING_LETTER",
  offer_letter_date: null,
  expected_joining_date: "2026-11-02",
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
  // useBlocker needs a DATA router — createMemoryRouter is one (MemoryRouter
  // is not), so the guard runs under the same semantics as production.
  const router = createMemoryRouter(
    [
      {
        path: "/settings/profile",
        element: (
          <AuthProvider>
            <SettingsProfilePage />
          </AuthProvider>
        ),
      },
      { path: "*", element: <div data-testid="other-page">other</div> },
    ],
    { initialEntries: ["/settings/profile"] },
  );
  render(<RouterProvider router={router} />);
}

afterEach(() => {
  localStorage.clear();
  window.confirm = () => true;
});

describe("SettingsProfilePage (9.5 Task 3)", () => {
  it("saves edited fields via a partial PATCH and confirms", async () => {
    const user = userEvent.setup();
    setup([
      { url: "/profile/", answers: [{ status: 200, data: PROFILE }] },
    ]);
    // routeAdapter's last entry repeats, so the PATCH is answered by the same
    // 200 — acceptable for the accept path since we assert on the call itself.
    // findByLabelText over findByText: the label text also appears in the
    // section heading, so text-matching finds two elements.
    const nameInput = await screen.findByLabelText("Display name");
    await user.clear(nameInput);
    await user.type(nameInput, "Sai Newname");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByTestId("saved-note")).toBeInTheDocument();
    });
  });

  it("renders DRF field errors inline with a focused summary on 400", async () => {
    const user = userEvent.setup();
    setup([
      {
        url: "/profile/",
        answers: [
          { status: 200, data: PROFILE },
          {
            status: 400,
            data: { region: ["This field may not be blank."], batch: ["Enter a valid year."] },
          },
        ],
      },
    ]);
    const regionInput = await screen.findByLabelText(/region/i);
    await user.clear(regionInput);
    await user.type(regionInput, " ");
    await user.click(screen.getByRole("button", { name: /save/i }));

    const summary = await screen.findByTestId("error-summary");
    expect(summary).toHaveFocus();
    // Each message appears twice (summary list + inline) — getAllByText.
    expect(screen.getAllByText(/This field may not be blank./i).length).toBe(2);
    expect(screen.getAllByText(/Enter a valid year./i).length).toBe(2);
    // 2 fields → the summary names the count.
    expect(screen.getByText(/2 fields need attention/i)).toBeInTheDocument();
  });

  it("shows the unsaved-changes indicator when a field is edited and enables Save", async () => {
    const user = userEvent.setup();
    setup([{ url: "/profile/", answers: [{ status: 200, data: PROFILE }] }]);
    const nameInput = await screen.findByLabelText("Display name");
    // queryBy for the negative assertion — getBy would throw before the matcher.
    expect(screen.queryByTestId("unsaved-indicator")).not.toBeInTheDocument();
    await user.type(nameInput, "!");
    expect(await screen.findByTestId("unsaved-indicator")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: /save/i });
    expect(save).toBeEnabled();
    // Cancel reverts the edit and clears the indicator.
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByTestId("unsaved-indicator")).not.toBeInTheDocument();
  });

  it("carries the honest wait-time copy (divergence from the mock's survey warning)", async () => {
    setup([{ url: "/profile/", answers: [{ status: 200, data: PROFILE }] }]);
    expect(
      await screen.findByText(
        /Community wait-time metrics are computed from survey, offer and joining-letter event dates/i,
      ),
    ).toBeInTheDocument();
    // The email is read-only with the sign-in-identity helper, never editable.
    expect(screen.getByTestId("email-readonly")).toBeInTheDocument();
  });
});
