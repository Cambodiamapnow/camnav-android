#!/usr/bin/env python3
"""check_rng.py — sanity-check a Cambodia RNG2 routing graph (CamNAV).

Loads the whole RNG2 file, snaps a few Cambodian cities to their nearest
junction, and runs Dijkstra from Phnom Penh to show which cities are reachable
and the estimated drive time (graph weights are 0.1 s units).

Usage: check_rng.py routing.rng
"""
import heapq
import struct
import sys

import numpy as np

CITIES = {
    "Phnom Penh (Independence Monument)": (11.5564, 104.9282),
    "Siem Reap": (13.3633, 103.8564),
    "Battambang": (13.0957, 103.2022),
    "Sihanoukville": (10.6253, 103.5234),
    "Kampot": (10.6104, 104.1815),
    "Kampong Cham": (11.9934, 105.4635),
    "Poipet": (13.6581, 102.5650),
    "Bavet": (11.0636, 106.1250),
}


def load(path):
    f = open(path, "rb")
    magic, ver, N, E, mnla, mnlo, mxla, mxlo, cell = struct.unpack("<4sIIIiiiiI", f.read(36))
    if magic != b"RNG2":
        sys.exit(f"expected RNG2, got {magic!r}")
    gw, gh = struct.unpack("<HH", f.read(4))
    cnf = np.fromfile(f, dtype="<u4", count=gw * gh + 1)
    lat = np.fromfile(f, dtype="<i4", count=N)
    lon = np.fromfile(f, dtype="<i4", count=N)
    first = np.fromfile(f, dtype="<u4", count=N + 1)
    to = np.fromfile(f, dtype="<u4", count=E)
    w = np.fromfile(f, dtype="<u2", count=E)
    rest = f.read()
    return dict(N=N, E=E, gw=gw, gh=gh, cell=cell, bbox=(mnla, mnlo, mxla, mxlo),
                cnf=cnf, lat=lat, lon=lon, first=first, to=to, w=w, trailing=len(rest))


def main():
    g = load(sys.argv[1])
    N, E = g["N"], g["E"]
    lat, lon, first, to, w = g["lat"], g["lon"], g["first"], g["to"], g["w"]
    print(f"RNG2: N={N:,} junctions, E={E:,} edges, grid {g['gw']}x{g['gh']} "
          f"cells of {g['cell']/1e7:.3f} deg, trailing bytes={g['trailing']}")
    # structural checks
    assert g["trailing"] == 0, "file has unexpected trailing bytes"
    assert int(first[-1]) == E, "CSR first[N] != E"
    assert int(g["cnf"][-1]) == N, "cell table does not cover all nodes"
    assert int(to.max()) < N, "edge target out of range"
    mnla, mnlo, mxla, mxlo = g["bbox"]
    print(f"bbox lat {mnla/1e7:.4f}..{mxla/1e7:.4f}  lon {mnlo/1e7:.4f}..{mxlo/1e7:.4f}")

    def nearest(la, lo):
        d = (lat / 1e7 - la) ** 2 + (lon / 1e7 - lo) ** 2
        i = int(np.argmin(d))
        return i, float(np.sqrt(d[i])) * 111000

    src_name = next(iter(CITIES))
    src, off = nearest(*CITIES[src_name])
    # Dijkstra over the whole country graph
    dist = np.full(N, np.iinfo(np.int64).max, dtype=np.int64)
    dist[src] = 0
    pq = [(0, src)]
    first_l, to_l, w_l = first.tolist(), to.tolist(), w.tolist()
    seen = 0
    while pq:
        d, u = heapq.heappop(pq)
        if d != dist[u]:
            continue
        seen += 1
        for k in range(first_l[u], first_l[u + 1]):
            v = to_l[k]
            nd = d + w_l[k]
            if nd < dist[v]:
                dist[v] = nd
                heapq.heappush(pq, (nd, v))
    print(f"reachable from {src_name}: {seen:,} of {N:,} junctions ({100*seen/N:.1f}%)")
    ok = True
    for name, (la, lo) in CITIES.items():
        i, off = nearest(la, lo)
        if dist[i] == np.iinfo(np.int64).max:
            print(f"  {name:38s} NOT reachable (nearest junction {off:.0f} m away)")
            ok = False
        else:
            mins = dist[i] / 10 / 60
            print(f"  {name:38s} {int(mins//60)} h {int(mins%60):02d} min  (snap {off:.0f} m)")
    if not ok:
        sys.exit("some cities are not reachable — check the graph")
    print("CHECK OK")


if __name__ == "__main__":
    main()
