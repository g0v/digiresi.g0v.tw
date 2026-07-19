import React from "react";
import { Tabs } from "../../components/core/Tabs.jsx";
import { Badge } from "../../components/core/Badge.jsx";
import { Alert } from "../../components/core/Alert.jsx";
import { Checkbox } from "../../components/forms/Checkbox.jsx";
import { SectionHeader } from "./Shared.jsx";

const DAYS = {
  sat: [
    { t: "09:00", title: "Registration & badge soldering", tag: "ALL", loc: "Lobby" },
    { t: "10:00", title: "Opening — why resilience, why now", tag: "TALK", loc: "Main hall" },
    { t: "10:30", title: "Project pitches ×20 — 3 min each", tag: "PITCH", loc: "Main hall" },
    { t: "12:00", title: "Team forming over lunchboxes", tag: "ALL", loc: "Commons" },
    { t: "13:00", title: "HACK — backbone gets 'cut' at 15:00", tag: "HACK", loc: "Everywhere" },
    { t: "15:00", title: "⚡ Blackout drill: venue goes offline for 2h", tag: "DRILL", loc: "Everywhere" },
    { t: "19:00", title: "Dinner + war stories from 921 & 403 quakes", tag: "TALK", loc: "Commons" },
  ],
  sun: [
    { t: "09:00", title: "HACK — final stretch", tag: "HACK", loc: "Everywhere" },
    { t: "12:00", title: "Code freeze (the merciful kind)", tag: "ALL", loc: "—" },
    { t: "13:00", title: "Demos ×20 — 5 min, offline demos score double", tag: "DEMO", loc: "Main hall" },
    { t: "16:00", title: "Community awards & next steps", tag: "ALL", loc: "Main hall" },
  ],
};

const KIT = ["Laptop + charger", "Battery pack (the big one)", "USB drive with your repos mirrored", "Paper notebook, pen", "Radio, LoRa boards, weird antennas — if you have them"];

export function Schedule() {
  const [day, setDay] = React.useState("sat");
  const [kit, setKit] = React.useState([true, true, false, false, false]);
  return (
    <div style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "48px var(--gutter) 64px" }}>
      <SectionHeader label="SCHEDULE" right="ALL TIMES GMT+8 · SAMPLE DATA" />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, gap: 16, flexWrap: "wrap" }}>
        <Tabs active={day} onChange={setDay} items={[{ id: "sat", label: "SAT 10.24" }, { id: "sun", label: "SUN 10.25" }]} />
        <Badge status="degraded">Wi-fi will be cut on purpose</Badge>
      </div>
      <div style={{ border: "var(--border)", marginTop: 20, background: "var(--surface)" }}>
        {DAYS[day].map((r, i) => (
          <div key={r.t + r.title} style={{ display: "grid", gridTemplateColumns: "110px 24px 1fr 90px 140px", alignItems: "center", gap: 12, padding: "14px 18px", borderTop: i ? "var(--border-soft)" : "none", fontFamily: "var(--font-mono)" }}>
            <span style={{ color: "var(--accent-2)", fontWeight: 600, fontSize: "var(--text-sm)" }}>{r.t}</span>
            <span style={{ color: "var(--ink-3)", fontSize: "var(--text-sm)" }}>{i === DAYS[day].length - 1 ? "└─" : "├─"}</span>
            <span style={{ fontSize: "var(--text-base)", color: r.tag === "DRILL" ? "var(--accent)" : "var(--ink)", fontWeight: r.tag === "DRILL" ? 600 : 400 }}>{r.title}</span>
            <Badge status={r.tag === "DRILL" ? "offline" : r.tag === "HACK" ? "online" : "neutral"} blink={false}>{r.tag}</Badge>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)", letterSpacing: "var(--tracking-label)", textAlign: "right" }}>{r.loc}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 32, alignItems: "start" }}>
        <Alert tone="degraded" title="Blackout drill, 15:00 Saturday">
          The venue backbone gets "cut" for two hours. It's not an outage, it's the point. Prototypes that keep working score double at demos.
        </Alert>
        <div style={{ border: "var(--border)", background: "var(--surface)", padding: "16px 18px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)", color: "var(--ink-2)", marginBottom: 12 }}>OFFLINE SURVIVAL KIT — PACK CHECK</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {KIT.map((k, i) => (
              <Checkbox key={k} label={k} checked={kit[i]} onChange={(v) => setKit(kit.map((x, j) => (j === i ? v : x)))} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
