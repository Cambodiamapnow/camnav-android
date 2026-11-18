/* CamNAV – Khmer voice packs (សំឡេងនាំផ្លូវ).
 * Each pack replaces the main moments of a drive with its own line.
 * Audio: voice/packs/<pack>/<event>.mp3 (recorded or AI-generated, same names);
 * if a file is missing, the phone's Khmer text-to-speech reads the line instead.
 * All other prompts (distances, roundabouts, cameras, signs…) use the standard voice.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.VoicePacks = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const EVENTS = ["start_route", "turn_left_200m", "turn_right_200m", "traffic_ahead", "flood_ahead", "arrived"];

  const PACKS = [
    {
      id: "standard", pro: false, emoji: "🧭", color: "#1a73e8", tts: { pitch: 1.0, rate: 1.0 },
      name: { km: "សំឡេងស្តង់ដារ", en: "Standard polite Khmer" },
      desc: { km: "សំឡេងសុភាព ច្បាស់លាស់ — ឥតគិតថ្លៃ", en: "Polite and clear — free" },
      lines: {
        start_route: "ចាប់ផ្តើមធ្វើដំណើរ។ សូមបើកបរដោយប្រុងប្រយ័ត្ន និងគោរពច្បាប់ចរាចរណ៍។",
        turn_left_200m: "នៅខាងមុខ ២០០ ម៉ែត្រទៀត សូមបត់ឆ្វេង។",
        turn_right_200m: "នៅខាងមុខ ២០០ ម៉ែត្រទៀត សូមបត់ស្តាំ។",
        traffic_ahead: "ប្រយ័ត្ន! មានការស្ទះចរាចរណ៍នៅខាងមុខ ប្រព័ន្ធកំពុងរកផ្លូវវាងជូនអ្នក។",
        flood_ahead: "ប្រយ័ត្ន! មានទឹកលិចផ្លូវនៅខាងមុខ សូមបន្ថយល្បឿន។",
        arrived: "អ្នកបានមកដល់គោលដៅហើយ។ សូមអរគុណ!",
      },
    },
    {
      id: "tuktuk_uncle", pro: true, emoji: "🛺", color: "#e8710a", tts: { pitch: 0.82, rate: 1.06 },
      name: { km: "ពូតុកតុក", en: "Funny Tuk-Tuk Uncle" },
      desc: { km: "ពូរកផ្លូវកាត់ឱ្យ កំប្លែងរាល់ការបត់", en: "Knows every shortcut, jokes at every turn" },
      lines: {
        start_route: "តោះក្មួយ! ពាក់មួកសុវត្ថិភាពឱ្យជាប់ ពូរកផ្លូវកាត់ឱ្យ ធានាថាមិនឱ្យស្ទះដូចថ្ងៃសុក្រទេ!",
        turn_left_200m: "២០០ ម៉ែត្រទៀតបត់ឆ្វេងណាក្មួយ ប្រយ័ត្នហួសផ្លូវកាត់ពូ!",
        turn_right_200m: "ត្រៀមខ្លួនបត់ស្តាំ ២០០ ម៉ែត្រទៀត ស៊ីញ៉ូឱ្យហើយទៅក្មួយ!",
        traffic_ahead: "អូហូ! ខាងមុខស្ទះណែនណាន់តាន់តាប់ហើយ ជឿពូ បត់ចូលផ្លូវលំតាមពូមក!",
        flood_ahead: "ឈប់សិនក្មួយ! ខាងមុខទឹកលិចដូចទន្លេហើយ ប្រយ័ត្នរលត់ម៉ាស៊ីនណា!",
        arrived: "ដល់ហើយក្មួយ! សុវត្ថិភាពដល់គោលដៅ កុំភ្លេចប៉ាវកាហ្វេ Developer មួយកែវផង!",
      },
    },
    {
      id: "caring_mom", pro: true, emoji: "👩‍👦", color: "#d93085", tts: { pitch: 1.22, rate: 0.95 },
      name: { km: "ម៉ាក់បារម្ភ", en: "Caring Khmer Mom" },
      desc: { km: "ម៉ាក់រំលឹកឱ្យជិះយឺតៗ និងប្រយ័ត្ន", en: "Mom reminds you to ride slowly and safely" },
      lines: {
        start_route: "កូនម៉ាក់ ជិះយឺតៗណាកូន កុំលេងទូរស័ព្ទពេលបើកបរ ពាក់មួកសុវត្ថិភាពឱ្យត្រឹមត្រូវ!",
        turn_left_200m: "បន្តិចទៀតបត់ឆ្វេងហើយកូន មើលឆ្វេងមើលស្តាំឱ្យស្រួលបួលណា!",
        turn_right_200m: "២០០ ម៉ែត្រទៀតបត់ស្តាំ កុំបត់កាត់មុខគេឱ្យសោះ ម៉ាក់បារម្ភ!",
        traffic_ahead: "ខាងមុខស្ទះហើយកូន កុំតានតឹងអី ចាំបន្តិចទៅ យឺតបន្តិចតែសុវត្ថិភាព!",
        flood_ahead: "ខាងមុខមានទឹកលិច កូនវាងផ្លូវផ្សេងទៅ ប្រយ័ត្នទទឹកជើងឈឺ!",
        arrived: "ដល់កន្លែងហើយមែនទេកូន? ល្អណាស់ ថែសុខភាពផងណា!",
      },
    },
    {
      id: "hype_coach", pro: true, emoji: "💪", color: "#188038", tts: { pitch: 1.08, rate: 1.16 },
      name: { km: "សំឡេងលើកទឹកចិត្ត", en: "Hype Motivational Coach" },
      desc: { km: "គ្រូលើកទឹកចិត្ត ធ្វើឱ្យថ្ងៃរបស់អ្នកភ្លឺស្វាង", en: "A coach who makes every trip feel like a win" },
      lines: {
        start_route: "ថ្ងៃនេះជាថ្ងៃល្អរបស់អ្នក! តោះចេញដំណើរទៅរកភាពជោគជ័យ ផ្លូវស្រឡះស្អាតណាស់!",
        turn_left_200m: "អស្ចារ្យណាស់! ២០០ ម៉ែត្រទៀតបត់ឆ្វេង យើងជិតឈ្នះការស្ទះចរាចរណ៍ហើយ!",
        turn_right_200m: "បន្តទៅមុខទៀត! ២០០ ម៉ែត្រទៀតបត់ស្តាំ អ្នកបើកបរបានល្អបំផុត!",
        traffic_ahead: "កុំបារម្ភ! ឧបសគ្គបន្តិចបន្តួចនៅខាងមុខ យើងនឹងរកផ្លូវវាងដ៏ឆ្លាតវៃជូនអ្នកភ្លាម!",
        flood_ahead: "ប្រយ័ត្នទឹកលិចខាងមុខ! បង្វែរទិសដៅបន្តិច ដើម្បីបន្តដំណើរទៅមុខដោយរលូន!",
        arrived: "ជោគជ័យ! អ្នកបានមកដល់គោលដៅទាន់ពេលវេលា សូមឱ្យថ្ងៃនេះជួបតែសំណាងល្អ!",
      },
    },
    {
      id: "grandpa", pro: true, emoji: "👴", color: "#795548", tts: { pitch: 0.7, rate: 0.86 },
      name: { km: "លោកតាចិត្តល្អ", en: "Kind Grandpa" },
      desc: { km: "លោកតាប្រាប់ផ្លូវយឺតៗ ដោយក្តីស្រឡាញ់", en: "A gentle grandpa who guides you slowly and kindly" },
      lines: {
        start_route: "ចៅអើយ មុនចេញដំណើរ ពាក់មួកសុវត្ថិភាពសិន។ យើងបើកយឺតៗ តែដល់ប្រាកដ។",
        turn_left_200m: "២០០ ម៉ែត្រទៀត បត់ឆ្វេងណាចៅ កុំប្រញាប់ពេក។",
        turn_right_200m: "២០០ ម៉ែត្រទៀត បត់ស្តាំចៅ បើកភ្លើងស៊ីញ៉ូឱ្យគេដឹងផង។",
        traffic_ahead: "ខាងមុខស្ទះហើយចៅ អត់ធ្មត់បន្តិច យឺតបន្តិចមិនអីទេ ឱ្យតែដល់សុខសប្បាយ។",
        flood_ahead: "ខាងមុខទឹកលិចចៅ ជិះយឺតៗ កុំឱ្យទឹកចូលម៉ាស៊ីន។",
        arrived: "ដល់ហើយចៅ! តាសប្បាយចិត្តណាស់ ដែលចៅដល់ដោយសុវត្ថិភាព។",
      },
    },
    {
      id: "little_sister", pro: true, emoji: "👧", color: "#e91e63", tts: { pitch: 1.42, rate: 1.05 },
      name: { km: "ប្អូនស្រីតូច", en: "Little Sister" },
      desc: { km: "ប្អូនស្រីរីករាយ ជួយនាំផ្លូវបង", en: "A cheerful little sister who helps you find the way" },
      lines: {
        start_route: "តោះបង ចេញដំណើរ! ប្អូនជួយនាំផ្លូវ កុំភ្លេចពាក់មួកសុវត្ថិភាពណា!",
        turn_left_200m: "បងៗ ២០០ ម៉ែត្រទៀតបត់ឆ្វេងណា ប្អូនចាំមើលបង!",
        turn_right_200m: "២០០ ម៉ែត្រទៀតបត់ស្តាំណាបង ត្រៀមខ្លួនបានហើយ!",
        traffic_ahead: "អូយ ខាងមុខស្ទះហើយបង កុំខឹងណា ស្តាប់ចម្រៀងបន្តិចទៅ!",
        flood_ahead: "បងប្រយ័ត្ន! ខាងមុខមានទឹកលិច ជិះយឺតៗណាបង!",
        arrived: "ដល់ហើយបង! ពូកែណាស់ ប្អូនសប្បាយចិត្តជាមួយបង!",
      },
    },
  ];

  const byId = (id) => PACKS.find((p) => p.id === id) || PACKS[0];
  const clipPath = (packId, ev) => "voice/packs/" + packId + "/" + ev + ".mp3";

  /**
   * Which pack event (if any) fits this navigation moment.
   * Turn lines say "200 m", so they are used for the "near" prompt of a plain left/right turn.
   */
  function eventForStep(step, stage) {
    if (!step) return null;
    if (step.type === "arrive" && stage === "now") return "arrived";
    if (stage !== "near") return null;
    const m = step.modifier || "";
    const plainTurn = step.type === "turn" || step.type === "end of road" || step.type === "continue" || step.type === "new name";
    if (!plainTurn) return null;
    if (m === "left" || m === "sharp left") return "turn_left_200m";
    if (m === "right" || m === "sharp right") return "turn_right_200m";
    return null;
  }

  /** For voice/packs: every (pack, event, text) – used by the build script and the recording guide. */
  function allLines() {
    const out = [];
    for (const p of PACKS) for (const ev of EVENTS) out.push({ pack: p.id, event: ev, file: clipPath(p.id, ev), km: p.lines[ev] });
    return out;
  }

  return { EVENTS, PACKS, byId, clipPath, eventForStep, allLines };
});
