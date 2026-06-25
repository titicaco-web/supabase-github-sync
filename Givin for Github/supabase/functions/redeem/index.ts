// ─────────────────────────────────────────────────────────────
// redeem · Supabase Edge Function (Deno)
// Public: the redeem page calls this with the order's public_token.
// Reveals the reward link and (first time) marks the order redeemed.
// The orders table itself is NOT publicly readable — this is the
// only door in, and it only returns what the recipient needs.
// ─────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { token } = await req.json();
    if (!token) return json({ error: "token required" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await admin
      .from("orders")
      .select("id, status, message, reward_link, recipient_name, redeemed_at, gift:gifts(title, category)")
      .eq("public_token", token)
      .single();

    if (!order) return json({ error: "not found" }, 404);
    if (order.status === "draft") return json({ error: "not ready" }, 409);

    // First view marks it redeemed (idempotent).
    if (!order.redeemed_at) {
      await admin.from("orders")
        .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
        .eq("id", order.id);
    }

    return json({
      recipient: order.recipient_name,
      gift: order.gift,
      message: order.message,
      reward_link: order.reward_link,
    });
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
