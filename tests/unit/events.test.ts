import { describe, expect, it } from "vitest";
import {
  byNewest,
  eventAnchor,
  eventCode,
  roundCount,
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

  it("breaks a same-number tie (a rerun) by the later date", () => {
    const rerun = { ...ev(16, "2026-09-13"), suffix: "RE" };
    const events = [ev(16, "2026-07-25"), rerun, ev(15, "2026-06-21")];
    expect(featuredEvent(events, "2026-10-01")).toBe(rerun);
  });

  it("returns null for an empty list", () => {
    expect(featuredEvent([], "2026-07-17")).toBeNull();
  });
});

describe("byNewest / eventCode", () => {
  it("orders by number desc, then date desc within a number", () => {
    const rerun = { ...ev(16, "2026-09-13"), suffix: "RE" };
    const sorted = [ev(15, "2026-06-21"), ev(16, "2026-07-25"), rerun].sort(byNewest);
    expect(sorted.map(eventCode)).toEqual(["Th16n RE", "Th16n", "Th15n"]);
  });

  it("renders the code without a suffix when none is set", () => {
    expect(eventCode(ev(3, null))).toBe("Th3n");
    expect(eventCode({ ...ev(3, null), suffix: null })).toBe("Th3n");
  });
});

describe("eventAnchor", () => {
  it("builds the in-page id from the round number, with the suffix when set", () => {
    expect(eventAnchor(ev(17, null))).toBe("th17n");
    expect(eventAnchor({ ...ev(16, null), suffix: "RE" })).toBe("th16n-re");
    expect(eventAnchor({ ...ev(3, null), suffix: null })).toBe("th3n");
  });

  it("gives every event in events.yaml a distinct anchor", () => {
    const anchors = loadEvents().map(eventAnchor);
    expect(new Set(anchors).size).toBe(anchors.length);
  });
});

describe("roundCount", () => {
  it("counts a rerun as the same round", () => {
    const events = [ev(16, "2026-07-25"), { ...ev(16, "2026-09-13"), suffix: "RE" }, ev(15, null)];
    expect(roundCount(events)).toBe(2);
    expect(roundCount([])).toBe(0);
  });

  it("counts 18 rounds (Th0n..Th17n) in events.yaml", () => {
    expect(roundCount(loadEvents())).toBe(18);
  });
});

describe("loadEvents (reads src/data/events.yaml)", () => {
  it("loads 19 rounds Th0n..Th17n (incl. Th16n RE), unique codes, newest first", () => {
    const events = loadEvents();
    expect(events).toHaveLength(19);
    expect(events[0].number).toBe(17);
    expect(new Set(events.map(eventCode)).size).toBe(19);
    expect([...events].sort(byNewest)).toEqual(events);
    for (const e of events) {
      expect(e.url).toMatch(/^https:\/\/g0v\.hackmd\.io\//);
      if (e.date !== null) expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("keeps quoted dates as strings and null days as null", () => {
    const th15 = loadEvents().find((e) => e.number === 15)!;
    expect(th15.date).toBe("2026-06-21");
    expect(th15.days).toBeNull();
    const re = loadEvents().find((e) => eventCode(e) === "Th16n RE")!;
    expect(re.date).toBe("2026-09-13");
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
