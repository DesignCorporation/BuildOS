// BuildOS - Invoice overdue logic tests

import { describe, it, expect } from "vitest";
import { isInvoiceOverdue } from "../src/invoice.service";

describe("InvoiceService - isInvoiceOverdue utility", () => {
  it("marks issued invoice overdue when due date is in the past", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const invoice = {
      status: "issued",
      dueDate: new Date("2026-01-05T00:00:00Z"),
    };

    expect(isInvoiceOverdue(invoice, now)).toBe(true);
  });

  it("does not mark paid invoice overdue", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const invoice = {
      status: "paid",
      dueDate: new Date("2026-01-05T00:00:00Z"),
    };

    expect(isInvoiceOverdue(invoice, now)).toBe(false);
  });

  it("returns false if dueDate is null", () => {
    const invoice = { status: "issued", dueDate: null };
    expect(isInvoiceOverdue(invoice)).toBe(false);
  });

  it("returns false if dueDate is in the future", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const invoice = {
      status: "issued",
      dueDate: new Date("2026-01-15T00:00:00Z"),
    };
    expect(isInvoiceOverdue(invoice, now)).toBe(false);
  });

  it("returns false if dueDate equals current time (boundary condition)", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const invoice = {
      status: "issued",
      dueDate: new Date("2026-01-10T00:00:00Z"),
    };
    expect(isInvoiceOverdue(invoice, now)).toBe(false);
  });

  it("handles dueDate as ISO string", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const invoice = {
      status: "issued",
      dueDate: "2026-01-05T00:00:00Z",
    };
    expect(isInvoiceOverdue(invoice, now)).toBe(true);
  });

  it("returns true even if status is overdue (only checks dates, not status)", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const invoice = {
      status: "overdue",
      dueDate: new Date("2026-01-05T00:00:00Z"),
    };
    // Function only checks dates, not current status
    expect(isInvoiceOverdue(invoice, now)).toBe(true);
  });
});
