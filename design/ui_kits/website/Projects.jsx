import React from "react";
import { Button } from "../../components/core/Button.jsx";
import { Badge } from "../../components/core/Badge.jsx";
import { Card } from "../../components/core/Card.jsx";
import { Tabs } from "../../components/core/Tabs.jsx";
import { Input } from "../../components/forms/Input.jsx";
import { SignalBars } from "../../components/brand/SignalBars.jsx";
import { Px, SectionHeader } from "./Shared.jsx";

const PROJECTS = [
  { name: "MESHBOX", track: "comms", tag: "COMMS", sync: 4, people: 12, desc: "Solar-powered mesh node in a lunchbox. Flooding-resistant firmware, 2km hops." },
  { name: "PAPERSYNC", track: "civic", tag: "CIVIC", sync: 3, people: 7, desc: "QR-batched forms that reconcile with the database when power returns." },
  { name: "MIRROR-MIRROR", track: "data", tag: "DATA", sync: 4, people: 5, desc: "One-command community mirrors for critical repos and docs, rsync over anything." },
  { name: "RUMOR TRIAGE", track: "info", tag: "INFO", sync: 2, people: 9, desc: "Low-bandwidth verification queue for emergency info, SMS-first." },
  { name: "SHELTERMAP", track: "civic", tag: "CIVIC", sync: 3, people: 11, desc: "Offline-cached shelter map with bluetooth sync between devices." },
  { name: "HAMBRIDGE", track: "comms", tag: "COMMS", sync: 1, people: 4, desc: "Packet-radio gateway that speaks boring, reliable 1980s protocols." },
];

export function Projects({ onRegister }) {
  const [tab, setTab] = React.useState("all");
  const [q, setQ] = React.useState("");
  const shown = PROJECTS.filter((p) => (tab === "all" || p.track === tab) && p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "48px var(--gutter) 64px" }}>
      <SectionHeader label="PROJECTS" right="SAMPLE DATA · YEAR 0" />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
        <Tabs active={tab} onChange={setTab} items={[
          { id: "all", label: "All", count: PROJECTS.length },
          { id: "comms", label: "Comms" }, { id: "data", label: "Data" },
          { id: "info", label: "Info" }, { id: "civic", label: "Civic" },
        ]} />
        <div style={{ width: 260 }}>
          <Input prefix="$" placeholder="grep projects…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginTop: 24 }}>
        {shown.map((p) => (
          <Card key={p.name} title={p.name} meta={<Badge blink={false}>{p.tag}</Badge>} lifted
            footer={<><span>{p.people} people</span><span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>SYNC <SignalBars level={p.sync} height={14} /></span></>}>
            {p.desc}
          </Card>
        ))}
        <Card offline title="YOUR IDEA" meta="EMPTY SLOT" footer={<><span>0 people</span><span>→ pitch it</span></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span>This slot is intentionally empty. Don't ask why nobody built it yet.</span>
            <Button variant="secondary" size="sm" icon={<Px name="zap" size={14} color="currentColor" />} onClick={onRegister}>Be the n0body</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
