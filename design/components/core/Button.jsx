import React from "react";

const SIZES = { sm: { font: 12, pad: "6px 12px" }, md: { font: 13, pad: "10px 20px" }, lg: { font: 14, pad: "14px 28px" } };

export function Button({ variant = "primary", size = "md", disabled = false, icon = null, block = false, children, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const base = {
    fontFamily: "var(--font-mono)", fontWeight: 600, letterSpacing: "var(--tracking-label)",
    textTransform: "uppercase", fontSize: s.font, padding: s.pad, lineHeight: 1.2,
    cursor: disabled ? "not-allowed" : "pointer",
    display: block ? "flex" : "inline-flex", width: block ? "100%" : undefined,
    alignItems: "center", justifyContent: "center", gap: 8, borderRadius: "var(--radius)",
    transition: "all var(--dur-1) var(--ease-step-2)", userSelect: "none",
    outline: focus ? "var(--focus-ring)" : "none", outlineOffset: "var(--focus-offset)",
  };
  let look;
  if (disabled) look = { background: "transparent", color: "var(--ink-3)", border: "var(--border-offline)", boxShadow: "none" };
  else if (variant === "primary") look = {
    background: hover ? "var(--accent-hover)" : "var(--accent)", color: "var(--ink-on-accent)",
    border: "2px solid var(--line)", boxShadow: press ? "none" : "var(--shadow-1)", transform: press ? "translate(3px,3px)" : "none",
  };
  else if (variant === "secondary") look = {
    background: hover ? "var(--ink)" : "var(--surface)", color: hover ? "var(--ink-on-ink)" : "var(--ink)",
    border: "2px solid var(--line)", boxShadow: press ? "none" : "var(--shadow-1)", transform: press ? "translate(3px,3px)" : "none",
  };
  else look = { background: hover ? "var(--surface-sunken)" : "transparent", color: "var(--ink)", border: "2px solid transparent" };
  return (
    <button disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{ ...base, ...look, ...style }} {...rest}>
      {icon}{children}
    </button>
  );
}
