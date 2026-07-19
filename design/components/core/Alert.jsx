import React from "react";

const TONES = {
  info: { color: "var(--ink)", band: "var(--ink)" },
  online: { color: "var(--status-online)", band: "var(--status-online)" },
  degraded: { color: "var(--status-degraded)", band: "repeating-linear-gradient(-45deg, var(--status-degraded) 0 10px, transparent 10px 20px)" },
  offline: { color: "var(--status-offline)", band: "repeating-linear-gradient(-45deg, var(--status-offline) 0 10px, transparent 10px 20px)" },
};

export function Alert({ tone = "info", title, action, children, style }) {
  const t = TONES[tone] || TONES.info;
  return (
    <div role="alert" style={{ border: "var(--border)", background: "var(--surface)", display: "flex", borderRadius: "var(--radius)", ...style }}>
      <div style={{ width: 10, flex: "none", background: t.band, borderRight: "var(--border)" }}></div>
      <div style={{ padding: "12px 16px", flex: 1 }}>
        {title && <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "var(--text-sm)", letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: t.color }}>{title}</div>}
        {children && <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)", marginTop: title ? 4 : 0, lineHeight: "var(--leading-body)" }}>{children}</div>}
      </div>
      {action && <div style={{ padding: "12px 16px", display: "flex", alignItems: "center" }}>{action}</div>}
    </div>
  );
}
