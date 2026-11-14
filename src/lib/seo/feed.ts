import { absoluteUrl, SITE_NAME } from "./index";
import { byNewest, eventAnchor, type EventEntry } from "../events";

/** Site-absolute path of the Atom feed of the event schedule. */
export const FEED_PATH = "/schedule/feed.xml";

const FEED_TITLE = "數位韌性松活動時程";
const FEED_SUBTITLE = "g0v 數位韌性松歷次活動的日期、場地與共筆，資料來自網站的活動時程。";
const FEED_LANG = "zh-Hant-TW";

type DatedEvent = EventEntry & { date: string };

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const isDated = (e: EventEntry): e is DatedEvent => Boolean(e.date);

/** The data has only event dates, so each entry is stamped at GMT+8 midnight of its date. */
const stamp = (date: string) => `${date}T00:00:00+08:00`;

/** Anchor on the schedule page for one round, e.g. https://digiresi.g0v.tw/schedule/#th16n-re. */
const scheduleLink = (e: EventEntry) => `${absoluteUrl("/schedule/")}#${eventAnchor(e)}`;

/** Ends a fragment with a full stop unless it already ends in sentence punctuation. */
const sentence = (s: string) => (/[。！？.!?]$/.test(s) ? s : `${s}。`);

/** "2026-03-08，g0v 台北社群空間。" + optional summary + "活動共筆：<pad url>". */
function summaryText(e: DatedEvent): string {
  const head = sentence(`${e.date}${e.venue ? `，${e.venue}` : ""}`);
  const body = e.summary ? sentence(e.summary) : "";
  return `${head}${body}活動共筆：${e.url}`;
}

function entryXml(e: DatedEvent): string {
  const link = scheduleLink(e);
  return [
    "  <entry>",
    `    <id>${esc(link)}</id>`,
    `    <title>${esc(e.name)}</title>`,
    `    <link rel="alternate" type="text/html" href="${esc(link)}"/>`,
    `    <link rel="related" type="text/html" href="${esc(e.url)}"/>`,
    `    <published>${stamp(e.date)}</published>`,
    `    <updated>${stamp(e.date)}</updated>`,
    `    <summary type="text">${esc(summaryText(e))}</summary>`,
    "  </entry>",
  ].join("\n");
}

/** Atom 1.0 feed: one entry per event with a date, newest round first. */
export function scheduleFeed(events: EventEntry[]): string {
  const entries = events.filter(isDated).sort(byNewest);
  const latest = entries.reduce((max, e) => (e.date > max ? e.date : max), "");
  // Atom requires <updated>. With no dated events there is no entry date, so fall back to build time.
  const updated = latest ? stamp(latest) : new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const self = absoluteUrl(FEED_PATH);
  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    `<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${FEED_LANG}">`,
    `  <id>${esc(self)}</id>`,
    `  <title>${esc(FEED_TITLE)}</title>`,
    `  <subtitle>${esc(FEED_SUBTITLE)}</subtitle>`,
    `  <link rel="self" type="application/atom+xml" href="${esc(self)}"/>`,
    `  <link rel="alternate" type="text/html" href="${esc(absoluteUrl("/schedule/"))}"/>`,
    "  <author>",
    `    <name>${esc(SITE_NAME.zh)}</name>`,
    `    <uri>${esc(absoluteUrl("/"))}</uri>`,
    "  </author>",
    `  <updated>${updated}</updated>`,
    ...entries.map(entryXml),
    "</feed>",
    "",
  ].join("\n");
}
