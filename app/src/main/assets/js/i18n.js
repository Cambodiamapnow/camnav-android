/* CamNav — Khmer / English text: UI labels and spoken turn instructions. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.I18N = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const KM_DIGITS = "០១២៣៤៥៦៧៨៩";
  /** 12.5 -> "១២.៥" */
  const kmNum = (n) => String(n).replace(/[0-9]/g, (d) => KM_DIGITS[+d]);
  const isKhmer = (s) => /[ក-៿]/.test(s || "");

  // ---------- UI labels ----------
  const UI = {
    en: {
      searchPh: "Search here", noResults: "No places found", searching: "Searching…",
      cats: { fuel: "Gas", restaurant: "Restaurants", cafe: "Coffee", atm: "ATMs", hospital: "Hospitals", pharmacy: "Pharmacies", hotel: "Hotels", parking: "Parking", marketplace: "Markets" },
      home: "Home", work: "Work", saved: "Saved", recent: "Recent", tapToSet: "Tap to set",
      directions: "Directions", start: "Start", save: "Save", share: "Share", savedOk: "Saved", saveAs: "Save as", favorite: "Favorites", remove: "Remove",
      yourLocation: "Your location", car: "Car", moto: "Motorbike",
      fastest: "Fastest route", via: "via", steps: "Steps", demo: "Demo drive", cancel: "Cancel", back: "Back",
      exit: "Exit", overview: "Overview", arrivedTitle: "You have arrived", done: "Done",
      min: "min", hr: "hr", km: "km", m: "m", kmh: "km/h",
      speedLimit: "Speed limit", estLimit: "Estimated from Cambodian law (no sign in map data)",
      slowTraffic: "Slow traffic? Report a jam", report: "Report", reports: { police: "Police", accident: "Crash", jam: "Traffic jam", hazard: "Hazard", flood: "Flood", camera: "Speed camera" },
      reportSaved: "Report added. Thanks!", reportNote: "Reports are kept on this phone for now. Sharing them with all drivers needs a server.", clearReports: "Clear my reports",
      shareEta: "I'm on my way to {dest}. Arriving around {time} ({left}).", copied: "Copied — paste it in a message",
      layers: "Map type", mapDefault: "Default", mapOsm: "Khmer labels", mapDark: "Dark", mapDetails: "Map details",
      nightAuto: "Dark map at night while driving", showSignals: "Traffic lights", showCameras: "Speed cameras", showReports: "Driver reports",
      settings: "Settings", voice: "Voice", voiceKm: "Khmer", voiceEn: "English", voiceBoth: "Khmer + English", voiceOff: "Off",
      textLang: "Language", testVoice: "Test voice", headingUp: "Turn map with car", speedRate: "Speaking speed", demoSpeed: "Demo drive speed",
      vehicle: "Vehicle", speedWarn: "Speed warning", warnOff: "Off", warnAt: "At limit",
      routerUrl: "Routing server (OSRM)", ble: "ESP32 car screen (Bluetooth)", bleConnect: "Connect NAV-OSM", bleDisconnect: "Disconnect",
      bleNotSupported: "Bluetooth works in Chrome only (not in the APK)", bleOn: "Connected", bleOff: "Not connected",
      noKmVoice: "No Khmer voice on this phone yet. Install it: Settings → Text-to-speech → Google → Install voice data → Khmer. Until then, English is spoken.",
      forceKm: "Use Khmer even if no Khmer voice is listed", openVoiceSettings: "Open voice settings",
      locating: "Finding your location…", noGps: "Location is off — using the map centre as start.",
      routing: "Finding routes…", routeFail: "Couldn't find a route. Check your internet and try again.", rerouting: "Rerouting…",
      longPress: "Tip: press and hold the map to drop a pin", pickedPoint: "Dropped pin", ago: "ago", close: "Close",
      then: "Then", mute: "Mute", kmVoiceType: "Khmer voice", kmNatural: "Natural (recorded)", kmPhone: "Phone voice", naturalReady: "Natural Khmer voice installed ({n} clips)", naturalMissing: "Natural Khmer voice not installed yet — using the phone voice", recenter: "Re-centre", loadingRoad: "Loading speed limits and cameras…", noMore: "",
      weather: { 0: "Clear", 1: "Cloudy", 45: "Fog", 51: "Drizzle", 61: "Rain", 95: "Storm" },
    },
    km: {
      searchPh: "ស្វែងរកនៅទីនេះ", noResults: "រកមិនឃើញទីកន្លែង", searching: "កំពុងស្វែងរក…",
      cats: { fuel: "ស្ថានីយប្រេង", restaurant: "ភោជនីយដ្ឋាន", cafe: "កាហ្វេ", atm: "ATM", hospital: "មន្ទីរពេទ្យ", pharmacy: "ឱសថស្ថាន", hotel: "សណ្ឋាគារ", parking: "ចំណតឡាន", marketplace: "ផ្សារ" },
      home: "ផ្ទះ", work: "កន្លែងធ្វើការ", saved: "បានរក្សាទុក", recent: "ថ្មីៗ", tapToSet: "ចុចដើម្បីកំណត់",
      directions: "ទិសដៅ", start: "ចាប់ផ្តើម", save: "រក្សាទុក", share: "ចែករំលែក", savedOk: "បានរក្សាទុក", saveAs: "រក្សាទុកជា", favorite: "ចំណូលចិត្ត", remove: "លុប",
      yourLocation: "ទីតាំងរបស់អ្នក", car: "ឡាន", moto: "ម៉ូតូ",
      fastest: "ផ្លូវលឿនបំផុត", via: "តាម", steps: "ជំហាន", demo: "សាកល្បងបើកបរ", cancel: "បោះបង់", back: "ត្រឡប់",
      exit: "ចាកចេញ", overview: "មើលទាំងមូល", arrivedTitle: "អ្នកបានមកដល់ហើយ", done: "រួចរាល់",
      min: "នាទី", hr: "ម៉ោង", km: "គ.ម", m: "ម", kmh: "គ.ម/ម៉",
      speedLimit: "ល្បឿនកំណត់", estLimit: "ប៉ាន់ស្មានតាមច្បាប់ចរាចរណ៍កម្ពុជា (គ្មានស្លាកក្នុងទិន្នន័យផែនទី)",
      slowTraffic: "ចរាចរណ៍យឺត? រាយការណ៍ការស្ទះ", report: "រាយការណ៍", reports: { police: "ប៉ូលិស", accident: "គ្រោះថ្នាក់", jam: "ស្ទះចរាចរណ៍", hazard: "ឧបសគ្គ", flood: "ទឹកលិច", camera: "កាមេរ៉ាល្បឿន" },
      reportSaved: "បានបន្ថែមរបាយការណ៍។ អរគុណ!", reportNote: "បច្ចុប្បន្ន របាយការណ៍រក្សាទុកតែលើទូរស័ព្ទនេះ។ ការចែករំលែកជាមួយអ្នកបើកបរទាំងអស់ត្រូវការម៉ាស៊ីនមេ។", clearReports: "លុបរបាយការណ៍របស់ខ្ញុំ",
      shareEta: "ខ្ញុំកំពុងធ្វើដំណើរទៅ {dest}។ នឹងមកដល់ប្រហែលម៉ោង {time} ({left})។", copied: "បានចម្លង — បិទភ្ជាប់ក្នុងសារ",
      layers: "ប្រភេទផែនទី", mapDefault: "លំនាំដើម", mapOsm: "ឈ្មោះខ្មែរ", mapDark: "ងងឹត", mapDetails: "ព័ត៌មានលើផែនទី",
      nightAuto: "ផែនទីងងឹតពេលយប់ ពេលបើកបរ", showSignals: "ភ្លើងស្តុប", showCameras: "កាមេរ៉ាល្បឿន", showReports: "របាយការណ៍អ្នកបើកបរ",
      settings: "ការកំណត់", voice: "សំឡេង", voiceKm: "ខ្មែរ", voiceEn: "អង់គ្លេស", voiceBoth: "ខ្មែរ + អង់គ្លេស", voiceOff: "បិទ",
      textLang: "ភាសា", testVoice: "សាកល្បងសំឡេង", headingUp: "បង្វិលផែនទីតាមទិសឡាន", speedRate: "ល្បឿននិយាយ", demoSpeed: "ល្បឿនសាកល្បង",
      vehicle: "យានយន្ត", speedWarn: "ការព្រមានល្បឿន", warnOff: "បិទ", warnAt: "ត្រឹមកំណត់",
      routerUrl: "ម៉ាស៊ីនរកផ្លូវ (OSRM)", ble: "អេក្រង់ ESP32 ក្នុងឡាន (ប៊្លូធូស)", bleConnect: "ភ្ជាប់ NAV-OSM", bleDisconnect: "ផ្តាច់",
      bleNotSupported: "ប៊្លូធូសដំណើរការតែក្នុង Chrome (មិនមែនក្នុង APK)", bleOn: "បានភ្ជាប់", bleOff: "មិនទាន់ភ្ជាប់",
      noKmVoice: "ទូរស័ព្ទនេះមិនទាន់មានសំឡេងខ្មែរ។ សូមដំឡើង៖ Settings → Text-to-speech → Google → Install voice data → Khmer។ មុនពេលដំឡើង កម្មវិធីនិយាយជាភាសាអង់គ្លេស។",
      forceKm: "ប្រើសំឡេងខ្មែរ ទោះបីរកមិនឃើញក្នុងបញ្ជីក៏ដោយ", openVoiceSettings: "បើកការកំណត់សំឡេង",
      locating: "កំពុងស្វែងរកទីតាំងរបស់អ្នក…", noGps: "ទីតាំងត្រូវបានបិទ — ប្រើកណ្តាលផែនទីជាចំណុចចាប់ផ្តើម។",
      routing: "កំពុងរកផ្លូវ…", routeFail: "រកផ្លូវមិនឃើញ។ សូមពិនិត្យអ៊ីនធឺណិត ហើយសាកម្តងទៀត។", rerouting: "កំពុងរកផ្លូវថ្មី…",
      longPress: "គន្លឹះ៖ ចុចឱ្យយូរលើផែនទី ដើម្បីដាក់ម្ជុល", pickedPoint: "ម្ជុលដែលបានដាក់", ago: "មុន", close: "បិទ",
      then: "បន្ទាប់មក", mute: "បិទសំឡេង", kmVoiceType: "សំឡេងខ្មែរ", kmNatural: "ធម្មជាតិ (ថតទុក)", kmPhone: "សំឡេងទូរស័ព្ទ", naturalReady: "បានដំឡើងសំឡេងខ្មែរធម្មជាតិ ({n} ឃ្លា)", naturalMissing: "មិនទាន់មានសំឡេងខ្មែរធម្មជាតិ — កំពុងប្រើសំឡេងទូរស័ព្ទ", recenter: "ត្រឡប់មកឡាន", loadingRoad: "កំពុងទាញយកល្បឿនកំណត់ និងកាមេរ៉ា…", noMore: "",
      weather: { 0: "មេឃស្រឡះ", 1: "មានពពក", 45: "អ័ព្ទ", 51: "ភ្លៀងរលឹម", 61: "ភ្លៀង", 95: "ព្យុះផ្គររន្ទះ" },
    },
  };

  // ---------- spoken / banner instructions ----------
  function distText(m, lang) {
    const NavCore = (typeof module === "object" && module.exports) ? require("./navcore.js") : self.NavCore;
    const r = NavCore.roundDist(m);
    if (lang === "km") return kmNum(r.v) + (r.unit === "m" ? " ម៉ែត្រ" : " គីឡូម៉ែត្រ");
    return r.v + (r.unit === "m" ? " meters" : r.v === 1 ? " kilometer" : " kilometers");
  }

  function ordinalEn(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /** Street label suitable for the given voice language ("" if none fits). */
  function streetFor(step, lang) {
    const name = (step.name || "").trim();
    const ref = (step.ref || "").trim();
    if (lang === "km") return name || ref;
    // An English voice can't read Khmer script: prefer a Latin name, else the ref (e.g. "NR5").
    if (name && !isKhmer(name)) return name;
    return ref && !isKhmer(ref) ? ref : "";
  }

  function side(mod, lang) {
    const left = /left/.test(mod), right = /right/.test(mod);
    if (lang === "km") return left ? "ខាងឆ្វេង" : right ? "ខាងស្តាំ" : "";
    return left ? "left" : right ? "right" : "";
  }

  /** The action part only, e.g. "Turn right onto Norodom Blvd". */
  function action(step, lang, opts = {}) {
    const t = step.type, m = step.modifier || "";
    const street = opts.noStreet ? "" : streetFor(step, lang);
    if (lang === "km") {
      // avoid "ចូលផ្លូវ ផ្លូវ…" when the OSM name already starts with ផ្លូវ (street)
      const road = (pre) => (/^ផ្លូវ/.test(street) ? " " + pre + street : " " + pre + "ផ្លូវ " + street);
      const onto = street ? road("ចូល") : "";
      const dir = {
        "uturn": "បកក្រោយ",
        "sharp left": "បត់ឆ្វេងខ្លាំង",
        "left": "បត់ឆ្វេង",
        "slight left": "បត់ឆ្វេងបន្តិច",
        "straight": "បន្តទៅត្រង់",
        "slight right": "បត់ស្តាំបន្តិច",
        "right": "បត់ស្តាំ",
        "sharp right": "បត់ស្តាំខ្លាំង",
      };
      switch (t) {
        case "depart": return "ចាប់ផ្តើមធ្វើដំណើរ" + (street ? road("តាម") : "");
        case "arrive": {
          const s = side(m, "km");
          return s ? "គោលដៅរបស់អ្នកនៅ" + s : "អ្នកបានមកដល់គោលដៅហើយ";
        }
        case "roundabout": case "rotary": case "roundabout turn":
          return step.exit
            ? "នៅរង្វង់មូល សូមចេញតាមផ្លូវទី" + kmNum(step.exit) + onto
            : "ចូលរង្វង់មូល" + onto;
        case "exit roundabout": case "exit rotary": return "ចេញពីរង្វង់មូល" + onto;
        case "fork": return "នៅផ្លូវបំបែក សូមរក្សា" + (side(m, "km") || "ទិសដៅ") + onto;
        case "merge": return "បញ្ចូលផ្លូវ" + (side(m, "km") ? "ទៅ" + side(m, "km") : "") + onto;
        case "on ramp": return "ឡើងផ្លូវ" + (side(m, "km") || "") + onto;
        case "off ramp": return "ចេញតាមផ្លូវ" + (side(m, "km") || "") + onto;
        case "end of road": return "ដល់ចុងផ្លូវ " + (dir[m] || "បត់") + onto;
        case "continue": case "new name":
          if (m === "uturn") return "បកក្រោយ" + onto;
          if (m && m !== "straight") return (dir[m] || "") + onto;
          return "បន្តទៅត្រង់" + (street ? road("តាម") : "");
        default: return (dir[m] || "បន្តទៅមុខ") + onto;
      }
    }
    // English
    const onto = street ? " onto " + street : "";
    const dir = {
      "uturn": "Make a U-turn",
      "sharp left": "Turn sharp left",
      "left": "Turn left",
      "slight left": "Bear left",
      "straight": "Continue straight",
      "slight right": "Bear right",
      "right": "Turn right",
      "sharp right": "Turn sharp right",
    };
    switch (t) {
      case "depart": return "Head off" + (street ? " on " + street : "");
      case "arrive": {
        const s = side(m, "en");
        return s ? "Your destination is on the " + s : "You have arrived at your destination";
      }
      case "roundabout": case "rotary": case "roundabout turn":
        return step.exit ? "At the roundabout, take the " + ordinalEn(step.exit) + " exit" + onto : "Enter the roundabout" + onto;
      case "exit roundabout": case "exit rotary": return "Exit the roundabout" + onto;
      case "fork": return "At the fork, keep " + (side(m, "en") || "straight") + onto;
      case "merge": return "Merge" + (side(m, "en") ? " " + side(m, "en") : "") + onto;
      case "on ramp": return "Take the ramp" + (side(m, "en") ? " on the " + side(m, "en") : "") + onto;
      case "off ramp": return "Take the exit" + (side(m, "en") ? " on the " + side(m, "en") : "") + onto;
      case "end of road": return "At the end of the road, " + (dir[m] || "turn").toLowerCase() + onto;
      case "continue": case "new name":
        if (m === "uturn") return "Make a U-turn" + onto;
        if (m && m !== "straight") return (dir[m] || "Continue") + onto;
        return "Continue straight" + (street ? " on " + street : "");
      default: return (dir[m] || "Continue") + onto;
    }
  }

  /** Full spoken sentence for a prompt stage. */
  function sentence(step, lang, stage, distM, nextStep) {
    let s;
    const act = action(step, lang);
    if (stage === "now" || distM == null) {
      // the last-second prompt stays short: no street name
      const shortAct = action(step, lang, { noStreet: true });
      s = step.type === "arrive" ? act : (lang === "km" ? shortAct + " ឥឡូវនេះ" : shortAct + " now");
    } else if (lang === "km") {
      s = "ក្នុងចម្ងាយ " + distText(distM, "km") + "ទៀត " + act;
    } else {
      s = "In " + distText(distM, "en") + ", " + act.charAt(0).toLowerCase() + act.slice(1);
    }
    // "…then turn left" when two maneuvers are very close together
    if (nextStep && stage !== "far") {
      const gap = nextStep.at - step.at;
      if (gap > 0 && gap < 120 && nextStep.type !== "arrive") {
        const a2 = action(nextStep, lang, { noStreet: true });
        s += lang === "km" ? " បន្ទាប់មក " + a2 : ", then " + a2.charAt(0).toLowerCase() + a2.slice(1);
      }
    }
    return s;
  }

  // ---------- other spoken alerts ----------
  const ALERTS = {
    km: {
      start: "បើកបរដោយសុវត្ថិភាព",
      reroute: "កំពុងរកផ្លូវថ្មី",
      gpsLost: "បាត់សញ្ញា ជីភីអេស",
      test: "សួស្តី! នេះជាសំឡេងណែនាំផ្លូវជាភាសាខ្មែរ។ ក្នុងចម្ងាយ ២០០ ម៉ែត្រទៀត បត់ស្តាំ",
      camera: (d, v) => "កាមេរ៉ាល្បឿននៅខាងមុខ ក្នុងចម្ងាយ " + distText(d, "km") + (v ? "។ ល្បឿនកំណត់ " + kmNum(v) : ""),
      overspeed: (v) => "សូមបន្ថយល្បឿន។ ល្បឿនកំណត់ " + kmNum(v) + " គីឡូម៉ែត្រក្នុងមួយម៉ោង",
      report: {
        police: "មានប៉ូលិសនៅខាងមុខ",
        accident: "មានគ្រោះថ្នាក់នៅខាងមុខ",
        jam: "ស្ទះចរាចរណ៍នៅខាងមុខ",
        hazard: "មានឧបសគ្គនៅលើផ្លូវខាងមុខ",
        flood: "ផ្លូវលិចទឹកនៅខាងមុខ",
        camera: "មានកាមេរ៉ាល្បឿននៅខាងមុខ",
      },
    },
    en: {
      start: "Drive safely",
      reroute: "Rerouting",
      gpsLost: "GPS signal lost",
      test: "Hello! This is English voice guidance. In 200 meters, turn right",
      camera: (d, v) => "Speed camera in " + distText(d, "en") + (v ? ". Speed limit " + v : ""),
      overspeed: (v) => "Please slow down. The speed limit is " + v,
      report: {
        police: "Police reported ahead",
        accident: "Accident reported ahead",
        jam: "Traffic jam ahead",
        hazard: "Hazard on the road ahead",
        flood: "Flooded road ahead",
        camera: "Speed camera ahead",
      },
    },
  };

  return { UI, ALERTS, kmNum, isKhmer, distText, action, sentence, streetFor };
});
