/* CamNav — road information along the route, from OpenStreetMap (Overpass API):
 * speed limits (maxspeed), speed cameras, traffic lights. Falls back to
 * Cambodia's legal default limits when a road has no posted limit in OSM
 * (Land Traffic Law: towns 40 km/h for cars / 30 for motorbikes, outside towns 90,
 * motorways 100).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./navcore.js"));
  else root.RoadInfo = factory(root.NavCore);
})(typeof self !== "undefined" ? self : this, function (NC) {
  "use strict";

  const DEFAULTS = {
    car: { urban: 40, rural: 90, motorway: 100 },
    moto: { urban: 30, rural: 90, motorway: 100 },
  };
  const URBAN_CLASSES = /^(residential|living_street|service|unclassified|tertiary|tertiary_link|road)$/;
  const MAIN_CLASSES = /^(trunk|trunk_link|primary|primary_link|secondary|secondary_link)$/;

  // ---------- spatial grid over the route so matching stays fast ----------
  const CELL = 0.002; // degrees (~220 m)
  function buildGrid(route) {
    const g = new Map();
    const key = (x, y) => x + ":" + y;
    for (let i = 0; i < route.coords.length - 1; i++) {
      const a = route.coords[i], b = route.coords[i + 1];
      const x0 = Math.floor(Math.min(a[0], b[0]) / CELL), x1 = Math.floor(Math.max(a[0], b[0]) / CELL);
      const y0 = Math.floor(Math.min(a[1], b[1]) / CELL), y1 = Math.floor(Math.max(a[1], b[1]) / CELL);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
        const k = key(x, y);
        if (!g.has(k)) g.set(k, []);
        g.get(k).push(i);
      }
    }
    return { g, key };
  }

  /** Nearest point on the route to p. Returns {along, off, seg} or null if far (>1 cell). */
  function locate(route, grid, p) {
    const cx = Math.floor(p[0] / CELL), cy = Math.floor(p[1] / CELL);
    let best = null;
    const seen = new Set();
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const list = grid.g.get(grid.key(cx + dx, cy + dy));
      if (!list) continue;
      for (const i of list) {
        if (seen.has(i)) continue;
        seen.add(i);
        const pr = NC.projectOnSegment(p, route.coords[i], route.coords[i + 1]);
        if (!best || pr.d < best.off) {
          best = { off: pr.d, seg: i, along: route.cum[i] + pr.t * (route.cum[i + 1] - route.cum[i]) };
        }
      }
    }
    return best;
  }

  /** Overpass QL for everything we need near the route between two distances. */
  function buildQuery(route, fromAlong, toAlong) {
    const pts = [];
    const stepM = Math.max(120, (toAlong - fromAlong) / 220); // ≤ ~220 sample points
    for (let a = Math.max(0, fromAlong); a <= Math.min(route.total, toAlong); a += stepM) {
      const p = NC.pointAt(route, a).p;
      pts.push(p[1].toFixed(5) + "," + p[0].toFixed(5));
    }
    const end = NC.pointAt(route, Math.min(route.total, toAlong)).p;
    pts.push(end[1].toFixed(5) + "," + end[0].toFixed(5));
    const line = pts.join(",");
    return "[out:json][timeout:25];(" +
      `way(around:${Math.ceil(stepM / 2) + 15},${line})["highway"]["highway"!~"footway|path|cycleway|steps|pedestrian|track|bridleway|corridor|platform|proposed|construction"];` +
      `node(around:${Math.ceil(stepM / 2) + 35},${line})["highway"~"^(speed_camera|traffic_signals)$"];` +
      ");out tags geom qt;";
  }

  /** "40", "40 km/h", "25 mph", "KH:urban" → km/h number or null. */
  function parseMaxspeed(v) {
    if (!v) return null;
    const s = String(v).trim().toLowerCase();
    if (s === "kh:urban") return 40;
    if (s === "kh:rural") return 90;
    if (s === "kh:motorway") return 100;
    const m = s.match(/^(\d+(?:\.\d+)?)\s*(km\/h|kmh|kph|mph)?/);
    if (!m) return null;
    const n = parseFloat(m[1]);
    return m[2] === "mph" ? Math.round(n * 1.609) : Math.round(n);
  }

  function mergeInto(road, list, items) {
    for (const it of items) road[list].push(it);
  }

  /**
   * Turn an Overpass response into road info along the route.
   * Returns {limits:[{from,to,v}], classes:[{from,to,hw}], junctions:[along], cameras:[{along,lon,lat,v}], signals:[...]}
   */
  function process(route, data, grid) {
    grid = grid || buildGrid(route);
    const out = { limits: [], classes: [], junctions: [], cameras: [], signals: [] };
    for (const el of (data && data.elements) || []) {
      const tags = el.tags || {};
      if (el.type === "node") {
        const p = [el.lon, el.lat];
        const loc = locate(route, grid, p);
        if (!loc) continue;
        if (tags.highway === "speed_camera" && loc.off < 40) {
          out.cameras.push({ id: "osm" + el.id, along: loc.along, lon: el.lon, lat: el.lat, v: parseMaxspeed(tags.maxspeed) });
        } else if (tags.highway === "traffic_signals" && loc.off < 25) {
          out.signals.push({ id: "osm" + el.id, along: loc.along, lon: el.lon, lat: el.lat });
        }
        continue;
      }
      if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
      // Which parts of this way run ALONG the route (close + same direction)?
      const g = el.geometry.map((q) => [q.lon, q.lat]);
      const locs = g.map((p) => locate(route, grid, p));
      let runFrom = null, runTo = null, touches = false;
      for (let i = 0; i < g.length - 1; i++) {
        const a = locs[i], b = locs[i + 1];
        if (a && a.off < 15) touches = true;
        if (b && b.off < 15) touches = true;
        if (!a || !b || a.off > 12 || b.off > 12) continue;
        // sample along the way segment: every sample must sit on the route,
        // and the route must run the same way at the middle (not a crossing)
        const len = NC.dist(g[i], g[i + 1]);
        const n = Math.max(2, Math.ceil(len / 40));
        let okRun = true, lo = Infinity, hi = -Infinity, mid = null;
        for (let k = 0; k <= n; k++) {
          const f = k / n;
          const q = [g[i][0] + (g[i + 1][0] - g[i][0]) * f, g[i][1] + (g[i + 1][1] - g[i][1]) * f];
          const l = locate(route, grid, q);
          if (!l || l.off > 12) { okRun = false; break; }
          lo = Math.min(lo, l.along); hi = Math.max(hi, l.along);
          if (k === Math.floor(n / 2)) mid = l;
        }
        if (!okRun || !mid || hi - lo < 1) continue;
        const wb = NC.bearing(g[i], g[i + 1]);
        const rb = NC.bearing(route.coords[mid.seg], route.coords[mid.seg + 1]);
        const diff = Math.abs(NC.angleDiff(wb, rb));
        if (diff > 35 && diff < 145) continue; // crossing, not following
        runFrom = runFrom == null ? lo : Math.min(runFrom, lo);
        runTo = runTo == null ? hi : Math.max(runTo, hi);
      }
      if (runFrom != null && runTo - runFrom > 5) {
        const v = parseMaxspeed(tags["maxspeed:forward"] || tags.maxspeed);
        if (v) out.limits.push({ id: "w" + el.id, from: runFrom, to: runTo, v });
        out.classes.push({ id: "w" + el.id, from: runFrom, to: runTo, hw: tags.highway });
      } else if (touches) {
        // a side street meeting the route: used to tell town from open road
        const near = locs.filter((l) => l && l.off < 15).sort((x, y) => x.off - y.off)[0];
        if (near) out.junctions.push({ id: "j" + el.id, along: near.along });
      }
    }
    out.junctions.sort((a, b) => a.along - b.along);
    out.cameras.sort((a, b) => a.along - b.along);
    out.signals.sort((a, b) => a.along - b.along);
    return out;
  }

  /** Fresh container for a route; add chunks with addChunk(). */
  function create() {
    return { limits: [], classes: [], junctions: [], cameras: [], signals: [], loadedTo: 0, loading: false };
  }
  function addChunk(road, chunk, loadedTo) {
    for (const k of ["limits", "classes", "junctions", "cameras", "signals"]) {
      const have = new Set(road[k].map((x) => x.id).filter(Boolean));
      mergeInto(road, k, chunk[k].filter((x) => !x.id || !have.has(x.id)));
    }
    road.junctions.sort((a, b) => a.along - b.along);
    road.cameras.sort((a, b) => a.along - b.along);
    road.signals.sort((a, b) => a.along - b.along);
    road.loadedTo = Math.max(road.loadedTo, loadedTo);
  }

  /** Side streets per km within ±400 m of `along`. */
  function junctionDensity(road, along) {
    let n = 0;
    for (const j of road.junctions) if (Math.abs(j.along - along) <= 400) n++;
    return n / 0.8;
  }

  /**
   * Speed limit at `along`. Returns {v, est} — est=true when it is the legal
   * default guessed from the road type (no posted limit in OSM), or null.
   */
  function limitAt(road, along, vehicle) {
    if (!road) return null;
    let best = null;
    for (const l of road.limits) {
      if (along >= l.from - 3 && along <= l.to + 3 && (!best || l.to - l.from < best.to - best.from)) best = l;
    }
    if (best) return { v: best.v, est: false };
    let cls = null;
    for (const c of road.classes) {
      if (along >= c.from - 3 && along <= c.to + 3 && (!cls || c.to - c.from < cls.to - cls.from)) cls = c;
    }
    if (!cls) return null;
    const d = DEFAULTS[vehicle === "moto" ? "moto" : "car"];
    if (/^motorway/.test(cls.hw)) return { v: cls.hw === "motorway_link" ? 60 : d.motorway, est: true };
    if (URBAN_CLASSES.test(cls.hw)) return { v: d.urban, est: true };
    if (MAIN_CLASSES.test(cls.hw)) return { v: junctionDensity(road, along) >= 6 ? d.urban : d.rural, est: true };
    return null;
  }

  async function load(route, road, fromAlong, toAlong, endpoint) {
    const q = buildQuery(route, fromAlong, toAlong);
    const res = await fetch(endpoint || "https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!res.ok) throw new Error("overpass " + res.status);
    const data = await res.json();
    route._grid = route._grid || buildGrid(route);
    addChunk(road, process(route, data, route._grid), toAlong);
    return road;
  }

  return { DEFAULTS, buildGrid, locate, buildQuery, parseMaxspeed, process, create, addChunk, limitAt, junctionDensity, load };
});
