import React from "react";

/** Pixelarticon via CSS mask so tokens color it. */
export function Px({ name, size = 20, color = "var(--ink)", style }) {
  const u = `url(https://unpkg.com/pixelarticons@1.8.1/svg/${name}.svg)`;
  return <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, flex: "none", background: color, WebkitMask: `${u} center/contain no-repeat`, mask: `${u} center/contain no-repeat`, ...style }}></span>;
}

/** Box-drawing section header: ┌─ LABEL ───────┐ */
export function SectionHeader({ label, right, style }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: "var(--font-mono)", color: "var(--ink-2)", ...style }}>
      <span style={{ fontSize: "var(--text-sm)" }}>┌─</span>
      <span style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--px-1)", WebkitFontSmoothing: "none", color: "var(--ink)", letterSpacing: "0.04em" }}>{label}</span>
      <span aria-hidden="true" style={{ flex: 1, borderTop: "2px solid var(--line-soft)", transform: "translateY(1px)" }}></span>
      {right && <span style={{ fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)" }}>{right}</span>}
      <span style={{ fontSize: "var(--text-sm)" }}>┐</span>
    </div>
  );
}

/** The one allowed 45° red slash per view. Position via wrapper (absolute, overflow hidden). */
export function Slash({ width = 18, left = "70%", style }) {
  return <div aria-hidden="true" style={{ position: "absolute", top: "-20%", left, width, height: "140%", background: "var(--accent)", transform: "rotate(45deg)", pointerEvents: "none", ...style }}></div>;
}

export const SAMPLE = {
  dates: "2026.10.24–25",
  place: "TAIPEI",
  regOpen: true,
  targetDate: "2026-10-24T09:00:00+08:00",
};
