import { describe, expect, it } from "vitest";
import {
  featuredEvent,
  loadEvents,
  upcomingEvent,
  type EventEntry,
} from "../../src/lib/events";

const ev = (number: number, date: string | null): EventEntry => ({
  number,
  name: `Th${number}n`,
  date,
  venue: null,
  summary: null,
  url: `https://g0v.hackmd.io/note-${number}`,
  registerUrl: null,
  days: null,
});

describe("upcomingEvent", () => {
  it("returns the earliest event on or after today", () => {
    const events = [ev(2, "2026-09-01"), ev(1, "2026-08-01"), ev(0, "2026-01-01")];
    expect(upcomingEvent(events, "2026-07-17")?.number).toBe(1);
  });

  it("treats an event happening today as upcoming", () => {
    expect(upcomingEvent([ev(0, "2026-07-17")], "2026-07-17")?.number).toBe(0);
  });

  it("ignores undated events and returns null when nothing is upcoming", () => {
    expect(upcomingEvent([ev(0, "2026-01-01"), ev(1, null)], "2026-07-17")).toBeNull();
  });
});

describe("featuredEvent", () => {
  it("prefers the next upcoming event", () => {
    const events = [ev(0, "2026-01-01"), ev(1, "2026-08-01")];
    expect(featuredEvent(events, "2026-07-17")?.number).toBe(1);
  });

  it("falls back to the highest-numbered dated past event", () => {
    const events = [ev(1, null), ev(14, "2026-03-08"), ev(15, "2026-06-21")];
    expect(featuredEvent(events, "2026-07-17")?.number).toBe(15);
  });

  it("returns null for an empty list", () => {
    expect(featuredEvent([], "2026-07-17")).toBeNull();
  });
});

describe("loadEvents (reads src/data/events.yaml)", () => {
  it("loads 18 rounds Th0n..Th17n, unique numbers, newest first", () => {
    const events = loadEvents();
    expect(events).toHaveLength(18);
    expect(events[0].number).toBe(17);
    expect(new Set(events.map((e) => e.number)).size).toBe(18);
    for (const e of events) {
      expect(e.url).toMatch(/^https:\/\/g0v\.hackmd\.io\//);
      if (e.date !== null) expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps quoted dates as strings and null days as null", () => {
    const th15 = loadEvents().find((e) => e.number === 15)!;
    expect(th15.date).toBe("2026-06-21");
    expect(th15.days).toBeNull();
    const th0 = loadEvents().find((e) => e.number === 0)!;
    expect(th0.days).toHaveLength(1);
    expect(th0.days![0].sessions[0]).toEqual({
      t: "12:30",
      title: "活動入場",
      tag: "ALL",
      loc: "4F 廚房",
    });
  });
});
