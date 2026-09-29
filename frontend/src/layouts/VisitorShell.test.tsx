/**
 * VisitorShell tests (9.5.1 Task 4): the auth-aware chrome — visitors see the
 * §5.4 nav + auth zone, signed-in readers never see Sign in/Create account,
 * booting hides the zone — plus the footer link row and disclaimer.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import type { AxiosAdapter } from "axios";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api/client";
import { routeAdapter } from "@/test/axiosTestHelper";
import { AuthProvider } from "@/context/AuthContext";
import { VisitorFooter } from "@/layouts/VisitorFooter";
import { VisitorShell } from "@/layouts/VisitorShell";
import * as tokenStore from "@/api/tokenStore";

function renderShell(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route element={<VisitorShell />}>
            <Route path="/" element={<p>page-home</p>} />
            <Route path="/about" element={<p>page-about</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // Default: no stored session → AuthProvider boots straight to anonymous.
  vi.spyOn(tokenStore, "getRefreshToken").mockReturnValue(null);
  vi.spyOn(tokenStore, "getAccessToken").mockReturnValue(null);
});

const bootingAdapter: AxiosAdapter = () => new Promise(() => undefined); // never resolves

describe("VisitorFooter", () => {
  it("renders the §5.4 link row above the shipped footer disclaimer", () => {
    render(
      <MemoryRouter>
        <VisitorFooter />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Explore Community" })).toHaveAttribute("href", "/community");
    expect(screen.getByTestId("disclaimer-footer")).toBeInTheDocument();
  });
});

describe("VisitorHeader auth zones", () => {
  it("shows the §5.4 nav and the visitor auth zone for a signed-out reader", async () => {
    renderShell();
    const header = screen.getByRole("banner");
    await waitFor(() => {
      expect(within(header).getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    });
    expect(within(header).getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/register");
    expect(within(header).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(within(header).getByRole("link", { name: "Community" })).toHaveAttribute("href", "/community");
    expect(within(header).getByRole("link", { name: "About" })).toHaveAttribute("href", "/about");
  });

  it("never shows Register to a signed-in reader — account affordance instead", async () => {
    vi.spyOn(tokenStore, "getRefreshToken").mockReturnValue("stored-refresh-token");
    vi.spyOn(tokenStore, "getAccessToken").mockReturnValue("stored-access-token");
    routeAdapter([
      { url: "/auth/token/refresh/", answers: [{ status: 200, data: { access: "a", refresh: "r" } }] },
      { url: "/me/", answers: [{ status: 200, data: { id: "u1", email: "me@example.com", is_verified: true, created_at: "2026-01-01T00:00:00Z", profile_completed: true } }] },
    ]);
    renderShell();
    const header = () => screen.getByRole("banner");
    await waitFor(() => {
      expect(within(header()).getByRole("link", { name: "My tracker" })).toBeInTheDocument();
    });
    expect(within(header()).queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
    expect(within(header()).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("hides the auth zone while booting", async () => {
    vi.spyOn(tokenStore, "getRefreshToken").mockReturnValue("stored-refresh-token");
    vi.spyOn(tokenStore, "getAccessToken").mockReturnValue(null);
    apiClient.defaults.adapter = bootingAdapter; // the refresh never resolves → status stays booting
    renderShell();
    const header = screen.getByRole("banner");
    expect(within(header).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
    expect(within(header).queryByRole("link", { name: "Create account" })).not.toBeInTheDocument();
    expect(within(header).queryByRole("link", { name: "My tracker" })).not.toBeInTheDocument();
    expect(screen.getByText("page-home")).toBeInTheDocument();
  });
});

describe("VisitorShell composition", () => {
  it("frames children with header + footer and renders the outlet", async () => {
    renderShell("/about");
    await waitFor(() => {
      expect(screen.getByText("page-about")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Community" })).toBeInTheDocument();
    expect(screen.getByTestId("disclaimer-footer")).toBeInTheDocument();
  });
});
