import { describe, expect, it } from "vitest";
import { loadEvents, type EventEntry } from "../../src/lib/events";
import { FEED_PATH, scheduleFeed } from "../../src/lib/seo/feed";

const ev = (number: number, date: string | null, extra: Partial<EventEntry> = {}): EventEntry => ({
  number,
  name: `DigiResiTh${number}n`,
  date,
  venue: null,
  summary: null,
  url: `https://g0v.hackmd.io/note-${number}`,
  registerUrl: null,
  days: null,
  ...extra,
});

/** Inner text of the first <name> element in `xml`. */
const text = (xml: string, name: string) => new RegExp(`<${name}[^>]*>([^<]*)</${name}>`).exec(xml)?.[1];
/** Every <entry> block of the feed. */
const entriesOf = (xml: string) => xml.split("<entry>").slice(1).map((s) => s.split("</entry>")[0]);

describe("scheduleFeed", () => {
  const events = loadEvents();
  const dated = events.filter((e) => e.date);
  const xml = scheduleFeed(events);

  it("is Atom 1.0 UTF-8 with the zh-Hant-TW root, served at /schedule/feed.xml", () => {
    expect(
      xml.startsWith(
        '<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="zh-Hant-TW">',
      ),
    ).toBe(true);
    expect(FEED_PATH).toBe("/schedule/feed.xml");
    expect(text(xml, "id")).toBe("https://digiresi.g0v.tw/schedule/feed.xml");
  });

  it("has one entry per dated event", () => {
    expect(dated.length).toBeGreaterThan(0);
    expect(entriesOf(xml)).toHaveLength(dated.length);
  });

  it("gives every entry a distinct id on the schedule page", () => {
    const ids = entriesOf(xml).map((e) => text(e, "id"));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^https:\/\/digiresi\.g0v\.tw\/schedule\/#th\d+n(-[a-z]+)?$/);
  });

  it("escapes markup in names, venues and URLs", () => {
    const fake = ev(99, "2026-01-02", {
      name: "A <&> B",
      venue: "甲 & 乙",
      url: "https://g0v.hackmd.io/a?b=1&c=2",
    });
    const out = scheduleFeed([fake]);
    expect(out).toContain("<title>A &lt;&amp;&gt; B</title>");
    expect(out).toContain("甲 &amp; 乙");
    expect(out).toContain('href="https://g0v.hackmd.io/a?b=1&amp;c=2"');
    expect(out).not.toContain("A <&> B");
  });

  it("reads cleanly when the summary is null", () => {
    const out = scheduleFeed([ev(1, "2026-03-08", { venue: "場地", summary: null })]);
    expect(text(out, "summary")).toBe("2026-03-08，場地。活動共筆：https://g0v.hackmd.io/note-1");
  });

  it("sets the feed updated to the latest entry date", () => {
    const latest = dated.reduce((max, e) => (e.date! > max ? e.date! : max), "");
    const head = xml.split("<entry>")[0];
    expect(text(head, "updated")).toBe(`${latest}T00:00:00+08:00`);
  });
});
