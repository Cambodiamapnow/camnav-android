// CamNAV – "Developer Coffee" $1/month via ABA KHQR / Bakong.
// Supabase Edge Function (Deno).  POST { action: "create" }            → { qr, md5, bill_number, expires_at, amount }
//                                 POST { action: "verify", md5: "..." } → { paid, profile }
// Secrets (supabase secrets set ...): BAKONG_TOKEN, BAKONG_ACCOUNT_ID (e.g. yourname@aclb),
//   MERCHANT_NAME, MERCHANT_CITY (default "Phnom Penh"), PRICE_USD (default 1), PRO_DAYS (default 30)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from "npm:@supabase/supabase-js@2";
import { BakongKHQR, IndividualInfo, khqrData } from "npm:bakong-khqr@1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const env = (k: string, d = "") => Deno.env.get(k) ?? d;
const PRICE = Number(env("PRICE_USD", "1"));
const DAYS = Number(env("PRO_DAYS", "30"));
const QR_MINUTES = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // who is asking? (must be a real, non-guest account)
  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "sign in first" }, 401);
  if ((user as { is_anonymous?: boolean }).is_anonymous) return json({ error: "sign in with phone or Google first" }, 403);

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
  let body: { action?: string; md5?: string } = {};
  try { body = await req.json(); } catch { /* empty body */ }

  // ---------- create a $1 KHQR for this user ----------
  if (body.action === "create") {
    const account = env("BAKONG_ACCOUNT_ID");
    if (!account) return json({ error: "KHQR is not set up yet (BAKONG_ACCOUNT_ID missing)" }, 500);
    const bill = "CN" + Date.now().toString(36).toUpperCase();
    const expiresAt = Date.now() + QR_MINUTES * 60_000;
    const info = new IndividualInfo(account, env("MERCHANT_NAME", "CamNAV"), env("MERCHANT_CITY", "Phnom Penh"), {
      currency: khqrData.currency.usd,
      amount: PRICE,
      billNumber: bill,
      storeLabel: "CamNAV",
      terminalLabel: "Coffee",
      expirationTimestamp: expiresAt,
    });
    const res = new BakongKHQR().generateIndividual(info);
    const qr = res?.data?.qr, md5 = res?.data?.md5;
    if (!qr || !md5) return json({ error: "could not make KHQR", detail: res?.status }, 500);
    const { error } = await admin.from("payment_transactions").insert({
      user_id: user.id, provider: "khqr", amount: PRICE, currency: "USD", status: "pending",
      khqr_md5: md5, khqr_string: qr, bill_number: bill,
    });
    if (error) return json({ error: error.message }, 500);
    return json({ qr, md5, bill_number: bill, amount: PRICE, currency: "USD", expires_at: new Date(expiresAt).toISOString() });
  }

  // ---------- check whether that KHQR has been paid ----------
  if (body.action === "verify" && body.md5) {
    const { data: tx } = await admin.from("payment_transactions").select("*")
      .eq("khqr_md5", body.md5).eq("user_id", user.id).maybeSingle();
    if (!tx) return json({ error: "unknown payment" }, 404);
    const profileNow = async () => (await admin.from("profiles").select("*").eq("id", user.id).single()).data;
    if (tx.status === "paid") return json({ paid: true, profile: await profileNow() });

    const r = await fetch("https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + env("BAKONG_TOKEN") },
      body: JSON.stringify({ md5: body.md5 }),
    });
    const j = await r.json().catch(() => ({}));
    const paid = r.ok && j?.responseCode === 0 && j?.data &&
      Number(j.data.amount) >= PRICE && String(j.data.currency || "USD").toUpperCase() === "USD";
    if (!paid) {
      if (Date.now() - new Date(tx.created_at).getTime() > QR_MINUTES * 60_000 + 60_000) {
        await admin.from("payment_transactions").update({ status: "expired" }).eq("id", tx.id).eq("status", "pending");
      }
      return json({ paid: false, bakong: j?.responseMessage ?? null });
    }

    // extend from today, or from the current end date if still active (early renewal)
    const prof = await profileNow();
    const now = Date.now();
    const base = prof?.subscription_expires_at && new Date(prof.subscription_expires_at).getTime() > now
      ? new Date(prof.subscription_expires_at).getTime() : now;
    const end = new Date(base + DAYS * 86_400_000).toISOString();
    await admin.from("payment_transactions").update({
      status: "paid", paid_at: new Date().toISOString(), provider_ref: j.data.hash ?? j.data.externalRef ?? null,
      period_start: new Date(base).toISOString(), period_end: end,
    }).eq("id", tx.id);
    await admin.from("profiles").update({ subscription_status: "active", subscription_expires_at: end }).eq("id", user.id);
    return json({ paid: true, profile: await profileNow() });
  }

  return json({ error: "unknown action" }, 400);
});
