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
      `node(around:${Math.ceil(stepM / 2) + 35},${line})["highway"~"^(speed_camera|traffic_signals|stop|give_way|crossing)$"];` +
      `node(around:${Math.ceil(stepM / 2) + 25},${line})["traffic_calming"]["traffic_calming"!="no"];` +
      `node(around:${Math.ceil(stepM / 2) + 30},${line})["railway"="level_crossing"];` +
      `node(around:${Math.ceil(stepM / 2) + 30},${line})["hazard"];` +
      `nwr(around:${Math.ceil(stepM / 2) + 40},${line})["barrier"="toll_booth"];` +
      `nwr(around:${Math.ceil(stepM / 2) + 90},${line})["amenity"~"^(school|kindergarten)$"];` +
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
    const out = { limits: [], classes: [], junctions: [], cameras: [], signals: [],
      bumps: [], signs: [], crossings: [], rail: [], tolls: [], schools: [], hazards: [], noOvertake: [] };
    const centre = (el) => {
      if (el.type === "node") return [el.lon, el.lat];
      if (el.center) return [el.center.lon, el.center.lat];
      if (el.geometry && el.geometry.length) {
        let x = 0, y = 0; for (const q of el.geometry) { x += q.lon; y += q.lat; }
        return [x / el.geometry.length, y / el.geometry.length];
      }
      return null;
    };
    for (const el of (data && data.elements) || []) {
      const tags = el.tags || {};
      // point-like features (also schools / toll booths mapped as areas)
      if (el.type === "node" || tags.amenity === "school" || tags.amenity === "kindergarten" || tags.barrier === "toll_booth") {
        const p = centre(el);
        if (!p) continue;
        const loc = locate(route, grid, p);
        if (!loc) continue;
        const item = { id: "osm" + el.type[0] + el.id, along: loc.along, lon: p[0], lat: p[1] };
        if (tags.highway === "speed_camera" && loc.off < 40) out.cameras.push(Object.assign(item, { v: parseMaxspeed(tags.maxspeed) }));
        else if (tags.highway === "traffic_signals" && loc.off < 25) out.signals.push(item);
        else if ((tags.highway === "stop" || tags.highway === "give_way") && loc.off < 20) out.signs.push(Object.assign(item, { kind: tags.highway }));
        else if (tags.traffic_calming && loc.off < 15) out.bumps.push(Object.assign(item, { kind: tags.traffic_calming }));
        else if (tags.railway === "level_crossing" && loc.off < 25) out.rail.push(item);
        else if (tags.barrier === "toll_booth" && loc.off < 60) out.tolls.push(item);
        else if ((tags.amenity === "school" || tags.amenity === "kindergarten") && loc.off < 120) out.schools.push(Object.assign(item, { name: tags["name:en"] || tags.name || "" }));
        else if (tags.hazard && loc.off < 40) out.hazards.push(Object.assign(item, { kind: tags.hazard }));
        else if (tags.highway === "crossing" && loc.off < 15) out.crossings.push(item);
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
        const ot = tags["overtaking:forward"] || tags.overtaking;
        if (ot === "no") out.noOvertake.push({ id: "o" + el.id, from: runFrom, to: runTo });
      } else if (touches) {
        // a side street meeting the route: used to tell town from open road
        const near = locs.filter((l) => l && l.off < 15).sort((x, y) => x.off - y.off)[0];
        if (near) out.junctions.push({ id: "j" + el.id, along: near.along });
      }
    }
    for (const k of POINT_KINDS.concat("junctions")) out[k].sort((a, b) => a.along - b.along);
    return out;
  }

  /** Fresh container for a route; add chunks with addChunk(). */
  const POINT_KINDS = ["cameras", "signals", "bumps", "signs", "crossings", "rail", "tolls", "schools", "hazards"];
  const ALL_KINDS = ["limits", "classes", "junctions", "noOvertake"].concat(POINT_KINDS);
  function create() {
    const r = { loadedTo: 0, loading: false };
    for (const k of ALL_KINDS) r[k] = [];
    return r;
  }
  function addChunk(road, chunk, loadedTo) {
    for (const k of ALL_KINDS) {
      if (!road[k]) road[k] = [];
      const have = new Set(road[k].map((x) => x.id).filter(Boolean));
      mergeInto(road, k, (chunk[k] || []).filter((x) => !x.id || !have.has(x.id)));
    }
    for (const k of POINT_KINDS.concat("junctions")) road[k].sort((a, b) => a.along - b.along);
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

  const MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
  async function overpass(q, endpoint) {
    const list = [endpoint].concat(MIRRORS).filter((u, i, a) => u && a.indexOf(u) === i);
    let err;
    for (const url of list) {
      try {
        const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) });
        if (res.ok) return await res.json();
        err = new Error("overpass " + res.status);
      } catch (e) { err = e; }
    }
    throw err || new Error("overpass");
  }

  async function load(route, road, fromAlong, toAlong, endpoint) {
    const q = buildQuery(route, fromAlong, toAlong);
    const data = await overpass(q, endpoint);
    route._grid = route._grid || buildGrid(route);
    addChunk(road, process(route, data, route._grid), toAlong);
    return road;
  }

  return { overpass, MIRRORS, DEFAULTS, POINT_KINDS, buildGrid, locate, buildQuery, parseMaxspeed, process, create, addChunk, limitAt, junctionDensity, load };
});
