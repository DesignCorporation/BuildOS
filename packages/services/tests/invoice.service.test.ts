// BuildOS - Invoice overdue logic tests

import { describe, it, expect } from "vitest";
import { isInvoiceOverdue } from "../src/invoice.service";

describe("InvoiceService overdue logic", () => {
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
});
