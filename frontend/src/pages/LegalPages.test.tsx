/**
 * Legal route tests (9.5.1 Task 5): the three pages render inside the
 * VisitorShell, the honesty line is present, the TOC appears only from two
 * sections, and the awaiting-copy state renders gracefully.
 */
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as tokenStore from "@/api/tokenStore";
import { AuthProvider } from "@/context/AuthContext";
import { VisitorShell } from "@/layouts/VisitorShell";
import { LegalLayout } from "@/pages/LegalLayout";
import { AboutPage } from "@/pages/AboutPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import type { LegalPageData } from "@/pages/LegalLayout";

function renderLegal(path: string, element: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route element={<VisitorShell />}>
            <Route path={path} element={element} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.spyOn(tokenStore, "getRefreshToken").mockReturnValue(null);
  vi.spyOn(tokenStore, "getAccessToken").mockReturnValue(null);
});

describe("legal routes on the visitor shell", () => {
  for (const [path, name, Page, title] of [
    ["/about", "about", AboutPage, "About"],
    ["/privacy", "privacy", PrivacyPage, "Privacy Policy"],
    ["/terms", "terms", TermsPage, "Terms of Service"],
  ] as const) {
    it(`renders /${name} inside the shell with title + honesty line`, async () => {
      renderLegal(path, <Page />);
      await waitFor(() => {
        expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
      });
      expect(screen.getByTestId("legal-honesty")).toHaveTextContent(
        "describes how this community platform actually behaves",
      );
      // The shell is around it: header nav + footer disclaimer.
      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByTestId("disclaimer-footer")).toBeInTheDocument();
    });
  }
});

describe("LegalLayout TOC contract", () => {
  it("omits the TOC under two sections (awaiting-copy state renders cleanly)", () => {
    render(
      <LegalLayout page={{ title: "About", sections: [] } satisfies LegalPageData} />,
    );
    expect(screen.queryByTestId("legal-toc")).not.toBeInTheDocument();
    expect(screen.getByText(/no published sections yet/)).toBeInTheDocument();
  });

  it("shows the TOC from two sections", () => {
    render(
      <LegalLayout
        page={{
          title: "Terms of Service",
          sections: [
            { id: "acceptable-use", heading: "Acceptable use", paragraphs: ["Real words."] },
            { id: "enforcement", heading: "Enforcement", paragraphs: ["Real words."] },
          ],
        }}
      />,
    );
    expect(screen.getByTestId("legal-toc")).toBeInTheDocument();
    // The TOC anchor (and its in-prose twin) both point at the section id.
    const anchors = screen.getAllByRole("link", { name: "Acceptable use" });
    for (const anchor of anchors) {
      expect(anchor).toHaveAttribute("href", "#acceptable-use");
    }
    expect(anchors.length).toBeGreaterThanOrEqual(1);
  });
});
