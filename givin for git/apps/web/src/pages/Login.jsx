import { Logo } from "../components/Logo";

export default function Login({ auth }) {
  return (
    <div className="wrap section" style={{ paddingTop: 72, maxWidth: 420 }}>
      <Logo />
      <h1 className="h1" style={{ marginTop: 40, fontSize: 30, lineHeight: 1.1 }}>
        Send a real gift to a connection in 30 seconds.
      </h1>
      <p className="sub" style={{ fontSize: 15, marginTop: 12 }}>
        Celebrate the moments that matter — a new job, a work anniversary, a great
        meeting. They pick what they want and where to redeem it.
      </p>

      <button className="btn primary block" style={{ marginTop: 28 }} onClick={auth.signInWithLinkedIn}>
        Continue with LinkedIn
      </button>
      <p className="tiny muted center" style={{ marginTop: 12 }}>
        We only use LinkedIn to sign you in. We never message or post on your behalf.
      </p>

      <div className="card" style={{ marginTop: 36, padding: 18 }}>
        <div className="label" style={{ marginTop: 0 }}>HOW IT WORKS</div>
        <div className="stack">
          <Step n="1" t="Pick a moment & a gift" />
          <Step n="2" t="Add a short personal note" />
          <Step n="3" t="They get an email and redeem in one click" />
        </div>
      </div>
    </div>
  );
}

function Step({ n, t }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <div
        className="mono"
        style={{
          width: 24, height: 24, borderRadius: 7, background: "var(--coral)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 600, flex: "none",
        }}
      >
        {n}
      </div>
      <span style={{ fontSize: 14 }}>{t}</span>
    </div>
  );
}
