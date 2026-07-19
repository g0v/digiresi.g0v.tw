import React from "react";

const TONES = { green: "var(--accent-2)", red: "var(--accent)", dim: "var(--ink-3)", default: "var(--ink)" };

export function TerminalBlock({ title = "digiresithon@tw:~", lines = [], cursor = true, height, children, style }) {
  return (
    <div style={{ border: "var(--border)", background: "var(--surface)", display: "flex", flexDirection: "column", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "var(--border)" }}>
        <span style={{ width: 10, height: 10, background: "var(--accent)" }}></span>
        <span style={{ width: 10, height: 10, background: "var(--status-degraded)" }}></span>
        <span style={{ width: 10, height: 10, background: "var(--accent-2)" }}></span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)", color: "var(--ink-2)", marginLeft: 6 }}>{title}</span>
      </div>
      <div style={{ position: "relative", background: "var(--surface-sunken)", flex: 1, minHeight: height, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "var(--scanlines)", pointerEvents: "none" }}></div>
        <div style={{ padding: "14px 16px", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", lineHeight: 1.8, position: "relative" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ color: TONES[l.tone] || TONES.default, whiteSpace: "pre-wrap" }}>
              {l.prompt && <span style={{ color: "var(--accent-2)", marginRight: 8 }}>{l.prompt}</span>}
              {l.text}
            </div>
          ))}
          {children}
          {cursor && <span style={{ display: "inline-block", width: 9, height: 16, background: "var(--accent-2)", verticalAlign: "-3px", animation: "drt-blink 1s steps(1) infinite" }}></span>}
        </div>
      </div>
    </div>
  );
}
