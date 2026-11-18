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
    if os.environ.get("ONLY") and pack not in os.environ["ONLY"].split(","):
        continue
    lens = [max(8, len(w["km"])) for w in want]
    best = None
    for noise in ("-42dB", "-38dB", "-34dB", "-46dB"):
        cand = [((s + e) / 2, e - s) for s, e in silences(src, noise, 0.18) if s > 0.3 and e < total - 0.3]
        m = len(cand)
        if m < n - 1: continue
        # dynamic programming: pick n-1 cut points so piece lengths follow the script and cuts sit in long pauses
        speech = total
        exp = [speech * l / sum(lens) for l in lens]
        pos = [0.0] + [c[0] for c in cand] + [total]
        gap = [0.0] + [c[1] for c in cand] + [0.0]
        INF = float("inf")
        # f[i][k]: best cost having finished line i (0-based) with its end at pos k
        f = [[INF] * (m + 2) for _ in range(n)]
        back = [[-1] * (m + 2) for _ in range(n)]
        def seg_cost(i, a, b):
            d = pos[b] - pos[a]; e = exp[i]
            return 4 * ((d - e) / e) ** 2
        for k in range(1, m + 2):
            f[0][k] = seg_cost(0, 0, k) - (2.5 * gap[k] if k <= m else 0)
        for i in range(1, n):
            for k in range(i + 1, m + 2):
                if i == n - 1 and k != m + 1: continue
                bonus = 2.5 * gap[k] if k <= m else 0
                bestv, bk = INF, -1
                for j in range(i, k):
                    v = f[i - 1][j]
                    if v == INF: continue
                    v += seg_cost(i, j, k) - bonus
                    if v < bestv: bestv, bk = v, j
                f[i][k], back[i][k] = bestv, bk
        if f[n - 1][m + 1] == INF: continue
        idx = [m + 1]
        for i in range(n - 1, 0, -1): idx.append(back[i][idx[-1]])
        idx.append(0); idx.reverse()
        segs = [(pos[idx[i]], pos[idx[i + 1]]) for i in range(n)]
        durs = [b - a for a, b in segs]
        c = corr(durs, lens)
        err = statistics.mean(abs(d - e) / e for d, e in zip(durs, exp))
        cutgaps = [gap[k] for k in idx[1:-1]]
        score = c - err
        print(f"  {pack} {noise}: cands={m} r={c:.2f} err={err:.2f} min_cut_pause={min(cutgaps):.2f}s")
        if best is None or score > best[0]: best = (score, segs, noise, c, err)
    if not best:
        report.append(f"{pack}: SKIPPED – found fewer pauses than the {n} lines"); continue
    _, segs, noise, c, err = best
    if c < 0.55 or err > 0.45:
        report.append(f"{pack}: SKIPPED – piece lengths don't match the script (r={c:.2f}, err={err:.2f})"); continue
    for (a, b), w in zip(segs, want):
        out = os.path.join(ASSETS, w["file"])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        # trim the silence at both ends of the piece, mono 64 kbps
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", src,
                        "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15",
                        "-ac", "1", "-b:a", "64k", out], check=True)
        ok_total += 1
    report.append(f"{pack}: {n} clips (match r={c:.2f}, err={err:.2f}, {noise})")

print("\n".join(report))
print(f"TOTAL {ok_total}/{len(lines)} clips")
