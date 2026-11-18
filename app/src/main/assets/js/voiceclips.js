/* CamNAV – natural Khmer voice.
 * Every Khmer sentence the app speaks is built from these short recorded clips
 * (voice/km/<id>.mp3). The table below is the single source of the "script":
 * tools/make_khmer_voice.py turns it into MP3 files with an Azure neural voice,
 * or you can record / AI-generate the files yourself with the same file names.
 * Numbers are written as Khmer words so any voice engine reads them fluently.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VoiceClips = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const W = { 1: "មួយ", 2: "ពីរ", 3: "បី", 4: "បួន", 5: "ប្រាំ", 6: "ប្រាំមួយ", 7: "ប្រាំពីរ", 8: "ប្រាំបី", 9: "ប្រាំបួន",
    10: "ដប់", 20: "ម្ភៃ", 30: "សាមសិប", 40: "សែសិប", 50: "ហាសិប", 60: "ហុកសិប", 70: "ចិតសិប", 80: "ប៉ែតសិប", 90: "កៅសិប" };
  /** 0..999 → Khmer words, e.g. 350 → "បីរយហាសិប" */
  function words(n) {
    let s = "";
    const h = Math.floor(n / 100), r = n % 100, tn = Math.floor(r / 10) * 10, u = r % 10;
    if (h) s += W[h] + "រយ";
    if (tn) s += W[tn];
    if (u) s += W[u];
    return s;
  }

  // ---------- distances the voice can say ----------
  const METERS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950];
  const KMS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10];
  const kmWords = (k) => (Number.isInteger(k) ? W[k] || words(k) : W[Math.floor(k)]) + "គីឡូម៉ែត្រ" + (Number.isInteger(k) ? "" : "កន្លះ");
  const kmId = (k) => "dist_" + String(k).replace(".", "_") + "km";
  const LIMITS = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  const ORD = ["", "ទីមួយ", "ទីពីរ", "ទីបី", "ទីបួន", "ទីប្រាំ", "ទីប្រាំមួយ"];

  // ---------- the script: id, Khmer text, English meaning ----------
  const PHRASES = [];
  const add = (id, km, en) => PHRASES.push({ id, km, en });

  for (const m of METERS) add("dist_" + m + "m", "ក្នុងចម្ងាយ " + words(m) + "ម៉ែត្រទៀត", "In " + m + " meters");
  for (const k of KMS) add(kmId(k), "ក្នុងចម្ងាយ " + kmWords(k) + "ទៀត", "In " + k + " kilometers");

  add("turn_left", "បត់ឆ្វេង", "Turn left");
  add("turn_right", "បត់ស្តាំ", "Turn right");
  add("slight_left", "បត់ឆ្វេងបន្តិច", "Bear left");
  add("slight_right", "បត់ស្តាំបន្តិច", "Bear right");
  add("sharp_left", "បត់ឆ្វេងខ្លាំង", "Turn sharp left");
  add("sharp_right", "បត់ស្តាំខ្លាំង", "Turn sharp right");
  add("uturn", "បកក្រោយ", "Make a U-turn");
  add("straight", "បន្តទៅត្រង់", "Continue straight");
  add("keep_left", "នៅផ្លូវបំបែក សូមរក្សាខាងឆ្វេង", "At the fork, keep left");
  add("keep_right", "នៅផ្លូវបំបែក សូមរក្សាខាងស្តាំ", "At the fork, keep right");
  add("merge", "បញ្ចូលផ្លូវ", "Merge");
  add("merge_left", "បញ្ចូលផ្លូវទៅខាងឆ្វេង", "Merge left");
  add("merge_right", "បញ្ចូលផ្លូវទៅខាងស្តាំ", "Merge right");
  add("ramp_left", "ឡើងផ្លូវខាងឆ្វេង", "Take the ramp on the left");
  add("ramp_right", "ឡើងផ្លូវខាងស្តាំ", "Take the ramp on the right");
  add("exit_left", "ចេញតាមផ្លូវខាងឆ្វេង", "Take the exit on the left");
  add("exit_right", "ចេញតាមផ្លូវខាងស្តាំ", "Take the exit on the right");
  add("end_of_road", "ដល់ចុងផ្លូវ", "At the end of the road");
  add("roundabout", "ចូលរង្វង់មូល", "Enter the roundabout");
  for (let e = 1; e <= 6; e++) add("roundabout_" + e, "នៅរង្វង់មូល សូមចេញតាមផ្លូវ" + ORD[e], "At the roundabout, take exit " + e);
  add("roundabout_exit", "ចេញពីរង្វង់មូល", "Exit the roundabout");
  add("depart", "ចាប់ផ្តើមធ្វើដំណើរ", "Let's go");
  add("arrive", "អ្នកបានមកដល់គោលដៅហើយ", "You have arrived");
  add("arrive_left", "គោលដៅរបស់អ្នកនៅខាងឆ្វេង", "Your destination is on the left");
  add("arrive_right", "គោលដៅរបស់អ្នកនៅខាងស្តាំ", "Your destination is on the right");
  add("now", "ឥឡូវនេះ", "now");
  add("then", "បន្ទាប់មក", "then");

  add("slogan", "បើកបរដោយសុវត្ថិភាព", "Drive safely");
  add("reroute", "កំពុងរកផ្លូវថ្មី", "Rerouting");
  add("gps_lost", "បាត់សញ្ញា ជីភីអេស", "GPS signal lost");
  add("camera", "កាមេរ៉ាល្បឿននៅខាងមុខ", "Speed camera ahead");
  add("slow_down", "សូមបន្ថយល្បឿន", "Please slow down");
  for (const v of LIMITS) add("limit_" + v, "ល្បឿនកំណត់ " + words(v) + "គីឡូម៉ែត្រក្នុងមួយម៉ោង", "Speed limit " + v);
  add("report_police", "មានប៉ូលិសនៅខាងមុខ", "Police ahead");
  add("report_accident", "មានគ្រោះថ្នាក់នៅខាងមុខ", "Crash ahead");
  add("report_jam", "ស្ទះចរាចរណ៍នៅខាងមុខ", "Traffic jam ahead");
  add("report_hazard", "មានឧបសគ្គនៅលើផ្លូវខាងមុខ", "Hazard on the road ahead");
  add("report_flood", "ផ្លូវលិចទឹកនៅខាងមុខ", "Flooded road ahead");
  add("road_bump", "មានដុំបន្ថយល្បឿននៅខាងមុខ", "Speed bump ahead");
  add("road_school", "តំបន់សាលារៀននៅខាងមុខ សូមបន្ថយល្បឿន", "School zone ahead, slow down");
  add("road_rail", "ផ្លូវរថភ្លើងកាត់នៅខាងមុខ សូមប្រុងប្រយ័ត្ន", "Railway crossing ahead, take care");
  add("road_toll", "ស្ថានីយបង់ថ្លៃផ្លូវនៅខាងមុខ", "Toll booth ahead");
  add("road_stop", "ស្លាកឈប់នៅខាងមុខ", "Stop sign ahead");
  add("road_hazard", "គ្រោះថ្នាក់នៅខាងមុខ សូមប្រុងប្រយ័ត្ន", "Danger ahead, take care");
  add("road_curve", "ផ្លូវកោងខ្លាំងនៅខាងមុខ សូមបន្ថយល្បឿន", "Sharp curve ahead, slow down");
  add("road_junction_danger", "ផ្លូវប្រសព្វគ្រោះថ្នាក់នៅខាងមុខ", "Dangerous junction ahead");
  add("road_animal", "ប្រយ័ត្នសត្វឆ្លងផ្លូវ", "Watch out for animals crossing");
  add("road_no_overtake", "ហាមវ៉ាជែង", "No overtaking");
  add("helmet", "សូមពាក់មួកសុវត្ថិភាព ទាំងអ្នកបើកបរ និងអ្នកជិះពីក្រោយ", "Please wear a helmet, rider and passenger");
  add("seatbelt", "សូមពាក់ខ្សែក្រវាត់សុវត្ថិភាព", "Please fasten your seat belt");
  add("test", "សួស្តី! នេះជាសំឡេងណែនាំផ្លូវរបស់ ខេមណាវ។ សូមបើកបរដោយសុវត្ថិភាព", "Hello! This is the CamNAV voice. Please drive safely");

  // ---------- builders: what to play for a given moment ----------
  /** Distance clip for the voice (snapped to the clips that exist). */
  function distClip(m) {
    if (m < 975) {
      const v = Math.min(950, Math.max(50, Math.round(m / 50) * 50));
      return "dist_" + v + "m";
    }
    const k = m / 1000;
    const snap = k < 3.25 ? Math.round(k * 2) / 2 : Math.min(10, Math.round(k));
    return kmId(snap);
  }
  function limitClip(v) {
    if (!v) return null;
    const near = LIMITS.reduce((a, b) => (Math.abs(b - v) < Math.abs(a - v) ? b : a));
    return Math.abs(near - v) <= 2 ? "limit_" + near : null; // only say it if we have that exact number
  }

  const DIR = { left: "turn_left", right: "turn_right", "slight left": "slight_left", "slight right": "slight_right",
    "sharp left": "sharp_left", "sharp right": "sharp_right", uturn: "uturn", straight: "straight" };
  const side = (m) => (/left/.test(m || "") ? "left" : /right/.test(m || "") ? "right" : "");

  /** Clips for one maneuver (no distance, no "now"). Street names are not spoken in this voice. */
  function actionClips(step) {
    const t = step.type, m = step.modifier || "";
    switch (t) {
      case "depart": return ["depart"];
      case "arrive": return [side(m) ? "arrive_" + side(m) : "arrive"];
      case "roundabout": case "rotary": case "roundabout turn":
        return [step.exit >= 1 && step.exit <= 6 ? "roundabout_" + step.exit : "roundabout"];
      case "exit roundabout": case "exit rotary": return ["roundabout_exit"];
      case "fork": return [side(m) ? "keep_" + side(m) : "straight"];
      case "merge": return [side(m) ? "merge_" + side(m) : "merge"];
      case "on ramp": return [side(m) ? "ramp_" + side(m) : "straight"];
      case "off ramp": return [side(m) ? "exit_" + side(m) : "straight"];
      case "end of road": return ["end_of_road", DIR[m] || "turn_" + (side(m) || "right")];
      default: return [DIR[m] || "straight"];
    }
  }

  /** Same structure as I18N.sentence(): [distance] action [now] [then action2]. */
  function sentenceClips(step, stage, distM, nextStep) {
    const act = actionClips(step);
    let out;
    if (stage === "now" || distM == null) out = step.type === "arrive" ? act : act.concat("now");
    else out = [distClip(distM)].concat(act);
    if (nextStep && stage !== "far") {
      const gap = nextStep.at - step.at;
      if (gap > 0 && gap < 120 && nextStep.type !== "arrive") out = out.concat("then", actionClips(nextStep));
    }
    return out;
  }

  const alertClips = {
    start: (firstStep) => ["depart", "slogan"],
    reroute: () => ["reroute"],
    gpsLost: () => ["gps_lost"],
    test: () => ["test"],
    overspeed: (v) => ["slow_down"].concat(limitClip(v) || []),
    camera: (d, v) => ["camera", distClip(d)].concat(limitClip(v) || []),
    report: (kind) => ["report_" + kind],
    road: (kind) => ["road_" + kind],
    helmet: () => ["helmet"],
    seatbelt: () => ["seatbelt"],
  };

  return { PHRASES, words, distClip, limitClip, actionClips, sentenceClips, alertClips };
});
