/**
 * TimelineEventModal tests (Task 7): the three fields render, edit mode
 * pre-fills from the event, and quick-action presetType pre-selects the
 * milestone ("Mark as Received" opens with JOINING_LETTER, "Set Date" with
 * JOINING_DATE).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { TimelineEventModal } from "@/components/TimelineEventModal";

function setup(props: Partial<Parameters<typeof TimelineEventModal>[0]> = {}) {
  const submitted: unknown[] = [];
  render(
    <TimelineEventModal
      open={true}
      event={null}
      onClose={() => undefined}
      onSubmit={async (payload) => {
        submitted.push(payload);
      }}
      {...props}
    />,
  );
  return { submitted };
}

describe("TimelineEventModal", () => {
  it("renders the three writable fields with defaults for add mode", () => {
    setup();
    expect(screen.getByLabelText(/Event Milestone Type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date Occurred/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description \/ Notes/i)).toBeInTheDocument();
  });

  it("pre-fills from the event in edit mode", () => {
    setup({
      event: {
        id: "evt-1",
        event_type: "INTERVIEW",
        event_date: "2026-04-23",
        description: "Hyderabad center.",
      },
    });
    const typeSelect = screen.getByLabelText(/Event Milestone Type/i) as HTMLSelectElement;
    expect(typeSelect.value).toBe("INTERVIEW");
    const dateInput = screen.getByLabelText(/Date Occurred/i) as HTMLInputElement;
    expect(dateInput.value).toBe("2026-04-23");
  });

  it("pre-selects the quick-action milestone type", () => {
    setup({ presetType: "JOINING_LETTER" });
    const typeSelect = screen.getByLabelText(/Event Milestone Type/i) as HTMLSelectElement;
    expect(typeSelect.value).toBe("JOINING_LETTER");
  });

  it("submits the three writable fields and never auto_update_status", async () => {
    const user = userEvent.setup();
    const { submitted } = setup();
    const saveButton = screen.getByRole("button", { name: /Add Event/i });
    await user.click(saveButton);
    await waitFor(() => expect(submitted).toHaveLength(1));
    const payload = submitted[0] as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(["description", "event_date", "event_type"]);
  });

  it("shows prior events inputs and includes them in payload when OFFER_LETTER is selected", async () => {
    const user = userEvent.setup();
    const { submitted } = setup();

    const typeSelect = screen.getByLabelText(/Event Milestone Type/i);
    await user.selectOptions(typeSelect, "OFFER_LETTER");

    expect(screen.getByLabelText(/Interview Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Selection Date/i)).toBeInTheDocument();

    const saveButton = screen.getByRole("button", { name: /Add Event/i });
    await user.click(saveButton);

    await waitFor(() => expect(submitted).toHaveLength(1));
    const payload = submitted[0] as {
      event_type: string;
      event_date: string;
      priorEvents?: { interviewDate: string; selectionDate: string };
    };
    expect(payload.event_type).toBe("OFFER_LETTER");
    expect(payload.priorEvents).toBeDefined();
    expect(payload.priorEvents?.interviewDate).not.toBe(payload.event_date);
    expect(payload.priorEvents?.selectionDate).not.toBe(payload.event_date);
  });
});
