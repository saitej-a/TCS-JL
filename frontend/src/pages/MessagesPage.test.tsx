/**
 * MessagesPage tests (Phase 13 D-01, D-08, D-11, ui-ux-pro-max).
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/context/AuthContext";
import { MessagesPage } from "@/pages/MessagesPage";
import type { ChatMessage, ChatRoom } from "@/types/chat";

// Mock API module
vi.mock("@/api/chat", () => ({
  createChatRoom: vi.fn(),
  listChatRooms: vi.fn(),
  listAdminMembers: vi.fn(),
  listChatMessages: vi.fn(),
  sendChatMessage: vi.fn(),
  deleteChatMessage: vi.fn(),
  fetchWsTicket: vi.fn(),
}));

let currentMockUser: { id: string; email: string; is_staff?: boolean } | null = {
  id: "u-me",
  email: "me@example.com",
};

vi.mock("@/context/AuthContext", async () => {
  const actual = await vi.importActual<typeof import("@/context/AuthContext")>(
    "@/context/AuthContext",
  );
  return {
    ...actual,
    useAuth: () => ({
      user: currentMockUser,
      status: currentMockUser ? "authenticated" : "anonymous",
      isAuthenticated: Boolean(currentMockUser),
      isBooting: false,
      login: vi.fn(),
      logout: vi.fn(),
      refreshUser: vi.fn(),
    }),
  };
});

import * as chatApi from "@/api/chat";

const MOCK_ROOMS: ChatRoom[] = [
  {
    id: "r-general",
    slug: "general",
    label: "General",
    is_default: true,
    is_archived: false,
    message_count: 5,
    last_message_at: "2026-09-30T10:00:00Z",
    created_at: "2026-09-01T00:00:00Z",
  },
  {
    id: "r-jl",
    slug: "joining_letter",
    label: "Joining Letter",
    is_default: false,
    is_archived: false,
    message_count: 2,
    last_message_at: "2026-09-30T09:30:00Z",
    created_at: "2026-09-01T00:00:00Z",
  },
];

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "m-1",
    room: "r-general",
    room_slug: "general",
    author: {
      id: "u-1",
      display_name: "Sai Teja",
      batch: "2025 Digital",
      hiring_type: "DIGITAL",
      region: "Hyderabad",
      avatar_seed: 1,
    },
    body: "Hello everyone in the General room!",
    is_deleted: false,
    created_at: "2026-09-30T10:00:00Z",
    can_delete: true,
  },
  {
    id: "m-2",
    room: "r-general",
    room_slug: "general",
    author: {
      id: "u-2",
      display_name: "Anonymous Candidate",
      batch: "2025 Ninja",
      hiring_type: "NINJA",
      region: "Bangalore",
      avatar_seed: 2,
    },
    body: "This message was removed.",
    is_deleted: true,
    created_at: "2026-09-30T10:05:00Z",
    can_delete: false,
  },
];

class MockWebSocket {
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = 1; // OPEN
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 10);
  }

  send = vi.fn();
  close = vi.fn();
}

function dispatchTyping(
  ws: MockWebSocket,
  user: { id: string; display_name: string },
  isTyping = true,
  expiresAt = new Date(Date.now() + 6000).toISOString(),
  room = "general",
) {
  act(() => {
    ws.onmessage?.({
      data: JSON.stringify({
        type: "chat.typing",
        room,
        user,
        is_typing: isTyping,
        expires_at: expiresAt,
      }),
    });
  });
}

function renderMessages(initialPath = "/messages?room=general") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/messages" element={<MessagesPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("MessagesPage", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    MockWebSocket.instances = [];
    currentMockUser = { id: "u-me", email: "me@example.com" };
    vi.stubGlobal("WebSocket", MockWebSocket);
    vi.mocked(chatApi.listChatRooms).mockResolvedValue(MOCK_ROOMS);
    vi.mocked(chatApi.listChatMessages).mockResolvedValue({
      results: MOCK_MESSAGES,
      has_more: false,
    });
    vi.mocked(chatApi.fetchWsTicket).mockResolvedValue({
      ticket: "test-ticket",
      expires_at: "2026-09-30T10:01:00Z",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders the channel header and room rail", async () => {
    renderMessages();

    await waitFor(() => {
      expect(screen.getAllByText("General").length).toBeGreaterThan(0);
      expect(screen.getByText("Default Channel")).toBeInTheDocument();
    });

    expect(screen.getAllByText("Joining Letter").length).toBeGreaterThan(0);
  });

  it("lets staff create a channel and opens it", async () => {
    const user = userEvent.setup();
    currentMockUser = { id: "u-admin", email: "admin@example.com", is_staff: true };
    vi.mocked(chatApi.createChatRoom).mockResolvedValue({
      id: "r-data",
      slug: "data-science",
      label: "Data Science",
      is_default: false,
      is_archived: false,
      message_count: 0,
      last_message_at: null,
      created_at: "2026-10-01T00:00:00Z",
    });

    renderMessages();
    await user.click(await screen.findByRole("button", { name: "Create channel" }));
    await user.type(screen.getByRole("textbox", { name: "Channel name" }), "Data Science");
    await user.click(screen.getAllByRole("button", { name: "Create channel" })[1]);

    await waitFor(() => {
      expect(chatApi.createChatRoom).toHaveBeenCalledWith("Data Science");
      expect(screen.getByLabelText("Chat channel: Data Science")).toBeInTheDocument();
    });
  });

  it("renders the message log with author and message content", async () => {
    renderMessages();

    await waitFor(() => {
      expect(
        screen.getByText("Hello everyone in the General room!"),
      ).toBeInTheDocument();
      expect(screen.getByText("Sai Teja")).toBeInTheDocument();
    });

    // Tombstone check
    expect(screen.getByText("This message was removed.")).toBeInTheDocument();
  });

  it("renders empty state when room has no messages", async () => {
    vi.mocked(chatApi.listChatMessages).mockResolvedValue({
      results: [],
      has_more: false,
    });

    renderMessages();

    await waitFor(() => {
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
      expect(
        screen.getByText("Start the conversation in #General."),
      ).toBeInTheDocument();
    });
  });

  it("allows typing and sending a message via the composer", async () => {
    const user = userEvent.setup();
    vi.mocked(chatApi.sendChatMessage).mockResolvedValue({
      id: "m-new",
      room: "r-general",
      room_slug: "general",
      author: {
        id: "u-me",
        display_name: "My Name",
        batch: "2025 Digital",
        hiring_type: "DIGITAL",
        region: "Hyderabad",
      },
      body: "My brand new chat message",
      is_deleted: false,
      created_at: "2026-09-30T10:15:00Z",
      can_delete: true,
    });

    renderMessages();

    const textarea = await screen.findByRole("textbox", {
      name: "Message #General",
    });
    expect(textarea).toBeInTheDocument();

    await user.type(textarea, "My brand new chat message");
    expect(textarea).toHaveValue("My brand new chat message");

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await user.click(sendButton);

    await waitFor(() => {
      expect(textarea).toHaveValue("");
    });
  });

  it("displays delete button on messages user can delete", async () => {
    renderMessages();

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole("button", {
        name: "Delete message",
      });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });
  });

  it("stays live when switching channels (stale socket close is ignored)", async () => {
    const user = userEvent.setup();
    renderMessages();

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });
    await waitFor(() => {
      expect(screen.getByTitle("Live updates active")).toBeInTheDocument();
    });

    // Switch to another channel
    await user.click(screen.getAllByText("Joining Letter")[0]);
    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(2);
    });

    // The browser delivers the previous channel socket's close after the switch
    act(() => {
      MockWebSocket.instances[0].onclose?.({ code: 1000 });
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/Live updates paused/i),
      ).not.toBeInTheDocument();
      expect(screen.getByTitle("Live updates active")).toBeInTheDocument();
    });

    // Switch back to the default channel — same stale-close scenario
    await user.click(screen.getAllByText("General")[0]);
    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(3);
    });

    act(() => {
      MockWebSocket.instances[1].onclose?.({ code: 1000 });
    });

    await waitFor(() => {
      expect(
        screen.queryByText(/Live updates paused/i),
      ).not.toBeInTheDocument();
      expect(screen.getByTitle("Live updates active")).toBeInTheDocument();
    });
  });

  it("asserts typing row is absent on first render and appears above the composer when another user types", async () => {
    renderMessages();

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    dispatchTyping(MockWebSocket.instances[0], {
      id: "u-other",
      display_name: "Priya",
    });

    const statusEl = screen.getByRole("status");
    expect(statusEl).toBeInTheDocument();
    expect(statusEl).toHaveTextContent("Priya is typing\u2026");

    const formEl = statusEl.closest("footer")?.querySelector("form");
    expect(formEl).toBeInTheDocument();
    expect(statusEl.nextElementSibling).toBe(formEl);
  });

  it("does not duplicate entry on repeated typing frames for the same user", async () => {
    renderMessages();

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    dispatchTyping(MockWebSocket.instances[0], {
      id: "u-other",
      display_name: "Priya",
    });
    dispatchTyping(MockWebSocket.instances[0], {
      id: "u-other",
      display_name: "Priya",
    });

    const statusEl = screen.getByRole("status");
    expect(statusEl).toHaveTextContent("Priya is typing\u2026");
    expect(statusEl).not.toHaveTextContent("and");
  });

  it("ignores typing frame whose user.id matches the signed-in user's id", async () => {
    renderMessages();

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    dispatchTyping(MockWebSocket.instances[0], {
      id: "u-me",
      display_name: "Me Myself",
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("removes typing entry once its expires_at passes via timer sweep", async () => {
    vi.useFakeTimers();

    renderMessages();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(20);
    });

    expect(MockWebSocket.instances).toHaveLength(1);

    const now = Date.now();
    dispatchTyping(
      MockWebSocket.instances[0],
      { id: "u-other", display_name: "Priya" },
      true,
      new Date(now + 2000).toISOString(),
    );

    expect(screen.getByRole("status")).toHaveTextContent("Priya is typing\u2026");

    // Advance 4000ms so expires_at (2000ms) has passed and interval sweeps it
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("clears typing indicator when switching channels", async () => {
    const user = userEvent.setup();
    renderMessages();

    await waitFor(() => {
      expect(MockWebSocket.instances).toHaveLength(1);
    });

    dispatchTyping(MockWebSocket.instances[0], {
      id: "u-other",
      display_name: "Priya",
    });

    expect(screen.getByRole("status")).toHaveTextContent("Priya is typing\u2026");

    // Switch channels
    await user.click(screen.getAllByText("Joining Letter")[0]);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});
