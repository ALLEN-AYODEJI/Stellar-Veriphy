import type { ProvenanceEvent, ProvenanceRecord } from "@stellarveriphy/shared/types";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { ProvenanceHistoryView } from "@/components/provenance/ProvenanceHistoryView";

const KEY = "GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWXYZ2345";
const DAY = 86_400;
const BASE = 1_700_000_000;

const record = {
  id: "1001",
  status: "active",
  fileName: "photo.jpg",
  creator: KEY,
  contentHash: "a".repeat(64),
  timestamp: BASE,
  lastEventAt: BASE + 3 * DAY,
} as unknown as ProvenanceRecord;

function event(i: number, type: ProvenanceEvent["type"], offset: number): ProvenanceEvent {
  return {
    id: `e-${i}`,
    certificateId: "1001",
    type,
    actor: KEY,
    timestamp: BASE + offset,
    txHash: `hash${i}`,
  } as ProvenanceEvent;
}

describe("ProvenanceHistoryView timeline (#901)", () => {
  it("orders events chronologically even when input is unsorted", () => {
    const events = [
      event(2, "certificate_minted", 3600),
      event(1, "verification_submitted", 0),
      event(3, "metadata_updated", DAY + 60),
    ];
    render(<ProvenanceHistoryView record={record} events={events} />);

    const items = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    const order = items.map((text) =>
      ["Verification submitted", "Certificate minted", "Metadata updated"].find((l) =>
        text.includes(l)
      )
    );
    expect(order).toEqual(["Verification submitted", "Certificate minted", "Metadata updated"]);
  });

  it("groups events under their calendar day", () => {
    const events = [
      event(1, "verification_submitted", 0),
      event(2, "certificate_minted", 600),
      event(3, "metadata_updated", DAY * 2),
    ];
    const { container } = render(<ProvenanceHistoryView record={record} events={events} />);

    // Day sections are the ones labelled with their date.
    const dayGroups = Array.from(container.querySelectorAll<HTMLElement>("section[aria-label]"));
    expect(dayGroups).toHaveLength(2);
    expect(within(dayGroups[0]).getAllByRole("listitem")).toHaveLength(2);
    expect(within(dayGroups[1]).getAllByRole("listitem")).toHaveLength(1);
  });

  it("highlights key events", () => {
    const events = [event(1, "verification_submitted", 0), event(2, "certificate_revoked", 60)];
    render(<ProvenanceHistoryView record={record} events={events} />);
    expect(screen.getAllByText("Key event")).toHaveLength(1);
  });

  it("collapses long histories and expands on request", () => {
    const events = Array.from({ length: 12 }, (_, i) => event(i, "metadata_updated", i * 60));
    render(<ProvenanceHistoryView record={record} events={events} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "Show all 12 events" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(12);
  });
});
