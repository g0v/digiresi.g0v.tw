import React from "react";

const COLORS = { online: "var(--status-online)", degraded: "var(--status-degraded)", offline: "var(--status-offline)" };

export function StatusDot({ status = "online", label, blink, size = 10, style }) {
  const doBlink = blink != null ? blink : status === "online";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 600, letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--ink)", ...style }}>
      <span style={{ width: size, height: size, flex: "none", background: COLORS[status] || COLORS.online, animation: doBlink ? "drt-blink 1.2s steps(1) infinite" : "none" }}></span>
      {label != null ? label : status}
    </span>
  );
}
