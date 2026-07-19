import React from "react";

export function SignalBars({ level = 4, bars = 4, height = 24, color = "var(--accent-2)", animated = false, style }) {
  const [tick, setTick] = React.useState(0);
  React.useEffect(() => {
    if (!animated) return;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [animated]);
  const lvl = animated ? tick % (bars + 1) : level;
  const w = Math.max(4, Math.round(height / 4));
  return (
    <span role="img" aria-label={`signal ${lvl}/${bars}`} style={{ display: "inline-flex", alignItems: "flex-end", gap: Math.max(2, Math.round(w / 2)), height, ...style }}>
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} style={{
          width: w, height: Math.round(((i + 1) / bars) * height),
          background: i < lvl ? color : "transparent",
          border: i < lvl ? "none" : "1px solid var(--line-soft)",
          boxSizing: "border-box",
        }}></span>
      ))}
    </span>
  );
}
