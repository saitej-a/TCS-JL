/**
 * TimelinePage tests (Task 7): create posts exactly the three writable
 * fields (never auto_update_status), a rejected date renders the server's
 * message inline verbatim, and delete requires confirmation before DELETE.
 *
 * Script steps must match the page's actual request order: the initial load
 * fires GET /timeline/ (refresh) and GET /profile/ (status) via Promise.all.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { TimelinePage } from "@/pages/TimelinePage";
import { ToastProvider } from "@/components/Toast";
import { scriptAdapter } from "@/test/axiosTestHelper";

const PROFILE = {
  id: "prof-1",
  display_name: "Sai T.",
  public_identity_mode: "DISPLAY_NAME",
  batch: "2025 Digital",
  hiring_type: "DIGITAL",
  region: "Hyderabad",
  interview_center: "Hyderabad",
  interview_date: null,
  joining_location: "Hyderabad",
  current_status: "WAITING_FOR_JOINING_LETTER",
  offer_letter_date: null,
  expected_joining_date: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const EVENT = {
  id: "evt-1",
  event_type: "INTERVIEW",
  event_date: "2026-04-23",
  description: "Hyderabad center.",
  is_verified: true,
  created_at: "2026-04-23T00:00:00Z",
};

function listResponse(events: unknown[]) {
  return { status: 200, data: { count: events.length, next: null, previous: null, results: events } };
}

function renderTimeline() {
  return render(
    <MemoryRouter initialEntries={["/timeline"]}>
      <ToastProvider>
        <TimelinePage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("TimelinePage", () => {
  it("renders the shared timeline-style My Status Summary card", async () => {
    scriptAdapter([
      { url: "/timeline/", method: "get", respond: () => listResponse([EVENT]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
    ]);
    renderTimeline();

    const summary = await screen.findByRole("region", { name: "My Status Summary" });
    expect(summary).toHaveClass("rounded-2xl", "bg-white", "dark:bg-slate-800");
    expect(within(summary).getByText("Latest milestone:")).toBeInTheDocument();
    expect(
      within(summary).getByRole("button", { name: /Update my status/i }),
    ).toBeInTheDocument();
  });

  it("posts exactly the three writable fields on create", async () => {
    const user = userEvent.setup();
    const bodies: string[] = [];
    scriptAdapter([
      { url: "/timeline/", method: "get", respond: () => listResponse([]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
      {
        url: "/timeline/",
        method: "post",
        respond: (config) => {
          bodies.push(String(config.data));
          return { status: 201, data: EVENT };
        },
      },
      { url: "/timeline/", method: "get", respond: () => listResponse([EVENT]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
    ]);
    renderTimeline();
    const addButton = await screen.findByRole("button", { name: "Add Milestone Event" });
    expect(addButton).not.toHaveTextContent("+");

    await user.click(addButton);
    const saveButton = await screen.findByRole("button", { name: /Add Event/i });
    await user.click(saveButton);
    await waitFor(() => expect(bodies).toHaveLength(1));
    const body = JSON.parse(bodies[0] ?? "{}");
    expect(Object.keys(body).sort()).toEqual(["description", "event_date", "event_type"]);
  });

  it("renders a rejected date's server message inline", async () => {
    const user = userEvent.setup();
    const SERVER_MESSAGE = "event_date cannot be more than 730 days in the future.";
    scriptAdapter([
      { url: "/timeline/", method: "get", respond: () => listResponse([]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
      {
        url: "/timeline/",
        method: "post",
        respond: () => ({ status: 400, data: { event_date: [SERVER_MESSAGE] } }),
      },
    ]);
    renderTimeline();
    const addButton = await screen.findByRole("button", { name: /Add Milestone Event/i });
    await user.click(addButton);
    const saveButton = await screen.findByRole("button", { name: /Add Event/i });
    await user.click(saveButton);
    await waitFor(() => expect(screen.getByText(SERVER_MESSAGE)).toBeInTheDocument());
  });

  it("requires confirmation before DELETE", async () => {
    const user = userEvent.setup();
    const deletes: string[] = [];
    scriptAdapter([
      { url: "/timeline/", method: "get", respond: () => listResponse([EVENT]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
      {
        url: "/evt-1/",
        method: "delete",
        respond: (config) => {
          deletes.push(String(config.url));
          return { status: 204, data: {} };
        },
      },
      { url: "/timeline/", method: "get", respond: () => listResponse([]) },
    ]);
    renderTimeline();
    // The composition's literal bracketed row actions ([Edit] / [Delete]).
    const deleteButtons = await screen.findAllByRole("button", { name: "[Delete]" });
    await user.click(deleteButtons[0] as HTMLElement);
    const confirmButton = await screen.findByRole("button", { name: /Delete event/i });
    await user.click(confirmButton);
    await waitFor(() => expect(deletes).toHaveLength(1));
  });

  it("marks previous events as complete when offer letter received date is entered", async () => {
    const user = userEvent.setup();
    const bodies: string[] = [];
    const OFFER_EVENT = {
      id: "evt-offer",
      event_type: "OFFER_LETTER",
      event_date: "2026-05-15",
      description: "Offer Letter Issued",
      is_verified: false,
      created_at: "2026-05-15T00:00:00Z",
    };
    const INTERVIEW_EVENT = {
      id: "evt-interview",
      event_type: "INTERVIEW",
      event_date: "2026-05-15",
      description: "Technical & HR Interview cleared prior to offer letter.",
      is_verified: false,
      created_at: "2026-05-15T00:00:00Z",
    };
    const SELECTION_EVENT = {
      id: "evt-selection",
      event_type: "SELECTION",
      event_date: "2026-05-15",
      description: "Selection confirmed prior to offer letter.",
      is_verified: false,
      created_at: "2026-05-15T00:00:00Z",
    };

    scriptAdapter([
      { url: "/timeline/", method: "get", respond: () => listResponse([]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
      // First call creates OFFER_LETTER
      {
        url: "/timeline/",
        method: "post",
        respond: (config) => {
          bodies.push(String(config.data));
          return { status: 201, data: OFFER_EVENT };
        },
      },
      // Automatically creates INTERVIEW
      {
        url: "/timeline/",
        method: "post",
        respond: (config) => {
          bodies.push(String(config.data));
          return { status: 201, data: INTERVIEW_EVENT };
        },
      },
      // Automatically creates SELECTION
      {
        url: "/timeline/",
        method: "post",
        respond: (config) => {
          bodies.push(String(config.data));
          return { status: 201, data: SELECTION_EVENT };
        },
      },
      {
        url: "/timeline/",
        method: "get",
        respond: () => listResponse([OFFER_EVENT, SELECTION_EVENT, INTERVIEW_EVENT]),
      },
      {
        url: "/profile/",
        respond: () => ({ status: 200, data: { ...PROFILE, current_status: "OFFER_RECEIVED" } }),
      },
    ]);

    renderTimeline();
    const addButton = await screen.findByRole("button", { name: /Add Milestone Event/i });
    await user.click(addButton);

    // Select OFFER_LETTER
    const select = screen.getByLabelText(/Event Milestone Type/i);
    await user.selectOptions(select, "OFFER_LETTER");

    const saveButton = await screen.findByRole("button", { name: /Add Event/i });
    await user.click(saveButton);

    await waitFor(() => expect(bodies).toHaveLength(3));
    const parsedBodies = bodies.map((b) => JSON.parse(b) as { event_type: string; event_date: string });
    const offerBody = parsedBodies.find((b) => b.event_type === "OFFER_LETTER");
    const interviewBody = parsedBodies.find((b) => b.event_type === "INTERVIEW");
    const selectionBody = parsedBodies.find((b) => b.event_type === "SELECTION");

    expect(offerBody).toBeDefined();
    expect(interviewBody).toBeDefined();
    expect(selectionBody).toBeDefined();

    // Verify distinct timeline dates (not the same date as offer letter)
    expect(interviewBody?.event_date).not.toBe(offerBody?.event_date);
    expect(selectionBody?.event_date).not.toBe(offerBody?.event_date);
    expect((interviewBody?.event_date ?? "") < (selectionBody?.event_date ?? "")).toBe(true);
    expect((selectionBody?.event_date ?? "") < (offerBody?.event_date ?? "")).toBe(true);
  });

  it("allows setting custom prior event dates when entering offer letter date", async () => {
    const user = userEvent.setup();
    const bodies: string[] = [];

    scriptAdapter([
      { url: "/timeline/", method: "get", respond: () => listResponse([]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
      {
        url: "/timeline/",
        method: "post",
        respond: (config) => {
          bodies.push(String(config.data));
          return { status: 201, data: { id: "e1", ...JSON.parse(String(config.data)) } };
        },
      },
      {
        url: "/timeline/",
        method: "post",
        respond: (config) => {
          bodies.push(String(config.data));
          return { status: 201, data: { id: "e2", ...JSON.parse(String(config.data)) } };
        },
      },
      {
        url: "/timeline/",
        method: "post",
        respond: (config) => {
          bodies.push(String(config.data));
          return { status: 201, data: { id: "e3", ...JSON.parse(String(config.data)) } };
        },
      },
      { url: "/timeline/", method: "get", respond: () => listResponse([]) },
      { url: "/profile/", respond: () => ({ status: 200, data: PROFILE }) },
    ]);

    renderTimeline();
    const addButton = await screen.findByRole("button", { name: /Add Milestone Event/i });
    await user.click(addButton);

    // Select OFFER_LETTER
    const select = screen.getByLabelText(/Event Milestone Type/i);
    await user.selectOptions(select, "OFFER_LETTER");

    // Enter custom offer letter date
    const offerDateInput = screen.getByLabelText(/Date Occurred/i);
    await user.clear(offerDateInput);
    await user.type(offerDateInput, "2026-06-01");

    // Enter custom interview date
    const interviewInput = screen.getByLabelText(/Interview Date/i);
    await user.clear(interviewInput);
    await user.type(interviewInput, "2026-05-10");

    // Enter custom selection date
    const selectionInput = screen.getByLabelText(/Selection Date/i);
    await user.clear(selectionInput);
    await user.type(selectionInput, "2026-05-20");

    const saveButton = await screen.findByRole("button", { name: /Add Event/i });
    await user.click(saveButton);

    await waitFor(() => expect(bodies).toHaveLength(3));
    const parsedBodies = bodies.map((b) => JSON.parse(b) as { event_type: string; event_date: string });
    const interviewBody = parsedBodies.find((b) => b.event_type === "INTERVIEW");
    const selectionBody = parsedBodies.find((b) => b.event_type === "SELECTION");
    const offerBody = parsedBodies.find((b) => b.event_type === "OFFER_LETTER");

    expect(offerBody?.event_date).toBe("2026-06-01");
    expect(interviewBody?.event_date).toBe("2026-05-10");
    expect(selectionBody?.event_date).toBe("2026-05-20");
  });

  it("displays previous milestones as completed when offer letter exists", async () => {
    const OFFER_EVENT = {
      id: "evt-offer",
      event_type: "OFFER_LETTER",
      event_date: "2026-05-15",
      description: "Offer Letter Issued",
      is_verified: true,
      created_at: "2026-05-15T00:00:00Z",
    };
    scriptAdapter([
      { url: "/timeline/", method: "get", respond: () => listResponse([OFFER_EVENT]) },
      {
        url: "/profile/",
        respond: () => ({ status: 200, data: { ...PROFILE, current_status: "OFFER_RECEIVED" } }),
      },
    ]);
    renderTimeline();

    // Verify Technical & HR Interview and Selection are rendered as completed
    const interviewElements = await screen.findAllByText(/Technical & HR Interview/i);
    expect(interviewElements.length).toBeGreaterThan(0);
    const selectionElements = screen.getAllByText(/Selection Communicated/i);
    expect(selectionElements.length).toBeGreaterThan(0);
    // And NOT rendered as PENDING steps
    expect(screen.queryByText(/PENDING — Technical & HR Interview/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/PENDING — Selection Communicated/i)).not.toBeInTheDocument();
  });
});
