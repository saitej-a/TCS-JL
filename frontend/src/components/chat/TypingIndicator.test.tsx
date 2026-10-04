/**
 * TypingIndicator tests (Phase 15 Task 3, 15-UI-SPEC).
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TypingIndicator } from "@/components/chat/TypingIndicator";
import type { ChatTypingUser } from "@/types/chat";

describe("TypingIndicator", () => {
  it("renders nothing when users list is empty or zero", () => {
    const { container } = render(<TypingIndicator users={[]} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders exactly '{name} is typing…' for one user", () => {
    const users: ChatTypingUser[] = [
      { id: "u-1", display_name: "Priya", expires_at: "2026-10-04T12:00:00Z" },
    ];
    render(<TypingIndicator users={users} />);

    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveTextContent("Priya is typing\u2026");
  });

  it("renders '{name1} and {name2} are typing…' for two users", () => {
    const users: ChatTypingUser[] = [
      { id: "u-1", display_name: "Priya", expires_at: "2026-10-04T12:00:00Z" },
      { id: "u-2", display_name: "Sam", expires_at: "2026-10-04T12:00:00Z" },
    ];
    render(<TypingIndicator users={users} />);

    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveTextContent("Priya and Sam are typing\u2026");
  });

  it("renders 'Several people are typing…' for three or more users", () => {
    const users: ChatTypingUser[] = [
      { id: "u-1", display_name: "Priya", expires_at: "2026-10-04T12:00:00Z" },
      { id: "u-2", display_name: "Sam", expires_at: "2026-10-04T12:00:00Z" },
      { id: "u-3", display_name: "Alex", expires_at: "2026-10-04T12:00:00Z" },
    ];
    render(<TypingIndicator users={users} />);

    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveTextContent("Several people are typing\u2026");
  });

  it("handles a 200-character display name without throwing and applies truncate styling", () => {
    const longName = "A".repeat(200);
    const users: ChatTypingUser[] = [
      { id: "u-1", display_name: longName, expires_at: "2026-10-04T12:00:00Z" },
    ];
    render(<TypingIndicator users={users} />);

    const textSpan = screen.getByText(`${longName} is typing\u2026`);
    expect(textSpan).toBeInTheDocument();
    expect(textSpan).toHaveClass("truncate");
    expect(textSpan).toHaveClass("max-w-[12rem]");
  });

  it("ensures every dot carries both animate-typing-wave and motion-reduce:animate-none", () => {
    const users: ChatTypingUser[] = [
      { id: "u-1", display_name: "Priya", expires_at: "2026-10-04T12:00:00Z" },
    ];
    const { container } = render(<TypingIndicator users={users} />);

    const dots = container.querySelectorAll("span.rounded-full");
    expect(dots.length).toBe(3);
    dots.forEach((dot) => {
      expect(dot).toHaveClass("animate-typing-wave");
      expect(dot).toHaveClass("motion-reduce:animate-none");
    });
  });
});
