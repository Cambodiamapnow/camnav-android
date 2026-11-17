#!/usr/bin/env python3
"""Make the natural Khmer voice clips for CamNAV.

The phrase list lives in app/src/main/assets/js/voiceclips.js (PHRASES).
For every phrase this script makes sure app/src/main/assets/voice/km/<id>.mp3 exists:
  1. a file you added yourself (recorded or AI-generated) always wins;
  2. else a copy from the build cache (.voice-cache/);
  3. else it is generated with Azure neural text-to-speech, if AZURE_SPEECH_KEY is set.
Then it writes voice/km/manifest.json listing the clips the app may use, plus
voice/km/SCRIPT.csv (the full script, for recording or other AI voice tools).

Environment: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (default southeastasia),
KHMER_VOICE (default km-KH-SreymomNeural; or km-KH-PisethNeural), KHMER_VOICE_RATE (default +0%).
"""
import csv, hashlib, json, os, shutil, subprocess, sys, time, urllib.request, urllib.error
from xml.sax.saxutils import escape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "app", "src", "main", "assets")
OUT = os.path.join(ASSETS, "voice", "km")
CACHE = os.path.join(ROOT, ".voice-cache")
KEY = os.environ.get("AZURE_SPEECH_KEY", "").strip()
REGION = os.environ.get("AZURE_SPEECH_REGION", "southeastasia").strip() or "southeastasia"
VOICE = os.environ.get("KHMER_VOICE", "km-KH-SreymomNeural").strip() or "km-KH-SreymomNeural"
RATE = os.environ.get("KHMER_VOICE_RATE", "+0%").strip() or "+0%"


def phrases():
    js = os.path.join(ASSETS, "js", "voiceclips.js")
    out = subprocess.check_output(["node", "-e", f"process.stdout.write(JSON.stringify(require({json.dumps(js)}).PHRASES))"])
    return json.loads(out)


def synth(text):
    ssml = (f"<speak version='1.0' xml:lang='km-KH'><voice name='{VOICE}'>"
            f"<prosody rate='{RATE}'>{escape(text)}</prosody></voice></speak>")
    req = urllib.request.Request(
        f"https://{REGION}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"), method="POST",
        headers={"Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/ssml+xml",
                 "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "CamNAV-build"})
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503):  # free tier is rate limited: wait and retry
                time.sleep(5 * (attempt + 1)); continue
            raise SystemExit(f"Azure TTS error {e.code}: {e.read()[:300]!r} (check AZURE_SPEECH_KEY / AZURE_SPEECH_REGION)")
    raise SystemExit("Azure TTS kept failing (rate limit)")


def main():
    os.makedirs(OUT, exist_ok=True)
    cache_dir = os.path.join(CACHE, VOICE + RATE.replace("%", "pct"))
    os.makedirs(cache_dir, exist_ok=True)
    ps = phrases()
    made = reused = own = missing = 0
    for p in ps:
        dst = os.path.join(OUT, p["id"] + ".mp3")
        cached = os.path.join(cache_dir, p["id"] + "__" + hashlib.md5(p["km"].encode("utf-8")).hexdigest()[:10] + ".mp3")
        if os.path.exists(dst) and not os.path.exists(dst + ".generated"):
            own += 1; continue
        if os.path.exists(cached):
            shutil.copyfile(cached, dst); open(dst + ".generated", "w").close(); reused += 1; continue
        if not KEY:
            missing += 1; continue
        audio = synth(p["km"])
        with open(cached, "wb") as f: f.write(audio)
        shutil.copyfile(cached, dst); open(dst + ".generated", "w").close()
        made += 1
        time.sleep(0.4)
    # markers are build-only; keep them out of the APK
    for f in os.listdir(OUT):
        if f.endswith(".generated"): os.remove(os.path.join(OUT, f))
    have = [p["id"] for p in ps if os.path.exists(os.path.join(OUT, p["id"] + ".mp3"))]
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"voice": VOICE if (made or reused) else "custom", "clips": have}, f, ensure_ascii=False)
    with open(os.path.join(OUT, "SCRIPT.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f); w.writerow(["file_name", "khmer_text", "english_meaning"])
        for p in ps: w.writerow([p["id"] + ".mp3", p["km"], p["en"]])
    print(f"Khmer voice: {len(have)}/{len(ps)} clips ready "
          f"(your files {own}, generated {made}, from cache {reused}, missing {missing}) voice={VOICE}")
    if not KEY and missing:
        print("No AZURE_SPEECH_KEY secret: missing clips fall back to the phone's Khmer voice.")


if __name__ == "__main__":
    main()
