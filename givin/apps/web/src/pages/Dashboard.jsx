import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/Logo";

// Phase 0 dashboard: saved recipients + recent gifts, and the CTA to send.
// LinkedIn does NOT give us connections via API, so "moments" are the dates
// the user saves themselves (or that the extension hands over). This screen
// shows saved recipients and recent activity.
export default function Dashboard({ auth }) {
  const nav = useNavigate();
  const [recipients, setRecipients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [credits, setCredits] = useState(null);

  useEffect(() => {
    (async () => {
      const [{ data: r }, { data: o }, { data: c }] = await Promise.all([
        supabase.from("recipients").select("*").order("created_at", { ascending: false }).limit(8),
        supabase.from("orders").select("*, gift:gifts(title)").order("created_at", { ascending: false }).limit(6),
        supabase.from("credits").select("free_remaining").order("period", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setRecipients(r ?? []);
      setOrders(o ?? []);
      setCredits(c);
    })();
  }, []);

  const name = auth.user?.user_metadata?.name?.split(" ")[0] ?? "there";

  return (
    <>
      <div className="topbar">
        <Logo />
        <div className="spacer" />
        {credits && <span className="pill">{credits.free_remaining} free gifts</span>}
        <button className="btn ghost sm" onClick={auth.signOut}>Sign out</button>
      </div>

      <div className="wrap section">
        <h1 className="h1">Hi {name} 👋</h1>
        <p className="sub">Celebrate someone in your network today.</p>

        <button className="btn primary block" style={{ marginTop: 18 }} onClick={() => nav("/send")}>
          Send a gift
        </button>

        <div className="label">SAVED PEOPLE</div>
        {recipients.length === 0 && (
          <p className="tiny muted">No one saved yet — they'll appear here once you send a gift.</p>
        )}
        <div className="stack">
          {recipients.map((r) => (
            <div className="row" key={r.id}>
              <div className="avatar sm" />
              <div className="grow">
                <div className="name">{r.name}</div>
                <div className="meta">{r.headline || r.email}</div>
              </div>
              <button
                className="btn ghost sm"
                onClick={() => nav(`/send?name=${encodeURIComponent(r.name)}&email=${encodeURIComponent(r.email || "")}`)}
              >
                Gift
              </button>
            </div>
          ))}
        </div>

        <div className="label">RECENT GIFTS</div>
        {orders.length === 0 && <p className="tiny muted">Nothing sent yet.</p>}
        <div className="stack">
          {orders.map((o) => (
            <div className="row" key={o.id}>
              <div className="grow">
                <div className="name">{o.recipient_name}</div>
                <div className="meta">{o.gift?.title} · {o.status}</div>
              </div>
              <StatusDot status={o.status} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function StatusDot({ status }) {
  const color = status === "redeemed" ? "var(--green)" : status === "sent" ? "var(--coral)" : "var(--faint)";
  return <span className="mono tiny" style={{ color }}>● {status}</span>;
}
