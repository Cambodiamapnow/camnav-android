/* CamNAV – នាំផ្លូវ · "បើកបរដោយសុវត្ថិភាព" — Google-Maps-style navigation for Cambodia with Khmer + English voice.
 * Map: MapLibre GL + raster tiles · Search: Nominatim · Places & road data: Overpass
 * Routing: OSRM · Weather: Open-Meteo
 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const NC = window.NavCore, I = window.I18N, RI = window.RoadInfo, V = window.Voice, BLE = window.CarScreen, VC = window.VoiceClips;
  const CL = window.Cloud, VP = window.VoicePacks;

  // =====================================================================
  // settings & storage
  // =====================================================================
  const DEFAULTS = {
    voice: "km", kmVoice: "natural", lang: "km", rate: 1.0, headingUp: true, simKmh: 50, forceKm: false,
    tiles: "dark", nightAuto: true, vehicle: "car", speedWarn: 5,
    showSignals: true, showCameras: true, showReports: true, showSigns: true, reminders: true, chatter: true, voicePack: "standard",
    router: "https://router.project-osrm.org",
    overpass: "https://overpass-api.de/api/interpreter",
  };
  // Map pictures: free OpenStreetMap tiles (no key needed; Khmer street names drawn correctly).
  // "clean" softens the colours for a Google-like look, "dark" inverts them for night driving.
  const OSM = ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png", "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"];
  const HOT = ["https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", "https://b.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"];
  const ATTR = "© OpenStreetMap contributors";
  const TILES = {
    // vector styles (OpenFreeMap, no key) — see js/mapstyle.js
    dark: { vector: "dark", dark: true,
      thumb: "linear-gradient(90deg,transparent 44%,#a58a4c 44% 56%,transparent 56%),linear-gradient(0deg,transparent 38%,#14304d 38% 60%,transparent 60%),#1c232d" },
    light: { vector: "light",
      thumb: "linear-gradient(90deg,transparent 44%,#fbd38d 44% 56%,transparent 56%),linear-gradient(0deg,transparent 38%,#aadaff 38% 60%,transparent 60%),linear-gradient(135deg,#cfe6c4 0 22%,transparent 22%),#f3f1ec" },
    // raster OpenStreetMap: the only style with Khmer-script labels
    osm: { urls: OSM, max: 19, attr: ATTR, paint: {},
      thumb: "linear-gradient(90deg,transparent 44%,#fff 44% 56%,transparent 56%),linear-gradient(0deg,transparent 38%,#f7b29c 38% 52%,transparent 52%),linear-gradient(135deg,#add19e 0 22%,transparent 22%),#f2efe9" },
    hot: { urls: HOT, max: 19, attr: ATTR + " · HOT", paint: { "raster-saturation": -0.3 }, thumb: "#f2efe9" }, // automatic backup
  };
  const store = {
    get(k, d) { try { const v = localStorage.getItem("camnav." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("camnav." + k, JSON.stringify(v)); } catch {} },
  };
  const S = Object.assign({}, DEFAULTS, store.get("settings", {}));
  if (!(S.styleV >= 2)) { S.tiles = "dark"; S.styleV = 2; } // new CamNAV dark map becomes the default once
  if (!TILES[S.tiles] || S.tiles === "hot") S.tiles = "dark";
  const saveSettings = () => store.set("settings", S);
  const L = () => I.UI[S.lang] || I.UI.en;
  const t = (k) => (L()[k] != null ? L()[k] : I.UI.en[k] != null ? I.UI.en[k] : k);
  const num = (n) => (S.lang === "km" ? I.kmNum(n) : String(n));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const icon = (name, cls = "") => `<span class="msr ${cls}">${name}</span>`;

  let saved = store.get("saved", { home: null, work: null, favs: [] });
  let recent = store.get("recent", []);
  const saveSaved = () => store.set("saved", saved);

  // =====================================================================
  // state
  // =====================================================================
  const PHNOM_PENH = [104.9282, 11.5564];
  let view = "home";            // home | results | place | dirs | nav | arrived
  let fix = null, heading = 0, gotFirstFix = false;
  let results = [], resultMarkers = [], activeCat = null;
  let place = null, placeMarker = null, placeRoute = null;
  let routes = [], sel = 0, route = null, dest = null;
  let nav = null, sim = null, follow = true, wakeLock = null;
  let sheetCollapsed = false;

  // =====================================================================
  // map
  // =====================================================================
  let currentTiles = S.tiles;
  function styleFor(key) {
    const tl = TILES[key] || TILES.dark;
    document.documentElement.classList.toggle("theme-dark", !!tl.dark);
    if (tl.vector && window.MapStyles) return window.MapStyles.build(tl.vector);
    return {
      version: 8,
      sources: { base: { type: "raster", tiles: tl.urls, tileSize: 256, maxzoom: tl.max, attribution: tl.attr } },
      layers: [{ id: "base", type: "raster", source: "base", paint: Object.assign({ "raster-fade-duration": 150 }, tl.paint) }],
    };
  }
  const map = new maplibregl.Map({
    container: "map", style: styleFor(S.tiles), center: store.get("lastCenter", PHNOM_PENH), zoom: 13,
    attributionControl: false, pitchWithRotate: true, dragRotate: true, maxPitch: 65,
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-left");
  // if the OpenStreetMap tile server refuses us, switch to the Humanitarian (HOT) style automatically
  let tileErrors = 0;
  map.on("error", (e) => {
    const src = e && (e.sourceId || (e.source && e.source.id));
    if (src !== "base" && src !== "omt") return;
    if (currentTiles === "hot") return;
    if (++tileErrors > 12) {
      tileErrors = 0;
      const next = TILES[currentTiles] && TILES[currentTiles].vector ? "osm" : "hot"; // vector fails → OSM raster → HOT
      currentTiles = next; map.setStyle(styleFor(next));
    }
  });
  // two fingers rotate, two fingers sliding up/down tilt — like Google Maps
  try { map.touchZoomRotate.enableRotation(); map.touchPitch && map.touchPitch.enable(); } catch (e) {}

  // compass: shows when the map is turned; tap = face north (browsing) or switch heading-up / north-up (driving)
  function updateCompass() {
    const b = map.getBearing ? map.getBearing() : 0, p = map.getPitch ? map.getPitch() : 0;
    const el = $("btnCompass");
    if (!el) return;
    el.querySelector(".needle").style.transform = "rotate(" + (-b) + "deg)";
    el.classList.toggle("hidden", view !== "nav" && Math.abs(b) < 1 && p < 1);
  }
  map.on("rotate", updateCompass);
  map.on("pitch", updateCompass);
  // a user gesture (rotate / tilt) during navigation pauses follow mode, like a pan does
  ["rotatestart", "pitchstart"].forEach((ev) => map.on(ev, (e) => {
    if (view === "nav" && e && e.originalEvent) { follow = false; show("btnRecenter", true); }
  }));

  const emptyFC = () => ({ type: "FeatureCollection", features: [] });
  function ensureLayers() {
    if (!map.isStyleLoaded() || map.getSource("routes")) return;
    let before;
    try { const ls = map.getStyle().layers || []; const sym = ls.find((l) => l.type === "symbol"); before = sym && sym.id; } catch (e) {}
    map.addSource("routes", { type: "geojson", data: emptyFC() });
    map.addSource("active", { type: "geojson", data: emptyFC() });
    map.addLayer({ id: "alt-casing", type: "line", source: "routes", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#9aa0a6", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 6, 17, 14] } }, before);
    map.addLayer({ id: "alt-line", type: "line", source: "routes", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#bdc1c6", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 17, 10] } }, before);
    map.addLayer({ id: "route-casing", type: "line", source: "active", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#1967d2", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 7, 17, 17] } }, before);
    map.addLayer({ id: "route-line", type: "line", source: "active", layout: { "line-join": "round", "line-cap": "round" }, paint: { "line-color": "#4285f4", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 5, 17, 12] } }, before);
    redrawRoutes();
  }
  map.on("load", ensureLayers);
  map.on("styledata", ensureLayers);
  map.on("moveend", () => { const c = map.getCenter(); store.set("lastCenter", [c.lng, c.lat]); });
  map.on("click", "alt-line", (e) => {
    const f = e.features && e.features[0];
    if (view === "dirs" && f) selectRoute(f.properties.idx);
  });

  function setTiles(key) {
    if (key === currentTiles) return;
    currentTiles = key;
    map.setStyle(styleFor(key));
  }
  function line(coords) { return { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }; }
  function redrawRoutes() {
    const a = map.getSource("routes"), b = map.getSource("active");
    if (!a || !b) return;
    if (view === "dirs") {
      a.setData({ type: "FeatureCollection", features: routes.map((r, i) => i === sel ? null : Object.assign(line(r.coords), { properties: { idx: i } })).filter(Boolean) });
      b.setData(routes[sel] ? line(routes[sel].coords) : emptyFC());
    } else if (view === "nav" && route) {
      a.setData(emptyFC());
      b.setData(line(remainingCoords()));
    } else { a.setData(emptyFC()); b.setData(emptyFC()); }
  }

  // ---- markers
  const pinSvg = (color = "#ea4335") => `<svg viewBox="0 0 30 42"><path d="M15 1C7.3 1 1 7.2 1 14.9 1 25.3 15 41 15 41s14-15.7 14-26.1C29 7.2 22.7 1 15 1z" fill="${color}" stroke="#fff" stroke-width="1.5"/><circle cx="15" cy="15" r="5.2" fill="#fff" opacity=".95"/></svg>`;
  function makeEl(cls, html) { const d = document.createElement("div"); d.className = cls; d.innerHTML = html || ""; return d; }

  const meEl = makeEl("me");
  const meMarker = new maplibregl.Marker({ element: meEl });
  const carEl = makeEl("car", `<svg viewBox="0 0 50 50" class="car"><circle cx="25" cy="25" r="22" fill="#fff"/><path d="M25 8 L38 39 L25 32 L12 39 Z" fill="#1a73e8" stroke="#1967d2" stroke-width="1.5" stroke-linejoin="round"/></svg>`);
  const carMarker = new maplibregl.Marker({ element: carEl, rotationAlignment: "map", pitchAlignment: "map" });
  let meOn = false, carOn = false;
  function showMe(ll) {
    if (carOn) { carMarker.remove(); carOn = false; }
    meMarker.setLngLat(ll); if (!meOn) { meMarker.addTo(map); meOn = true; }
  }
  function showCar(ll, hdg) {
    if (meOn) { meMarker.remove(); meOn = false; }
    carMarker.setLngLat(ll).setRotation(hdg); if (!carOn) { carMarker.addTo(map); carOn = true; }
  }
  function clearResultMarkers() { resultMarkers.forEach((m) => m.remove()); resultMarkers = []; }
  function setPlaceMarker(p) {
    if (placeMarker) placeMarker.remove();
    placeMarker = p ? new maplibregl.Marker({ element: makeEl("pin", pinSvg()) }).setLngLat([p.lon, p.lat]).addTo(map) : null;
  }

  // long-press (touch) / right-click (desktop) drops a pin
  let pressTimer = null, pressStart = null;
  const cc = map.getCanvasContainer();
  cc.addEventListener("touchstart", (e) => {
    if (view === "nav" || e.touches.length !== 1) return;
    const tch = e.touches[0], rect = map.getCanvas().getBoundingClientRect();
    pressStart = [tch.clientX, tch.clientY];
    const pt = [tch.clientX - rect.left, tch.clientY - rect.top];
    pressTimer = setTimeout(() => { const ll = map.unproject(pt); dropPin([ll.lng, ll.lat]); }, 600);
  }, { passive: true });
  cc.addEventListener("touchmove", (e) => {
    if (!pressTimer) return;
    const tch = e.touches[0];
    if (Math.hypot(tch.clientX - pressStart[0], tch.clientY - pressStart[1]) > 10) { clearTimeout(pressTimer); pressTimer = null; }
  }, { passive: true });
  ["touchend", "touchcancel"].forEach((ev) => cc.addEventListener(ev, () => { clearTimeout(pressTimer); pressTimer = null; }, { passive: true }));
  map.on("contextmenu", (e) => { if (view !== "nav") dropPin([e.lngLat.lng, e.lngLat.lat]); });
  $("btnCompass").onclick = () => {
    if (view === "nav") {
      S.headingUp = !S.headingUp; saveSettings(); follow = true; show("btnRecenter", false);
      toast(S.headingUp ? t("headingUpOn") : t("northUpOn"));
    } else map.easeTo({ bearing: 0, pitch: 0, duration: 500 });
  };
  map.on("dragstart", (e) => {
    if (view === "nav" && e.originalEvent) { follow = false; show("btnRecenter", true); }
    if ((view === "home" || view === "results") && !sheetCollapsed) collapseSheet(true);
  });

  // =====================================================================
  // small UI helpers
  // =====================================================================
  const show = (id, on) => $(id).classList.toggle("hidden", !on);
  let toastTimer = null;
  function toast(msg, ms = 2600) {
    const el = $("toast"); el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), ms);
  }
  function fmtDist(m) { const r = NC.roundDist(m); return num(r.v) + " " + (r.unit === "m" ? t("m") : t("km")); }
  function fmtDur(sec) {
    const mins = Math.max(1, Math.round(sec / 60));
    if (mins < 60) return num(mins) + " " + t("min");
    const h = Math.floor(mins / 60), m = mins % 60;
    return num(h) + " " + t("hr") + (m ? " " + num(m) + " " + t("min") : "");
  }
  const fmtClock = (d) => num(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"));
  function here() { if (fix) return [fix.lon, fix.lat]; const c = map.getCenter(); return [c.lng, c.lat]; }
  function updateSheetHeight() {
    const sh = $("sheet");
    const h = sh.classList.contains("hidden") ? 0 : sh.getBoundingClientRect().height;
    document.documentElement.style.setProperty("--sheet-h", h + "px");
  }
  function collapseSheet(on) { sheetCollapsed = on; $("sheet").classList.toggle("collapsed", on); setTimeout(updateSheetHeight, 30); }
  $("sheetHandle").onclick = () => collapseSheet(!sheetCollapsed);

  // maneuver arrows (white on green banner, grey in lists)
  const ARROWS = {
    straight: "M32 56V12M32 8 19 23M32 8l13 15",
    left: "M42 56V32q0-9-9-9H14M20 11 8 23l12 12",
    right: "M22 56V32q0-9 9-9h19M44 11l12 12-12 12",
    "slight-left": "M40 56V36L23 17M19 28V13h15",
    "slight-right": "M24 56V36l17-19M45 28V13H30",
    uturn: "M42 56V24a11 11 0 0 0-22 0v15M9 30l11 12 11-12",
  };
  function arrowSvg(ic, color = "#fff") {
    if (ic === "roundabout") return `<svg viewBox="0 0 64 64" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="27" r="11"/><path d="M32 56V38M43 27h12M49 21l6 6-6 6"/></svg>`;
    if (ic === "arrive") return `<svg viewBox="0 0 64 64"><path d="M32 5C21.5 5 13 13.4 13 23.8 13 37.7 32 59 32 59s19-21.3 19-35.2C51 13.4 42.5 5 32 5z" fill="${color}"/><circle cx="32" cy="24" r="7" fill="${color === "#fff" ? "#0f6b3f" : "#fff"}"/></svg>`;
    return `<svg viewBox="0 0 64 64" fill="none" stroke="${color}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"><path d="${ARROWS[ic] || ARROWS.straight}"/></svg>`;
  }

  // =====================================================================
  // voice
  // =====================================================================
  /** Khmer uses the natural recorded voice when all its clips exist, else the phone voice. */
  function voiceParts(builder, clips) {
    if (S.voice === "off" || !V.supported) return [];
    const natural = S.kmVoice !== "phone" && V.hasClips(clips);
    const kmOk = natural || V.hasKhmer() || S.forceKm;
    const langs = S.voice === "both" ? (kmOk ? ["km", "en"] : ["en"]) : S.voice === "km" ? [kmOk ? "km" : "en"] : ["en"];
    return langs.map((lang) => (lang === "km" && natural ? { lang, clips } : { lang, text: builder(lang) }));
  }
  let lastTalk = 0; // when the app last said anything (for the characters' small talk)
  const speak = (builder, urgent, clips) => { lastTalk = Date.now(); V.say(voiceParts(builder, clips), urgent); };

  /** The selected voice pack (falls back to standard when Pro has ended). */
  function activePack() {
    const p = VP.byId(S.voicePack || "standard");
    return p.pro && !CL.isPro() ? VP.byId("standard") : p;
  }
  /**
   * Speak a voice-pack moment (start, 200 m turns, traffic, flood, arrived) in Khmer;
   * English (or no Khmer voice) keeps the normal sentence.
   */
  function packSpeak(event, builder, urgent, clips) {
    if (S.voice === "off" || !V.supported) return;
    const pack = activePack();
    const take = VP.pickTake(pack, event);
    const line = (pack.lines[event] || [])[take];
    const file = VP.clipPath(pack.id, event, take);
    const haveFile = V.hasFile(file);
    const kmOk = haveFile || V.hasKhmer() || S.forceKm;
    if (!line || S.voice === "en" || !kmOk) return builder ? speak(builder, urgent, clips) : undefined;
    lastTalk = Date.now();
    const sty = pack.tts || {};
    const parts = [haveFile ? { lang: "km", clips: [file] } : { lang: "km", text: line, pitch: sty.pitch, rate: sty.rate }];
    if (S.voice === "both" && builder) parts.push({ lang: "en", text: builder("en") });
    V.say(parts, urgent);
  }

  // =====================================================================
  // GPS
  // =====================================================================
  let geoWatch = null;
  function startGps() {
    if (!navigator.geolocation || geoWatch != null) return;
    geoWatch = navigator.geolocation.watchPosition(onGps, (err) => {
      console.warn("GPS", err);
      if (!gotFirstFix && err.code === 1) toast(t("noGps"), 4000);
      if (err.code === 1) geoWatch = null;
    }, { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 });
  }
  function onGps(pos) {
    const c = pos.coords;
    const p = { lon: c.longitude, lat: c.latitude, acc: c.accuracy || 20, speed: c.speed, heading: c.heading, t: pos.timestamp };
    if (p.speed != null && p.speed > 1.5 && p.heading != null && !isNaN(p.heading)) heading = p.heading;
    else if (fix) {
      const d = NC.dist([fix.lon, fix.lat], [p.lon, p.lat]);
      if (d > 6 && d > p.acc * 0.5) heading = NC.bearing([fix.lon, fix.lat], [p.lon, p.lat]);
    }
    if (p.speed == null && fix && p.t > fix.t) p.speed = NC.dist([fix.lon, fix.lat], [p.lon, p.lat]) / ((p.t - fix.t) / 1000);
    fix = p;
    if (!gotFirstFix) {
      gotFirstFix = true;
      if (view === "home") map.jumpTo({ center: [p.lon, p.lat], zoom: 15 });
      loadWeather();
    }
    if (sim) return;
    if (view === "nav") navTick({ lon: p.lon, lat: p.lat, speed: p.speed || 0, acc: p.acc, heading });
    else showMe([p.lon, p.lat]);
  }

  // =====================================================================
  // weather chip (Open-Meteo, no key)
  // =====================================================================
  let weatherAt = 0;
  async function loadWeather() {
    if (Date.now() - weatherAt < 15 * 60e3) return;
    weatherAt = Date.now();
    const [lon, lat] = here();
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`);
      const j = await r.json();
      const code = j.current.weather_code, temp = Math.round(j.current.temperature_2m);
      const k = code >= 95 ? 95 : code >= 61 ? 61 : code >= 51 ? 51 : code >= 45 ? 45 : code >= 1 ? 1 : 0;
      const ic = { 0: "☀️", 1: "⛅", 45: "🌫️", 51: "🌦️", 61: "🌧️", 95: "⛈️" }[k];
      weatherNow = { temp, k, ic, code };
      renderWeather();
    } catch (e) { console.warn("weather", e); }
  }
  let weatherNow = null;
  function renderWeather() {
    if (!weatherNow) return;
    $("weather").innerHTML = `${weatherNow.ic} ${num(weatherNow.temp)}° · ${esc(t("weather")[weatherNow.k])}`;
    show("weather", view === "home");
  }
  setInterval(loadWeather, 15 * 60e3);

  // =====================================================================
  // views
  // =====================================================================
  function setView(v) {
    view = v;
    const browse = v === "home" || v === "results" || v === "place";
    show("top", browse);
    show("chips", v !== "place");
    show("dirHead", v === "dirs");
    show("mapFabs", v !== "nav" && v !== "arrived");
    show("sheet", v !== "nav");
    show("navTop", v === "nav"); show("navLeft", v === "nav"); show("navFabs", v === "nav"); show("navBottom", v === "nav");
    if (v !== "nav") { show("btnRecenter", false); show("stepsPanel", false); }
    show("btnBackSearch", v === "results" || v === "place");
    show("pillLogo", !(v === "results" || v === "place"));
    show("btnClearQ", !!$("q").value && v !== "home");
    renderWeather();
    collapseSheet(false);
    redrawRoutes();
    requestAnimationFrame(updateSheetHeight);
  }

  // ---------------- home sheet ----------------
  const CATS = [
    ["fuel", "local_gas_station", '["amenity"="fuel"]'],
    ["restaurant", "restaurant", '["amenity"~"^(restaurant|fast_food|food_court)$"]'],
    ["cafe", "local_cafe", '["amenity"="cafe"]'],
    ["atm", "local_atm", '["amenity"~"^(atm|bank)$"]'],
    ["hospital", "local_hospital", '["amenity"~"^(hospital|clinic)$"]'],
    ["pharmacy", "local_pharmacy", '["amenity"="pharmacy"]'],
    ["hotel", "hotel", '["tourism"~"^(hotel|guest_house)$"]'],
    ["parking", "local_parking", '["amenity"="parking"]'],
    ["marketplace", "storefront", '["amenity"="marketplace"]'],
  ];
  function renderChips() {
    $("chips").innerHTML = CATS.map(([k, ic]) => `<button class="chip ${activeCat === k ? "on" : ""}" data-cat="${k}">${icon(ic)}${esc(t("cats")[k])}</button>`).join("");
    $("chips").querySelectorAll(".chip").forEach((b) => (b.onclick = () => searchCategory(b.dataset.cat)));
  }

  function quickBtn(id, ic, title, sub) {
    return `<button data-q="${id}"><span class="qIcon">${icon(ic, "fill")}</span><span><b>${esc(title)}</b><small>${esc(sub)}</small></span></button>`;
  }
  function renderHome() {
    if (view !== "home") $("q").value = "";
    clearResultMarkers(); setPlaceMarker(null); activeCat = null; renderChips();
    let h = renewalBanner() + `<div class="brand"><img src="icons/icon-192.png" alt=""><div><b>CamNAV – នាំផ្លូវ</b><small>បើកបរដោយសុវត្ថិភាព · Drive safely</small></div></div><div class="quick">`;
    h += quickBtn("home", "home", t("home"), saved.home ? saved.home.name : t("tapToSet"));
    h += quickBtn("work", "work", t("work"), saved.work ? saved.work.name : t("tapToSet"));
    h += quickBtn("rules", "gavel", t("rulesShort"), S.vehicle === "moto" ? t("moto") : t("car"));
    saved.favs.forEach((f, i) => { h += quickBtn("fav" + i, "star", f.name, f.address || ""); });
    h += `</div>`;
    if (recent.length) {
      h += `<div class="secTitle">${esc(t("recent"))}</div><div class="list">`;
      recent.slice(0, 6).forEach((r, i) => {
        h += `<div class="item" data-r="${i}"><span class="ic">${icon("history")}</span><span class="tx"><b>${esc(r.name)}</b><small>${esc(r.address || "")}</small></span><span class="dist">${fmtDist(NC.dist(here(), [r.lon, r.lat]))}</span></div>`;
      });
      h += `</div>`;
    }
    $("sheetBody").innerHTML = h;
    $("sheetBody").querySelectorAll("[data-q]").forEach((b) => (b.onclick = () => {
      const q = b.dataset.q;
      if (q === "rules") return openRules();
      const p = q === "home" ? saved.home : q === "work" ? saved.work : saved.favs[+q.slice(3)];
      if (p) openDirections(p);
      else { toast(t("longPress")); $("q").focus(); pendingSaveAs = q; }
    }));
    $("sheetBody").querySelectorAll("[data-r]").forEach((b) => (b.onclick = () => openPlace(recent[+b.dataset.r])));
    if ($("renewBar")) $("renewBar").onclick = () => openPaywall();
    setView("home");
  }
  let pendingSaveAs = null; // "home"/"work" waiting for the next chosen place

  // ---------------- search ----------------
  async function search(q) {
    q = q.trim(); if (!q) return;
    activeCat = null; renderChips();
    $("sheetBody").innerHTML = `<div class="note">${esc(t("searching"))}</div>`;
    setView("results");
    const c = here();
    const vb = [c[0] - 0.5, c[1] + 0.5, c[0] + 0.5, c[1] - 0.5].join(",");
    const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=0&limit=12&countrycodes=kh"
      + "&accept-language=" + (S.lang === "km" ? "km,en" : "en,km") + "&viewbox=" + vb + "&q=" + encodeURIComponent(q);
    try {
      const list = await (await fetch(url, { headers: { Accept: "application/json" } })).json();
      showResults(list.map((r) => ({
        lon: +r.lon, lat: +r.lat,
        name: r.name || r.display_name.split(",")[0],
        address: r.display_name.split(",").slice(1, 4).join(",").trim(),
        type: (r.type || "").replace(/_/g, " "),
      })));
    } catch (e) { $("sheetBody").innerHTML = `<div class="note">${esc(t("routeFail"))}</div>`; }
  }

  async function searchCategory(cat) {
    const def = CATS.find((c) => c[0] === cat); if (!def) return;
    activeCat = cat; renderChips();
    $("q").value = t("cats")[cat];
    $("sheetBody").innerHTML = `<div class="note">${esc(t("searching"))}</div>`;
    setView("results");
    const [lon, lat] = here();
    const q = `[out:json][timeout:20];nwr${def[2]}(around:4000,${lat},${lon});out center tags 40;`;
    try {
      const data = await RI.overpass(q, S.overpass);
      const list = (data.elements || []).map((el) => {
        const tg = el.tags || {};
        const ll = el.type === "node" ? [el.lon, el.lat] : el.center ? [el.center.lon, el.center.lat] : null;
        if (!ll) return null;
        const name = (S.lang === "km" ? tg["name:km"] || tg.name || tg["name:en"] : tg["name:en"] || tg.name || tg["name:km"]) || tg.brand || t("cats")[cat];
        const addr = [tg["addr:housenumber"], tg["addr:street"]].filter(Boolean).join(" ");
        return { lon: ll[0], lat: ll[1], name, address: addr, type: t("cats")[cat], cat, hours: tg.opening_hours || "" };
      }).filter(Boolean);
      list.sort((a, b) => NC.dist([lon, lat], [a.lon, a.lat]) - NC.dist([lon, lat], [b.lon, b.lat]));
      showResults(list.slice(0, 25), def[1]);
    } catch (e) { console.warn(e); $("sheetBody").innerHTML = `<div class="note">${esc(t("routeFail"))}</div>`; }
  }

  function showResults(list, ic = "place") {
    results = list; clearResultMarkers(); setPlaceMarker(null);
    if (!list.length) { $("sheetBody").innerHTML = `<div class="note">${esc(t("noResults"))}</div>`; updateSheetHeight(); return; }
    const c = here();
    $("sheetBody").innerHTML = `<div class="list">` + list.map((r, i) =>
      `<div class="item" data-i="${i}"><span class="ic red">${icon(ic, "fill")}</span><span class="tx"><b>${esc(r.name)}</b><small>${esc([r.type, r.address].filter(Boolean).join(" · "))}</small></span><span class="dist">${fmtDist(NC.dist(c, [r.lon, r.lat]))}</span></div>`).join("") + `</div>`;
    $("sheetBody").querySelectorAll("[data-i]").forEach((el) => (el.onclick = () => openPlace(results[+el.dataset.i])));
    const b = new maplibregl.LngLatBounds();
    list.forEach((r, i) => {
      const m = new maplibregl.Marker({ element: makeEl("pin small", pinSvg()) }).setLngLat([r.lon, r.lat]).addTo(map);
      m.getElement().onclick = (e) => { e.stopPropagation(); openPlace(results[i]); };
      resultMarkers.push(m); b.extend([r.lon, r.lat]);
    });
    if (fix) b.extend([fix.lon, fix.lat]);
    map.fitBounds(b, { padding: { top: 140, bottom: Math.round(window.innerHeight * 0.5), left: 40, right: 40 }, maxZoom: 16, duration: 600 });
    updateSheetHeight();
  }

  $("searchPill").addEventListener("submit", (e) => { e.preventDefault(); V.unlock(); $("q").blur(); search($("q").value); });
  $("q").addEventListener("input", () => { show("btnClearQ", !!$("q").value); suggestSoon(); });

  let suggestTimer = null, suggestSeq = 0;
  function suggestSoon() {
    clearTimeout(suggestTimer);
    const q = $("q").value.trim();
    if (q.length < 2) { if (view === "results" && !activeCat) renderHome(); return; }
    suggestTimer = setTimeout(() => suggest(q), 280);
  }
  /** Places as you type: your saved & recent places first, then OpenStreetMap (Photon) around you. */
  async function suggest(q) {
    const seq = ++suggestSeq;
    const ql = q.toLowerCase();
    const mine = [saved.home && Object.assign({ mine: "home" }, saved.home), saved.work && Object.assign({ mine: "work" }, saved.work)]
      .concat(saved.favs.map((f) => Object.assign({ mine: "star" }, f)), recent.map((r) => Object.assign({ mine: "history" }, r)))
      .filter((x) => x && (x.name || "").toLowerCase().includes(ql)).slice(0, 4);
    const [lon, lat] = here();
    let found = [];
    try {
      const url = "https://photon.komoot.io/api/?limit=8&bbox=102.3,10.3,107.7,14.8&lang=" + (S.lang === "km" ? "default" : "en")
        + "&lat=" + lat.toFixed(4) + "&lon=" + lon.toFixed(4) + "&q=" + encodeURIComponent(q);
      const j = await (await fetch(url)).json();
      found = (j.features || []).map((f) => {
        const p = f.properties || {}, c = f.geometry.coordinates;
        const addr = [p.street, p.district, p.city || p.county, p.state].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(", ");
        return { lon: c[0], lat: c[1], name: p.name || p.street || q, address: addr, type: (p.osm_value || "").replace(/_/g, " ") };
      });
    } catch (e) { console.warn("suggest", e); }
    if (seq !== suggestSeq || $("q").value.trim() !== q) return; // a newer keystroke won
    const seen = new Set();
    const list = mine.concat(found).filter((x) => { const k = x.name + "|" + x.lat.toFixed(4); if (seen.has(k)) return false; seen.add(k); return true; });
    renderSuggestions(list);
  }
  function renderSuggestions(list) {
    const c = here();
    activeCat = null;
    if (view !== "results") { setView("results"); renderChips(); }
    $("sheetBody").innerHTML = list.length ? `<div class="list">` + list.map((r, i) =>
      `<div class="item" data-s="${i}"><span class="ic ${r.mine ? "" : "red"}">${icon(r.mine || "location_on", "fill")}</span><span class="tx"><b>${esc(r.name)}</b><small>${esc([r.type, r.address].filter(Boolean).join(" · "))}</small></span><span class="dist">${fmtDist(NC.dist(c, [r.lon, r.lat]))}</span></div>`).join("") + `</div>`
      : `<div class="note">${esc(t("noResults"))}</div>`;
    $("sheetBody").querySelectorAll("[data-s]").forEach((el) => (el.onclick = () => { $("q").blur(); results = list; openPlace(list[+el.dataset.s]); }));
    updateSheetHeight();
  }
  $("btnClearQ").onclick = () => { $("q").value = ""; renderHome(); };
  $("btnBackSearch").onclick = () => {
    if (view === "place" && results.length) { setPlaceMarker(null); resultMarkers.forEach((m) => m.addTo(map)); showResults(results, activeCat ? CATS.find((c) => c[0] === activeCat)[1] : "place"); setView("results"); }
    else { $("q").value = ""; renderHome(); }
  };

  // ---------------- drop pin ----------------
  async function dropPin(ll) {
    if (navigator.vibrate) navigator.vibrate(25);
    const p = { lon: ll[0], lat: ll[1], name: t("pickedPoint"), address: ll[1].toFixed(5) + ", " + ll[0].toFixed(5) };
    openPlace(p);
    try {
      const r = await (await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${ll[1]}&lon=${ll[0]}&accept-language=${S.lang === "km" ? "km,en" : "en,km"}`)).json();
      if (r && r.display_name && place === p) {
        p.name = r.name || r.display_name.split(",")[0];
        p.address = r.display_name.split(",").slice(1, 4).join(",").trim();
        renderPlace();
      }
    } catch {}
  }

  // ---------------- place card ----------------
  function openPlace(p) {
    place = p; placeRoute = null;
    if (pendingSaveAs === "home" || pendingSaveAs === "work") { saved[pendingSaveAs] = strip(p); saveSaved(); toast(t("savedOk") + " · " + t(pendingSaveAs)); pendingSaveAs = null; }
    resultMarkers.forEach((m) => m.remove());
    setPlaceMarker(p);
    renderPlace();
    setView("place");
    map.easeTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 15.5), padding: { top: 120, bottom: Math.round(window.innerHeight * 0.38), left: 0, right: 0 }, duration: 600 });
    // drive time for the Directions button, like Google
    fetchRoutes(here(), [p.lon, p.lat], null, false).then((rs) => { if (place === p) { placeRoute = rs[0]; renderPlace(); } }).catch(() => {});
  }
  const strip = (p) => ({ lon: p.lon, lat: p.lat, name: p.name, address: p.address || "" });
  function isSaved(p) { return saved.favs.some((f) => NC.dist([f.lon, f.lat], [p.lon, p.lat]) < 15); }
  function renderPlace() {
    const p = place; if (!p) return;
    const d = NC.dist(here(), [p.lon, p.lat]);
    const drive = placeRoute ? fmtDur(placeRoute.duration) : "";
    $("sheetBody").innerHTML = `
      <div class="pTitle">${esc(p.name)}</div>
      <div class="pSub">${esc([p.type, p.address].filter(Boolean).join(" · "))}</div>
      <div class="pMeta">${icon("near_me", "")} ${fmtDist(d)}${p.hours ? " · " + esc(p.hours) : ""}</div>
      <div class="actions">
        <button class="primary" id="aDir">${icon("directions", "fill")}${esc(t("directions"))}${drive ? " · " + esc(drive) : ""}</button>
        <button id="aStart">${icon("navigation", "fill")}${esc(t("start"))}</button>
        <button id="aSave">${icon(isSaved(p) ? "bookmark_added" : "bookmark", isSaved(p) ? "fill" : "")}${esc(t("save"))}</button>
        <button id="aShare">${icon("share")}${esc(t("share"))}</button>
      </div>`;
    $("aDir").onclick = () => openDirections(p);
    $("aStart").onclick = async () => { await openDirections(p); if (routes.length) startNav(false); };
    $("aSave").onclick = () => { if (!CL.enabled() || requireAccount(() => openSaveModal(p))) openSaveModal(p); };
    $("aShare").onclick = () => shareText(`${p.name}\nhttps://www.openstreetmap.org/?mlat=${p.lat.toFixed(6)}&mlon=${p.lon.toFixed(6)}#map=18/${p.lat.toFixed(6)}/${p.lon.toFixed(6)}`);
    updateSheetHeight();
  }

  // =====================================================================
  // routing + directions
  // =====================================================================
  async function fetchRoutes(from, to, hdg, alts = true) {
    const base = (S.router || DEFAULTS.router).replace(/\/+$/, "");
    let url = `${base}/route/v1/driving/${from[0].toFixed(6)},${from[1].toFixed(6)};${to[0].toFixed(6)},${to[1].toFixed(6)}`
      + `?overview=full&geometries=geojson&steps=true&alternatives=${alts ? 3 : "false"}`;
    if (hdg != null) url += `&bearings=${Math.round(hdg) % 360},60;`;
    // motorbikes are not allowed on the expressway: ask the router to avoid motorways
    let data = null;
    if (S.vehicle === "moto") {
      try { data = await (await fetch(url + "&exclude=motorway")).json(); } catch (e) { data = null; }
      if (!data || data.code !== "Ok") data = null; // server without the exclude option → plain route
    }
    if (!data) data = await (await fetch(url)).json();
    if (data.code !== "Ok" || !data.routes || !data.routes.length) throw new Error(data.message || data.code || "no route");
    return data.routes.map((r) => { const b = NC.buildRoute(r); b.via = viaName(b); return b; });
  }
  function viaName(r) {
    let best = null, bestLen = 0;
    for (let i = 0; i < r.steps.length - 1; i++) {
      const len = r.steps[i + 1].at - r.steps[i].at;
      const nm = I.streetFor(r.steps[i], S.lang);
      if (nm && len > bestLen) { best = nm; bestLen = len; }
    }
    return best || "";
  }

  async function openDirections(p) {
    dest = strip(p);
    addRecent(dest);
    clearResultMarkers(); setPlaceMarker(dest);
    $("dirFrom").textContent = fix ? t("yourLocation") : t("yourLocation") + " (?)";
    $("dirTo").textContent = dest.name;
    renderVeh();
    routes = []; sel = 0;
    $("sheetBody").innerHTML = `<div class="note">${esc(t("routing"))}</div>`;
    setView("dirs");
    if (!fix) toast(t("noGps"), 3500);
    try {
      routes = await fetchRoutes(here(), [dest.lon, dest.lat], fix && fix.speed > 2 ? heading : null, true);
      routes.forEach((r) => { r.road = RI.create(); });
      renderDirs();
      fitRoute(routes[0]);
      loadRoadInfo(routes[0], 0, 40000);
    } catch (e) {
      console.warn(e);
      $("sheetBody").innerHTML = `<div class="note">${esc(t("routeFail"))}</div>`;
    }
    redrawRoutes();
    updateSheetHeight();
  }
  function fitRoute(r) {
    const b = new maplibregl.LngLatBounds(); r.coords.forEach((c) => b.extend(c));
    map.fitBounds(b, { padding: { top: 170, bottom: Math.round(window.innerHeight * 0.42), left: 40, right: 40 }, maxZoom: 16, duration: 700 });
  }
  function selectRoute(i) { sel = i; renderDirs(); redrawRoutes(); loadRoadInfo(routes[i], 0, 40000); }

  function renderDirs() {
    const fastest = Math.min(...routes.map((r) => r.duration));
    let h = "";
    routes.forEach((r, i) => {
      const cams = r.road ? r.road.cameras.length : 0;
      h += `<div class="routeCard ${i === sel ? "on" : ""}" data-i="${i}">
        <div class="rc1">
          <div class="rTime">${esc(fmtDur(r.duration))} <small>(${esc(fmtDist(r.distance))})</small></div>
          <div class="rVia">${r.via ? esc(t("via") + " " + r.via) : ""}</div>
          ${r.duration === fastest ? `<div class="rTag">${esc(t("fastest"))}</div>` : ""}
        </div>
        <div class="rIcons">${cams ? icon("photo_camera") + num(cams) : ""}</div>
      </div>`;
    });
    h += `<div class="bigBtns">
      <button id="dSteps">${icon("format_list_bulleted")}${esc(t("steps"))}</button>
      <button id="dDemo">${icon("play_circle")}${esc(t("demo"))}</button>
      <button class="primary" id="dStart">${icon("navigation", "fill")}${esc(t("start"))}</button></div>`;
    $("sheetBody").innerHTML = h;
    $("sheetBody").querySelectorAll(".routeCard").forEach((el) => (el.onclick = () => selectRoute(+el.dataset.i)));
    $("dStart").onclick = () => startNav(false);
    $("dDemo").onclick = () => startNav(true);
    $("dSteps").onclick = () => openSteps(routes[sel], 0);
    updateSheetHeight();
  }
  function renderVeh() {
    $("vehSeg").innerHTML = [["car", "directions_car"], ["moto", "two_wheeler"]].map(([k, ic]) =>
      `<button data-v="${k}" class="${S.vehicle === k ? "on" : ""}">${icon(ic)}${esc(t(k))}</button>`).join("");
    $("vehSeg").querySelectorAll("button").forEach((b) => (b.onclick = () => {
      if (S.vehicle === b.dataset.v) return;
      S.vehicle = b.dataset.v; saveSettings(); renderVeh(); syncVehicle();
      if (view === "dirs" && dest) openDirections(dest); // motorbike routes avoid the expressway
    }));
  }
  $("btnDirBack").onclick = () => { routes = []; if (place) { openPlace(place); } else renderHome(); };

  function addRecent(p) {
    recent = [strip(p)].concat(recent.filter((r) => NC.dist([r.lon, r.lat], [p.lon, p.lat]) > 15)).slice(0, 10);
    store.set("recent", recent);
  }

  // ---- road info (speed limits, cameras, traffic lights) ----
  async function loadRoadInfo(r, from, to) {
    if (!r || !r.road || r.road.loading || r.road.loadedTo >= Math.min(to, r.total)) return;
    r.road.loading = true;
    try {
      await RI.load(r, r.road, from, Math.min(to, r.total), S.overpass);
      if (view === "dirs" && routes[sel] === r) renderDirs();
      renderRoadMarkers(r);
    } catch (e) { console.warn("road info", e); }
    r.road.loading = false;
  }
  let roadMarkers = [];
  function renderRoadMarkers(r) {
    roadMarkers.forEach((m) => m.remove()); roadMarkers = [];
    if (!r || !r.road || (view !== "dirs" && view !== "nav")) return;
    if (S.showCameras) r.road.cameras.forEach((c) => roadMarkers.push(new maplibregl.Marker({ element: signEl("camera") }).setLngLat([c.lon, c.lat]).addTo(map)));
    if (S.showSignals) r.road.signals.slice(0, 200).forEach((s) => roadMarkers.push(new maplibregl.Marker({ element: signEl("signal") }).setLngLat([s.lon, s.lat]).addTo(map)));
    if (S.showSigns) {
      const add = (list, kind, max) => (list || []).slice(0, max).forEach((x) => {
        const el = signEl(x.kind === "give_way" ? "give_way" : kind);
        roadMarkers.push(new maplibregl.Marker({ element: el }).setLngLat([x.lon, x.lat]).addTo(map));
      });
      add(r.road.bumps, "bump", 150); add(r.road.schools, "school", 80); add(r.road.rail, "rail", 40);
      add(r.road.tolls, "toll", 20); add(r.road.signs, "stop", 120);
      add(r.road.hazards, "hazard", 60); add(r.road.crossings, "crossing", 120);
      // posted speed limits: one round sign where the limit changes
      let last = null, n = 0;
      for (let a = 0; a < Math.min(r.total, r.road.loadedTo || 0) && n < 120; a += 150) {
        const lim = RI.limitAt(r.road, a, S.vehicle);
        if (!lim || lim.est || lim.v === last) continue;
        last = lim.v; n++;
        const p = NC.pointAt(r, a).p;
        if (p) roadMarkers.push(new maplibregl.Marker({ element: signEl("limit", lim.v) }).setLngLat(p).addTo(map));
      }
    }
  }
  // road-sign look (Cambodian signs follow the Vienna convention: red triangles, red octagon, blue discs)
  function signSvg(kind, v) {
    const tri = (inner) => `<svg viewBox="0 0 40 36"><path d="M20 2 38 34H2Z" fill="#fff" stroke="#d93025" stroke-width="4" stroke-linejoin="round"/>${inner}</svg>`;
    const sym = (ch, y = 28, size = 15) => `<text x="20" y="${y}" text-anchor="middle" font-size="${size}" font-weight="700" font-family="sans-serif" fill="#202124">${ch}</text>`;
    switch (kind) {
      case "stop": return `<svg viewBox="0 0 40 40"><path d="M12 2h16l10 10v16L28 38H12L2 28V12Z" fill="#d93025" stroke="#fff" stroke-width="2"/><text x="20" y="25" text-anchor="middle" font-size="10" font-weight="800" font-family="sans-serif" fill="#fff">STOP</text></svg>`;
      case "give_way": return `<svg viewBox="0 0 40 36"><path d="M2 2h36L20 34Z" fill="#fff" stroke="#d93025" stroke-width="4" stroke-linejoin="round"/></svg>`;
      case "bump": return tri(`<path d="M9 28q11-12 22 0" fill="#202124"/>`);
      case "school": return tri(`<circle cx="16" cy="15" r="2.6" fill="#202124"/><circle cx="24" cy="17" r="2.2" fill="#202124"/><path d="M14 19h4l1 9h-2l-1-5-2 5h-2l2-6zM22.5 21h3.5l.8 7h-2l-.4-4-1.5 4h-1.8z" fill="#202124"/>`);
      case "rail": return tri(`<path d="M12 28 17 14h6l5 14M14 23h12M15.5 19h9" stroke="#202124" stroke-width="2" fill="none"/>`);
      case "crossing": return `<svg viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="4" fill="#1a73e8" stroke="#fff" stroke-width="2"/><path d="M8 30 20 8l12 22Z" fill="#fff"/><circle cx="20" cy="17" r="2.2" fill="#202124"/><path d="M19 20h2.5l2 6h-2l-1-3-1.5 3h-2z" fill="#202124"/></svg>`;
      case "hazard": return tri(sym("!", 30, 18));
      case "curve": return tri(`<path d="M15 30v-8q0-6 8-8v-3l5 5-5 5v-3q-4 1-4 5v7z" fill="#202124"/>`);
      case "junction_danger": return tri(`<path d="M18.5 30V12h3v18zM13 19h14v3H13z" fill="#202124"/>`);
      case "animal": return tri(`<path d="M11 26q1-7 7-7h6l3-3 2 1-2 4v5h-2v-3h-8v3h-2z" fill="#202124"/>`);
      case "signal": return tri(`<rect x="16.5" y="12" width="7" height="17" rx="2" fill="#202124"/><circle cx="20" cy="15.5" r="1.6" fill="#ea4335"/><circle cx="20" cy="20.5" r="1.6" fill="#fbbc04"/><circle cx="20" cy="25.5" r="1.6" fill="#34a853"/>`);
      case "no_overtake": return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" stroke="#d93025" stroke-width="5"/><rect x="10" y="15" width="8" height="12" rx="2" fill="#d93025"/><rect x="22" y="15" width="8" height="12" rx="2" fill="#202124"/></svg>`;
      case "toll": return `<svg viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="4" fill="#1a73e8" stroke="#fff" stroke-width="2"/>${sym("$", 27, 18).replace("#202124", "#fff")}</svg>`;
      case "camera": return `<svg viewBox="0 0 40 40"><rect x="2" y="2" width="36" height="36" rx="4" fill="#1a73e8" stroke="#fff" stroke-width="2"/><rect x="9" y="14" width="22" height="15" rx="3" fill="#fff"/><circle cx="20" cy="21.5" r="4.5" fill="#1a73e8"/><rect x="15" y="11" width="10" height="4" rx="1" fill="#fff"/></svg>`;
      case "limit": return `<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="17" fill="#fff" stroke="#d93025" stroke-width="5"/><text x="20" y="25.5" text-anchor="middle" font-size="${String(v).length > 2 ? 12 : 15}" font-weight="800" font-family="sans-serif" fill="#202124">${v}</text></svg>`;
    }
    return null;
  }
  function signEl(kind, v) {
    const svg = signSvg(kind, v);
    if (!svg) { const m = ROAD_META[kind] || ROAD_META.hazard; const el = makeEl("mk sig", icon(m.icon, "fill")); el.style.background = m.color; return el; }
    const el = document.createElement("div"); el.className = "rsign"; el.innerHTML = svg; return el;
  }
  const ROAD_META = {
    bump: { icon: "speed", color: "#e8710a" },
    school: { icon: "school", color: "#f9ab00" },
    rail: { icon: "train", color: "#5f6368" },
    toll: { icon: "toll", color: "#1a73e8" },
    stop: { icon: "front_hand", color: "#d93025" },
    give_way: { icon: "change_history", color: "#d93025" },
    crossing: { icon: "directions_walk", color: "#1a73e8" },
    hazard: { icon: "warning", color: "#d93025" },
    curve: { icon: "turn_sharp_right", color: "#e8710a" },
    junction_danger: { icon: "fork_right", color: "#d93025" },
    animal: { icon: "pets", color: "#a0522d" },
    no_overtake: { icon: "block", color: "#d93025" },
    signal: { icon: "traffic", color: "#3c4043" },
  };

  // =====================================================================
  // navigation
  // =====================================================================
  function startNav(demo) {
    route = routes[sel]; if (!route) return;
    V.unlock();
    follow = true;
    nav = {
      idx: null, along: 0, stepIdx: 1, spoken: new Set(), off: NC.makeOffRouteTracker(), rerouting: false,
      lastDraw: 0, lastBle: 0, bleWindowAt: -1e9, alerted: new Set(), voted: new Set(), arrived: false, lastMinute: -1,
      overSince: 0, lastOverWarn: 0, slowSince: 0, slowAsked: 0, limit: null, distTo: 0, remaining: route.total, speed: 0,
    };
    indexReports();
    setView("nav");
    setPlaceMarker(dest);
    renderRoadMarkers(route);
    applyNightMode();
    requestWakeLock();
    const first = route.steps[0];
    packSpeak("start_route", (lang) => I.action(first, lang) + (lang === "km" ? "។ " : ". ") + I.ALERTS[lang].start, true, VC.alertClips.start(first));
    if (S.reminders) {
      const k = S.vehicle === "moto" ? "helmet" : "seatbelt";
      speak((lang) => I.ALERTS[lang][k], false, VC.alertClips[k]());
    }
    loadRoadInfo(route, 0, 40000);
    if (demo) startSim();
    else if (fix) navTick({ lon: fix.lon, lat: fix.lat, speed: fix.speed || 0, acc: fix.acc, heading });
    else { const p0 = route.coords[0]; navTick({ lon: p0[0], lat: p0[1], speed: 0, acc: 10, heading: NC.bearing(route.coords[0], route.coords[1]) }); }
  }

  function endNav(arrived) {
    stopSim();
    releaseWakeLock();
    if (!arrived) V.stop();
    if (BLE.isConnected()) BLE.send(BLE.encNav(0, NC.ESP_ID.arrive, ""));
    roadMarkers.forEach((m) => m.remove()); roadMarkers = [];
    setTiles(S.tiles);
    map.easeTo({ pitch: 0, bearing: 0, padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 500 });
    const d = dest;
    nav = null; route = null; routes = [];
    if (arrived && d) {
      $("sheetBody").innerHTML = `<div class="arrive"><div class="flag">${icon("flag", "fill")}</div><h2>${esc(t("arrivedTitle"))}</h2><div class="pSub">${esc(d.name)}</div>
        <div class="btnLine"><button class="primary" id="btnDone">${esc(t("done"))}</button></div></div>`;
      setView("arrived");
      $("btnDone").onclick = () => { setPlaceMarker(null); renderHome(); };
      if (fix) showMe([fix.lon, fix.lat]);
    } else {
      setPlaceMarker(null); renderHome();
      if (fix) showMe([fix.lon, fix.lat]);
    }
  }

  function remainingCoords() {
    if (!route) return [];
    if (!nav) return route.coords;
    const h = NC.pointAt(route, nav.along);
    return [h.p].concat(route.coords.slice(h.idx + 1));
  }

  function navTick(p) {
    if (!route || !nav) return;
    const s = NC.snap(route, [p.lon, p.lat], nav.idx);
    const now = Date.now();
    if (!sim && nav.off.update(s.off, p.acc) && !nav.rerouting) { reroute(p); return; }
    if (s.off < 60) { nav.idx = s.idx; nav.along = Math.max(nav.along - 30, s.along); }

    const onLine = s.off < 25;
    const shown = onLine ? NC.pointAt(route, nav.along).p : [p.lon, p.lat];
    const hdg = onLine && (p.speed || 0) < 2 ? s.routeBearing : p.heading;
    showCar(shown, hdg);

    // next maneuver + voice prompts
    nav.stepIdx = NC.nextStepIndex(route, nav.along);
    const step = route.steps[nav.stepIdx];
    nav.distTo = Math.max(0, step.at - nav.along);
    const pr = NC.promptFor(route, nav.stepIdx, nav.distTo, p.speed, nav.spoken);
    if (pr) {
      nav.spoken.add(nav.stepIdx + ":" + pr.stage);
      const nx = route.steps[nav.stepIdx + 1], d = nav.distTo;
      const normal = (lang) => I.sentence(step, lang, pr.stage, pr.withDist ? d : null, nx);
      const clips = VC.sentenceClips(step, pr.stage, pr.withDist ? d : null, nx);
      const ev = VP.eventForStep(step, pr.stage);
      // pack turn lines say "200 m": use them only when the turn really is about that far
      if (ev && (ev === "arrived" || (d >= 120 && d <= 320))) packSpeak(ev, normal, pr.stage === "now", clips);
      else speak(normal, pr.stage === "now", clips);
    }

    nav.remaining = Math.max(0, route.total - nav.along);
    nav.speed = p.speed || 0;
    if (!nav.arrived && (nav.remaining < 25 || (step.type === "arrive" && nav.distTo < 20))) {
      nav.arrived = true;
      if (!nav.spoken.has(nav.stepIdx + ":now")) packSpeak("arrived", (lang) => I.action(route.steps[route.steps.length - 1], lang), true, VC.actionClips(route.steps[route.steps.length - 1]));
      const sess = nav;
      setTimeout(() => { if (nav === sess) endNav(true); }, 4000);
    }

    // road data ahead
    if (route.road && !route.road.loading && route.road.loadedTo < route.total && nav.along > route.road.loadedTo - 12000) {
      loadRoadInfo(route, route.road.loadedTo - 500, route.road.loadedTo + 40000);
    }
    nav.limit = route.road ? RI.limitAt(route.road, nav.along, S.vehicle) : null;
    checkSpeed(now);
    checkAhead();
    checkSlowTraffic(now);
    checkMoments(now);

    updateNavUI(false);
    if (now - nav.lastDraw > 1000) { nav.lastDraw = now; redrawRoutes(); }
    if (follow) followCamera(shown, hdg, nav.speed, sim ? 220 : 900);
    bleTick(shown, hdg, nav.speed, now);
  }

  async function reroute(p) {
    nav.rerouting = true;
    toast(t("rerouting"));
    packSpeak("rerouting", (lang) => I.ALERTS[lang].reroute, true, VC.alertClips.reroute());
    try {
      const rs = await fetchRoutes([p.lon, p.lat], [dest.lon, dest.lat], p.heading, false);
      route = rs[0]; route.road = RI.create(); routes = [route]; sel = 0;
      Object.assign(nav, { idx: null, along: 0, spoken: new Set(), bleWindowAt: -1e9 });
      nav.off.reset();
      indexReports(); redrawRoutes(); renderRoadMarkers(route);
      loadRoadInfo(route, 0, 40000);
    } catch (e) { console.warn("reroute failed", e); nav.off.reset(); }
    nav.rerouting = false;
  }

  // ---- trip moments for voice characters: halfway, almost there, 1-hour break, small talk ----
  function checkMoments(now) {
    if (sim || nav.arrived || S.voice === "off") return;
    nav.startedAt = nav.startedAt || now;
    const pack = activePack();
    if (route.total > 4000 && !nav.halfSaid && nav.along > route.total / 2) {
      nav.halfSaid = true; packSpeak("halfway", null, false); return;
    }
    if (route.total > 2500 && !nav.nearSaid && nav.remaining < 700 && nav.remaining > 150) {
      nav.nearSaid = true; packSpeak("almost_there", null, false); return;
    }
    const hours = Math.floor((now - nav.startedAt) / 3600000);
    if (hours >= 1 && hours > (nav.breakSaid || 0)) { nav.breakSaid = hours; packSpeak("break_time", null, false); return; }
    // small talk: only on a quiet, straight stretch, never close to a turn
    if (S.chatter !== false && pack.lines.chatter && nav.distTo > 1500 && now - lastTalk > 240000
        && now - nav.startedAt > 180000 && now - (nav.lastChat || 0) > 420000 && (nav.speed || 0) > 2) {
      nav.lastChat = now; packSpeak("chatter", null, false);
    }
  }

  // ---- speed limit + overspeed warning ----
  function checkSpeed(now) {
    const lim = nav.limit, kmh = nav.speed * 3.6;
    const over = lim && S.speedWarn >= 0 && kmh > lim.v + S.speedWarn;
    if (over) { if (!nav.overSince) nav.overSince = now; } else nav.overSince = 0;
    const warnNow = over && now - nav.overSince > 2500;
    $("speedBox").classList.toggle("over", !!warnNow);
    if (warnNow && now - nav.lastOverWarn > 45000) {
      nav.lastOverWarn = now;
      packSpeak("overspeed", (lang) => I.ALERTS[lang].overspeed(lim.v), false, VC.alertClips.overspeed(lim.v));
    }
  }

  // ---- cameras / reports ahead ----
  function checkAhead() {
    const items = [];
    if (route.road && S.showCameras) for (const c of route.road.cameras) items.push({ id: c.id, kind: "camera", along: c.along, v: c.v });
    if (route.reportsOnRoute && S.showReports) for (const r of route.reportsOnRoute) items.push({ id: r.id, kind: r.type, along: r.along, cloud: !!r.cloud, cloudId: r.cloudId });
    if (route.road && S.showSigns) {
      const rd = route.road;
      const near = (list, kind, warn, voice) => { for (const x of list || []) { const a = x.along - nav.along; if (a > 0 && a < warn) items.push({ id: x.id, kind, along: x.along, warn, voice }); } };
      near(rd.bumps, "bump", 180, true);
      near(rd.schools, "school", 300, true);
      near(rd.rail, "rail", 400, true);
      near(rd.tolls, "toll", 800, true);
      near((rd.signs || []).filter((x) => x.kind === "stop"), "stop", 150, true);
      near((rd.signs || []).filter((x) => x.kind === "give_way"), "give_way", 120, false);
      if (S.showSignals) near(rd.signals, "signal", 150, false);
      near(rd.crossings, "crossing", 80, false);
      // OSM hazard=* values → our kinds
      const hz = (k) => (/curve/.test(k) ? "curve" : /junction|intersection/.test(k) ? "junction_danger" : /animal|cattle|cow|deer/.test(k) ? "animal" : "hazard");
      for (const x of rd.hazards || []) { const a = x.along - nav.along; if (a > 0 && a < 400) items.push({ id: x.id, kind: hz(x.kind || ""), along: x.along, warn: 400, voice: true }); }
      // inside a no-overtaking stretch → steady chip, said once when it starts
      for (const z of rd.noOvertake || []) {
        if (nav.along >= z.from - 100 && nav.along <= z.to) items.push({ id: z.id, kind: "no_overtake", along: Math.max(z.from, nav.along + 1), warn: 200, voice: true });
      }
    }
    const shownAlerts = [];
    nav.cameraAhead = 0;
    for (const it of items) {
      const ahead = it.along - nav.along;
      const warnAt = it.warn || (it.kind === "camera" ? 600 : 500);
      if (ahead <= 0 || ahead > warnAt) continue;
      shownAlerts.push({ it, ahead });
      if (it.kind === "camera" && (!nav.cameraAhead || ahead < nav.cameraAhead)) nav.cameraAhead = ahead;
      if (!nav.alerted.has(it.id)) {
        nav.alerted.add(it.id);
        if (it.kind === "camera") {
          const v = it.v || (nav.limit && nav.limit.v) || null;
          packSpeak("camera_ahead", (lang) => I.ALERTS[lang].camera(ahead, v), false, VC.alertClips.camera(ahead, v));
        } else if (ROAD_META[it.kind]) {
          const pev = it.kind === "bump" ? "bump_ahead" : it.kind === "school" ? "school_ahead" : null;
          if (it.voice && pev) packSpeak(pev, (lang) => I.ALERTS[lang].road[it.kind], false, VC.alertClips.road(it.kind));
          else if (it.voice) speak((lang) => I.ALERTS[lang].road[it.kind], false, VC.alertClips.road(it.kind));
        } else if (it.kind === "jam" || it.kind === "flood") {
          packSpeak(it.kind === "jam" ? "traffic_ahead" : "flood_ahead", (lang) => I.ALERTS[lang].report[it.kind], false, VC.alertClips.report(it.kind));
        } else speak((lang) => I.ALERTS[lang].report[it.kind], false, VC.alertClips.report(it.kind));
        if (it.cloud && !nav.voted.has(it.id)) verifyChip = { id: it.cloudId, kind: it.kind, key: it.id, t: Date.now() };
      }
    }
    shownAlerts.sort((a, b) => a.ahead - b.ahead);
    renderAlerts(shownAlerts.slice(0, 3));
    renderSignStrip();
  }
  function renderSignStrip() {
    const el = $("signStrip"); if (!el) return;
    const rd = route && route.road;
    if (!rd || !S.showSigns || !nav) { el.innerHTML = ""; return; }
    const up = [];
    const take = (list, kind) => { for (const x of list || []) { const a = x.along - nav.along; if (a > 0 && a < 1500) up.push({ kind: x.kind === "give_way" ? "give_way" : kind, a }); } };
    if (S.showCameras) take(rd.cameras, "camera");
    take(rd.bumps, "bump"); take(rd.schools, "school"); take(rd.rail, "rail"); take(rd.tolls, "toll");
    take(rd.signs, "stop"); take(rd.crossings, "crossing");
    if (S.showSignals) take(rd.signals, "signal");
    for (const x of rd.hazards || []) { const a = x.along - nav.along; if (a > 0 && a < 1500) up.push({ kind: /curve/.test(x.kind || "") ? "curve" : /junction|intersection/.test(x.kind || "") ? "junction_danger" : /animal|cattle|cow/.test(x.kind || "") ? "animal" : "hazard", a }); }
    up.sort((p, q) => p.a - q.a);
    // keep one per kind so the strip shows variety, nearest first
    const seen = new Set(), pick = [];
    for (const u of up) { if (seen.has(u.kind)) continue; seen.add(u.kind); pick.push(u); if (pick.length >= 3) break; }
    el.innerHTML = pick.map((u) => `<div class="ss">${signSvg(u.kind)}<small>${esc(fmtDist(u.a))}</small></div>`).join("");
  }
  let slowChip = false;
  let verifyChip = null; // {id, kind, key}: ask "Still there / Cleared" when passing a shared pin
  function renderAlerts(list) {
    let h = list.map(({ it, ahead }) => {
      const meta = REPORT_META[it.kind] || ROAD_META[it.kind] || REPORT_META.camera;
      return `<div class="alert"><span class="aic" style="background:${meta.color}">${icon(meta.icon, "fill")}</span>${esc(t("reports")[it.kind])}<small>&nbsp;· ${esc(fmtDist(ahead))}</small></div>`;
    }).join("");
    if (slowChip) h += `<div class="alert"><span class="aic red">${icon("traffic", "fill")}</span>${esc(t("slowTraffic"))}<button id="btnJam">${esc(t("report"))}</button></div>`;
    if (verifyChip && Date.now() - verifyChip.t > 60000) verifyChip = null;
    if (verifyChip && CL.canReport()) h += `<div class="alert verify"><span class="aic" style="background:${(REPORT_META[verifyChip.kind] || REPORT_META.jam).color}">${icon((REPORT_META[verifyChip.kind] || REPORT_META.jam).icon, "fill")}</span>
      <button id="vcStill">${esc(t("stillThere"))}</button><button id="vcClear">${esc(t("cleared"))}</button></div>`;
    $("alerts").innerHTML = h;
    if (verifyChip && $("vcStill")) {
      const vc = verifyChip;
      $("vcStill").onclick = () => castVote(vc.id, "still_there");
      $("vcClear").onclick = () => castVote(vc.id, "cleared");
    }
    if (slowChip) $("btnJam").onclick = () => { slowChip = false; addReport("jam"); };
  }

  // ---- slow traffic → offer one-tap jam report ----
  function checkSlowTraffic(now) {
    if (sim) return;
    const kmh = nav.speed * 3.6;
    if (kmh < 8 && nav.remaining > 300) { if (!nav.slowSince) nav.slowSince = now; } else { nav.slowSince = 0; slowChip = false; }
    if (nav.slowSince && now - nav.slowSince > 90000 && now - nav.slowAsked > 600000) { nav.slowAsked = now; slowChip = true; }
  }

  // ---- UI while driving ----
  let lastBannerKey = "";
  function updateNavUI(force) {
    if (!nav || !route) return;
    const step = route.steps[nav.stepIdx];
    const key = nav.stepIdx + "|" + S.lang + "|" + nav.arrived + "|" + route.total;
    if (force || key !== lastBannerKey) {
      lastBannerKey = key;
      $("bIcon").innerHTML = arrowSvg(NC.iconOf(step));
      $("bText").textContent = I.action(step, S.lang);
      const nx = route.steps[nav.stepIdx + 1];
      const thenOn = nx && nx.at - step.at < 300 && step.type !== "arrive";
      $("bThen").innerHTML = thenOn ? `${esc(t("then"))} ${arrowSvg(NC.iconOf(nx))}` : "";
      show("bThen", !!thenOn);
      $("navTop").classList.toggle("hasThen", !!thenOn);
    }
    $("bDist").textContent = nav.arrived ? "" : fmtDist(nav.distTo);
    const secs = route.duration * (route.total ? nav.remaining / route.total : 0);
    $("nbTime").textContent = fmtDur(secs);
    $("nbRest").textContent = fmtDist(nav.remaining) + " · " + fmtClock(new Date(Date.now() + secs * 1000));
    $("spdVal").textContent = String(Math.round(nav.speed * 3.6)); // dashboard style: 0-9 digits like road signs
    if (nav.limit) {
      $("limitVal").textContent = String(nav.limit.v);
      $("limitSign").classList.toggle("est", nav.limit.est);
      $("limitSign").title = nav.limit.est ? t("estLimit") : t("speedLimit");
      show("limitSign", true);
    } else show("limitSign", false);
  }
  $("limitSign").onclick = () => toast(nav && nav.limit && nav.limit.est ? t("estLimit") : t("speedLimit"), 3500);

  function followCamera(lonlat, hdg, speed, duration) {
    const kmh = speed * 3.6;
    const zoom = kmh > 80 ? 15.4 : kmh > 45 ? 16.1 : 16.9;
    const h = map.getContainer().clientHeight;
    map.easeTo({
      center: lonlat, bearing: S.headingUp ? hdg : 0, pitch: S.headingUp ? 52 : 0, zoom,
      padding: { top: Math.round(h * 0.45), bottom: 110, left: 0, right: 0 }, duration, easing: (x) => x,
    });
  }

  function applyNightMode() {
    const hr = new Date().getHours();
    const night = S.nightAuto && (hr >= 18 || hr < 6);
    setTiles(view === "nav" && night && !TILES[S.tiles].dark ? "dark" : S.tiles);
  }

  // ---- steps panel ----
  function openSteps(r, fromAlong) {
    if (!r) return;
    $("stepsTitle").textContent = t("steps");
    let h = "";
    for (let i = 1; i < r.steps.length; i++) {
      const st = r.steps[i];
      if (st.at < fromAlong) continue;
      const len = i + 1 < r.steps.length ? r.steps[i + 1].at - st.at : 0;
      h += `<div class="stepRow">${arrowSvg(NC.iconOf(st), "#5f6368")}<div><div>${esc(I.action(st, S.lang))}</div>${len > 0 ? `<div class="sd">${esc(fmtDist(len))}</div>` : ""}</div></div>`;
    }
    $("stepsList").innerHTML = h;
    show("stepsPanel", true);
  }
  $("btnStepsClose").onclick = () => show("stepsPanel", false);
  $("btnSteps").onclick = () => openSteps(route, nav ? nav.along : 0);

  // ---- demo drive ----
  function startSim() {
    stopSim();
    let along = 0, last = performance.now();
    sim = setInterval(() => {
      if (!route || view !== "nav") return stopSim();
      const nowT = performance.now(), dt = (nowT - last) / 1000; last = nowT;
      const v = S.simKmh / 3.6;
      const slow = nav && nav.distTo < 60 ? 0.55 : 1;
      along = Math.min(route.total, Math.max(along, nav ? nav.along : 0) + v * slow * dt);
      const pt = NC.pointAt(route, along);
      navTick({ lon: pt.p[0], lat: pt.p[1], speed: v * slow, acc: 5, heading: pt.bearing });
      if (along >= route.total) stopSim();
    }, 200);
  }
  function stopSim() { if (sim) { clearInterval(sim); sim = null; } }

  // ---- nav buttons ----
  $("btnExit").onclick = () => endNav(false);
  $("btnRecenter").onclick = () => { follow = true; show("btnRecenter", false); };
  $("btnMute").onclick = () => { V.setMuted(!V.isMuted()); $("btnMute").innerHTML = icon(V.isMuted() ? "volume_off" : "volume_up"); };
  $("btnShareEta").onclick = () => {
    if (!nav || !dest) return;
    const secs = route.duration * (nav.remaining / (route.total || 1));
    shareText(t("shareEta").replace("{dest}", dest.name).replace("{time}", fmtClock(new Date(Date.now() + secs * 1000))).replace("{left}", fmtDur(secs)));
  };

  // =====================================================================
  // reports (Waze-style)
  // =====================================================================
  const REPORT_META = {
    police: { icon: "local_police", color: "#1a73e8", ttl: 2 },
    accident: { icon: "car_crash", color: "#d93025", ttl: 3 },
    jam: { icon: "traffic", color: "#e8710a", ttl: 1 },
    hazard: { icon: "warning", color: "#f9ab00", ttl: 6 },
    flood: { icon: "flood", color: "#1e8e9e", ttl: 24 },
    roadwork: { icon: "construction", color: "#f29900", ttl: 0.75 },
    camera: { icon: "photo_camera", color: "#e37400", ttl: 24 * 365 },
  };
  let reports = store.get("reports", []);
  let reportMarkers = [];
  function pruneReports() {
    const now = Date.now();
    reports = reports.filter((r) => REPORT_META[r.type] && now - r.t < REPORT_META[r.type].ttl * 3600e3);
    store.set("reports", reports);
  }
  // live pins shared by all drivers (Supabase); local `reports` are used only without the cloud
  const cloudPins = new Map();
  const pinLive = (x) => x.active !== false && new Date(x.expires_at).getTime() > Date.now();
  function allPins() {
    pruneReports();
    const out = CL.canReport() ? [] : reports.slice();
    for (const x of cloudPins.values()) if (pinLive(x) && REPORT_META[x.type]) {
      out.push({ id: "c" + x.id, cloudId: x.id, cloud: true, type: x.type, lon: x.lon, lat: x.lat, t: new Date(x.created_at).getTime(),
        still: x.still_there_count, cleared: x.cleared_count, expires: new Date(x.expires_at).getTime() });
    }
    return out;
  }
  function renderReports() {
    reportMarkers.forEach((m) => m.remove());
    reportMarkers = !S.showReports ? [] : allPins().map((r) => {
      const meta = REPORT_META[r.type];
      const el = makeEl("mk", icon(meta.icon, "fill")); el.style.background = meta.color;
      el.onclick = (e) => { e.stopPropagation(); openPinCard(r); };
      return new maplibregl.Marker({ element: el }).setLngLat([r.lon, r.lat]).addTo(map);
    });
  }
  function openPinCard(r) {
    const meta = REPORT_META[r.type];
    const ago = fmtDur((Date.now() - r.t) / 1000) + " " + t("ago");
    $("modalPanel").innerHTML = `<div class="pinCard"><span class="rbadge" style="background:${meta.color}">${icon(meta.icon, "fill")}</span>
      <div><h3 style="margin:0">${esc(t("reports")[r.type])}</h3><div class="pSub">${esc(ago)}${r.cloud ? " · 👍 " + num(r.still || 0) + " · ✅ " + num(r.cleared || 0) : ""}</div></div></div>
      ${r.cloud ? `<div class="bigBtns"><button id="vStill">${icon("thumb_up", "fill")} ${esc(t("stillThere"))}</button><button id="vClear">${icon("check_circle", "fill")} ${esc(t("cleared"))}</button></div>` : ""}
      <div class="btnLine"><button class="primary" id="mClose">${esc(t("close"))}</button></div>`;
    if (r.cloud) { $("vStill").onclick = () => castVote(r.cloudId, "still_there"); $("vClear").onclick = () => castVote(r.cloudId, "cleared"); }
    $("mClose").onclick = closeModal;
    openModal();
  }
  async function castVote(id, v) {
    try { await CL.vote(id, v); toast(t("thanksPoints").replace("{n}", num(2))); }
    catch (e) { toast(String(e.message || e)); }
    closeModal(); if (nav) nav.voted.add("c" + id); verifyChip = null;
  }
  let lastPinFetch = null;
  async function loadPins(force) {
    if (!CL.enabled()) return;
    const [lon, lat] = here();
    if (!force && lastPinFetch && NC.dist(lastPinFetch.at, [lon, lat]) < 15000 && Date.now() - lastPinFetch.t < 120000) return;
    lastPinFetch = { at: [lon, lat], t: Date.now() };
    const list = await CL.fetchIncidents(lat, lon, 0.6);
    cloudPins.clear(); list.forEach((x) => cloudPins.set(x.id, x));
    renderReports(); indexReports();
  }
  CL.subscribeIncidents((ev, row) => {
    if (!row || !row.id) return;
    if (ev === "DELETE" || row.active === false) cloudPins.delete(row.id); else cloudPins.set(row.id, row);
    renderReports(); indexReports();
  });
  setInterval(() => { loadPins(false); renderReports(); }, 60000);
  map.on("moveend", () => loadPins(false));
  function openReportModal() {
    $("modalPanel").innerHTML = `<h3>${esc(t("report"))}</h3><div class="grid3">` +
      Object.entries(REPORT_META).map(([k, m]) => `<button data-k="${k}"><span class="rbadge" style="background:${m.color}">${icon(m.icon, "fill")}</span>${esc(t("reports")[k])}</button>`).join("") +
      `</div><div class="note">${esc(CL.canReport() ? t("reportShareNote") : t("reportNote"))}</div><div class="btnLine"><button id="mClear">${esc(t("clearReports"))}</button><button class="primary" id="mClose">${esc(t("close"))}</button></div>`;
    $("modalPanel").querySelectorAll("[data-k]").forEach((b) => (b.onclick = () => addReport(b.dataset.k)));
    $("mClear").onclick = () => { reports = []; store.set("reports", reports); renderReports(); indexReports(); closeModal(); };
    $("mClose").onclick = closeModal;
    openModal();
  }
  async function addReport(type) {
    const ll = carOn ? carMarker.getLngLat() : meOn ? meMarker.getLngLat() : map.getCenter();
    closeModal();
    if (CL.canReport()) {
      try {
        const row = await CL.report(type, ll.lat, ll.lng);
        cloudPins.set(row.id, row); renderReports(); indexReports();
        toast(t("reportShared").replace("{n}", num(10)));
        return;
      } catch (e) { console.warn("report", e); toast(String(e.message || e)); return; }
    }
    reports.push({ id: "r" + Date.now() + Math.random().toString(36).slice(2, 6), type, lon: ll.lng, lat: ll.lat, t: Date.now() });
    store.set("reports", reports);
    renderReports(); indexReports();
    toast(t("reportSaved"));
  }
  function indexReports() {
    if (!route) return;
    pruneReports();
    route.reportsOnRoute = allPins().map((r) => ({ r, s: NC.snap(route, [r.lon, r.lat], null) }))
      .filter((x) => x.s.off < 35).map((x) => Object.assign({}, x.r, { along: x.s.along }));
  }
  $("btnReport").onclick = openReportModal;
  $("btnVoiceChar").onclick = () => openVoicePacks();

  // =====================================================================
  // modals: save / layers / settings
  // =====================================================================
  function openModal() { show("modal", true); }
  function closeModal() { show("modal", false); }
  $("modal").onclick = (e) => { if (e.target.id === "modal") closeModal(); };

  function openSaveModal(p) {
    const fav = isSaved(p);
    $("modalPanel").innerHTML = `<h3>${esc(t("saveAs"))}</h3><div class="grid3">
      <button data-s="home"><span class="rbadge" style="background:#1a73e8">${icon("home", "fill")}</span>${esc(t("home"))}</button>
      <button data-s="work"><span class="rbadge" style="background:#1a73e8">${icon("work", "fill")}</span>${esc(t("work"))}</button>
      <button data-s="fav" class="${fav ? "on" : ""}"><span class="rbadge" style="background:#f9ab00">${icon("star", "fill")}</span>${esc(t("favorite"))}</button></div>
      <div class="btnLine"><button class="primary" id="mClose">${esc(t("close"))}</button></div>`;
    $("modalPanel").querySelectorAll("[data-s]").forEach((b) => (b.onclick = () => {
      const k = b.dataset.s;
      if (k === "fav") {
        if (fav) saved.favs = saved.favs.filter((f) => NC.dist([f.lon, f.lat], [p.lon, p.lat]) >= 15);
        else saved.favs.push(strip(p));
      } else saved[k] = strip(p);
      saveSaved(); closeModal(); toast(fav && k === "fav" ? t("remove") : t("savedOk")); renderPlace();
    }));
    $("mClose").onclick = closeModal;
    openModal();
  }

  function signGuide(R) {
    const rows = [["camera", "photo_camera", "#e37400"]].concat(Object.entries(ROAD_META).map(([k, m]) => [k, m.icon, m.color]))
      .concat([["police", "local_police", "#1a73e8"], ["jam", "traffic", "#e8710a"], ["flood", "flood", "#1e8e9e"]]);
    return `<div class="note">${esc(R.signsIntro)}</div><div class="list">` + rows.map(([k, ic, col]) =>
      `<div class="item"><span class="ic" style="background:${col};color:#fff">${icon(ic, "fill")}</span><span class="tx"><b>${esc(t("reports")[k] || k)}</b><small>${esc((I.ALERTS[S.lang].road || {})[k] || (I.ALERTS[S.lang].report || {})[k] || "")}</small></span></div>`).join("") +
      `<div class="item"><span class="limit" style="width:36px;height:36px;border-width:4px"><b style="font-size:13px">40</b></span><span class="tx"><b>${esc(t("speedLimit"))}</b><small>${esc(t("estLimit"))}</small></span></div></div>`;
  }

  function openRules(tab) {
    tab = tab || (S.vehicle === "moto" ? "moto" : "car");
    const R = I.RULES[S.lang] || I.RULES.en;
    const li = (arr) => `<div class="list">` + arr.map((x) => `<div class="item"><span class="ic">${icon("check_circle", "fill")}</span><span class="tx" style="white-space:normal">${esc(x)}</span></div>`).join("") + `</div>`;
    $("modalPanel").innerHTML = `<h3>${icon("gavel")} ${esc(t("rules"))}</h3>
      ${seg([["car", R.car_t], ["moto", R.moto_t], ["signs", R.signs_t]], tab, "rtab")}
      ${tab === "signs" ? signGuide(R) : `<div class="secTitle">${esc(tab === "moto" ? R.moto_t : R.car_t)}</div>${li(R[tab])}
      <div class="secTitle">${esc(R.common_t)}</div>${li(R.common)}
      <div class="note">${esc(R.intro)}</div>`}
      <div class="btnLine"><button class="primary" id="mClose">${esc(t("close"))}</button></div>`;
    $("modalPanel").querySelectorAll("[data-rtab]").forEach((b) => (b.onclick = () => openRules(b.dataset.rtab)));
    $("mClose").onclick = closeModal;
    openModal();
  }

  function openLayers() {
    const opt = (k, label) => `<button data-t="${k}" class="${S.tiles === k ? "on" : ""}"><span class="mapThumb" style="background:${TILES[k].thumb}"></span>${esc(label)}</button>`;
    const sw = (k, label) => `<label class="switch"><span>${esc(label)}</span><input type="checkbox" data-sw="${k}" ${S[k] ? "checked" : ""}></label>`;
    $("modalPanel").innerHTML = `<h3>${esc(t("layers"))}</h3><div class="grid3">${opt("dark", t("mapDark"))}${opt("light", t("mapLight"))}${opt("osm", t("mapOsm"))}</div>
      <div class="secTitle">${esc(t("mapDetails"))}</div>${sw("showCameras", t("showCameras"))}${sw("showSignals", t("showSignals"))}${sw("showReports", t("showReports"))}${sw("showSigns", t("showSigns"))}${sw("nightAuto", t("nightAuto"))}
      <div class="btnLine"><button class="primary" id="mClose">${esc(t("close"))}</button></div>`;
    $("modalPanel").querySelectorAll("[data-t]").forEach((b) => (b.onclick = () => { S.tiles = b.dataset.t; saveSettings(); setTiles(S.tiles); openLayers(); }));
    $("modalPanel").querySelectorAll("[data-sw]").forEach((c) => (c.onchange = () => { S[c.dataset.sw] = c.checked; saveSettings(); renderReports(); renderRoadMarkers(route || routes[sel]); }));
    $("mClose").onclick = closeModal;
    openModal();
  }
  $("btnLayers").onclick = openLayers;

  function seg(options, current, attr) {
    return `<div class="seg">` + options.map(([v, label]) => `<button data-${attr}="${v}" class="${String(v) === String(current) ? "on" : ""}">${esc(label)}</button>`).join("") + `</div>`;
  }
  function openSettings() {
    const n = V.voiceNames();
    const needKm = (S.voice === "km" || S.voice === "both") && V.supported && !V.hasKhmer() && !S.forceKm && !(S.kmVoice !== "phone" && V.clipCount() > 0);
    $("modalPanel").innerHTML = `<h3>${esc(t("settings"))}</h3>
      <div class="field"><label>${esc(t("textLang"))}</label>${seg([["km", "ខ្មែរ"], ["en", "English"]], S.lang, "lang")}</div>
      <div class="field"><label>${esc(t("voice"))}</label>${seg([["km", t("voiceKm")], ["en", t("voiceEn")], ["both", t("voiceBoth")], ["off", t("voiceOff")]], S.voice, "voice")}
        <div class="small">km: ${esc(n.km || "—")} · en: ${esc(n.en || "—")}</div>
        <div class="field" style="margin:12px 0 4px"><label>${esc(t("kmVoiceType"))}</label>${seg([["natural", t("kmNatural")], ["phone", t("kmPhone")]], S.kmVoice, "kmv")}
          <div class="small">${V.clipCount() ? esc(t("naturalReady").replace("{n}", num(V.clipCount()))) : esc(t("naturalMissing"))}</div></div>
        ${needKm ? `<div class="warnBox">${esc(t("noKmVoice"))}${V.openSettings ? `<div class="btnLine"><button id="sOpenTts">${esc(t("openVoiceSettings"))}</button></div>` : ""}</div>` : ""}
        <label class="switch"><span>${esc(t("forceKm"))}</span><input type="checkbox" id="sForce" ${S.forceKm ? "checked" : ""}></label>
        <div class="btnLine"><button id="sTest">${icon("volume_up")} ${esc(t("testVoice"))}</button></div></div>
      <div class="field"><label>${esc(t("speedRate"))}</label><input type="range" id="sRate" min="0.6" max="1.4" step="0.1" value="${S.rate}"></div>
      <div class="field"><label>${esc(t("vehicle"))}</label>${seg([["car", t("car")], ["moto", t("moto")]], S.vehicle, "veh")}</div>
      <div class="field"><label>${esc(t("speedWarn"))}</label>${seg([[-1, t("warnOff")], [0, t("warnAt")], [5, "+" + num(5)], [10, "+" + num(10)]], S.speedWarn, "warn")}</div>
      <label class="switch"><span>${esc(t("headingUp"))}</span><input type="checkbox" id="sHead" ${S.headingUp ? "checked" : ""}></label>
      <label class="switch"><span>${esc(t("reminders"))}</span><input type="checkbox" id="sRemind" ${S.reminders ? "checked" : ""}></label>
      <label class="switch"><span>${esc(t("chatter"))}</span><input type="checkbox" id="sChatter" ${S.chatter !== false ? "checked" : ""}></label>
      <div class="small">${esc(t("motoNoExpress"))}</div>
      <div class="btnLine"><button id="sRules">${icon("gavel")} ${esc(t("rules"))}</button></div>
      <div class="field"><label>${esc(t("demoSpeed"))}: <span id="sSimV">${num(S.simKmh)}</span> ${esc(t("kmh"))}</label><input type="range" id="sSim" min="20" max="200" step="10" value="${S.simKmh}"></div>
      <div class="field"><label>${esc(t("ble"))}</label><div class="btnLine" style="margin-top:0"><button id="sBle" ${BLE.supported() ? "" : "disabled"}>${esc(BLE.isConnected() ? t("bleDisconnect") : t("bleConnect"))}</button></div>
        <div class="small">${esc(!BLE.supported() ? t("bleNotSupported") : BLE.isConnected() ? "🟢 " + t("bleOn") : "⚪ " + t("bleOff"))}</div></div>
      <div class="field"><label>${esc(t("routerUrl"))}</label><input type="text" id="sRouter" value="${esc(S.router)}" spellcheck="false"></div>
      <div class="btnLine"><button class="primary" id="mClose">${esc(t("close"))}</button></div>
      <div class="note">CamNAV – នាំផ្លូវ · បើកបរដោយសុវត្ថិភាព<br>© OpenStreetMap contributors · OpenFreeMap · OSRM · Nominatim · Overpass · Open-Meteo</div>`;
    const P = $("modalPanel");
    P.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { S.lang = b.dataset.lang; saveSettings(); relabel(); openSettings(); }));
    P.querySelectorAll("[data-kmv]").forEach((b) => (b.onclick = () => { S.kmVoice = b.dataset.kmv; saveSettings(); openSettings(); }));
    P.querySelectorAll("[data-voice]").forEach((b) => (b.onclick = () => { S.voice = b.dataset.voice; saveSettings(); openSettings(); }));
    P.querySelectorAll("[data-veh]").forEach((b) => (b.onclick = () => { S.vehicle = b.dataset.veh; saveSettings(); syncVehicle(); openSettings(); }));
    P.querySelectorAll("[data-warn]").forEach((b) => (b.onclick = () => { S.speedWarn = +b.dataset.warn; saveSettings(); openSettings(); }));
    $("sForce").onchange = (e) => { S.forceKm = e.target.checked; saveSettings(); openSettings(); };
    $("sTest").onclick = () => { V.unlock(); speak((lang) => I.ALERTS[lang].test, true, VC.alertClips.test()); };
    if ($("sOpenTts")) $("sOpenTts").onclick = () => V.openSettings();
    $("sRate").oninput = (e) => { S.rate = +e.target.value; V.setRate(S.rate); saveSettings(); };
    $("sHead").onchange = (e) => { S.headingUp = e.target.checked; saveSettings(); };
    $("sRemind").onchange = (e) => { S.reminders = e.target.checked; saveSettings(); };
    $("sChatter").onchange = (e) => { S.chatter = e.target.checked; saveSettings(); };
    $("sRules").onclick = () => openRules();
    $("sSim").oninput = (e) => { S.simKmh = +e.target.value; $("sSimV").textContent = num(S.simKmh); saveSettings(); };
    $("sRouter").onchange = (e) => { S.router = e.target.value.trim() || DEFAULTS.router; saveSettings(); };
    $("sBle").onclick = async () => {
      if (BLE.isConnected()) BLE.disconnect();
      else { try { await BLE.connect(); if (nav) nav.bleWindowAt = -1e9; } catch (e) { toast(String(e.message || e)); } }
      openSettings();
    };
    $("mClose").onclick = closeModal;
    openModal();
  }
  $("btnSettings").onclick = () => (CL.enabled() ? openProfile() : openSettings());
  V.onChange(() => { if (!$("modal").classList.contains("hidden") && $("sTest")) openSettings(); });


  // =====================================================================
  // account: guest mode, sign-in, profile, $1 coffee subscription, voice packs
  // =====================================================================
  let afterAuth = null; // what to continue with once the user has signed in

  function renderAvatar() {
    const b = $("btnSettings");
    const p = CL.state.profile;
    if (CL.enabled() && !CL.isGuest() && p) {
      const name = p.display_name || p.phone || "";
      const ch = (name.replace(/^\+855/, "").trim()[0] || "★").toUpperCase();
      b.innerHTML = `<span class="avInit">${esc(ch)}</span>${CL.isPro() ? '<span class="avPro">PRO</span>' : ""}`;
    } else b.innerHTML = icon(CL.enabled() ? "person" : "settings");
    b.setAttribute("aria-label", t("myAccount"));
  }

  /** Open sign-in only when needed (subscribe, funny voices, saving places). */
  function requireAccount(next) {
    if (!CL.enabled()) { toast(t("cloudOff"), 4000); return false; }
    if (!CL.isGuest()) return true;
    afterAuth = next || null;
    openAuth();
    return false;
  }
  function authDone() {
    closeModal();
    toast(t("signedIn"));
    const next = afterAuth; afterAuth = null;
    if (next) setTimeout(next, 250);
  }

  function openAuth(step) {
    const cfg = window.CAMNAV_CONFIG || {};
    const P = $("modalPanel");
    if (step === "code") {
      P.innerHTML = `<h3>${icon("sms")} ${esc(t("enterCode"))}</h3>
        <div class="note">${esc(t("codeSent").replace("{phone}", authPhone || ""))}</div>
        <input id="otp" class="bigInput otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="••••••">
        <div class="btnLine"><button id="aBack">${esc(t("back"))}</button><button class="primary" id="aVerify">${esc(t("verify"))}</button></div>`;
      $("aBack").onclick = () => openAuth();
      $("aVerify").onclick = async () => {
        $("aVerify").disabled = true;
        try { await CL.verifyPhoneCode($("otp").value); authDone(); }
        catch (e) { toast(e.message === "bad-code" ? t("badCode") : String(e.message || e), 4000); $("aVerify").disabled = false; }
      };
      $("otp").oninput = (e) => { if (e.target.value.replace(/\D/g, "").length === 6) $("aVerify").click(); };
      setTimeout(() => $("otp").focus(), 100);
      return openModal();
    }
    P.innerHTML = `<h3>${icon("account_circle")} ${esc(t("signInTitle"))}</h3>
      <div class="note">${esc(t("signInWhy"))}</div>
      ${cfg.phoneLogin !== false ? `<label class="fieldLbl">${esc(t("phoneNumber"))}</label>
      <div class="phoneRow"><span class="cc">🇰🇭 +855</span><input id="phone" class="bigInput" inputmode="tel" placeholder="12 345 678" value="${esc((authPhone || "").replace(/^\+855/, ""))}"></div>
      <button class="wideBtn primary" id="aSend">${icon("sms")} ${esc(t("sendCode"))}</button>` : ""}
      ${cfg.googleLogin !== false ? `<div class="orLine"><span>${esc(t("or"))}</span></div>
      <button class="wideBtn google" id="aGoogle"><svg viewBox="0 0 48 48" width="20" height="20"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> ${esc(t("google"))}</button>` : ""}
      <button class="wideBtn ghost" id="aGuest">${esc(t("continueGuest"))}</button>`;
    if ($("aSend")) $("aSend").onclick = async () => {
      const ph = CL.normalizePhone($("phone").value);
      if (!ph) return toast(t("badPhone"), 3500);
      $("aSend").disabled = true;
      try { authPhone = await CL.sendPhoneCode(ph); openAuth("code"); }
      catch (e) { toast(String(e.message || e), 5000); $("aSend").disabled = false; }
    };
    if ($("aGoogle")) $("aGoogle").onclick = async () => {
      try { pendingGoogle = true; await CL.signInGoogle(); toast(t("finishInBrowser"), 5000); }
      catch (e) { pendingGoogle = false; toast(String(e.message || e), 5000); }
    };
    $("aGuest").onclick = () => { afterAuth = null; closeModal(); };
    openModal();
  }
  let authPhone = null, pendingGoogle = false;

  const STATUS_LABEL = (st) => ({ free: t("stFree"), trialing: t("stTrial"), active: t("stPro"), expired: t("stExpired") }[st] || st);
  function openProfile() {
    const P = $("modalPanel");
    if (!CL.enabled()) { openSettings(); return; }
    const p = CL.state.profile || {};
    const guest = CL.isGuest();
    const pts = p.community_points || 0;
    const rk = CL.rank(pts);
    const st = CL.isPro() ? p.subscription_status : (p.subscription_status === "free" ? "free" : "expired");
    const days = CL.daysLeft();
    P.innerHTML = `<h3>${icon("account_circle")} ${esc(t("myAccount"))}</h3>
      <div class="profileHead">
        <div class="bigAvatar">${guest ? icon("person") : esc(((p.display_name || p.phone || "★").replace(/^\+855/, "").trim()[0] || "★").toUpperCase())}</div>
        <div><b>${esc(guest ? t("guest") : (p.display_name || p.phone || ""))}</b>
          <div class="badges"><span class="badge st-${esc(st)}">${esc(STATUS_LABEL(st))}</span>${CL.isPro() ? `<span class="badge">${esc(t("daysLeft").replace("{n}", num(days)))}</span>` : ""}</div></div>
      </div>
      <div class="rankCard"><div class="rankTop"><span>🏆 ${esc(rk.rank[S.lang] || rk.rank.en)}</span><b>${num(pts)} ${esc(t("points"))}</b></div>
        <div class="bar"><i style="width:${Math.round(rk.progress * 100)}%"></i></div>
        <small>${rk.next ? esc(t("nextRank").replace("{rank}", rk.next[S.lang] || rk.next.en).replace("{n}", num(rk.next.min - pts))) : esc(t("topRank"))}</small></div>
      ${guest ? `<button class="wideBtn primary" id="pSignIn">${icon("login")} ${esc(t("signInTitle"))}</button>` : ""}
      <button class="wideBtn coffee" id="pCoffee">☕ ${esc(CL.isPro() ? t("renewCoffee") : t("coffeeCta"))}</button>
      <div class="menuList">
        <button id="pVoice">${icon("record_voice_over")}<span>${esc(t("voicePacks"))}</span><small>${esc(activePack().name[S.lang])}</small></button>
        <button id="pRules">${icon("gavel")}<span>${esc(t("rules"))}</span></button>
        <button id="pSettings">${icon("settings")}<span>${esc(t("settings"))}</span></button>
        ${guest ? "" : `<button id="pOut">${icon("logout")}<span>${esc(t("signOut"))}</span></button>`}
      </div>
      <div class="btnLine"><button class="primary" id="mClose">${esc(t("close"))}</button></div>`;
    if ($("pSignIn")) $("pSignIn").onclick = () => { afterAuth = openProfile; openAuth(); };
    $("pCoffee").onclick = () => openPaywall();
    $("pVoice").onclick = () => openVoicePacks();
    $("pRules").onclick = () => openRules();
    $("pSettings").onclick = () => openSettings();
    if ($("pOut")) $("pOut").onclick = async () => { await CL.signOut(); toast(t("signedOut")); openProfile(); };
    $("mClose").onclick = closeModal;
    openModal();
  }

  // ---------- $1/month "Developer coffee" ----------
  let payPoll = null;
  function stopPayPoll() { if (payPoll) { clearInterval(payPoll); payPoll = null; } }
  function openPaywall() {
    stopPayPoll();
    const p = CL.state.profile || {};
    const P = $("modalPanel");
    const perks = ["perkVoices", "perkAdFree", "perkOffline", "perkShortcuts"].map((k) => `<div class="perk">${icon("check_circle", "fill")}<span>${esc(t(k))}</span></div>`).join("");
    P.innerHTML = `<div class="paywall">
      <div class="cup">☕</div>
      <h3>${esc(t("coffeeTitle"))}</h3>
      <div class="price"><b>$1</b> / ${esc(t("month"))}</div>
      <div class="note center">${esc(t("coffeeWhy"))}</div>
      ${perks}
      ${CL.isPro() ? `<div class="okBox">${esc(t("proUntil").replace("{date}", new Date(p.subscription_expires_at).toLocaleDateString()))}</div>` : ""}
      ${!p.trial_used && !CL.isPro() ? `<button class="wideBtn primary" id="wTrial">🎁 ${esc(t("startTrial"))}</button>` : ""}
      <button class="wideBtn khqr" id="wKhqr"><span class="khqrTag">KHQR</span> ${esc(t("payKhqr"))}</button>
      <button class="wideBtn ghost" id="wPlay">${icon("shop")} ${esc(t("payPlay"))}</button>
      <div class="note center">${esc(t("payNote"))}</div>
      <button class="wideBtn ghost" id="mClose">${esc(t("notNow"))}</button></div>`;
    if ($("wTrial")) $("wTrial").onclick = async () => {
      if (!requireAccount(openPaywall)) return;
      try { await CL.startTrial(); toast(t("trialStarted"), 4000); closeModal(); }
      catch (e) { toast(String(e.message || e), 4000); }
    };
    $("wKhqr").onclick = () => { if (requireAccount(openPaywall)) openKhqr(); };
    $("wPlay").onclick = () => toast(t("playSoon"), 4000);
    $("mClose").onclick = () => { stopPayPoll(); closeModal(); };
    openModal();
  }
  /** Card with the owner's own ABA KHQR (unchanged) under the K'MAP name. */
  function openStaticKhqr() {
    const cfg = window.CAMNAV_CONFIG || {};
    const P = $("modalPanel");
    const qr = qrcode(0, "M"); qr.addData(cfg.khqrStatic); qr.make();
    const q = { amount: cfg.priceUsd || 1, bill_number: "", brand: cfg.payeeBrand || "CamNAV", account: cfg.payeeAccountName || "" };
    P.innerHTML = `<div class="paywall">
      <div class="khqrCard"><div class="khqrHead">KHQR</div>
        <div class="khqrName big">${esc(q.brand)}</div>
        <div class="khqrAcct">${esc(t("accountName"))}: ${esc(q.account)}</div>
        <div class="khqrAmt">$${Number(q.amount).toFixed(2)} <small>/ ${esc(t("month"))}</small></div>
        <div class="khqrCode">${qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true })}</div></div>
      <div class="steps">
        <div><b>1</b>${esc(t("payStep1").replace("{amount}", "$" + Number(q.amount).toFixed(2)))}</div>
        <div><b>2</b>${esc(t("payStep2").replace("{phone}", (CL.state.profile && CL.state.profile.phone) || t("yourPhone")))}</div>
        <div><b>3</b>${esc(t("payStep3"))}</div>
      </div>
      <button class="wideBtn primary" id="wPaid">${icon("check_circle", "fill")} ${esc(t("iPaid"))}</button>
      <button class="wideBtn" id="wSave">${icon("download")} ${esc(t("saveQr"))}</button>
      <div class="note center small">${esc(t("saveQrHow"))}</div>
      <button class="wideBtn ghost" id="mClose">${esc(t("cancel"))}</button></div>`;
    $("wSave").onclick = () => saveQrImage(qr, q);
    $("wPaid").onclick = async () => {
      $("wPaid").disabled = true;
      try {
        const tx = await CL.claimPayment((CL.state.profile && CL.state.profile.phone) || "");
        P.innerHTML = `<div class="paywall"><div class="cup">☕</div><h3>${esc(t("thanksCoffee"))}</h3>
          <div class="okBox">${esc(t("paidPending"))}</div><div class="note center">${esc(t("billRef"))}: <b>${esc(tx.bill_number || "")}</b></div>
          <button class="wideBtn primary" id="mClose">${esc(t("done"))}</button></div>`;
        $("mClose").onclick = closeModal;
      } catch (e) { toast(String(e.message || e), 5000); $("wPaid").disabled = false; }
    };
    $("mClose").onclick = closeModal;
  }

  async function openKhqr() {
    if ((window.CAMNAV_CONFIG || {}).khqrStatic) return openStaticKhqr();
    const P = $("modalPanel");
    P.innerHTML = `<div class="paywall"><div class="note center">${esc(t("makingQr"))}</div></div>`;
    let q;
    try { q = await CL.createKhqr(); }
    catch (e) { P.innerHTML = `<div class="paywall"><div class="warnBox">${esc(t("khqrFail"))}<br><small>${esc(String(e.message || e))}</small></div><button class="wideBtn ghost" id="mClose">${esc(t("close"))}</button></div>`; $("mClose").onclick = closeModal; return; }
    const qr = qrcode(0, "M"); qr.addData(q.qr); qr.make();
    P.innerHTML = `<div class="paywall">
      <div class="khqrCard"><div class="khqrHead">KHQR</div>
        <div class="khqrName">CamNAV · ☕</div><div class="khqrAmt">$${Number(q.amount).toFixed(2)}</div>
        <div class="khqrCode">${qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true })}</div></div>
      <div class="note center" id="payStatus">${esc(t("scanToPay"))}</div>
      <button class="wideBtn primary" id="wSave">${icon("download")} ${esc(t("saveQr"))}</button>
      <div class="note center small">${esc(t("saveQrHow"))}</div>
      <button class="wideBtn ghost" id="mClose">${esc(t("cancel"))}</button></div>`;
    $("wSave").onclick = () => saveQrImage(qr, q);
    $("mClose").onclick = () => { stopPayPoll(); closeModal(); };
    const until = new Date(q.expires_at).getTime();
    stopPayPoll();
    payPoll = setInterval(async () => {
      if (Date.now() > until) { stopPayPoll(); $("payStatus") && ($("payStatus").textContent = t("qrExpired")); return; }
      try {
        const r = await CL.verifyKhqr(q.md5);
        if (r && r.paid) {
          stopPayPoll();
          P.innerHTML = `<div class="paywall"><div class="cup">🎉</div><h3>${esc(t("thanksCoffee"))}</h3>
            <div class="okBox">${esc(t("proUntil").replace("{date}", new Date(r.profile.subscription_expires_at).toLocaleDateString()))}</div>
            <button class="wideBtn primary" id="mClose">${esc(t("done"))}</button></div>`;
          $("mClose").onclick = closeModal;
          renderAvatar();
        }
      } catch (e) { console.warn("verify", e); }
    }, 4000);
  }
  /** Save the KHQR as a picture so it can be opened from the gallery in ABA / Bakong on the same phone. */
  function saveQrImage(qr, q) {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas"); c.width = 600; c.height = 760;
      const g = c.getContext("2d");
      g.fillStyle = "#fff"; g.fillRect(0, 0, 600, 760);
      g.fillStyle = "#e1232e"; g.fillRect(0, 0, 600, 90);
      g.fillStyle = "#fff"; g.font = "bold 44px Roboto, sans-serif"; g.textAlign = "center"; g.fillText("KHQR", 300, 62);
      g.fillStyle = "#202124"; g.font = "bold 34px Roboto, sans-serif"; g.fillText((q.brand || "CamNAV") + " · $" + Number(q.amount).toFixed(2), 300, 140);
      g.imageSmoothingEnabled = false; g.drawImage(img, 75, 170, 450, 450);
      g.fillStyle = "#5f6368"; g.font = "22px Roboto, sans-serif"; g.fillText(q.account ? "Account: " + q.account : (q.bill_number || ""), 300, 680);
      g.fillText("CamNAV – នាំផ្លូវ", 300, 720);
      const data = c.toDataURL("image/png");
      if (window.AndroidApp && window.AndroidApp.saveImage) {
        const ok = window.AndroidApp.saveImage(data, "CamNAV-KHQR-" + (q.bill_number || Date.now()) + ".png");
        toast(ok ? t("qrSaved") : t("qrSaveFail"), 4000);
      } else {
        const a = document.createElement("a"); a.href = data; a.download = "CamNAV-KHQR.png"; a.click();
      }
    };
    img.src = qr.createDataURL(8, 2);
  }

  // ---------- voice packs ----------
  function openVoicePacks() {
    const P = $("modalPanel");
    P.innerHTML = `<h3>${icon("record_voice_over")} ${esc(t("voicePacks"))}</h3><div class="packList">` + VP.PACKS.map((p) => {
      const locked = p.pro && !CL.isPro();
      const on = activePack().id === p.id;
      return `<div class="pack ${on ? "on" : ""}" data-p="${p.id}">
        <div class="packIcon" style="background:${p.color}">${p.emoji}</div>
        <div class="packTx"><b>${esc(p.name[S.lang] || p.name.en)}</b><small>${esc(p.desc[S.lang] || p.desc.en)}</small>
          <span class="badge ${p.pro ? "pro" : "free"}">${p.pro ? (locked ? "🔒 PRO $1" : "PRO") : esc(t("free"))}</span></div>
        <div class="packBtns"><button data-play="${p.id}" aria-label="Preview">${icon("play_arrow", "fill")}</button>
          <button data-share="${p.id}" aria-label="Share">${icon("share")}</button></div></div>`;
    }).join("") + `</div><div class="btnLine"><button class="primary" id="mClose">${esc(t("close"))}</button></div>`;
    P.querySelectorAll("[data-play]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); previewPack(b.dataset.play); }));
    P.querySelectorAll("[data-share]").forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      const p = VP.byId(b.dataset.share);
      shareText("🔊 " + p.name.km + " – CamNAV នាំផ្លូវ\n\n“" + p.lines.start_route[0] + "”\n\n#CamNAV #នាំផ្លូវ #Cambodia");
    }));
    P.querySelectorAll(".pack").forEach((el) => (el.onclick = () => {
      const p = VP.byId(el.dataset.p);
      if (p.pro && !CL.isPro()) { if (requireAccount(openPaywall)) openPaywall(); return; }
      S.voicePack = p.id; saveSettings(); CL.updatePrefs({ selected_voice_pack: p.id });
      toast("🔊 " + p.name[S.lang]); openVoicePacks();
    }));
    $("mClose").onclick = closeModal;
    openModal();
  }
  function previewPack(id) {
    V.unlock();
    const p = VP.byId(id);
    const parts = ["start_route", p.lines.chatter ? "chatter" : "turn_right_200m"].map((ev) => {
      const i = VP.pickTake(p, ev), f = VP.clipPath(p.id, ev, i);
      const sty = p.tts || {};
      return V.hasFile(f) ? { lang: "km", clips: [f] } : { lang: V.hasKhmer() || S.forceKm ? "km" : "en", text: V.hasKhmer() || S.forceKm ? p.lines[ev][i] : I.ALERTS.en.test, pitch: sty.pitch, rate: sty.rate };
    });
    V.say(parts, true);
  }

  // renewal reminder 3 days before the end
  function renewalBanner() {
    if (!CL.enabled() || !CL.isPro()) return "";
    const d = CL.daysLeft();
    if (d > 3) return "";
    return `<div class="renewBar" id="renewBar">☕ ${esc(t("renewSoon").replace("{n}", num(d)))}<button>${esc(t("renew"))}</button></div>`;
  }

  CL.onChange((st) => {
    renderAvatar();
    const p = st.profile;
    if (p) {
      const veh = p.preferred_vehicle === "car" ? "car" : "moto";
      if (veh !== S.vehicle && !vehicleChangedLocally) { S.vehicle = veh; saveSettings(); }
      if (p.selected_voice_pack && VP.byId(p.selected_voice_pack).id === p.selected_voice_pack) { S.voicePack = p.selected_voice_pack; saveSettings(); }
    }
    if (pendingGoogle && !CL.isGuest()) { pendingGoogle = false; authDone(); }
    if (view === "home") renderHome();
    loadPins(true);
  });
  let vehicleChangedLocally = false;
  function syncVehicle() { vehicleChangedLocally = true; CL.updatePrefs({ preferred_vehicle: S.vehicle === "moto" ? "motorbike" : "car" }); }

  // =====================================================================
  // share
  // =====================================================================
  async function shareText(text) {
    if (window.AndroidApp && window.AndroidApp.share) { window.AndroidApp.share(text); return; }
    if (navigator.share) { try { await navigator.share({ text }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(text); toast(t("copied")); } catch { toast(text, 6000); }
  }

  // =====================================================================
  // ESP32 car screen (optional, Chrome only)
  // =====================================================================
  function bleTick(lonlat, hdg, speed, now) {
    if (!BLE.isConnected() || !nav || now - nav.lastBle < 1000) return;
    nav.lastBle = now;
    if (nav.along - nav.bleWindowAt > 300) {
      nav.bleWindowAt = nav.along;
      const startIdx = NC.pointAt(route, nav.along - 350).idx;
      const pts = NC.decimate(route.coords.slice(startIdx, startIdx + 600), 256);
      if (pts.length >= 2) BLE.send(BLE.encRoute(pts, 15));
    }
    BLE.send(BLE.encPos(lonlat[0], lonlat[1], speed * 3.6, hdg, nav.limit ? nav.limit.v : 0));
    const step = route.steps[nav.stepIdx], nx = route.steps[nav.stepIdx + 1];
    BLE.send(BLE.encNav(nav.distTo, NC.ESP_ID[NC.iconOf(step)], I.streetFor(step, "km")));
    if (nx) BLE.send(BLE.encNav(Math.max(0, nx.at - nav.along), NC.ESP_ID[NC.iconOf(nx)], I.streetFor(nx, "km"), true));
    const d = new Date();
    if (d.getMinutes() !== nav.lastMinute) {
      nav.lastMinute = d.getMinutes();
      BLE.send(BLE.encClock(d.getHours(), d.getMinutes()));
      const eta = new Date(Date.now() + route.duration * (nav.remaining / (route.total || 1)) * 1000);
      BLE.send(BLE.encEta(eta.getHours(), eta.getMinutes(), dest ? dest.name : ""));
    }
    BLE.send(BLE.encCamera(nav.cameraAhead || 0, false));
  }

  // =====================================================================
  // wake lock (browser; the APK keeps the screen on by itself)
  // =====================================================================
  async function requestWakeLock() { try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); } catch {} }
  function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; } }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && view === "nav") requestWakeLock(); });

  // =====================================================================
  // boot
  // =====================================================================
  $("btnLocate").onclick = () => {
    startGps();
    if (fix) map.easeTo({ center: [fix.lon, fix.lat], zoom: Math.max(map.getZoom(), 16), bearing: 0, pitch: 0, duration: 600 });
    else toast(t("locating"));
  };
  function relabel() {
    document.documentElement.lang = S.lang;
    $("q").placeholder = t("searchPh");
    $("spdUnit").textContent = t("kmh");
    $("recenterTxt").textContent = t("recenter") || "";
    renderChips(); renderWeather();
    if (view === "home") renderHome();
    else if (view === "place") renderPlace();
    else if (view === "dirs" && routes.length) { routes.forEach((r) => (r.via = viaName(r))); renderDirs(); }
    else if (view === "nav") updateNavUI(true);
  }
  window.addEventListener("resize", updateSheetHeight);

  if (document.fonts && document.fonts.load) {
    document.fonts.load('24px "Material Symbols Rounded"', "home").then(() => {
      if (document.fonts.check('24px "Material Symbols Rounded"', "home")) document.documentElement.classList.add("icons-ready");
    }).catch(() => {});
  } else document.documentElement.classList.add("icons-ready");

  setTimeout(() => { const sp = $("splash"); if (sp) { sp.classList.add("gone"); setTimeout(() => sp.remove(), 600); } }, 1300);

  V.setRate(S.rate);
  relabel();
  renderHome();
  renderReports();
  startGps();
  setTimeout(() => { if (view === "home") toast(t("longPress"), 3500); }, 1800);
  if (!window.AndroidTTS && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  renderAvatar();
  CL.init().then(() => { renderAvatar(); loadPins(true); });
  window.CamNAV = window.CamNav = {
    get route() { return route; }, get routes() { return routes; }, get nav() { return nav; }, map, dropPin, openPlace,
    openProfile, openPaywall, openVoicePacks, openAuth,
    // Android calls this when Google sign-in returns through camnav://login
    onDeepLink: (url) => CL.handleDeepLink(url).then(() => { if (!CL.isGuest()) authDone(); }).catch((e) => toast(String(e.message || e), 5000)),
  };
})();
