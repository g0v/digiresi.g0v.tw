import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

export type SessionTag = "ALL" | "TALK" | "PITCH" | "HACK" | "DRILL" | "DEMO";

export interface EventSession {
  t: string; // "HH:MM"
  title: string;
  tag: SessionTag;
  loc: string;
}

export interface EventDay {
  label: string;
  date: string; // "YYYY-MM-DD"
  sessions: EventSession[];
}

export interface EventEntry {
  number: number;
  /** Set only on a rerun that shares its round number, e.g. "RE" → "Th16n RE". */
  suffix?: string | null;
  name: string;
  date: string | null; // "YYYY-MM-DD" (quoted in YAML so it stays a string)
  venue: string | null;
  summary: string | null;
  url: string; // g0v.hackmd.io event pad
  registerUrl: string | null;
  days: EventDay[] | null;
}

/**
 * Reads src/data/events.yaml relative to the repo root.
 * cwd is the repo root both under `astro build` and `vitest run`.
 */
export function loadEvents(): EventEntry[] {
  const file = path.resolve(process.cwd(), "src/data/events.yaml");
  return yaml.load(fs.readFileSync(file, "utf8")) as EventEntry[];
}

/** Short round code shown in the archive: "Th15n", or "Th16n RE" for a rerun. */
export function eventCode(e: EventEntry): string {
  return e.suffix ? `Th${e.number}n ${e.suffix}` : `Th${e.number}n`;
}

/**
 * Newest-first comparator: round number desc, then (for a rerun sharing the
 * number) date desc, undated last.
 */
export function byNewest(a: EventEntry, b: EventEntry): number {
  if (a.number !== b.number) return b.number - a.number;
  return (b.date ?? "").localeCompare(a.date ?? "");
}

/** Earliest dated event with date >= todayISO ("YYYY-MM-DD"), else null. */
export function upcomingEvent(events: EventEntry[], todayISO: string): EventEntry | null {
  const future = events.filter(
    (e): e is EventEntry & { date: string } =>
      typeof e.date === "string" && e.date >= todayISO,
  );
  future.sort((a, b) => (a.date < b.date ? -1 : 1));
  return future[0] ?? null;
}

/**
 * The event the site features: the next upcoming one when announced,
 * else the highest-numbered dated past event.
 */
export function featuredEvent(events: EventEntry[], todayISO: string): EventEntry | null {
  const up = upcomingEvent(events, todayISO);
  if (up) return up;
  const past = events.filter((e) => typeof e.date === "string" && e.date < todayISO);
  past.sort(byNewest);
  return past[0] ?? null;
}
