import React from "react";
import { Button } from "../../components/core/Button.jsx";
import { Badge } from "../../components/core/Badge.jsx";
import { Card } from "../../components/core/Card.jsx";
import { Alert } from "../../components/core/Alert.jsx";
import { SignalBars } from "../../components/brand/SignalBars.jsx";
import { TerminalBlock } from "../../components/brand/TerminalBlock.jsx";
import { Marquee } from "../../components/brand/Marquee.jsx";
import { Px, SectionHeader, Slash, SAMPLE } from "./Shared.jsx";

const TRACKS = [
  { icon: "radio-signal", name: "COMMS W/O INTERNET", desc: "Mesh networks, LoRa, ham radio bridges, sneakernet protocols. Talk when the backbone can't.", count: 8 },
  { icon: "server", name: "DATA BACKUP", desc: "Mirrors, offline caches, distributed archives. The data survives even when the datacenter doesn't.", count: 6 },
  { icon: "alert", name: "INFO INTEGRITY", desc: "Verified emergency info, rumor triage, low-bandwidth broadcast. Truth at 300 baud.", count: 5 },
  { icon: "users", name: "CIVIC COORDINATION", desc: "Shelter maps, mutual-aid boards, paper-compatible workflows. Neighbors as infrastructure.", count: 4 },
];

function useCountdown(target) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const d = Math.max(0, new Date(target).getTime() - now);
  const days = Math.floor(d / 86400000), h = Math.floor(d / 3600000) % 24, m = Math.floor(d / 60000) % 60, s = Math.floor(d / 1000) % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `T-${days}D ${pad(h)}:${pad(m)}:${pad(s)}`;
}

export function Landing({ onRegister, onNav }) {
  const countdown = useCountdown(SAMPLE.targetDate);
  return (
    <div>
      {/* HERO */}
      <section style={{ position: "relative", overflow: "hidden", borderBottom: "var(--border)" }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, background: "var(--scanlines)", pointerEvents: "none" }}></div>
        <Slash left="62%" />
        <div style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "72px var(--gutter) 64px", display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 48, alignItems: "center", position: "relative" }}>
          <div>
            <div style={{ display: "flex", gap: 16, alignItems: "center", fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)", color: "var(--ink-2)" }}>
              <span style={{ color: "var(--accent)" }}>[ G0V COMMUNITY HACKATHON ]</span>
              <span>{SAMPLE.dates} · {SAMPLE.place}</span>
            </div>
            <h1 style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--px-3)", WebkitFontSmoothing: "none", lineHeight: "var(--leading-pixel)", margin: "20px 0 0", fontWeight: 400 }}>
              WHEN THE NET<br />GOES DOWN,<br />WE STAY <span style={{ color: "var(--accent)" }}>UP</span>.
            </h1>
            <p style={{ maxWidth: "52ch", color: "var(--ink-2)", margin: "20px 0 0" }}>
              The digital resilience hackathon. 48 hours to prototype the tools that still work on the worst day — mesh, radio, mirrors, paper, whatever holds.
            </p>
            <div style={{ display: "flex", gap: 14, marginTop: 28, alignItems: "center" }}>
              <Button variant="primary" size="lg" icon={<span>→</span>} onClick={onRegister}>Register</Button>
              <Button variant="secondary" size="lg" onClick={() => onNav("schedule")}>Schedule</Button>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)", color: "var(--accent-2)", fontWeight: 600 }}>{countdown}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <TerminalBlock title="digiresithon@tw:~" lines={[
              { prompt: "$", text: "ping backbone.example.tw" },
              { text: "Request timeout ×3", tone: "red" },
              { text: "# fine. we'll build our own network.", tone: "dim" },
              { prompt: "$", text: "join digiresithon --offline", tone: "green" },
              { text: "OK — see you at day 0.", tone: "green" },
            ]} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "var(--border)", background: "var(--surface)", padding: "10px 14px" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)", color: "var(--ink-2)" }}>VENUE UPLINK</span>
              <SignalBars animated height={22} />
            </div>
          </div>
        </div>
      </section>

      <Marquee speed={26} items={["SIGNAL LOST", "48 HOURS", `${SAMPLE.dates} ${SAMPLE.place}`, "NO CLOUD", "BRING BATTERIES", "REGISTRATION OPEN"]} />

      {/* STATS */}
      <section style={{ borderBottom: "var(--border)" }}>
        <div style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "0 var(--gutter)", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
          {[["48", "HOURS"], ["120", "HACKERS"], ["0", "CLOUDS"], ["20+", "PROTOTYPES"]].map(([n, l], i) => (
            <div key={l} style={{ padding: "28px 20px", borderLeft: i ? "var(--border)" : "none", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--px-3)", WebkitFontSmoothing: "none", color: i === 2 ? "var(--accent)" : "var(--ink)" }}>{n}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)", color: "var(--ink-3)", marginTop: 8 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TRACKS */}
      <section style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "64px var(--gutter)" }}>
        <SectionHeader label="TRACKS" right="4 WAYS TO BE USEFUL" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginTop: 24 }}>
          {TRACKS.map((t) => (
            <Card key={t.name} footer={<><span>{t.count} teams</span><span style={{ color: "var(--accent)" }}>→ join</span></>}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Px name={t.icon} size={28} color="var(--accent-2)" />
                <div style={{ fontFamily: "var(--font-pixel)", fontSize: "var(--px-1)", WebkitFontSmoothing: "none", lineHeight: 1.5 }}>{t.name}</div>
                <div style={{ fontSize: "var(--text-sm)", color: "var(--ink-2)" }}>{t.desc}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* WHO */}
      <section style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "0 var(--gutter) 64px" }}>
        <SectionHeader label="WHO SHOULD COME" right="EVERY0NE" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24, alignItems: "start" }}>
          <div style={{ fontSize: "var(--text-base)", color: "var(--ink-2)", lineHeight: "var(--leading-body)" }}>
            <p style={{ margin: 0 }}>Developers, sure. But resilience is mostly not code: field researchers, designers, docs writers, translators, radio amateurs, neighborhood organizers.</p>
            <p style={{ margin: "12px 0 0" }}>g0v canon applies — don't ask why nobody is building it. <span style={{ color: "var(--ink)" }}>You are the "nobody".</span></p>
          </div>
          <Alert tone="online" title="Registration open" action={<Button size="sm" variant="primary" onClick={onRegister}>Register</Button>}>
            92 / 120 seats taken. Free, as in beer and as in speech.
          </Alert>
        </div>
      </section>
    </div>
  );
}
