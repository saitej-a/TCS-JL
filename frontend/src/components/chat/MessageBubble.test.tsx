/**
 * MessageBubble Component tests (Phase 17 reply preview and interactions).
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MessageBubble } from "@/components/chat/MessageBubble";
import type { ChatMessage } from "@/types/chat";

const BASE_MESSAGE: ChatMessage = {
  id: "msg-1",
  room: "room-1",
  room_slug: "general",
  author: {
    id: "user-1",
    display_name: "Aarav Sharma",
    batch: "2025 Digital",
    hiring_type: "DIGITAL",
    region: "Bangalore",
  },
  body: "Does anyone have updates on the joining date?",
  is_deleted: false,
  created_at: new Date(Date.now() - 60000).toISOString(),
  can_delete: false,
};

describe("MessageBubble", () => {
  it("renders standard message body and author info", () => {
    render(<MessageBubble message={BASE_MESSAGE} isOwn={false} />);

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(
      screen.getByText("Does anyone have updates on the joining date?"),
    ).toBeInTheDocument();
  });

  it("renders reply quote preview when reply_to is present", () => {
    const messageWithReply: ChatMessage = {
      ...BASE_MESSAGE,
      id: "msg-2",
      body: "Yes, letters are arriving this Friday!",
      reply_to: {
        id: "msg-1",
        author: {
          id: "user-author-2",
          display_name: "Sneha Patel",
          batch: "2025 Ninja",
          hiring_type: "NINJA",
          region: "Mumbai",
        },
        body: "Does anyone have updates on the joining date?",
        is_deleted: false,
      },
    };

    render(<MessageBubble message={messageWithReply} isOwn={false} />);

    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
    expect(screen.getByText("Sneha Patel")).toBeInTheDocument();
    expect(screen.getByText("Yes, letters are arriving this Friday!")).toBeInTheDocument();
    expect(
      screen.getByText("Does anyone have updates on the joining date?"),
    ).toBeInTheDocument();
  });

  it("renders anonymous authors as Anonymous in the message card", () => {
    const anonymousMessage: ChatMessage = {
      ...BASE_MESSAGE,
      id: "msg-3",
      author: {
        ...BASE_MESSAGE.author,
        id: "user-2",
        display_name: "Anonymous Candidate",
      },
      body: "Hidden identity in chat",
    };

    render(<MessageBubble message={anonymousMessage} isOwn={false} />);

    expect(screen.getByText("Anonymous")).toBeInTheDocument();
    expect(screen.getByText("Hidden identity in chat")).toBeInTheDocument();
  });

  it("renders tombstone text in reply quote if referenced message was deleted", () => {
    const messageWithDeletedReply: ChatMessage = {
      ...BASE_MESSAGE,
      id: "msg-4",
      body: "Replying to a removed note",
      reply_to: {
        id: "msg-orig",
        author: {
          id: "user-2",
          display_name: "Anonymous Candidate",
          batch: null,
          hiring_type: null,
          region: null,
        },
        body: "This message was removed.",
        is_deleted: true,
      },
    };

    render(<MessageBubble message={messageWithDeletedReply} isOwn={false} />);

    expect(screen.getByText("This message was removed.")).toBeInTheDocument();
    expect(screen.getByText("Replying to a removed note")).toBeInTheDocument();
    expect(screen.getByText("Anonymous")).toBeInTheDocument();
  });

  it("calls onReply callback when reply button is clicked", async () => {
    const user = userEvent.setup();
    const handleReply = vi.fn();

    render(
      <MessageBubble
        message={BASE_MESSAGE}
        isOwn={false}
        onReply={handleReply}
      />,
    );

    const replyBtn = screen.getByRole("button", { name: /reply to message/i });
    await user.click(replyBtn);

    expect(handleReply).toHaveBeenCalledTimes(1);
    expect(handleReply).toHaveBeenCalledWith(BASE_MESSAGE);
  });
});
