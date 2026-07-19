import React from "react";

const TONES = {
  online: "var(--status-online)",
  degraded: "var(--status-degraded)",
  offline: "var(--status-offline)",
  live: "var(--accent)",
  neutral: "var(--ink-3)",
};

export function Badge({ status = "neutral", blink, children, style }) {
  const c = TONES[status] || TONES.neutral;
  const doBlink = blink != null ? blink : status === "live";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 600,
      letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
      border: "2px solid var(--line)", padding: "3px 9px", color: "var(--ink)",
      background: "var(--surface)", borderRadius: "var(--radius)", lineHeight: 1.4, ...style,
    }}>
      <span style={{ width: 8, height: 8, background: c, flex: "none", animation: doBlink ? "drt-blink 1.2s steps(1) infinite" : "none" }}></span>
      {children}
    </span>
  );
}
