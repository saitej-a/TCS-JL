import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/chat", () => ({
  listAdminMembers: vi.fn(),
}));

import { listAdminMembers } from "@/api/chat";
import { AdminMembersPage } from "@/pages/AdminMembersPage";

const MEMBER = {
  id: "member-1",
  email: "candidate@example.com",
  display_name: "Candidate One",
  batch: "2026",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  current_status: "WAITING_FOR_JOINING_LETTER",
};

describe("AdminMembersPage", () => {
  beforeEach(() => {
    vi.mocked(listAdminMembers).mockReset();
  });

  it("shows member profile details and loads the next page", async () => {
    const user = userEvent.setup();
    vi.mocked(listAdminMembers)
      .mockResolvedValueOnce({
        count: 21,
        next: "?page=2",
        previous: null,
        results: [MEMBER],
      })
      .mockResolvedValueOnce({
        count: 21,
        next: null,
        previous: "?page=1",
        results: [{ ...MEMBER, id: "member-2", email: "second@example.com" }],
      });

    render(<AdminMembersPage />);

    expect(await screen.findByText("Candidate One")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /candidate@example.com/i })).toHaveAttribute(
      "href",
      "mailto:candidate@example.com",
    );
    expect(screen.getByText("Waiting For Joining Letter")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(listAdminMembers).toHaveBeenLastCalledWith(2));
    expect(await screen.findByRole("link", { name: /second@example.com/i })).toBeInTheDocument();
  });
});
