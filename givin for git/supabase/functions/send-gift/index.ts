// ─────────────────────────────────────────────────────────────
// send-gift · Supabase Edge Function (Deno)
// Called by the web app after it inserts a draft order.
//   1. loads the order + gift (service role, bypasses RLS)
//   2. creates a Tremendous reward with a redeemable LINK
//   3. emails the recipient a Givin-branded redeem link (Resend)
//   4. marks the order "sent"
//
// Field names for Tremendous/Resend are current as of writing — confirm
// against their docs and your account before going live. TODOs mark the
// spots most likely to need your funding source / campaign id.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId } = await req.json();
    if (!orderId) return json({ error: "orderId required" }, 400);

    // Verify the caller is the authenticated sender of this order.
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    // Service-role client for trusted writes.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await admin
      .from("orders").select("*, gift:gifts(*)").eq("id", orderId).single();
    if (!order || order.sender_id !== user.id) return json({ error: "not found" }, 404);
    if (order.status === "sent" || order.status === "redeemed")
      return json({ error: "already sent" }, 409);

    // ── 1. Fulfil, by gift type ───────────────────────────────
    // digital  → public-domain content; reward link = the source URL (€0, no provider call)
    // trial    → affiliate/revenue-share trial; reward link = the affiliate URL (€0 to us)
    // physical → real-world reward (flowers, coffee, gift card) via Tremendous
    let rewardLink: string | null = null;
    let tremendousId: string | null = null;

    if (order.gift.gift_type === "physical") {
      const base = Deno.env.get("TREMENDOUS_BASE_URL") ?? "https://testflight.tremendous.com/api/v2";
      const tremRes = await fetch(`${base}/orders`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("TREMENDOUS_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payment: { funding_source_id: Deno.env.get("TREMENDOUS_FUNDING_SOURCE_ID") }, // TODO
          reward: {
            value: {
              denomination: Math.max(1, (order.gift.value_cents || 200) / 100),
              currency_code: order.gift.currency || "EUR",
            },
            delivery: { method: "LINK" }, // we email our own branded link
            recipient: { name: order.recipient_name, email: order.recipient_email },
            // products: [...] or campaign_id: "..."  // TODO scope the catalog you offer
          },
        }),
      });
      const trem = await tremRes.json();
      if (!tremRes.ok) {
        await admin.from("orders").update({ status: "failed" }).eq("id", orderId);
        return json({ error: "fulfillment failed", detail: trem }, 502);
      }
      const reward = trem?.order?.rewards?.[0];
      tremendousId = trem?.order?.id ?? null;
      rewardLink = reward?.delivery?.link ?? reward?.link ?? null;
    } else {
      // digital + trial: zero marginal cost — just hand over the link.
      rewardLink = order.gift.source_url ?? null;
    }

    // ── 2. Mark sent + store the reward link (revealed on redeem) ─
    await admin.from("orders").update({
      status: "sent",
      sent_at: new Date().toISOString(),
      tremendous_id: tremendousId,
      reward_link: rewardLink,
    }).eq("id", orderId);

    // ── 3. Email the recipient our branded redeem link ────────
    const webUrl = Deno.env.get("WEB_URL") ?? "https://givin.app";
    const redeemUrl = `${webUrl}/redeem/${order.public_token}`;
    const senderName = user.user_metadata?.name ?? "Someone";
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("RESEND_FROM") ?? "Givin <hello@givin.app>",
        to: order.recipient_email,
        subject: `${senderName} sent you a gift on Givin 🎁`,
        html: giftEmail({
          recipient: order.recipient_name,
          sender: senderName,
          gift: order.gift.title,
          message: order.message,
          redeemUrl,
        }),
      }),
    });

    return json({ ok: true, redeemUrl });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function giftEmail(p: {
  recipient: string; sender: string; gift: string; message?: string; redeemUrl: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#FBF9F6;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <div style="font-weight:800;font-size:22px;color:#1C1A17">Givin<span style="color:#E21E48">.</span></div>
    <div style="background:#fff;border:1px solid #ECE7E0;border-radius:16px;padding:28px;margin-top:20px">
      <p style="font-size:16px;color:#1C1A17;margin:0 0 4px">Hi ${esc(p.recipient)},</p>
      <p style="font-size:16px;color:#2E2A25;margin:0 0 16px"><strong>${esc(p.sender)}</strong> sent you a gift: <strong>${esc(p.gift)}</strong>.</p>
      ${p.message ? `<div style="background:#FBF9F6;border:1px solid #ECE7E0;border-radius:12px;padding:14px;font-size:15px;color:#3A352F;font-style:italic">"${esc(p.message)}"</div>` : ""}
      <a href="${p.redeemUrl}" style="display:block;text-align:center;background:#E21E48;color:#fff;text-decoration:none;font-weight:700;font-size:16px;border-radius:12px;padding:14px;margin-top:20px">Redeem your gift</a>
      <p style="font-size:12px;color:#9A938A;text-align:center;margin:14px 0 0">You choose what you want and where to redeem it.</p>
    </div>
    <p style="font-size:11px;color:#9A938A;text-align:center;margin-top:18px">Sent with Givin · reply STOP to opt out of future gifts</p>
  </div></body></html>`;
}

function esc(s = "") {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
