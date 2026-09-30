/**
 * Landing page tests: stats render on resolve, the failure path renders the
 * fallback (never fabricated numbers), and the CTAs route correctly.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { AuthProvider } from "@/context/AuthContext";
import { LandingPage } from "@/pages/LandingPage";
import { scriptAdapter } from "@/test/axiosTestHelper";

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      {/* The shared visitor chrome reads useAuth; a visitor boot resolves
          synchronously (no stored token → no network). */}
      <AuthProvider>
        <LandingPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LandingPage", () => {
  it("renders the live stats from /public/stats/", async () => {
    scriptAdapter([
      {
        url: "/public/stats/",
        respond: () => ({
          status: 200,
          data: {
            data_source: "COMMUNITY_REPORTED",
            disclaimer: "Community-reported",
            registered_candidates: 1248,
            community_posts: 42,
            timeline_events: 220,
          },
        }),
      },
    ]);
    renderLanding();
    await waitFor(() => {
      expect(screen.getByText("1,248")).toBeInTheDocument();
    });
    expect(screen.getByText("Community posts")).toBeInTheDocument();
    expect(screen.getByText("220")).toBeInTheDocument();
  });

  it("renders the fallback on API failure — never fabricated numbers", async () => {
    scriptAdapter([
      {
        url: "/public/stats/",
        respond: () => ({ status: 500, data: { error: { code: "UNKNOWN", message: "boom" } } }),
      },
    ]);
    renderLanding();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("unavailable");
    });
    expect(screen.queryByText("1,248")).not.toBeInTheDocument();
  });

  it("links the CTAs to /register and /login", () => {
    scriptAdapter([
      { url: "/public/stats/", respond: () => ({ status: 500, data: {} }) },
    ]);
    renderLanding();
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("carries the footer disclaimer", () => {
    scriptAdapter([
      { url: "/public/stats/", respond: () => ({ status: 500, data: {} }) },
    ]);
    renderLanding();
    expect(screen.getByTestId("disclaimer-footer")).toBeInTheDocument();
  });

  it("answers the non-affiliation FAQ without claiming verification", () => {
    scriptAdapter([
      { url: "/public/stats/", respond: () => ({ status: 500, data: {} }) },
    ]);
    renderLanding();
    expect(screen.getByText("Is this officially linked to TCS?")).toBeInTheDocument();
    expect(screen.getByText("Does the tracker verify my joining letter?")).toBeInTheDocument();
    // The composition's hashing story is not shipped: the answer says so.
    expect(screen.getByText(/no document upload/i)).toBeInTheDocument();
    expect(screen.queryByText(/SHA-256|hash verified/i)).not.toBeInTheDocument();
  });

  it("links the community band to the real feed", () => {
    scriptAdapter([
      {
        url: "/public/stats/",
        respond: () => ({
          status: 200,
          data: {
            data_source: "COMMUNITY_REPORTED",
            disclaimer: "Community-reported",
            registered_candidates: 1248,
            community_posts: 42,
            timeline_events: 220,
          },
        }),
      },
    ]);
    renderLanding();
    expect(screen.getByRole("link", { name: "Open the community feed" })).toHaveAttribute(
      "href",
      "/community",
    );
  });
});
