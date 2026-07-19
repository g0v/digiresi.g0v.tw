import React from "react";

export function Tabs({ items = [], active, onChange, style }) {
  const [hover, setHover] = React.useState(null);
  return (
    <div role="tablist" style={{ display: "flex", ...style }}>
      {items.map((it, i) => {
        const isActive = it.id === active;
        const isHover = hover === it.id;
        return (
          <button key={it.id} role="tab" aria-selected={isActive}
            onClick={() => onChange && onChange(it.id)}
            onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}
            style={{
              fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 600,
              letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
              padding: "9px 18px", cursor: "pointer", lineHeight: 1.4,
              border: "2px solid var(--line)", marginLeft: i === 0 ? 0 : -2,
              background: isActive ? "var(--ink)" : isHover ? "var(--surface-sunken)" : "var(--surface)",
              color: isActive ? "var(--ink-on-ink)" : "var(--ink)",
              position: "relative", zIndex: isActive ? 1 : 0,
              transition: "all var(--dur-1) var(--ease-step-2)", borderRadius: "var(--radius)",
            }}>
            {it.label}
            {it.count != null && <span style={{ marginLeft: 8, color: isActive ? "var(--ink-on-ink)" : "var(--accent)" }}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
