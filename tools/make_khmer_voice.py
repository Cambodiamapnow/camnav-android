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
# ElevenLabs (preferred when set): natural voices; one voice for the main prompts,
# optional per-character voices ELEVEN_VOICE_TUKTUK_UNCLE, ELEVEN_VOICE_CARING_MOM, ...
ELEVEN_KEY = os.environ.get("ELEVENLABS_API_KEY", "").strip()
ELEVEN_MODEL = os.environ.get("ELEVEN_MODEL", "").strip() or "eleven_v4"
ELEVEN_VOICE = os.environ.get("ELEVEN_VOICE_ID", "").strip()
# how each character should sound (audio tags work on eleven_v3 / eleven_v4)
PACK_TAGS = {"standard": "", "tuktuk_uncle": "[cheerful] [joking] ", "caring_mom": "[warmly] [caring] ",
             "hype_coach": "[excited] [energetic] ", "grandpa": "[elderly voice] [slowly] ", "little_sister": "[cheerful] [high voice] "}


def eleven(text, voice_id, tags=""):
    body = json.dumps({"text": (tags if ELEVEN_MODEL in ("eleven_v3", "eleven_v4") else "") + text, "model_id": ELEVEN_MODEL}).encode("utf-8")
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_64",
                                 data=body, method="POST",
                                 headers={"xi-api-key": ELEVEN_KEY, "Content-Type": "application/json", "Accept": "audio/mpeg"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503):
                time.sleep(4 * (attempt + 1)); continue
            raise SystemExit(f"ElevenLabs error {e.code}: {e.read()[:300]!r} (check ELEVENLABS_API_KEY / voice id / model)")
    raise SystemExit("ElevenLabs kept failing (rate limit)")


def pack_voice(pack):
    return os.environ.get("ELEVEN_VOICE_" + pack.upper(), "").strip() or ELEVEN_VOICE


def engine_tag():
    return ("eleven-" + ELEVEN_MODEL + "-" + ELEVEN_VOICE) if (ELEVEN_KEY and ELEVEN_VOICE) else ("azure-" + VOICE + RATE)


def phrases():
    js = os.path.join(ASSETS, "js", "voiceclips.js")
    out = subprocess.check_output(["node", "-e", f"process.stdout.write(JSON.stringify(require({json.dumps(js)}).PHRASES))"])
    return json.loads(out)


def synth(text, voice=None, rate=None):
    voice, rate = voice or VOICE, rate or RATE
    ssml = (f"<speak version='1.0' xml:lang='km-KH'><voice name='{voice}'>"
            f"<prosody rate='{rate}'>{escape(text)}</prosody></voice></speak>")
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


# voice packs: which Azure voice reads each pack (your own recordings always win)
PACK_VOICES = {
    "standard": ("km-KH-SreymomNeural", "+0%"),
    "tuktuk_uncle": ("km-KH-PisethNeural", "+8%"),
    "caring_mom": ("km-KH-SreymomNeural", "-6%"),
    "hype_coach": ("km-KH-PisethNeural", "+12%"),
    "grandpa": ("km-KH-PisethNeural", "-12%"),
    "funny_guy": ("km-KH-PisethNeural", "+10%"),
    "war_chief": ("km-KH-PisethNeural", "-5%"),
    "monk": ("km-KH-PisethNeural", "-15%"),
    "little_sister": ("km-KH-SreymomNeural", "+10%"),
}


def pack_lines():
    js = os.path.join(ASSETS, "js", "voicepacks.js")
    out = subprocess.check_output(["node", "-e", f"process.stdout.write(JSON.stringify(require({json.dumps(js)}).allLines()))"])
    return json.loads(out)


def make_packs():
    lines = pack_lines()
    made = own = missing = 0
    have = []
    for l in lines:
        dst = os.path.join(ASSETS, l["file"])
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        voice, rate = PACK_VOICES.get(l["pack"], (VOICE, RATE))
        ev_voice = pack_voice(l["pack"]) if ELEVEN_KEY else ""
        key = ("eleven" + ELEVEN_MODEL + ev_voice + (l.get("say") or "")) if ev_voice else (voice + rate)
        cached = os.path.join(CACHE, "packs", l["pack"], l["event"] + "__" + hashlib.md5((key + l["km"]).encode()).hexdigest()[:10] + ".mp3")
        if os.path.exists(dst):
            own += 1
        elif os.path.exists(cached):
            shutil.copyfile(cached, dst); made += 1
        elif ev_voice or KEY:
            os.makedirs(os.path.dirname(cached), exist_ok=True)
            audio = eleven(l.get("say") or l["km"], ev_voice, "" if "[" in (l.get("say") or "") else PACK_TAGS.get(l["pack"], "")) if ev_voice else synth(l["km"], voice, rate)
            with open(cached, "wb") as f: f.write(audio)
            shutil.copyfile(cached, dst); made += 1
            time.sleep(0.4)
        else:
            missing += 1
        if os.path.exists(dst):
            have.append(l["file"])
    os.makedirs(os.path.join(ASSETS, "voice", "packs"), exist_ok=True)
    # each character's own recordings of the direction phrases (turns, distances, roundabouts, signs…)
    packs_dir = os.path.join(ASSETS, "voice", "packs")
    for pk in sorted(os.listdir(packs_dir)):
        cdir = os.path.join(packs_dir, pk, "clips")
        if os.path.isdir(cdir):
            for fn in sorted(os.listdir(cdir)):
                if fn.endswith(".mp3"): have.append(f"voice/packs/{pk}/clips/{fn}")
    with open(os.path.join(ASSETS, "voice", "packs", "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"files": have}, f, ensure_ascii=False)
    with open(os.path.join(ASSETS, "voice", "packs", "PACKS-SCRIPT.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f); w.writerow(["file_path", "pack", "event", "khmer_text"])
        for l in lines: w.writerow([l["file"], l["pack"], l["event"], l["km"]])
    print(f"Voice packs: {len(have)}/{len(lines)} clips ready (your files {own}, generated {made}, missing {missing})")


def main():
    os.makedirs(OUT, exist_ok=True)
    cache_dir = os.path.join(CACHE, engine_tag().replace("%", "pct"))
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
        if ELEVEN_KEY and ELEVEN_VOICE:
            audio = eleven(p["km"], ELEVEN_VOICE)
        elif KEY:
            audio = synth(p["km"])
        else:
            missing += 1; continue
        with open(cached, "wb") as f: f.write(audio)
        shutil.copyfile(cached, dst); open(dst + ".generated", "w").close()
        made += 1
        time.sleep(0.4)
    # markers are build-only; keep them out of the APK
    for f in os.listdir(OUT):
        if f.endswith(".generated"): os.remove(os.path.join(OUT, f))
    have = [p["id"] for p in ps if os.path.exists(os.path.join(OUT, p["id"] + ".mp3"))]
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"voice": engine_tag() if (made or reused) else "custom", "clips": have}, f, ensure_ascii=False)
    with open(os.path.join(OUT, "SCRIPT.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f); w.writerow(["file_name", "khmer_text", "english_meaning"])
        for p in ps: w.writerow([p["id"] + ".mp3", p["km"], p["en"]])
    print(f"Khmer voice: {len(have)}/{len(ps)} clips ready "
          f"(your files {own}, generated {made}, from cache {reused}, missing {missing}) voice={VOICE}")
    if not KEY and not ELEVEN_KEY and missing:
        print("No AZURE_SPEECH_KEY secret: missing clips fall back to the phone's Khmer voice.")


if __name__ == "__main__":
    main()
    make_packs()
