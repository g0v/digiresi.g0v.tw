import React from "react";

export function Checkbox({ label, checked, onChange, disabled = false, style }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: disabled ? "var(--ink-3)" : "var(--ink)", userSelect: "none", ...style }}>
      <input type="checkbox" checked={!!checked} disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span aria-hidden="true" style={{
        width: 18, height: 18, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
        border: disabled ? "var(--border-offline)" : "2px solid var(--line)",
        background: "var(--surface-sunken)", outline: focus ? "var(--focus-ring)" : "none", outlineOffset: "var(--focus-offset)",
        fontWeight: 700, fontSize: 13, lineHeight: 1, color: "var(--accent-2)",
      }}>{checked ? "✕" : ""}</span>
      {label}
    </label>
  );
}
