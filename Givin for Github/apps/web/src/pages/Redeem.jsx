import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/Logo";

// Public page. Calls the redeem edge function with the token, reveals the
// reward link, and prompts the recipient to gift someone back — the loop.
export default function Redeem() {
  const { token } = useParams();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    supabase.functions
      .invoke("redeem", { body: { token } })
      .then(({ data, error }) => {
        if (error || data?.error) setState({ status: "error", msg: data?.error || error.message });
        else setState({ status: "ok", ...data });
      });
  }, [token]);

  if (state.status === "loading")
    return <div className="wrap section center muted" style={{ paddingTop: 80 }}>Unwrapping…</div>;

  if (state.status === "error")
    return (
      <div className="wrap section center" style={{ paddingTop: 80 }}>
        <Logo />
        <p className="sub" style={{ marginTop: 24 }}>We couldn't find this gift. The link may have expired.</p>
      </div>
    );

  const first = (state.recipient || "there").split(" ")[0];

  return (
    <div className="wrap section" style={{ paddingTop: 48, maxWidth: 420 }}>
      <div className="center"><Logo /></div>

      <div className="card center" style={{ padding: 28, marginTop: 28 }}>
        <div
          style={{
            width: 56, height: 56, borderRadius: 50, background: "var(--green-tint)",
            color: "var(--green)", fontSize: 26, fontWeight: 800, margin: "0 auto 14px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          🎁
        </div>
        <h1 className="h1">A gift for you, {first}</h1>
        <p className="sub">{state.gift?.title}</p>

        {state.message && (
          <div className="banner" style={{ marginTop: 18, fontStyle: "italic", textAlign: "left" }}>
            "{state.message}"
          </div>
        )}

        {state.reward_link ? (
          <a className="btn primary block" style={{ marginTop: 20 }} href={state.reward_link} target="_blank" rel="noreferrer">
            Choose &amp; redeem your gift
          </a>
        ) : (
          <p className="tiny muted" style={{ marginTop: 18 }}>
            Your gift is being prepared — check back shortly.
          </p>
        )}
        <p className="tiny muted" style={{ marginTop: 10 }}>You pick what you want and where to use it.</p>
      </div>

      {/* The viral loop. */}
      <div className="card" style={{ padding: 18, marginTop: 16, borderStyle: "dashed", borderColor: "var(--coral-line)" }}>
        <div className="label" style={{ marginTop: 0 }}>PASS IT ON</div>
        <p style={{ fontSize: 14, margin: "0 0 12px" }}>
          Brighten someone else's day. <strong style={{ color: "var(--coral)" }}>Your first gift is free too.</strong>
        </p>
        <a className="btn ghost block" href="/">Send a gift with Givin</a>
      </div>
    </div>
  );
}
