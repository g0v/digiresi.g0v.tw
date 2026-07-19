import React from "react";
import { Field } from "./Input.jsx";

export function Select({ label, hint, error, options = [], id, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const border = error ? "2px solid var(--status-offline)" : focus ? "2px solid var(--line)" : "2px solid var(--line-soft)";
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div style={{ position: "relative", display: "flex", background: "var(--surface-sunken)", border, outline: focus ? "var(--focus-ring)" : "none", outlineOffset: "var(--focus-offset)", ...style }}>
        <select id={id} {...rest}
          onFocus={(e) => { setFocus(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocus(false); rest.onBlur && rest.onBlur(e); }}
          style={{ appearance: "none", WebkitAppearance: "none", flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", padding: "10px 36px 10px 12px", cursor: "pointer" }}>
          {options.map((o) => <option key={o.value} value={o.value} style={{ background: "var(--surface)", color: "var(--ink)" }}>{o.label}</option>)}
        </select>
        <span aria-hidden="true" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 10, color: "var(--ink-2)" }}>▼</span>
      </div>
    </Field>
  );
}
