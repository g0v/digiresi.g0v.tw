import React from "react";

export function Card({ title, meta, footer, lifted = false, offline = false, inverse = false, children, style }) {
  const border = offline ? "var(--border-offline)" : "var(--border)";
  return (
    <div style={{
      border, background: inverse ? "var(--surface-ink)" : "var(--surface)",
      color: inverse ? "var(--ink-on-ink)" : "var(--ink)",
      boxShadow: lifted ? "var(--shadow-2)" : "none", borderRadius: "var(--radius)",
      display: "flex", flexDirection: "column", ...style,
    }}>
      {(title || meta) && (
        <div style={{ borderBottom: border, padding: "10px 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          {title && <div style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--px-1)", WebkitFontSmoothing: "none", lineHeight: 1.4, textTransform: "uppercase" }}>{title}</div>}
          {meta && <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: offline ? "var(--ink-3)" : "var(--accent)" }}>{meta}</div>}
        </div>
      )}
      <div style={{ padding: 16, flex: 1, fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)", color: offline ? "var(--ink-3)" : undefined }}>{children}</div>
      {footer && (
        <div style={{ borderTop: offline ? "var(--border-offline)" : "var(--border-soft)", padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--ink-2)", display: "flex", justifyContent: "space-between", gap: 12 }}>{footer}</div>
      )}
    </div>
  );
}
