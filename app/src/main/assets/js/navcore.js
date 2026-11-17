/* CamNav — navigation core (no DOM). Works in the browser and in Node tests.
 * Route model, GPS snapping, off-route detection, and voice-prompt scheduling.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NavCore = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const R = 6371008.8; // earth radius, m
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;

  /** Distance in metres between [lon,lat] points. */
  function dist(a, b) {
    const dLat = toRad(b[1] - a[1]);
    const dLon = toRad(b[0] - a[0]);
    const s =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
  }

  /** Compass bearing 0..360 from a to b ([lon,lat]). */
  function bearing(a, b) {
    const y = Math.sin(toRad(b[0] - a[0])) * Math.cos(toRad(b[1]));
    const x =
      Math.cos(toRad(a[1])) * Math.sin(toRad(b[1])) -
      Math.sin(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.cos(toRad(b[0] - a[0]));
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  /** Signed smallest difference b - a in degrees, -180..180. */
  function angleDiff(a, b) {
    return ((b - a + 540) % 360) - 180;
  }

  /** Project point p onto segment a-b in a local flat frame. Returns {t, d}. */
  function projectOnSegment(p, a, b) {
    const kx = Math.cos(toRad(p[1])) * 111320;
    const ky = 110540;
    const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky;
    const bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    let t = len2 > 0 ? -(ax * dx + ay * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + t * dx, py = ay + t * dy;
    return { t, d: Math.sqrt(px * px + py * py) };
  }

  /**
   * Build a route from one OSRM route object (geometries=geojson, steps=true).
   * Returns { coords, cum, total, duration, steps[] } where each step has
   * { type, modifier, exit, name, ref, at (metres from start), location }.
   */
  function buildRoute(osrmRoute) {
    const coords = osrmRoute.geometry.coordinates.slice();
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + dist(coords[i - 1], coords[i]));
    const total = cum[cum.length - 1];

    const raw = [];
    for (const leg of osrmRoute.legs || []) for (const s of leg.steps || []) raw.push(s);

    // Place every maneuver along the polyline by projecting its location,
    // searching forward only so loops and U-turns stay in order.
    const steps = [];
    let from = 0;
    for (const s of raw) {
      const loc = s.maneuver.location;
      let best = { d: Infinity, at: 0, i: from };
      for (let i = from; i < coords.length - 1; i++) {
        const pr = projectOnSegment(loc, coords[i], coords[i + 1]);
        if (pr.d < best.d) best = { d: pr.d, at: cum[i] + pr.t * (cum[i + 1] - cum[i]), i };
        if (best.d < 1 && i > best.i + 5) break;
      }
      from = best.i;
      steps.push({
        type: s.maneuver.type,
        modifier: s.maneuver.modifier || "",
        exit: s.maneuver.exit || 0,
        name: s.name || "",
        ref: s.ref || "",
        at: s.maneuver.type === "arrive" ? total : best.at,
        location: loc,
        length: s.distance || 0,
      });
    }
    return { coords, cum, total, duration: osrmRoute.duration || 0, distance: osrmRoute.distance || total, steps };
  }

  /**
   * Snap a GPS fix to the route. Searches near the previous index first
   * (forward-biased) and falls back to the whole line.
   * Returns { along, off, idx, routeBearing }.
   */
  function snap(route, p, prevIdx) {
    const { coords, cum } = route;
    const n = coords.length;
    const scan = (lo, hi) => {
      let best = { off: Infinity, idx: lo, along: 0 };
      for (let i = Math.max(0, lo); i < Math.min(n - 1, hi); i++) {
        const pr = projectOnSegment(p, coords[i], coords[i + 1]);
        if (pr.d < best.off) best = { off: pr.d, idx: i, along: cum[i] + pr.t * (cum[i + 1] - cum[i]) };
      }
      return best;
    };
    let best = prevIdx == null ? scan(0, n) : scan(prevIdx - 3, prevIdx + 60);
    if (best.off > 60) {
      const all = scan(0, n);
      if (all.off < best.off) best = all;
    }
    best.routeBearing = bearing(coords[best.idx], coords[Math.min(n - 1, best.idx + 1)]);
    return best;
  }

  /** Point on the route `along` metres from the start, plus bearing. */
  function pointAt(route, along) {
    const { coords, cum, total } = route;
    const a = Math.max(0, Math.min(total, along));
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= a) lo = mid; else hi = mid;
    }
    const segLen = cum[hi] - cum[lo] || 1;
    const t = (a - cum[lo]) / segLen;
    const p = [
      coords[lo][0] + (coords[hi][0] - coords[lo][0]) * t,
      coords[lo][1] + (coords[hi][1] - coords[lo][1]) * t,
    ];
    return { p, bearing: bearing(coords[lo], coords[hi]), idx: lo };
  }

  /** Index of the next maneuver after `along` (skips the depart step). */
  function nextStepIndex(route, along) {
    for (let i = 1; i < route.steps.length; i++) {
      if (route.steps[i].at > along + 5) return i;
    }
    return route.steps.length - 1;
  }

  /** Map an OSRM maneuver to a simple icon / ESP32 id. */
  function iconOf(step) {
    if (!step) return "straight";
    const t = step.type, m = step.modifier;
    if (t === "arrive") return "arrive";
    if (t === "depart") return "straight";
    if (t === "roundabout" || t === "rotary" || t === "roundabout turn" || t === "exit roundabout" || t === "exit rotary")
      return "roundabout";
    if (m === "uturn") return "uturn";
    if (m === "sharp left" || m === "left") return "left";
    if (m === "sharp right" || m === "right") return "right";
    if (m === "slight left") return "slight-left";
    if (m === "slight right") return "slight-right";
    return "straight";
  }

  const ESP_ID = { straight: 0, left: 1, right: 2, "slight-left": 3, "slight-right": 4, uturn: 5, roundabout: 6, arrive: 7 };

  /**
   * Decide which voice prompt (if any) to speak for the next maneuver.
   * stages: "far" (early heads-up), "near" (prepare), "now" (act).
   * `spoken` is a Set of "stepIdx:stage" keys already said.
   */
  function promptFor(route, stepIdx, distToStep, speedMs, spoken) {
    const step = route.steps[stepIdx];
    if (!step) return null;
    const v = Math.max(speedMs || 0, 5); // assume at least ~18 km/h
    const nowAt = Math.min(80, Math.max(25, v * 4));
    const nearAt = Math.min(400, Math.max(150, v * 12));
    const farAt = v > 19 ? 1500 : v > 11 ? 800 : 500;
    const prev = route.steps[stepIdx - 1];
    const legLen = prev ? step.at - prev.at : step.at;

    const key = (s) => stepIdx + ":" + s;
    if (step.type === "arrive") {
      if (distToStep <= Math.max(20, v * 2) && !spoken.has(key("now"))) return { stage: "now", withDist: false };
      if (distToStep <= nearAt && distToStep > nowAt && !spoken.has(key("near")) && legLen > nearAt)
        return { stage: "near", withDist: true };
      return null;
    }
    if (distToStep <= nowAt) {
      return spoken.has(key("now")) ? null : { stage: "now", withDist: false };
    }
    if (distToStep <= nearAt) {
      if (spoken.has(key("near")) || spoken.has(key("now"))) return null;
      return { stage: "near", withDist: true };
    }
    if (distToStep <= farAt && legLen > farAt * 1.2) {
      if (spoken.has(key("far")) || spoken.has(key("near"))) return null;
      return { stage: "far", withDist: true };
    }
    return null;
  }

  /** Round a distance for speech/display: 10 m steps <100, 50 m <1000, 0.1 km after. */
  function roundDist(m) {
    if (m < 100) return { v: Math.max(10, Math.round(m / 10) * 10), unit: "m" };
    if (m < 975) return { v: Math.round(m / 50) * 50, unit: "m" };
    if (m < 10000) return { v: Math.round(m / 100) / 10, unit: "km" };
    return { v: Math.round(m / 1000), unit: "km" };
  }

  /**
   * Off-route tracker: true once we've been far from the line for N fixes.
   */
  function makeOffRouteTracker(limitM = 45, needed = 3) {
    let count = 0;
    return {
      update(off, accuracy) {
        const lim = Math.max(limitM, (accuracy || 0) * 1.5);
        count = off > lim ? count + 1 : 0;
        return count >= needed;
      },
      reset() { count = 0; },
    };
  }

  /** Thin the route to ≤ max points (keeps first/last), for BLE windows. */
  function decimate(points, max) {
    if (points.length <= max) return points.slice();
    const out = [];
    const step = (points.length - 1) / (max - 1);
    for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
    return out;
  }

  return {
    dist, bearing, angleDiff, projectOnSegment, buildRoute, snap, pointAt,
    nextStepIndex, iconOf, ESP_ID, promptFor, roundDist, makeOffRouteTracker, decimate,
  };
});
