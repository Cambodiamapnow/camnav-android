/* CamNav — optional link to the ESP32-S3 "NAV-OSM" car screen over Web Bluetooth.
 * Implements the binary frame format described in the ESP32_OSM_NAV project's
 * docs/ble-protocol.md: [0xAA 0x55] type len_lo len_hi payload (little-endian).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.CarScreen = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SVC = "5a7e1000-2b2f-4f66-9f9a-5c0f8e1a2b3c";
  const CHR = "5a7e1001-2b2f-4f66-9f9a-5c0f8e1a2b3c";
  const T = { ROUTE: 0x01, POS: 0x02, NAV: 0x03, ETA: 0x04, CLOCK: 0x05, ROUTE_CONT: 0x06, NAV2: 0x08, CAMERA: 0x09 };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v) || 0));
  const enc = new TextEncoder();

  function frame(type, payload) {
    const out = new Uint8Array(5 + payload.length);
    out[0] = 0xaa; out[1] = 0x55; out[2] = type;
    out[3] = payload.length & 0xff; out[4] = (payload.length >> 8) & 0xff;
    out.set(payload, 5);
    return out;
  }

  /** Short UTF-8 string ≤ maxBytes without cutting a character in half. */
  function shortBytes(s, maxBytes) {
    let b = enc.encode(s || "");
    while (b.length > maxBytes) { s = Array.from(s).slice(0, -1).join(""); b = enc.encode(s); }
    return b;
  }

  /** points: [[lon,lat],...] (2..256). */
  function encRoute(points, zoom = 15, cont = false) {
    const pts = points.slice(0, 256);
    const p = new Uint8Array(3 + 8 + (pts.length - 1) * 4);
    const v = new DataView(p.buffer);
    p[0] = zoom;
    v.setUint16(1, pts.length, true);
    let lat = Math.round(pts[0][1] * 1e7), lon = Math.round(pts[0][0] * 1e7);
    v.setInt32(3, lat, true);
    v.setInt32(7, lon, true);
    let o = 11;
    for (let i = 1; i < pts.length; i++) {
      // deltas in 1e5 units relative to the previous *reconstructed* point (no drift)
      const nl = Math.round(pts[i][1] * 1e7), no = Math.round(pts[i][0] * 1e7);
      const dl = clamp((nl - lat) / 100, -32768, 32767), dn = clamp((no - lon) / 100, -32768, 32767);
      v.setInt16(o, dl, true); v.setInt16(o + 2, dn, true); o += 4;
      lat += dl * 100; lon += dn * 100;
    }
    return frame(cont ? T.ROUTE_CONT : T.ROUTE, p);
  }

  function encPos(lon, lat, kmh, hdg, limit) {
    const p = new Uint8Array(12);
    const v = new DataView(p.buffer);
    v.setInt32(0, Math.round(lat * 1e7), true);
    v.setInt32(4, Math.round(lon * 1e7), true);
    p[8] = clamp(kmh, 0, 255);
    v.setUint16(9, ((Math.round(hdg) % 360) + 360) % 360, true);
    p[11] = clamp(limit || 0, 0, 255);
    return frame(T.POS, p);
  }

  function encNav(dist, modId, street, second = false) {
    const s = shortBytes(street, 60);
    const p = new Uint8Array(4 + s.length);
    new DataView(p.buffer).setUint16(0, clamp(dist, 0, 65535), true);
    p[2] = modId; p[3] = s.length; p.set(s, 4);
    return frame(second ? T.NAV2 : T.NAV, p);
  }

  function encEta(h, m, label) {
    const s = shortBytes(label, 60);
    const p = new Uint8Array(3 + s.length);
    p[0] = clamp(h, 0, 23); p[1] = clamp(m, 0, 59); p[2] = s.length; p.set(s, 3);
    return frame(T.ETA, p);
  }

  function encClock(h, m) { return frame(T.CLOCK, new Uint8Array([clamp(h, 0, 23), clamp(m, 0, 59)])); }

  function encCamera(dist, mobile) {
    const p = new Uint8Array(3);
    new DataView(p.buffer).setUint16(0, clamp(dist, 0, 65535), true);
    p[2] = mobile ? 1 : 0;
    return frame(T.CAMERA, p);
  }

  // ---------- connection (browser only) ----------
  let device = null, chr = null, queue = Promise.resolve();
  const listeners = [];
  const notify = () => listeners.forEach((f) => f(!!chr));

  async function connect() {
    if (!navigator.bluetooth) throw new Error("no-web-bluetooth");
    device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SVC] }, { namePrefix: "NAV-OSM" }],
      optionalServices: [SVC],
    });
    device.addEventListener("gattserverdisconnected", () => { chr = null; notify(); });
    const server = await device.gatt.connect();
    const svc = await server.getPrimaryService(SVC);
    chr = await svc.getCharacteristic(CHR);
    notify();
  }

  function disconnect() {
    if (device && device.gatt.connected) device.gatt.disconnect();
    chr = null; notify();
  }

  /** Queue writes (write-with-response needs one at a time); ≤500 B chunks. */
  function send(bytes) {
    if (!chr) return Promise.resolve();
    queue = queue.then(async () => {
      if (!chr) return;
      for (let i = 0; i < bytes.length; i += 500) {
        const part = bytes.slice(i, i + 500);
        if (chr.writeValueWithResponse) await chr.writeValueWithResponse(part);
        else await chr.writeValue(part);
      }
    }).catch((e) => console.warn("BLE write failed", e));
    return queue;
  }

  return {
    supported: () => typeof navigator !== "undefined" && !!navigator.bluetooth,
    connect, disconnect, send, isConnected: () => !!chr, onChange: (f) => listeners.push(f),
    encRoute, encPos, encNav, encEta, encClock, encCamera, frame,
  };
});
