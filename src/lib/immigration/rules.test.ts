import { describe, it, expect } from "vitest";
import {
  calculateUnemploymentDays,
  checkFiveMonthRule,
  calculateSubstantialPresence,
  getUnemploymentLimit,
  getUnemploymentSeverity,
} from "./rules";

// ── calculateUnemploymentDays ────────��───────────────────────────────────────

describe("calculateUnemploymentDays", () => {
  it("returns 0 when EAD start is in the future", () => {
    const future = "2099-01-01";
    expect(calculateUnemploymentDays(future, [], new Date("2026-01-01"))).toBe(0);
  });

  it("counts all days as unemployed when no employment periods given", () => {
    const eadStart = "2026-01-01";
    const today = new Date("2026-01-11"); // 10 days later
    const result = calculateUnemploymentDays(eadStart, [], today);
    expect(result).toBe(10);
  });

  it("counts 0 unemployed days when employed the entire EAD period", () => {
    const eadStart = "2026-01-01";
    const today = new Date("2026-01-11");
    const employed = [{ startDate: "2026-01-01", endDate: "2026-01-10" }];
    const result = calculateUnemploymentDays(eadStart, employed, today);
    expect(result).toBe(0);
  });

  it("counts gap days correctly between two employment periods", () => {
    const eadStart = "2026-01-01";
    const today = new Date("2026-01-21");
    // Employed Jan 1–5, then unemployed Jan 6–10 (5 days), employed Jan 11–15, unemployed Jan 16–20 (5 days)
    const employed = [
      { startDate: "2026-01-01", endDate: "2026-01-05" },
      { startDate: "2026-01-11", endDate: "2026-01-15" },
    ];
    const result = calculateUnemploymentDays(eadStart, employed, today);
    expect(result).toBe(10);
  });

  it("treats null endDate as still employed (current job)", () => {
    const eadStart = "2026-01-01";
    const today = new Date("2026-01-11");
    const employed = [{ startDate: "2026-01-01", endDate: null }];
    const result = calculateUnemploymentDays(eadStart, employed, today);
    expect(result).toBe(0);
  });

  it("ignores employment that started before EAD start", () => {
    const eadStart = "2026-02-01";
    const today = new Date("2026-02-11");
    // Employment started before EAD — should clip to EAD start
    const employed = [{ startDate: "2026-01-01", endDate: "2026-02-10" }];
    const result = calculateUnemploymentDays(eadStart, employed, today);
    expect(result).toBe(0); // covered from EAD start to today
  });
});

// ── checkFiveMonthRule ──────────────────────��────────────────────────────────

describe("checkFiveMonthRule", () => {
  it("does not violate for a short trip", () => {
    const records = [{ departureDate: "2026-01-01", returnDate: "2026-01-15" }];
    const { violated, maxConsecutiveDays } = checkFiveMonthRule(records);
    expect(violated).toBe(false);
    expect(maxConsecutiveDays).toBe(14);
  });

  it("violates for a trip exceeding 5 calendar months", () => {
    // Departed Jan 1, returned June 15 — over 5 months
    const records = [{ departureDate: "2026-01-01", returnDate: "2026-06-15" }];
    const { violated } = checkFiveMonthRule(records);
    expect(violated).toBe(true);
  });

  it("does not violate for exactly 5 months (boundary)", () => {
    // Departed Jan 1, returned Jun 1 — exactly 5 months, not exceeding
    const records = [{ departureDate: "2026-01-01", returnDate: "2026-06-01" }];
    const { violated } = checkFiveMonthRule(records);
    expect(violated).toBe(false);
  });

  it("violates when one trip in multiple trips exceeds 5 months", () => {
    const records = [
      { departureDate: "2025-06-01", returnDate: "2025-06-15" }, // short trip
      { departureDate: "2025-08-01", returnDate: "2026-02-15" }, // over 5 months
    ];
    const { violated } = checkFiveMonthRule(records);
    expect(violated).toBe(true);
  });

  it("handles null returnDate (currently abroad) without throwing", () => {
    const records = [{ departureDate: "2026-04-01", returnDate: null }];
    expect(() => checkFiveMonthRule(records)).not.toThrow();
  });
});

// ── calculateSubstantialPresence ─────────────────────────────────────────────

describe("calculateSubstantialPresence", () => {
  it("is a nonresident alien with zero days in all years", () => {
    const result = calculateSubstantialPresence([], 2026);
    expect(result.isResident).toBe(false);
    expect(result.total).toBe(0);
  });

  it("meets the 183-day threshold using the IRS formula", () => {
    // 120 current + 63 prior (1/3 of 189) + 0 = 183
    const daysInUS = [
      { year: 2026, days: 120 },
      { year: 2025, days: 189 },
    ];
    const result = calculateSubstantialPresence(daysInUS, 2026);
    expect(result.total).toBe(183);
    expect(result.isResident).toBe(true);
  });

  it("correctly applies 1/3 for prior year and 1/6 for two years ago", () => {
    const daysInUS = [
      { year: 2026, days: 100 },
      { year: 2025, days: 60 }, // contributes 20
      { year: 2024, days: 120 }, // contributes 20
    ];
    const result = calculateSubstantialPresence(daysInUS, 2026);
    expect(result.total).toBe(140); // 100 + 20 + 20
    expect(result.isResident).toBe(false);
  });

  it("uses floor division for fractional days", () => {
    const daysInUS = [
      { year: 2026, days: 100 },
      { year: 2025, days: 10 }, // 1/3 = 3.33 → floor = 3
      { year: 2024, days: 11 }, // 1/6 = 1.83 → floor = 1
    ];
    const result = calculateSubstantialPresence(daysInUS, 2026);
    expect(result.total).toBe(104); // 100 + 3 + 1
  });
});

// ── getUnemploymentLimit ───────────────────────���─────────────────────────────

describe("getUnemploymentLimit", () => {
  it("returns 90 for post-completion OPT", () => {
    expect(getUnemploymentLimit("post_completion")).toBe(90);
  });

  it("returns 90 for pre-completion OPT", () => {
    expect(getUnemploymentLimit("pre_completion")).toBe(90);
  });

  it("returns 150 for STEM OPT extension", () => {
    expect(getUnemploymentLimit("stem_extension")).toBe(150);
  });
});

// ── getUnemploymentSeverity ──────────────────────────────────────────────────

describe("getUnemploymentSeverity", () => {
  it("returns info below 70% usage", () => {
    expect(getUnemploymentSeverity(60, 90)).toBe("info");
  });

  it("returns warning between 70% and 90%", () => {
    expect(getUnemploymentSeverity(70, 90)).toBe("warning");
  });

  it("returns critical at or above 90%", () => {
    expect(getUnemploymentSeverity(81, 90)).toBe("critical");
    expect(getUnemploymentSeverity(90, 90)).toBe("critical");
  });
});
