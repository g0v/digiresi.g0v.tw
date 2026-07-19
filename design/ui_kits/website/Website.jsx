import React from "react";
import { Button } from "../../components/core/Button.jsx";
import { Card } from "../../components/core/Card.jsx";
import { Input } from "../../components/forms/Input.jsx";
import { Select } from "../../components/forms/Select.jsx";
import { Checkbox } from "../../components/forms/Checkbox.jsx";
import { Logo } from "../../components/brand/Logo.jsx";
import { StatusDot } from "../../components/brand/StatusDot.jsx";
import { TerminalBlock } from "../../components/brand/TerminalBlock.jsx";
import { Px } from "./Shared.jsx";
import { Landing } from "./Landing.jsx";
import { Schedule } from "./Schedule.jsx";
import { Projects } from "./Projects.jsx";

const NAV = [
  { id: "landing", label: "HOME" },
  { id: "schedule", label: "SCHEDULE" },
  { id: "projects", label: "PROJECTS" },
];

function RegisterDialog({ onClose }) {
  const [sent, setSent] = React.useState(false);
  const [batt, setBatt] = React.useState(true);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: "100%" }}>
        {sent ? (
          <TerminalBlock title="register — done" cursor={false} lines={[
            { prompt: "$", text: "register --submit" },
            { text: "ACK. Check your inbox for the confirmation.", tone: "green" },
            { text: "# no inbox? that's what the hackathon is for.", tone: "dim" },
          ]}>
            <div style={{ marginTop: 12 }}><Button variant="secondary" size="sm" onClick={onClose}>Close</Button></div>
          </TerminalBlock>
        ) : (
          <Card title="REGISTER" meta="92/120" lifted footer={<><span>Free · CoC applies</span><span>g0v slack #digiresithon</span></>}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Input label="Callsign" prefix="$" placeholder="n0body" hint="Shown on your badge" />
              <Input label="Email" placeholder="you@example.tw" />
              <Select label="Track" defaultValue="comms" options={[
                { value: "comms", label: "Comms without internet" },
                { value: "data", label: "Data backup" },
                { value: "info", label: "Information integrity" },
                { value: "civic", label: "Civic coordination" },
              ]} />
              <Checkbox label="I'll bring a battery pack" checked={batt} onChange={setBatt} />
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant="primary" onClick={() => setSent(true)}>Submit</Button>
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export function Website() {
  const [view, setView] = React.useState("landing");
  const [reg, setReg] = React.useState(false);
  const [light, setLight] = React.useState(false);
  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    document.documentElement.setAttribute("data-theme", next ? "light" : "dark");
  };
  const go = (v) => setView(v);
  return (
    <div style={{ background: "var(--bg)", color: "var(--ink)", minHeight: "100vh", display: "flex", flexDirection: "column" }} data-screen-label={view}>
      {/* NAV */}
      <header style={{ borderBottom: "var(--border)", background: "var(--bg)", position: "sticky", top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "0 var(--gutter)", display: "flex", alignItems: "center", gap: 24, height: 64 }}>
          <a href="#home" onClick={(e) => { e.preventDefault(); go("landing"); }} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", padding: 0 }} aria-label="DigiResiThon home">
            <Logo variant="lockup" height={34} theme={light ? "light" : "dark"} />
          </a>
          <nav style={{ display: "flex", gap: 4, marginLeft: "auto" }} aria-label="Main">
            {NAV.map((n) => (
              <button key={n.id} onClick={() => go(n.id)} style={{
                fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", fontWeight: 600, letterSpacing: "var(--tracking-label)",
                background: view === n.id ? "var(--ink)" : "transparent", color: view === n.id ? "var(--ink-on-ink)" : "var(--ink)",
                border: "none", padding: "8px 12px", cursor: "pointer",
              }}>{n.label}</button>
            ))}
          </nav>
          <StatusDot status="online" label="Online" />
          <button onClick={toggleTheme} aria-label="Toggle theme" title="Toggle paper/blackout" style={{ background: "transparent", border: "2px solid var(--line)", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Px name={light ? "moon" : "sun"} size={16} />
          </button>
          <Button variant="primary" size="sm" onClick={() => setReg(true)}>Register</Button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {view === "landing" && <Landing onRegister={() => setReg(true)} onNav={go} />}
        {view === "schedule" && <Schedule />}
        {view === "projects" && <Projects onRegister={() => setReg(true)} />}
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: "var(--border)", marginTop: "auto" }}>
        <div style={{ maxWidth: "var(--container)", margin: "0 auto", padding: "28px var(--gutter)", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <Logo variant="mark" height={40} theme={light ? "light" : "dark"} />
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--ink-3)", letterSpacing: "var(--tracking-label)", lineHeight: 2 }}>
            A G0V COMMUNITY EVENT · CC BY 4.0 · CODE OF CONDUCT APPLIES<br />
            NOBODY OWNS THIS. THAT MEANS YOU DO.
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", letterSpacing: "var(--tracking-label)" }}>
            <a href="#slack">SLACK #DIGIRESITHON</a>
            <a href="#git">GIT</a>
            <a href="#coc">COC</a>
          </div>
        </div>
      </footer>

      {reg && <RegisterDialog onClose={() => setReg(false)} />}
    </div>
  );
}
