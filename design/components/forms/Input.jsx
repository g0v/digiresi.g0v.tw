import React from "react";

export function Field({ label, hint, error, htmlFor, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-mono)" }}>
      {label && <label htmlFor={htmlFor} style={{ fontSize: "var(--text-xs)", fontWeight: 600, letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--ink-2)" }}>{label}</label>}
      {children}
      {error ? <div style={{ fontSize: "var(--text-xs)", color: "var(--status-offline)" }}>✕ {error}</div>
        : hint ? <div style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)" }}>{hint}</div> : null}
    </div>
  );
}

export function Input({ label, hint, error, prefix, id, style, inputStyle, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const border = error ? "2px solid var(--status-offline)" : focus ? "2px solid var(--line)" : "2px solid var(--line-soft)";
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div style={{ display: "flex", alignItems: "center", background: "var(--surface-sunken)", border, outline: focus ? "var(--focus-ring)" : "none", outlineOffset: "var(--focus-offset)", transition: "border-color var(--dur-1) var(--ease-step-2)", ...style }}>
        {prefix && <span style={{ padding: "0 0 0 12px", color: "var(--accent-2)", fontSize: "var(--text-sm)", fontWeight: 600 }}>{prefix}</span>}
        <input id={id} {...rest}
          onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
          style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", padding: "10px 12px", ...inputStyle }} />
      </div>
    </Field>
  );
}
