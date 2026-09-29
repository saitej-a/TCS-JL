/**
 * 404 routing tests (9.5 Task 10): the acceptance criterion is that a
 * genuinely bad URL renders the 404 panel with the app shell intact for a
 * signed-in user, and chromeless for a visitor.
 */
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { AuthProvider } from "@/context/AuthContext";
import { RequireAuth } from "@/routes/RequireAuth";
import { NotFoundPage } from "@/pages";
import { routeAdapter } from "@/test/axiosTestHelper";

function authRoutes(): Parameters<typeof routeAdapter>[0] {
  localStorage.setItem("tjt.refresh_token", "test-refresh");
  return [
    { url: "/auth/token/refresh/", answers: [{ status: 200, data: { access: "a", refresh: "r" } }] },
    {
      url: "/me/",
      answers: [
        {
          status: 200,
          data: {
            id: "u1",
            email: "uat93@example.com",
            is_verified: true,
            is_staff: false,
            created_at: "2026-08-15T09:00:00Z",
            profile_completed: true,
          },
        },
      ],
    },
    // AppShell (rendered by RequireAuth around the 404) fetches the banner.
    { url: "/announcements/", answers: [{ status: 200, data: { count: 0, next: null, previous: null, results: [] } }] },
  ];
}

afterEach(() => {
  localStorage.clear();
});

describe("404 routing (9.5 Task 10)", () => {
  it("renders the 404 panel with the shell intact for a signed-in user", async () => {
    routeAdapter(authRoutes());
    render(
      <MemoryRouter initialEntries={["/dashboard/typo"]}>
        <AuthProvider>
          <Routes>
            {/* RequireAuth already renders AppShell + Outlet around children. */}
            <Route element={<RequireAuth />}>
              <Route path="/dashboard/typo" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    await screen.findByTestId("not-found-panel");
    expect(screen.getByTestId("not-found-panel")).toHaveTextContent("/dashboard/typo");
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByTestId("mobile-tab-bar")).toBeInTheDocument();
  });

  it("renders the panel chromeless for visitors on unknown routes", async () => {
    render(
      <MemoryRouter initialEntries={["/somewhere/unknown"]}>
        <NotFoundPage />
      </MemoryRouter>,
    );
    await screen.findByTestId("not-found-panel");
    expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  });
});
