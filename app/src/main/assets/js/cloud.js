/* CamNAV – cloud: Supabase auth (guest / +855 phone OTP / Google), profile &
 * subscription, live shared incidents with "Still there / Cleared" votes, and the
 * $1 KHQR coffee payment. Without a Supabase config everything stays local.
 */
(function (root) {
  "use strict";
  const cfg = root.CAMNAV_CONFIG || {};
  const REDIRECT = "camnav://login";
  const listeners = new Set();
  const incidentListeners = new Set();
  let sb = null;
  const state = { ready: false, enabled: false, session: null, user: null, profile: null, error: null };

  const RANKS = [
    { min: 0, km: "អ្នកដំណើរថ្មី", en: "New Traveler" },
    { min: 100, km: "អ្នកស្គាល់ផ្លូវ", en: "Road Explorer" },
    { min: 300, km: "អ្នកនាំផ្លូវ", en: "Trusted Guide" },
    { min: 700, km: "មេផ្លូវ", en: "Road Master" },
    { min: 1500, km: "ស្តេចផ្លូវកាត់", en: "King of Shortcuts" },
  ];

  const emit = () => listeners.forEach((f) => { try { f(state); } catch (e) { console.warn(e); } });
  const isAnon = (u) => !!(u && (u.is_anonymous || (u.app_metadata && u.app_metadata.provider === "anonymous")));

  async function loadProfile() {
    if (!sb || !state.user) { state.profile = null; return null; }
    let { data, error } = await sb.rpc("refresh_my_subscription");
    if (error || !data || !data.id) {
      const r = await sb.from("profiles").select("*").eq("id", state.user.id).maybeSingle();
      data = r.data;
    }
    state.profile = data || null;
    return state.profile;
  }

  async function setSession(session) {
    state.session = session || null;
    state.user = (session && session.user) || null;
    await loadProfile().catch((e) => console.warn("profile", e));
    emit();
  }

  async function init() {
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !root.supabase || !root.supabase.createClient) {
      state.ready = true; emit(); return state;
    }
    try {
      sb = root.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: "pkce", storageKey: "camnav.auth" },
      });
      state.enabled = true;
      sb.auth.onAuthStateChange((_ev, session) => { setSession(session); });
      let { data: { session } } = await sb.auth.getSession();
      if (!session) {
        // Guest mode: an anonymous account lets guests report & vote; upgrading keeps their points.
        const r = await sb.auth.signInAnonymously().catch((e) => ({ error: e }));
        if (r && r.data && r.data.session) session = r.data.session;
      }
      await setSession(session);
    } catch (e) {
      console.warn("cloud init", e); state.error = String(e.message || e);
    }
    state.ready = true; emit();
    return state;
  }

  // ---------------- sign in ----------------
  let otpMode = null, otpPhone = null;
  /** "012 345 678" / "12345678" / "+85512345678" → "+85512345678" */
  function normalizePhone(input) {
    let d = String(input || "").replace(/[^\d+]/g, "");
    if (d.startsWith("+855")) d = d.slice(4); else if (d.startsWith("855")) d = d.slice(3);
    d = d.replace(/^\+/, "").replace(/^0+/, "");
    return /^\d{8,9}$/.test(d) ? "+855" + d : null;
  }
  async function sendPhoneCode(input) {
    const phone = normalizePhone(input);
    if (!phone) throw new Error("bad-phone");
    otpPhone = phone;
    if (isAnon(state.user)) {
      // keep the guest's points: attach the phone to the current guest account
      const r = await sb.auth.updateUser({ phone });
      if (!r.error) { otpMode = "phone_change"; return phone; }
    }
    const { error } = await sb.auth.signInWithOtp({ phone });
    if (error) throw error;
    otpMode = "sms";
    return phone;
  }
  async function verifyPhoneCode(code) {
    const token = String(code || "").replace(/\D/g, "");
    if (token.length !== 6) throw new Error("bad-code");
    const { data, error } = await sb.auth.verifyOtp({ phone: otpPhone, token, type: otpMode || "sms" });
    if (error) throw error;
    await setSession(data.session || (await sb.auth.getSession()).data.session);
    return state;
  }
  async function signInGoogle() {
    let res = null;
    if (isAnon(state.user) && sb.auth.linkIdentity) {
      res = await sb.auth.linkIdentity({ provider: "google", options: { redirectTo: REDIRECT, skipBrowserRedirect: true } }).catch((e) => ({ error: e }));
    }
    if (!res || res.error || !res.data || !res.data.url) {
      res = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: REDIRECT, skipBrowserRedirect: true } });
    }
    if (res.error) throw res.error;
    // Google blocks sign-in inside app web views, so open the real browser; it returns via camnav://login
    if (root.AndroidApp && root.AndroidApp.openExternal) root.AndroidApp.openExternal(res.data.url);
    else root.location.href = res.data.url;
  }
  /** called by the Android app when camnav://login?... opens the app again */
  async function handleDeepLink(url) {
    if (!sb || !url) return;
    try {
      const u = new URL(url.replace(/^camnav:\/\//, "https://camnav.app/"));
      const code = u.searchParams.get("code");
      const hash = new URLSearchParams((u.hash || "").replace(/^#/, ""));
      const errDesc = u.searchParams.get("error_description") || hash.get("error_description");
      if (errDesc) throw new Error(errDesc);
      if (code) { const { data, error } = await sb.auth.exchangeCodeForSession(code); if (error) throw error; await setSession(data.session); }
      else if (hash.get("access_token")) {
        const { data, error } = await sb.auth.setSession({ access_token: hash.get("access_token"), refresh_token: hash.get("refresh_token") });
        if (error) throw error; await setSession(data.session);
      }
    } catch (e) { state.error = String(e.message || e); emit(); throw e; }
  }
  async function signOut() {
    if (!sb) return;
    await sb.auth.signOut().catch(() => {});
    const r = await sb.auth.signInAnonymously().catch(() => null);
    await setSession(r && r.data ? r.data.session : null);
  }

  // ---------------- profile & subscription ----------------
  async function updatePrefs(p) {
    if (!sb || !state.user) return;
    const { data, error } = await sb.from("profiles").update(p).eq("id", state.user.id).select().maybeSingle();
    if (!error && data) { state.profile = data; emit(); }
  }
  async function startTrial() {
    const { data, error } = await sb.rpc("start_trial");
    if (error) throw error;
    state.profile = data; emit(); return data;
  }
  function isPro() {
    const p = state.profile;
    return !!(p && (p.subscription_status === "active" || p.subscription_status === "trialing") &&
      p.subscription_expires_at && new Date(p.subscription_expires_at).getTime() > Date.now());
  }
  function daysLeft() {
    const p = state.profile;
    if (!p || !p.subscription_expires_at) return 0;
    return Math.max(0, Math.ceil((new Date(p.subscription_expires_at).getTime() - Date.now()) / 86400000));
  }
  function rank(points) {
    let r = RANKS[0], next = null;
    for (let i = 0; i < RANKS.length; i++) if (points >= RANKS[i].min) { r = RANKS[i]; next = RANKS[i + 1] || null; }
    return { rank: r, next, progress: next ? (points - r.min) / (next.min - r.min) : 1 };
  }

  // ---------------- live incidents ----------------
  let channel = null;
  async function fetchIncidents(lat, lon, deg = 0.6) {
    if (!sb) return [];
    const { data, error } = await sb.from("incidents").select("*")
      .gte("lat", lat - deg).lte("lat", lat + deg).gte("lon", lon - deg).lte("lon", lon + deg)
      .gt("expires_at", new Date().toISOString()).eq("active", true).limit(500);
    if (error) { console.warn(error); return []; }
    return data || [];
  }
  function subscribeIncidents(cb) {
    incidentListeners.add(cb);
    if (!sb || channel) return;
    channel = sb.channel("incidents-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, (payload) => {
        incidentListeners.forEach((f) => f(payload.eventType, payload.new || payload.old));
      })
      .subscribe();
  }
  async function report(type, lat, lon) {
    if (!sb || !state.user) throw new Error("offline");
    const { data, error } = await sb.from("incidents").insert({ type, lat, lon }).select().single();
    if (error) throw error;
    loadProfile().then(emit);
    return data;
  }
  async function vote(incidentId, v) {
    if (!sb || !state.user) throw new Error("offline");
    const { error } = await sb.from("incident_votes").insert({ incident_id: incidentId, vote: v });
    if (error && !/duplicate|unique/i.test(error.message)) throw error;
    loadProfile().then(emit);
  }

  // ---------------- $1 KHQR ----------------
  async function createKhqr() {
    const { data, error } = await sb.functions.invoke("khqr", { body: { action: "create" } });
    if (error) throw error;
    if (data && data.error) throw new Error(data.error);
    return data;
  }
  /** Paid to the owner's ABA KHQR → a pending payment the owner confirms. */
  async function claimPayment(note) {
    const { data, error } = await sb.rpc("claim_payment", { p_note: note || null });
    if (error) throw error;
    return data;
  }
  async function verifyKhqr(md5) {
    const { data, error } = await sb.functions.invoke("khqr", { body: { action: "verify", md5 } });
    if (error) throw error;
    if (data && data.profile) { state.profile = data.profile; emit(); }
    return data;
  }

  root.Cloud = {
    state, RANKS, init, onChange: (f) => { listeners.add(f); return () => listeners.delete(f); },
    enabled: () => state.enabled,
    isGuest: () => !state.user || isAnon(state.user),
    canReport: () => !!(state.enabled && state.user),
    normalizePhone, sendPhoneCode, verifyPhoneCode, signInGoogle, handleDeepLink, signOut,
    updatePrefs, startTrial, isPro, daysLeft, rank, loadProfile,
    fetchIncidents, subscribeIncidents, report, vote, createKhqr, verifyKhqr, claimPayment,
  };
})(typeof self !== "undefined" ? self : this);
