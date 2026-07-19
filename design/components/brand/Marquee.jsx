import React from "react";

export function Marquee({ items = [], separator = " /// ", speed = 30, reverse = false, style }) {
  const content = items.join(separator) + separator;
  const inner = (
    <span style={{ whiteSpace: "nowrap", paddingRight: 24 }}>{content}</span>
  );
  return (
    <div style={{ overflow: "hidden", borderTop: "var(--border)", borderBottom: "var(--border)", background: "var(--surface)", ...style }}>
      <div style={{ display: "inline-flex", whiteSpace: "nowrap", animation: `drt-marquee ${speed}s linear infinite ${reverse ? "reverse" : "normal"}`, fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", fontWeight: 600, letterSpacing: "var(--tracking-label)", textTransform: "uppercase", padding: "8px 0", color: "var(--ink)", willChange: "transform" }}>
        {inner}{inner}
      </div>
    </div>
  );
}
