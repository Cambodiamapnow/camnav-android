/* CamNAV — speech output.
 * Two kinds of speech go through one queue so they never talk over each other:
 *  - recorded / AI-generated Khmer clips (voice/km/<id>.mp3) — natural voice
 *  - text-to-speech: Android TextToSpeech in the APK, Web Speech API in a browser
 */
(function (root) {
  "use strict";
  const native = root.AndroidTTS || null;
  const synth = root.speechSynthesis || null;
  let rate = 1.0, muted = false;
  const listeners = [];
  const changed = () => listeners.forEach((f) => { try { f(); } catch (e) {} });

  // ---------------- text-to-speech voices ----------------
  let kmVoice = null, enVoice = null;
  function pickWebVoices() {
    if (!synth) return;
    const vs = synth.getVoices() || [];
    const by = (re) => vs.filter((v) => re.test((v.lang || "").replace("_", "-")));
    const prefer = (l) => l.find((v) => /google/i.test(v.name)) || l.find((v) => v.localService) || l[0] || null;
    kmVoice = prefer(by(/^km(-|$)/i));
    enVoice = prefer(by(/^en-(US|GB|AU|IN)/i)) || prefer(by(/^en/i));
    changed();
  }
  if (!native && synth) {
    pickWebVoices();
    if ("onvoiceschanged" in synth) synth.onvoiceschanged = pickWebVoices;
    setTimeout(pickWebVoices, 500); setTimeout(pickWebVoices, 2000);
    setInterval(() => { if (synth.speaking && synth.paused) synth.resume(); }, 5000);
  }
  const hasKhmerTts = () => { try { return native ? native.hasLang("km") : !!kmVoice; } catch { return false; } };

  // ---------------- recorded Khmer clips ----------------
  const CLIP_DIR = "voice/km/";
  let clipSet = new Set();
  fetch(CLIP_DIR + "manifest.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : { clips: [] }))
    .then((m) => { (m.clips || []).forEach((c) => clipSet.add(c)); changed(); })
    .catch(() => {});
  // voice packs: voice/packs/manifest.json lists files like "voice/packs/tuktuk_uncle/arrived.mp3"
  fetch("voice/packs/manifest.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : { files: [] }))
    .then((m) => { (m.files || []).forEach((f) => clipSet.add(f)); changed(); })
    .catch(() => {});
  const hasClips = (ids) => !!ids && ids.length > 0 && ids.every((id) => clipSet.has(id));

  // ---------------- one queue for everything ----------------
  // item: {type:"clips", ids:[...]} | {type:"tts", text, lang}
  let queue = [], busy = false, current = null, gen = 0;
  const audio = typeof Audio !== "undefined" ? new Audio() : null;
  const ttsWaiters = new Map();

  function next() {
    if (muted || !queue.length) { busy = false; current = null; return; }
    busy = true;
    const item = queue.shift();
    current = item;
    const myGen = gen;
    const done = () => { if (myGen === gen) next(); };
    if (item.type === "clips") playClips(item.ids.slice(), done);
    else speakTts(item.text, item.lang, done, item.pitch, item.rate);
  }

  function playClips(ids, done) {
    if (!audio || !ids.length) return done();
    const id = ids.shift();
    audio.onended = () => playClips(ids, done);
    audio.onerror = () => playClips(ids, done);
    audio.src = id.indexOf("/") >= 0 ? id : CLIP_DIR + id + ".mp3";
    audio.playbackRate = Math.max(0.8, Math.min(1.3, rate));
    const p = audio.play();
    if (p && p.catch) p.catch(() => playClips(ids, done));
  }

  function speakTts(text, lang, done, pitch, rateOverride) {
    const r = rate * (rateOverride || 1), pt = pitch || 1;
    if (native) {
      const uid = "u" + Date.now() + Math.random().toString(36).slice(2, 6);
      ttsWaiters.set(uid, done);
      // safety net if the engine never reports back
      setTimeout(() => { if (ttsWaiters.has(uid)) { ttsWaiters.delete(uid); done(); } }, 1500 + text.length * 120);
      try {
        if (native.speakStyled) native.speakStyled(text, lang, false, r, uid, pt);
        else native.speak(text, lang, false, r, uid);
      } catch (e) { try { native.speak(text, lang, false, r); } catch (e2) {} }
      return;
    }
    if (!synth) return done();
    const u = new SpeechSynthesisUtterance(text);
    if (lang === "km") { u.lang = "km-KH"; if (kmVoice) u.voice = kmVoice; }
    else { u.lang = (enVoice && enVoice.lang) || "en-US"; if (enVoice) u.voice = enVoice; }
    u.rate = r; u.pitch = pt;
    let fired = false;
    const fin = () => { if (!fired) { fired = true; done(); } };
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, 2000 + text.length * 120);
    synth.speak(u);
  }

  function stop() {
    gen++; queue = []; busy = false; current = null;
    if (audio) { try { audio.pause(); } catch {} }
    if (native) { try { native.stop(); } catch {} } else if (synth) synth.cancel();
    ttsWaiters.clear();
  }

  /** parts: [{lang, text} | {lang, clips:[ids]}]. urgent cuts in front of anything playing. */
  function say(parts, urgent) {
    if (muted || !parts || !parts.length) return;
    if (urgent) stop();
    for (const p of parts) {
      if (p.clips && p.clips.length) queue.push({ type: "clips", ids: p.clips });
      else if (p.text) queue.push({ type: "tts", text: p.text, lang: p.lang, pitch: p.pitch, rate: p.rate });
    }
    if (!busy) next();
  }

  root.Voice = {
    supported: !!(native || synth || audio),
    say, stop,
    hasKhmer: hasKhmerTts,
    hasEnglish: () => (native ? true : !!enVoice),
    hasClips,
    clipCount: () => Array.from(clipSet).filter((c) => c.indexOf("/") < 0).length,
    hasFile: (path) => clipSet.has(path),
    voiceNames: () => (native
      ? { km: hasKhmerTts() ? "Android TTS (km)" : null, en: "Android TTS (en)" }
      : { km: kmVoice && kmVoice.name, en: enVoice && enVoice.name }),
    setRate: (r) => { rate = r; },
    setMuted: (m) => { muted = m; if (m) stop(); },
    isMuted: () => muted,
    onChange: (f) => listeners.push(f),
    openSettings: native && native.openTtsSettings ? () => native.openTtsSettings() : null,
    /** call from a tap once so mobile browsers allow audio later */
    unlock: () => {
      if (audio && !audio.src) { try { audio.muted = true; const p = audio.play(); if (p && p.catch) p.catch(() => {}); audio.muted = false; } catch {} }
      if (!native && synth) { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; synth.speak(u); }
    },
    // called by the Android app when a TTS utterance finishes
    _ttsDone: (uid) => { const f = ttsWaiters.get(uid); if (f) { ttsWaiters.delete(uid); f(); } },
    _refresh: changed,
  };
})(typeof self !== "undefined" ? self : this);
