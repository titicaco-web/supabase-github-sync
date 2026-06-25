import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Logo } from "../components/Logo";

const OCCASIONS = [
  { id: "new_job", label: "New job" },
  { id: "work_anniversary", label: "Work anniv." },
  { id: "great_call", label: "Great call" },
  { id: "just_because", label: "Just because" },
];

// Pre-fill comes from the extension: /send?name=...&email=...&headline=...&occasion=...
export default function Send({ auth }) {
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [gifts, setGifts] = useState([]);
  const [giftId, setGiftId] = useState(null);
  const [occasion, setOccasion] = useState(params.get("occasion") || "new_job");
  const [name, setName] = useState(params.get("name") || "");
  const [email, setEmail] = useState(params.get("email") || "");
  const headline = params.get("headline") || "";
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase.from("gifts").select("*").eq("active", true).order("value_cents").then(({ data }) => {
      setGifts(data ?? []);
      const free = (data ?? []).find((g) => g.tier === "free");
      setGiftId(free?.id ?? data?.[0]?.id ?? null);
    });
  }, []);

  // Suggest a message when the occasion or name changes.
  useEffect(() => {
    const first = name.split(" ")[0] || "there";
    const templates = {
      new_job: `Congratulations on the new role, ${first}! Well deserved — let's catch up soon.`,
      work_anniversary: `Happy work anniversary, ${first}! Here's to the milestone.`,
      great_call: `Great talking today, ${first}. Thanks for your time — a small thank-you.`,
      just_because: `Thinking of you, ${first}. Hope this brightens your day.`,
    };
    setMessage(templates[occasion] || "");
  }, [occasion, name]);

  const gift = useMemo(() => gifts.find((g) => g.id === giftId), [gifts, giftId]);

  async function send() {
    setError(null);
    if (!name || !email || !giftId) {
      setError("Add a recipient name, email, and gift.");
      return;
    }
    setBusy(true);
    try {
      // 1. Save the recipient (best effort) and insert a draft order.
      await supabase.from("recipients").insert({
        owner_id: auth.user.id, name, email, headline,
      });
      const { data: order, error: oErr } = await supabase
        .from("orders")
        .insert({
          sender_id: auth.user.id,
          gift_id: giftId,
          recipient_name: name,
          recipient_email: email,
          occasion,
          message,
          status: "draft",
        })
        .select()
        .single();
      if (oErr) throw oErr;

      // 2. Fulfil + email via the edge function.
      const { data, error: fErr } = await supabase.functions.invoke("send-gift", {
        body: { orderId: order.id },
      });
      if (fErr || data?.error) throw new Error(data?.error || fErr.message);

      nav("/app");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  const cat = (c) => ({ flowers: "#F0D8D0", coffee: "#E5DDD2", chocolate: "#D8CEE0", giftcard: "#CFD8D2" }[c] || "#E5DDD2");

  return (
    <>
      <div className="topbar">
        <Logo />
        <div className="spacer" />
        <button className="btn ghost sm" onClick={() => nav("/app")}>Cancel</button>
      </div>

      <div className="wrap section">
        <h1 className="h1">Send a gift</h1>

        <div className="label" style={{ marginTop: 14 }}>OCCASION</div>
        <div className="chips">
          {OCCASIONS.map((o) => (
            <button key={o.id} className={"chip" + (occasion === o.id ? " on" : "")} onClick={() => setOccasion(o.id)}>
              {o.label}
            </button>
          ))}
        </div>

        <div className="label">PICK A GIFT</div>
        <div className="gift-grid">
          {gifts.map((g) => (
            <button key={g.id} className={"gift" + (giftId === g.id ? " on" : "")} onClick={() => setGiftId(g.id)}>
              <div className="gift-img" style={{ background: `repeating-linear-gradient(45deg, ${cat(g.category)}, ${cat(g.category)} 7px, #fff8 7px, #fff8 14px)` }}>
                {g.tier === "free" && <span className="gift-tag">FREE</span>}
              </div>
              <div className="gift-body">
                <div className="name" style={{ fontSize: 13 }}>{g.title}</div>
                <div className="mono tiny muted">{g.tier === "free" ? "€0" : "€" + (g.value_cents / 100).toFixed(0)}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="label">TO</div>
        <div className="stack">
          <input className="input" placeholder="Recipient name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Recipient email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <div className="label">MESSAGE</div>
        <textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} />

        {error && <p className="tiny" style={{ color: "var(--coral-dark)" }}>{error}</p>}

        <button className="btn primary block" style={{ marginTop: 18 }} disabled={busy} onClick={send}>
          {busy ? "Sending…" : gift ? `Send ${gift.title}` : "Send gift"}
        </button>
        <p className="tiny muted center" style={{ marginTop: 10 }}>
          No address needed — {name ? name.split(" ")[0] : "they"} chooses where to redeem.
        </p>
      </div>
    </>
  );
}
