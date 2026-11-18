#!/usr/bin/env python3
"""Download the long ElevenLabs recordings (one per voice character, lines separated by a long pause)
and cut them into one clip per line: app/src/main/assets/voice/packs/<pack>/<event>[_n].mp3.
The N-1 longest silences become the cut points. A pack is skipped (phone voice stays) when the
number of pieces or their lengths don't match the script."""
import json, os, re, subprocess, sys, urllib.request, statistics

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "app", "src", "main", "assets")
batch = json.load(open(os.path.join(ROOT, "tools", "eleven-batch.json"), encoding="utf-8"))
lines = json.loads(subprocess.check_output(["node", "-e", "process.stdout.write(JSON.stringify(require('./app/src/main/assets/js/voicepacks.js').allLines()))"], cwd=ROOT))
by_pack = {}
for l in lines: by_pack.setdefault(l["pack"], []).append(l)

def dur(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip())

def silences(path, noise="-38dB", d=0.3):
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", f"silencedetect=noise={noise}:d={d}", "-f", "null", "-"], capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return list(zip(st, en))

def corr(a, b):
    ma, mb = statistics.mean(a), statistics.mean(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    den = (sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b)) ** 0.5
    return num / den if den else 0

report, ok_total = [], 0
os.makedirs("/tmp/eleven", exist_ok=True)
for pack, info in batch.items():
    want = by_pack.get(pack, [])
    src = f"/tmp/eleven/{pack}.mp3"
    try:
        urllib.request.urlretrieve(info["url"], src)
    except Exception as e:
        report.append(f"{pack}: download failed ({e})"); continue
    total = dur(src)
    n = len(want)
    best = None
    for noise in ("-38dB", "-34dB", "-42dB", "-30dB"):
        sil = [(s, e) for s, e in silences(src, noise) if s > 0.2 and e < total - 0.2]
        if len(sil) < n - 1: continue
        cuts = sorted(sorted(sil, key=lambda x: x[1] - x[0], reverse=True)[: n - 1])
        bounds = [0.0] + [(s + e) / 2 for s, e in cuts] + [total]
        segs = [(bounds[i], bounds[i + 1]) for i in range(n)]
        c = corr([b - a for a, b in segs], [len(w["km"]) for w in want])
        if best is None or c > best[0]: best = (c, segs, noise)
    if not best:
        report.append(f"{pack}: SKIPPED – found fewer pauses than the {n} lines"); continue
    c, segs, noise = best
    if c < 0.6:
        report.append(f"{pack}: SKIPPED – piece lengths don't match the script (r={c:.2f})"); continue
    for (a, b), w in zip(segs, want):
        out = os.path.join(ASSETS, w["file"])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        # trim the silence at both ends of the piece, mono 64 kbps
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", src,
                        "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15",
                        "-ac", "1", "-b:a", "64k", out], check=True)
        ok_total += 1
    report.append(f"{pack}: {n} clips (match r={c:.2f}, {noise})")

print("\n".join(report))
print(f"TOTAL {ok_total}/{len(lines)} clips")
