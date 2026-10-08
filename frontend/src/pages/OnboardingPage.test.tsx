/**
 * Onboarding wizard tests:
 * Step 1: Select recruitment status + fill conditional milestone date inputs
 *         (e.g., JRS asks interview date, offer letter date, and JRS date).
 * Step 2: Candidature details (display name, stream, region, batch).
 * Step 3: Review & accuracy confirmation, then releases truthful gate to dashboard.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/context/AuthContext";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { scriptAdapter } from "@/test/axiosTestHelper";

const PROFILE_404 = {
  status: 404,
  data: { error: { code: "PROFILE_NOT_FOUND", message: "No profile yet." } },
};

const PROFILE_CREATED = {
  id: "p1",
  display_name: "Sai",
  public_identity_mode: "DISPLAY_NAME",
  batch: "2025",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  interview_center: "",
  interview_date: "2025-02-10",
  joining_location: "",
  current_status: "READINESS_SURVEY",
  offer_letter_date: "2025-03-15",
  expected_joining_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const ME_COMPLETE = {
  id: "u1",
  email: "c@example.com",
  is_verified: true,
  created_at: "2026-01-01T00:00:00Z",
  profile_completed: true,
};

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={["/onboarding"]}>
      <AuthProvider>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<p>dashboard-here</p>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("OnboardingPage", () => {
  it("starts at step 1 asking recruitment status when no profile exists (404)", async () => {
    scriptAdapter([{ url: "/profile/", respond: () => PROFILE_404 }]);
    renderWizard();
    await waitFor(() => {
      expect(screen.getByText("What is your recruitment status?")).toBeInTheDocument();
    });
    expect(screen.getByText(/Step 1 of 3/)).toBeInTheDocument();
  });

  it("dynamically shows interview date, offer letter date, and JRS date when JRS status is selected", async () => {
    const user = userEvent.setup();
    scriptAdapter([{ url: "/profile/", respond: () => PROFILE_404 }]);
    renderWizard();

    await waitFor(() => {
      expect(screen.getByText("What is your recruitment status?")).toBeInTheDocument();
    });

    // Select "Joining readiness survey (JRS) received"
    await user.click(screen.getByLabelText(/Joining readiness survey \(JRS\) received/i));

    // Must show interview date, offer letter date, and JRS date
    expect(screen.getByLabelText(/Interview date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Offer letter date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Joining readiness survey \(JRS\) date/i)).toBeInTheDocument();
  });

  it("completes Step 1 and advances to Step 2 (Candidature details)", async () => {
    const user = userEvent.setup();
    scriptAdapter([{ url: "/profile/", respond: () => PROFILE_404 }]);
    renderWizard();

    await waitFor(() => {
      expect(screen.getByText("What is your recruitment status?")).toBeInTheDocument();
    });

    // Pick JRS
    await user.click(screen.getByLabelText(/Joining readiness survey \(JRS\) received/i));

    // Fill the required dates
    await user.type(screen.getByLabelText(/Offer letter date/i), "2025-03-15");
    await user.type(screen.getByLabelText(/Joining readiness survey \(JRS\) date/i), "2025-04-10");

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(screen.getByText("Tell us about your candidature")).toBeInTheDocument();
      expect(screen.getByText(/Step 2 of 3/)).toBeInTheDocument();
    });
  });

  it("persists profile and timeline milestones upon completing step 2", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([
      { url: "/profile/", method: "GET", respond: () => PROFILE_404 },
      { url: "/profile/", method: "POST", respond: () => ({ status: 201, data: PROFILE_CREATED }) },
      {
        url: "/timeline/",
        method: "POST",
        respond: () => ({
          status: 201,
          data: {
            id: "t1",
            event_type: "OFFER_LETTER",
            event_date: "2025-03-15",
            description: "x",
            is_verified: false,
            created_at: "x",
          },
        }),
      },
      {
        url: "/timeline/",
        method: "POST",
        respond: () => ({
          status: 201,
          data: {
            id: "t2",
            event_type: "READINESS_SURVEY",
            event_date: "2025-04-10",
            description: "x",
            is_verified: false,
            created_at: "x",
          },
        }),
      },
      {
        url: "/timeline/",
        method: "POST",
        respond: () => ({
          status: 201,
          data: {
            id: "t3",
            event_type: "INTERVIEW",
            event_date: "2025-02-10",
            description: "x",
            is_verified: false,
            created_at: "x",
          },
        }),
      },
      { url: "/me/", method: "GET", respond: () => ({ status: 200, data: ME_COMPLETE }) },
    ]);

    renderWizard();
    await waitFor(() => {
      expect(screen.getByText("What is your recruitment status?")).toBeInTheDocument();
    });

    // Select JRS
    await user.click(screen.getByLabelText(/Joining readiness survey \(JRS\) received/i));
    await user.type(screen.getByLabelText(/Interview date/i), "2025-02-10");
    await user.type(screen.getByLabelText(/Offer letter date/i), "2025-03-15");
    await user.type(screen.getByLabelText(/Joining readiness survey \(JRS\) date/i), "2025-04-10");

    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2
    await waitFor(() => screen.getByLabelText("Community display name"));
    await user.type(screen.getByLabelText("Community display name"), "Sai");
    await user.type(screen.getByLabelText("Region of joining"), "Hyderabad");
    await user.click(screen.getByRole("radio", { name: /^digital/ }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3 Review
    await waitFor(() => screen.getByText("Review your details"));
    expect(screen.getByText("Review your details")).toBeInTheDocument();

    const post = calls.find((c) => c.method?.toLowerCase() === "post" && String(c.url).endsWith("/profile/"));
    expect(post).toBeDefined();
    const body = JSON.parse(String(post?.data));
    expect(body).toMatchObject({
      display_name: "Sai",
      hiring_type: "DIGITAL",
      region: "Hyderabad",
      batch: "2025",
      offer_letter_date: "2025-03-15",
      interview_date: "2025-02-10",
    });

    const timelinePosts = calls.filter((c) => c.method?.toLowerCase() === "post" && String(c.url).endsWith("/timeline/"));
    expect(timelinePosts.length).toBeGreaterThanOrEqual(2);
  });

  it("requires the accuracy confirmation before finishing, then releases the gate", async () => {
    const user = userEvent.setup();
    const { calls } = scriptAdapter([
      { url: "/profile/", method: "GET", respond: () => PROFILE_404 },
      { url: "/profile/", method: "POST", respond: () => ({ status: 201, data: PROFILE_CREATED }) },
      {
        url: "/timeline/",
        method: "POST",
        respond: () => ({
          status: 201,
          data: {
            id: "t1",
            event_type: "OFFER_LETTER",
            event_date: "2025-03-15",
            description: "x",
            is_verified: false,
            created_at: "x",
          },
        }),
      },
      { url: "/me/", method: "GET", respond: () => ({ status: 200, data: ME_COMPLETE }) },
    ]);

    renderWizard();
    await waitFor(() => {
      expect(screen.getByText("What is your recruitment status?")).toBeInTheDocument();
    });

    // Default status OFFER_RECEIVED
    await user.type(screen.getByLabelText(/Offer letter date/i), "2025-03-15");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 2
    await waitFor(() => screen.getByLabelText("Community display name"));
    await user.type(screen.getByLabelText("Community display name"), "Sai");
    await user.type(screen.getByLabelText("Region of joining"), "Hyderabad");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    // Step 3
    await waitFor(() => screen.getByText("Review your details"));
    const finishButton = screen.getByRole("button", { name: /Finish and go to dashboard/ });
    expect(finishButton).toBeDisabled();

    await user.click(screen.getByTestId("confirm-accuracy"));
    expect(finishButton).toBeEnabled();
    await user.click(finishButton);

    await waitFor(() => {
      expect(screen.getByText("dashboard-here")).toBeInTheDocument();
    });
    expect(calls.some((c) => String(c.url).endsWith("/me/"))).toBe(true);
  });
});
