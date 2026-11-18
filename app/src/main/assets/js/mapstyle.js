/* CamNAV — vector map styles (OpenFreeMap / OpenMapTiles data, no API key).
 * "dark": night-blue land, navy water, gold main roads (CamNAV default)
 * "light": soft Google-like day style
 * Labels use Latin names (MapLibre cannot shape Khmer script yet); the
 * "Khmer labels" raster style is still available in the layers menu.
 */
(function (root) {
  "use strict";

  const PALETTES = {
    dark: {
      bg: "#1c232d", landcover: "#1f2a2a", park: "#1d3127", landuse: "#212a35", building: "#262f3b", buildingLine: "#2e3946",
      water: "#14304d", waterway: "#1d4369", waterLabel: "#7fa7cf",
      minor: "#37414e", minorCase: "#1c232d", mid: "#4a5462", midCase: "#1c232d",
      major: "#a58a4c", majorCase: "#5b4b26", motorway: "#c19a4f", rail: "#4b5563",
      boundary: "#8b95a3", label: "#e3e6ea", labelDim: "#aab2bd", halo: "#1c232d", place: "#f2f4f7",
    },
    light: {
      bg: "#f3f1ec", landcover: "#e5ecd9", park: "#cfe6c4", landuse: "#ece9e2", building: "#e4e1db", buildingLine: "#d8d4cc",
      water: "#aadaff", waterway: "#8cc8f5", waterLabel: "#3d7bb5",
      minor: "#ffffff", minorCase: "#d9d5cd", mid: "#ffffff", midCase: "#cfc9bf",
      major: "#fbd38d", majorCase: "#e1ad5b", motorway: "#f7b955", rail: "#bdbab4",
      boundary: "#9e9aa8", label: "#3c4043", labelDim: "#5f6368", halo: "#ffffff", place: "#202124",
    },
  };

  const NAME = ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]];
  const Z = (stops) => ["interpolate", ["exponential", 1.4], ["zoom"], ...stops];
  // zoom expressions must stay top-level, so scale the stop values instead of wrapping
  const scaleZ = (z, k) => z.map((v, i) => (i >= 3 && i % 2 === 0 ? +(v * k).toFixed(2) : v));
  const cls = (list) => ["match", ["get", "class"], list, true, false];

  function build(kind) {
    const c = PALETTES[kind] || PALETTES.dark;
    const roadGroups = [
      { id: "minor", classes: ["minor", "service", "track", "raw"], color: c.minor, casing: c.minorCase, min: 12,
        w: Z([12, 0.6, 14, 2.2, 16, 6, 18, 14]) },
      { id: "mid", classes: ["tertiary", "secondary"], color: c.mid, casing: c.midCase, min: 9,
        w: Z([9, 0.6, 12, 1.6, 14, 4, 16, 9, 18, 18]) },
      { id: "major", classes: ["primary", "trunk"], color: c.major, casing: c.majorCase, min: 6,
        w: Z([6, 0.7, 10, 1.8, 12, 3, 14, 6, 16, 12, 18, 24]) },
      { id: "motorway", classes: ["motorway"], color: c.motorway, casing: c.majorCase, min: 5,
        w: Z([5, 0.8, 10, 2.2, 12, 3.6, 14, 7, 16, 14, 18, 26]) },
    ];
    const layers = [
      { id: "bg", type: "background", paint: { "background-color": c.bg } },
      { id: "landcover", type: "fill", source: "omt", "source-layer": "landcover",
        filter: cls(["wood", "grass", "farmland", "wetland"]), paint: { "fill-color": c.landcover, "fill-opacity": 0.6 } },
      { id: "landuse", type: "fill", source: "omt", "source-layer": "landuse", minzoom: 12,
        filter: cls(["hospital", "school", "university", "commercial", "retail", "industrial", "stadium"]),
        paint: { "fill-color": c.landuse, "fill-opacity": 0.8 } },
      { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": c.park, "fill-opacity": 0.85 } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": c.water } },
      { id: "waterway", type: "line", source: "omt", "source-layer": "waterway", minzoom: 8,
        paint: { "line-color": c.waterway, "line-width": Z([8, 0.5, 14, 2, 18, 6]) } },
      { id: "aeroway", type: "fill", source: "omt", "source-layer": "aeroway", minzoom: 11,
        filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": c.landuse } },
      { id: "building", type: "fill", source: "omt", "source-layer": "building", minzoom: 14,
        paint: { "fill-color": c.building, "fill-outline-color": c.buildingLine } },
      { id: "boundary", type: "line", source: "omt", "source-layer": "boundary",
        filter: ["all", ["<=", ["get", "admin_level"], 6], ["!=", ["get", "maritime"], 1]],
        paint: { "line-color": c.boundary, "line-opacity": 0.55, "line-dasharray": [1, 2],
          "line-width": ["match", ["get", "admin_level"], 2, 1.6, 1] } },
      { id: "rail", type: "line", source: "omt", "source-layer": "transportation", minzoom: 11,
        filter: cls(["rail", "transit"]), paint: { "line-color": c.rail, "line-width": 1.2, "line-dasharray": [3, 3] } },
    ];
    // casings first, then fills, so crossings look clean
    for (const g of roadGroups) {
      layers.push({ id: "road-" + g.id + "-case", type: "line", source: "omt", "source-layer": "transportation", minzoom: g.min,
        filter: cls(g.classes), layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": g.casing, "line-width": g.w, "line-gap-width": 0, "line-opacity": kind === "dark" ? 0.6 : 1,
          "line-blur": 0.4, "line-translate": [0, 0] } });
    }
    for (const g of roadGroups) {
      layers.push({ id: "road-" + g.id, type: "line", source: "omt", "source-layer": "transportation", minzoom: g.min,
        filter: cls(g.classes), layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": g.color, "line-width": scaleZ(g.w, 0.74) } });
    }
    const text = (size, color, font = "Noto Sans Regular") => ({
      layout: { "text-field": NAME, "text-font": [font], "text-size": size, "text-max-width": 8 },
      paint: { "text-color": color, "text-halo-color": c.halo, "text-halo-width": 1.6 },
    });
    layers.push(
      Object.assign({ id: "water-name", type: "symbol", source: "omt", "source-layer": "water_name", minzoom: 10 },
        mergeText(text(Z([10, 11, 16, 15]), c.waterLabel, "Noto Sans Italic"), { "symbol-placement": "line" , "text-letter-spacing": 0.15 })),
      Object.assign({ id: "road-name", type: "symbol", source: "omt", "source-layer": "transportation_name", minzoom: 13 },
        mergeText(text(Z([13, 10.5, 16, 13.5, 18, 15]), c.labelDim), { "symbol-placement": "line", "text-rotation-alignment": "map" })),
      Object.assign({ id: "place-minor", type: "symbol", source: "omt", "source-layer": "place", minzoom: 11,
        filter: cls(["suburb", "neighbourhood", "quarter", "village", "hamlet"]) },
        text(Z([11, 11, 16, 15]), c.labelDim)),
      Object.assign({ id: "place-town", type: "symbol", source: "omt", "source-layer": "place", minzoom: 7,
        filter: cls(["town"]) }, text(Z([7, 11, 14, 16]), c.label, "Noto Sans Bold")),
      Object.assign({ id: "place-city", type: "symbol", source: "omt", "source-layer": "place", maxzoom: 15,
        filter: cls(["city"]) }, text(Z([4, 12, 10, 18, 14, 26]), c.place, "Noto Sans Bold")),
      Object.assign({ id: "place-country", type: "symbol", source: "omt", "source-layer": "place", maxzoom: 7,
        filter: cls(["country"]) }, text(Z([3, 12, 7, 18]), c.labelDim, "Noto Sans Bold"))
    );
    return {
      version: 8,
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet",
        attribution: '© <a href="https://openfreemap.org">OpenFreeMap</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' } },
      layers,
    };
  }
  function mergeText(t, extraLayout) { t.layout = Object.assign({}, t.layout, extraLayout); return t; }

  root.MapStyles = { build, PALETTES };
})(typeof self !== "undefined" ? self : this);
