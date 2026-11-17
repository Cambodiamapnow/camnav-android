/* CamNav — speech output using the phone's text-to-speech (Web Speech API).
 * Khmer uses a km-KH voice when the phone has one (Google TTS → Khmer).
 */
(function (root) {
  "use strict";
  const synth = root.speechSynthesis;
  let voices = [];
  let kmVoice = null, enVoice = null;
  let rate = 1.0;
  let muted = false;
  const listeners = [];

  function pick() {
    if (!synth) return;
    voices = synth.getVoices() || [];
    const byLang = (re) => voices.filter((v) => re.test((v.lang || "").replace("_", "-")));
    const prefer = (list) =>
      list.find((v) => /google/i.test(v.name)) ||
      list.find((v) => v.localService) ||
      list[0] || null;
    kmVoice = prefer(byLang(/^km(-|$)/i));
    enVoice = prefer(byLang(/^en-(US|GB|AU|IN)/i)) || prefer(byLang(/^en/i));
    listeners.forEach((f) => f());
  }
  if (synth) {
    pick();
    if ("onvoiceschanged" in synth) synth.onvoiceschanged = pick;
    // Some Android builds only fill the list after a delay
    setTimeout(pick, 500);
    setTimeout(pick, 2000);
  }

  function utter(text, lang) {
    const u = new SpeechSynthesisUtterance(text);
    if (lang === "km") {
      u.lang = "km-KH";
      if (kmVoice) u.voice = kmVoice;
    } else {
      u.lang = (enVoice && enVoice.lang) || "en-US";
      if (enVoice) u.voice = enVoice;
    }
    u.rate = rate;
    u.pitch = 1;
    return u;
  }

  /**
   * Speak. `parts` is [{text, lang}] spoken in order. `interrupt` cancels
   * whatever is being said (used for urgent "turn now" prompts).
   */
  function say(parts, interrupt) {
    if (!synth || muted || !parts || !parts.length) return;
    if (interrupt) synth.cancel();
    for (const p of parts) if (p.text) synth.speak(utter(p.text, p.lang));
  }

  // Android Chrome sometimes stalls the queue after ~15 s; nudge it.
  if (synth) setInterval(() => { if (synth.speaking && synth.paused) synth.resume(); }, 5000);

  // ---- Android app: speak through the native TextToSpeech bridge (WebView has no speechSynthesis)
  const native = root.AndroidTTS;
  if (native) {
    root.Voice = {
      supported: true,
      say(parts, interrupt) {
        if (muted || !parts || !parts.length) return;
        parts.forEach((p, i) => { if (p.text) native.speak(p.text, p.lang, !!interrupt && i === 0, rate); });
      },
      hasKhmer: () => { try { return native.hasLang("km"); } catch { return false; } },
      hasEnglish: () => true,
      voiceNames: () => ({ km: native.hasLang("km") ? "Android TTS (km)" : null, en: "Android TTS (en)" }),
      setRate: (r) => { rate = r; },
      setMuted: (m) => { muted = m; if (m) native.stop(); },
      isMuted: () => muted,
      onChange: (f) => listeners.push(f),
      _refresh: () => listeners.forEach((f) => f()),
      openSettings: () => native.openTtsSettings(),
      unlock: () => {},
      stop: () => native.stop(),
    };
    return;
  }

  root.Voice = {
    supported: !!synth,
    say,
    hasKhmer: () => !!kmVoice,
    hasEnglish: () => !!enVoice,
    voiceNames: () => ({ km: kmVoice && kmVoice.name, en: enVoice && enVoice.name }),
    setRate: (r) => { rate = r; },
    setMuted: (m) => { muted = m; if (m && synth) synth.cancel(); },
    isMuted: () => muted,
    onChange: (f) => listeners.push(f),
    /** Must be called from a tap once, so mobile browsers allow later speech. */
    unlock: () => {
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
    },
    stop: () => synth && synth.cancel(),
  };
})(typeof self !== "undefined" ? self : this);
