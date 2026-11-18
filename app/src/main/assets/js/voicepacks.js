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
  // extra moments a character can talk about (if it has no line, the normal voice speaks)
  const MORE_EVENTS = ["overspeed", "camera_ahead", "bump_ahead", "school_ahead", "rerouting", "halfway", "almost_there", "break_time", "chatter"];
  const ALL_EVENTS = EVENTS.concat(MORE_EVENTS);

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
      id: "funny_guy", pro: true, emoji: "🤪", color: "#9334e6", tts: { pitch: 1.15, rate: 1.12 },
      name: { km: "អាកំប្លែង", en: "Funny Guy" },
      desc: { km: "និយាយលេងសើចគ្រប់ផ្លូវ តែនៅតែប្រាប់ផ្លូវត្រូវ", en: "Jokes all the way, still gets you there" },
      lines: {
        start_route: "[excited] ហេហេ! ចេញដំណើរហើយ! ពាក់មួកសុវត្ថិភាពផង ក្បាលយើងមានតែមួយ គ្មានស្ពែរទេណា! [laughs]",
        turn_left_200m: "២០០ ម៉ែត្រទៀតបត់ឆ្វេង! [mischievously] កុំបត់ទៅផ្ទះអតីតសង្សារវិញណា! [laughs]",
        turn_right_200m: "២០០ ម៉ែត្រទៀតបត់ស្តាំ! ស្តាំ... ដៃដែលកាន់ស្លាបព្រាហ្នឹងហើយ! [laughs]",
        traffic_ahead: "[sighs] ស្ទះទៀតហើយ! ឡានដើរតម្រង់ជួរដូចស្រមោច... ចាំបន្តិចទៅ កុំស្រែកដាក់គេណា!",
        flood_ahead: "ខាងមុខទឹកលិច! បើមិនចង់ក្លាយជាទូកទេ ជិះយឺតៗណា! [laughs]",
        arrived: "[excited] ដល់ហើយ! ពូកែណាស់! ឥឡូវទៅញ៉ាំបាយទៅ ខ្ញុំក៏ឃ្លានដែរ! [laughs]",
      },
    },
    {
      id: "war_chief", pro: true, emoji: "⚔️", color: "#b71c1c", tts: { pitch: 0.6, rate: 0.95 },
      name: { km: "មេទ័ពក្លាហាន", en: "Battle Commander" },
      desc: { km: "មេទ័ពស្រែកបញ្ជាដូចក្នុងហ្គេមសង្គ្រាម តែទៅផ្សារទេ", en: "An epic war-game commander… leading you to the market" },
      lines: {
        start_route: "[shouting] ទាហានទាំងអស់! ពាក់មួកសុវត្ថិភាព! ចាប់ចង្កូតឱ្យជាប់! យើងចេញសមរភូមិ... [pause] ទៅផ្សារ! [laughs]",
        turn_left_200m: "[deep voice] ២០០ ម៉ែត្រទៀត វាយលុកទៅខាងឆ្វេង! បើកភ្លើងស៊ីញ៉ូផង អ្នកចម្បាំងពិតគោរពច្បាប់!",
        turn_right_200m: "[deep voice] ២០០ ម៉ែត្រទៀត ទ័ពយើងបត់ស្តាំ! ទៅមុខ! កុំបកក្រោយ!",
        traffic_ahead: "[angry] ខ្មាំងស្ទះផ្លូវ! ទាហានទាំងអស់ អត់ធ្មត់! អ្នកចម្បាំងពិត មិនបុកឡានគេទេ!",
        flood_ahead: "[dramatically] ទឹកជំនន់នៅខាងមុខ! បន្ថយល្បឿន! យើងជាទាហាន មិនមែនជាត្រីទេ!",
        arrived: "[shouting] ជ័យជម្នះ! យើងដល់គោលដៅហើយ! [laughs] ឥឡូវ... សម្រាកផឹកកាហ្វេសិន!",
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
      id: "caring_mom", pro: true, emoji: "👩‍👦", color: "#d93085", tts: { pitch: 1.22, rate: 1.0 },
      name: { km: "ម៉ាក់រអ៊ូ", en: "Nagging Mom" },
      desc: { km: "ម៉ាក់រអ៊ូគ្រប់ផ្លូវ ព្រោះស្រឡាញ់កូន", en: "Mom nags all the way, because she loves you" },
      lines: {
        start_route: "[warmly] កូនអើយ! ពាក់មួកសុវត្ថិភាពហើយនៅ? ញ៉ាំបាយហើយនៅ? យកអាវរងារទៅផង! [sighs] ហ្នឹងហើយ ចេញទៅ!",
        turn_left_200m: "២០០ ម៉ែត្រទៀតបត់ឆ្វេងកូន! ម៉ាក់ប្រាប់ច្រើនដងហើយណា ឆ្វេង! [sighs]",
        turn_right_200m: "២០០ ម៉ែត្រទៀតបត់ស្តាំ! ហើយកុំលេងទូរស័ព្ទ ម៉ាក់ឃើញណា!",
        traffic_ahead: "[sighs] ស្ទះហើយមើល! ម៉ាក់ប្រាប់ឱ្យចេញពីព្រលឹម មិនស្តាប់! ឥឡូវចាំទៅ!",
        flood_ahead: "ទឹកលិចកូន! ជិះយឺតៗ! ហើយស្បែកជើងសើម កុំយកចូលផ្ទះណា!",
        arrived: "[happy] ដល់ហើយកូន! ផ្ញើសារប្រាប់ម៉ាក់ផង! ម៉ាក់ចាំតាំងពីព្រឹក!",
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
      name: { km: "លោកតាភ្លេចភ្លាំង", en: "Forgetful Grandpa" },
      desc: { km: "លោកតានិទានរឿងសម័យមុន ហើយភ្លេចឆ្វេងស្តាំ", en: "Grandpa tells old-days stories and mixes up left and right" },
      lines: {
        start_route: "[elderly voice] ចៅអើយ... ពាក់មួកសុវត្ថិភាពសិន។ សម័យតា ជិះកង់ទៅផ្សារដប់គីឡូ មិនដែលត្អូញទេ! [chuckles]",
        turn_left_200m: "[elderly voice] ២០០ ម៉ែត្រទៀតបត់ឆ្វេង... ឬស្តាំ? [pause] អូ ឆ្វេងហ្នឹងហើយ តាចាំត្រូវ! [laughs]",
        turn_right_200m: "[elderly voice] ២០០ ម៉ែត្រទៀតបត់ស្តាំចៅ... យឺតៗ ជង្គង់តាឈឺហើយ! [chuckles]",
        traffic_ahead: "[sighs] ស្ទះទៀតហើយ... សម័យតា មានតែរទេះគោ ក៏មិនស្ទះដូចនេះដែរ!",
        flood_ahead: "[elderly voice] ទឹកលិចហើយចៅ! ជិះយឺតៗ... តាហែលទឹកមិនកើតទេណា! [laughs]",
        arrived: "[elderly voice] ដល់ហើយចៅ! ល្អណាស់... ឥឡូវ ទិញនំឱ្យតាមួយផង! [laughs]",
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
  // take 1 keeps the old name (<event>.mp3), more takes are <event>_2.mp3, <event>_3.mp3 …
  const clipPath = (packId, ev, i) => "voice/packs/" + packId + "/" + ev + (i ? "_" + (i + 1) : "") + ".mp3";

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

  // ---- more lines: extra moments + several takes per moment (picked at random, never the same twice in a row) ----
  const EXTRA = {
    standard: {
      halfway: "អ្នកបានធ្វើដំណើរពាក់កណ្តាលផ្លូវហើយ។",
      almost_there: "ជិតដល់គោលដៅហើយ។",
      break_time: "អ្នកបានបើកបរមួយម៉ោងហើយ។ សូមឈប់សម្រាកបន្តិច។",
    },
    funny_guy: {
      start_route: ["[excited] តោះ! ម៉ាស៊ីនក្តៅ ចិត្តក៏ក្តៅ តែល្បឿនកុំឱ្យក្តៅពេកណា! [laughs]"],
      traffic_ahead: ["[laughs] ស្ទះទៀតហើយ! បើដើរវិញ ប្រហែលដល់មុនហើយមើលទៅ!"],
      arrived: ["[excited] ដល់ហើយ! ពិន្ទុពេញមួយរយ! [laughs] ខ្ញុំកាត់មួយពិន្ទុ ព្រោះអ្នកមិនដែលសើចនឹងរឿងកំប្លែងខ្ញុំ!"],
      overspeed: ["[shouting] បន្ថយល្បឿន! [laughs] អ្នកបើកលឿនជាងអ៊ីនធឺណិតផ្ទះខ្ញុំទៅទៀត!", "ហ្ហា! លឿនពេកហើយ! យើងមិនមែនប្រណាំងយកពានទេ យឺតៗមក!"],
      camera_ahead: ["[whispers] ស្ងៀមៗ... មានកាមេរ៉ាល្បឿននៅខាងមុខ! ញញឹមផង ហើយបើកតាមល្បឿនកំណត់! [laughs]", "កាមេរ៉ាខាងមុខ! ថតរូបបាន តែកុំឱ្យជាប់ពិន័យណា!"],
      bump_ahead: "ដុំបន្ថយល្បឿននៅខាងមុខ! យឺតៗ កុំឱ្យបាយក្នុងពោះលោតចេញ! [laughs]",
      school_ahead: "តំបន់សាលារៀន! បន្ថយល្បឿន! ក្មេងៗកំពុងរៀន... ហើយខ្ញុំក៏នៅរៀនបើកបរដែរ! [laughs]",
      rerouting: ["[laughs] អូខេ... អ្នកមិនស្តាប់ខ្ញុំទេ! មិនអីទេ ខ្ញុំរកផ្លូវថ្មីឱ្យ!", "ផ្លូវនេះក៏ល្អដែរ! ខ្ញុំកំពុងរកផ្លូវថ្មី... ចាំបន្តិច!"],
      halfway: "[excited] បានពាក់កណ្តាលផ្លូវហើយ! នៅកន្លះទៀត ដូចញ៉ាំនំបញ្ចុកកន្លះចាន! [laughs]",
      almost_there: "ជិតដល់ហើយ! ត្រៀមរៀបសក់ ញញឹម ដល់ហើយ! [laughs]",
      break_time: "[sighs] បើកមួយម៉ោងហើយ! ឈប់សម្រាក ផឹកទឹកសិនទៅ ខ្ញុំក៏ហត់ដែរ! [laughs]",
      chatter: [
        "[curious] ដឹងទេ ហេតុអ្វីមាន់ឆ្លងផ្លូវ? [pause] ព្រោះគ្មានអ្នកនាំផ្លូវដូចខ្ញុំ! [laughs]",
        "ផ្លូវស្រឡះល្អណាស់! នៅខាងស្តាំបន្តិច ទុកឱ្យគេវ៉ាផង!",
        "[laughs] ខ្ញុំជាអ្នកនាំផ្លូវដែលកំប្លែងជាងគេ... ហើយក៏ជាអ្នកតែម្នាក់គត់ដែលអ្នកមាន!",
        "កុំភ្លេចផឹកទឹក! ខ្លួនយើងដូចម៉ូតូដែរ ត្រូវការសាំង... តែជាទឹក! [laughs]",
      ],
    },
    war_chief: {
      start_route: ["[deep voice] ទ័ពត្រៀមរួចរាល់! ពិនិត្យសាំង ពិនិត្យហ្វ្រាំង... [shouting] ចេញដំណើរ!"],
      traffic_ahead: ["[deep voice] ខ្មាំងច្រើនណាស់នៅខាងមុខ! យើងរង់ចាំឱកាស! អ្នកចម្បាំងឆ្លាត មិនវ៉ាតាមចិញ្ចើមផ្លូវទេ!"],
      arrived: ["[shouting] បេសកកម្មជោគជ័យ! [laughs] ទាហានទទួលបានមេដាយ... នំបញ្ចុកមួយចាន!"],
      overspeed: ["[shouting] ទាហាន! លឿនពេកហើយ! បន្ថយល្បឿនភ្លាម! នេះជាបញ្ជា!", "[angry] ហ្វ្រាំងបន្តិច ទាហាន! មេទ័ពពិតមិនបើកលឿនហួសច្បាប់ទេ!"],
      camera_ahead: ["[deep voice] ស៊ើបការណ៍រាយការណ៍៖ កាមេរ៉ាល្បឿននៅខាងមុខ! រក្សាល្បឿនកំណត់!", "[dramatically] ភ្នែកខ្មាំងនៅខាងមុខ! កាមេរ៉ាល្បឿន! ទាហានទាំងអស់ គោរពល្បឿនកំណត់!"],
      bump_ahead: "[shouting] ឧបសគ្គនៅខាងមុខ! ដុំបន្ថយល្បឿន! យឺតៗ ឆ្លងកាត់ដោយសុវត្ថិភាព!",
      school_ahead: "[deep voice] តំបន់សាលារៀន! ទាហានពិតការពារកុមារ! បន្ថយល្បឿន!",
      rerouting: ["[deep voice] ផែនការផ្លាស់ប្តូរ! មេទ័ពកំពុងគូរផែនទីថ្មី!", "[shouting] កុំភ័យ! យើងវាយលុកតាមផ្លូវថ្មី!"],
      halfway: "[shouting] ពាក់កណ្តាលសមរភូមិ! កម្លាំងនៅពេញ! ទៅមុខទៀត!",
      almost_there: "[deep voice] គោលដៅនៅជិតហើយ! ទាហាន ត្រៀមខ្លួនចុះចត!",
      break_time: "[deep voice] ទាហានបើកមួយម៉ោងហើយ! សម្រាកបន្តិច ផឹកទឹក! ទ័ពហត់ វាយមិនឈ្នះទេ!",
      chatter: [
        "[deep voice] ផ្លូវស្ងប់ស្ងាត់ពេក... [pause] ល្អហើយ! សុខសន្តិភាព!",
        "[shouting] ទាហាន! ដៃនៅលើចង្កូត! ភ្នែកមើលផ្លូវ! [laughs] ល្អណាស់!",
        "[dramatically] រឿងព្រេងនិទានថា... មានអ្នកចម្បាំងម្នាក់ មិនដែលលើសល្បឿន។ [pause] អ្នកនោះគឺអ្នក!",
        "[deep voice] រាយការណ៍ស្ថានការណ៍៖ ផ្លូវស្រឡះ អាកាសធាតុល្អ ទាហានសង្ហា! [laughs]",
      ],
    },
    grandpa: {
      start_route: ["[elderly voice] តោះចៅ... ចេញដំណើរ! ចាំបន្តិច តាពាក់វ៉ែនតាសិន... [chuckles] ហ្នឹងហើយ!"],
      traffic_ahead: ["[sighs] ស្ទះទៀតហើយចៅ... ចាំបន្តិចទៅ តាដេកមួយភ្លែតសិន... [chuckles]"],
      arrived: ["[elderly voice] ដល់ហើយ! តាថា... ដល់ឆាប់ជាងតាគិតទៅទៀត! [laughs]"],
      overspeed: ["[elderly voice] ចៅអើយ! លឿនពេកហើយ! បេះដូងតាលោតដូចស្គរ! បន្ថយល្បឿនមក!", "[elderly voice] យឺតៗចៅ... លឿនមិនមែនជាសំណាងទេ សុវត្ថិភាពទើបជាសំណាង។"],
      camera_ahead: "[elderly voice] ចៅ... មានកាមេរ៉ានៅខាងមុខ! សម័យតា គ្មានកាមេរ៉ាទេ មានតែប៉ូលិសឈរក្រោមដើមឈើ! [chuckles]",
      bump_ahead: "[elderly voice] ដុំបន្ថយល្បឿនខាងមុខ! យឺតៗ... ធ្មេញតាជាធ្មេញក្លែងណាចៅ! [laughs]",
      school_ahead: "[elderly voice] សាលារៀននៅខាងមុខ... បន្ថយល្បឿនចៅ។ ពីមុនតាដើរទៅសាលាប្រាំគីឡូ គ្មានស្បែកជើងផង!",
      rerouting: "[elderly voice] អូ... វង្វេងហើយ? មិនអីទេចៅ តាក៏វង្វេងរាល់ថ្ងៃដែរ! [laughs]",
      halfway: "[elderly voice] ពាក់កណ្តាលផ្លូវហើយចៅ... ជង្គង់តាថាដល់ហើយ តែផែនទីថាមិនទាន់! [chuckles]",
      almost_there: "[elderly voice] ជិតដល់ហើយចៅ! ត្រៀមខ្លួន... ហើយកុំភ្លេចកាបូបតាផង!",
      break_time: "[elderly voice] មួយម៉ោងហើយចៅ... ឈប់សម្រាកសិន ផឹកតែក្តៅមួយកែវ។ តាក៏ត្រូវការបន្ទប់ទឹកដែរ! [chuckles]",
      chatter: [
        "[elderly voice] តាមើលចៅបើកបរ... ល្អណាស់! ដូចតាកាលនៅក្មេង... តែតាសង្ហាជាង! [laughs]",
        "[elderly voice] ចៅ... ផ្លូវនេះ ពីមុនជាវាលស្រែ។ ឥឡូវមានឡានច្រើនជាងក្របី! [chuckles]",
        "[elderly voice] តាភ្លេចហើយ... យើងទៅណាចៅ? [pause] អូ ផែនទីដឹង! ល្អហើយ! [laughs]",
        "[elderly voice] ចៅអើយ... ជីវិតដូចផ្លូវដែរ ពេលខ្លះស្ទះ ពេលខ្លះស្រឡះ។ ឱ្យតែបើកយឺតៗ ដល់ហើយ។",
      ],
    },
    caring_mom: {
      start_route: ["[warmly] ចេញហើយ? ទូរស័ព្ទសាកថ្មហើយនៅ? មួកពាក់ហើយ? លុយមានទេ? ម៉ាក់ឱ្យបន្ថែម... អត់ទេ ម៉ាក់លេងទេ! [laughs]"],
      traffic_ahead: ["[sighs] ស្ទះទៀតហើយ! កុំរអ៊ូណាកូន... ម៉ាក់ជាអ្នករអ៊ូតែម្នាក់គត់ក្នុងផ្ទះនេះ!"],
      arrived: ["[happy] ដល់ហើយ! ម៉ាក់មោទនភាពណាស់! ឥឡូវ តេមកម៉ាក់ផង... ឥឡូវនេះ!"],
      overspeed: ["[angry] កូន! លឿនពេកហើយ! ម៉ាក់រាប់ដល់បី... មួយ... ពីរ... បន្ថយល្បឿនមក!", "[shouting] បន្ថយល្បឿនភ្លាម! ម៉ាក់មិនបានចិញ្ចឹមកូនធំ ដើម្បីឱ្យបើកលឿនបែបនេះទេ!"],
      camera_ahead: "កាមេរ៉ាល្បឿននៅខាងមុខ! បើជាប់ពិន័យ ម៉ាក់មិនបង់ឱ្យទេណា!",
      bump_ahead: "ដុំបន្ថយល្បឿនកូន! យឺតៗ ម៉ាក់ទើបតែដាក់ពងមាន់ក្នុងកាបូបកូន! [laughs]",
      school_ahead: "សាលារៀនខាងមុខ! បន្ថយល្បឿន! នឹកឃើញកាលកូននៅតូច ម៉ាក់ដឹកទៅសាលារាល់ព្រឹក... [sighs] ធំហើយកូនម៉ាក់!",
      rerouting: "[sighs] វង្វេងទៀតហើយ? ដូចប៉ាកូនមែន! មិនអីទេ ម៉ាក់រកផ្លូវថ្មីឱ្យ!",
      halfway: "ពាក់កណ្តាលផ្លូវហើយកូន! ផឹកទឹកផងណា បបូរមាត់ស្ងួតហើយមើល!",
      almost_there: "ជិតដល់ហើយកូន! ដល់ហើយផ្ញើសារប្រាប់ម៉ាក់ផង កុំភ្លេចដូចលើកមុន!",
      break_time: "[warmly] បើកមួយម៉ោងហើយកូន! ឈប់សម្រាក ញ៉ាំអីបន្តិចសិន! ម៉ាក់ដឹងថាកូនមិនទាន់ញ៉ាំ!",
      chatter: [
        "[warmly] កូន... ពេលណាមកលេងផ្ទះម៉ាក់? ម៉ាក់ធ្វើសម្លម្ជូរទុកឱ្យ!",
        "ម៉ាក់ឃើញកូនបើកបរល្អណាស់ថ្ងៃនេះ! ល្អជាងប៉ាកូនទៅទៀត! [laughs]",
        "[sighs] កូនអើយ ពេលណារៀបការ? [pause] ម៉ាក់សួរលេងទេ... មើលផ្លូវទៅ! [laughs]",
        "កុំលេងទូរស័ព្ទណា! ម៉ាក់ដឹង ម៉ាក់ឃើញ ព្រោះម៉ាក់ជាម៉ាក់!",
      ],
    },
    tuktuk_uncle: {
      overspeed: "ក្មួយ! លឿនពេកហើយ! តុកតុកពូដេញមិនទាន់ទេ! បន្ថយល្បឿនមក!",
      camera_ahead: "កាមេរ៉ានៅខាងមុខក្មួយ! ពូស្គាល់កន្លែងនេះ បើកតាមល្បឿនកំណត់ទៅ!",
      bump_ahead: "ដុំបន្ថយល្បឿន! យឺតៗក្មួយ កុំឱ្យភ្ញៀវលោតប៉ះដំបូល!",
      school_ahead: "សាលារៀនខាងមុខក្មួយ បន្ថយល្បឿន ក្មេងៗរត់ឆ្លងផ្លូវញឹកញាប់!",
      rerouting: "គ្មានបញ្ហាទេក្មួយ! ពូស្គាល់ផ្លូវកាត់គ្រប់ច្រកល្ហក!",
      halfway: "ពាក់កណ្តាលផ្លូវហើយក្មួយ! ល្អណាស់ ដូចតុកតុកពូអីចឹង លឿនតែមិនប្រញាប់!",
      almost_there: "ជិតដល់ហើយក្មួយ! ត្រៀមលុយ... អត់ទេ ពូលេងទេ ឥតគិតថ្លៃ! [laughs]",
      break_time: "បើកមួយម៉ោងហើយក្មួយ! ឈប់ផឹកកាហ្វេទឹកដោះគោទឹកកកមួយកែវសិន!",
      chatter: [
        "ក្មួយ... ពូបើកតុកតុកម្ភៃឆ្នាំ មិនដែលវង្វេងទេ! [pause] មែនទែន... វង្វេងតែពីរដងទេ! [laughs]",
        "ផ្លូវល្អណាស់ថ្ងៃនេះ! ពូចូលចិត្តផ្លូវបែបនេះ ស្រឡះដូចចិត្តពូ!",
      ],
    },
    hype_coach: {
      overspeed: "ថាមពលល្អ! តែល្បឿនលើសហើយ! អ្នកឈ្នះពិតគោរពច្បាប់ បន្ថយល្បឿន!",
      camera_ahead: "កាមេរ៉ាខាងមុខ! បង្ហាញថាអ្នកជាអ្នកបើកបរល្អបំផុត!",
      bump_ahead: "ដុំបន្ថយល្បឿន! យឺតៗ! ឆ្លងកាត់ដូចអ្នកជំនាញ!",
      school_ahead: "តំបន់សាលារៀន! បន្ថយល្បឿន! ការពារអនាគតរបស់ប្រទេស!",
      rerouting: "គ្មានបញ្ហា! អ្នកឈ្នះតែងតែរកផ្លូវថ្មី!",
      halfway: "ពាក់កណ្តាលហើយ! អ្នកពូកែណាស់! បន្តទៀត!",
      almost_there: "ជិតដល់គោលដៅហើយ! អ្នកធ្វើបាន!",
      break_time: "មួយម៉ោងហើយ! អ្នកជំនាញក៏សម្រាកដែរ! ផឹកទឹក ដកដង្ហើមវែងៗ!",
      chatter: ["អ្នកកំពុងបើកបរដោយសុវត្ថិភាព! នេះជាជ័យជម្នះតូចៗរាល់ថ្ងៃ!", "ដង្ហើមចូល... ដង្ហើមចេញ... អ្នកអស្ចារ្យណាស់ថ្ងៃនេះ!"],
    },
    little_sister: {
      overspeed: "បង! លឿនពេកហើយ ប្អូនខ្លាច! បន្ថយល្បឿនបន្តិចណាបង!",
      camera_ahead: "បងៗ មានកាមេរ៉ានៅខាងមុខ! បើកតាមល្បឿនកំណត់ណា!",
      bump_ahead: "ដុំបន្ថយល្បឿន! យឺតៗបង ប្អូនកំពុងញ៉ាំការ៉េម!",
      school_ahead: "សាលារៀនខាងមុខបង! បន្ថយល្បឿនណា!",
      rerouting: "អូយ វង្វេងហើយបង! មិនអីទេ ប្អូនរកផ្លូវថ្មីឱ្យ!",
      halfway: "ពាក់កណ្តាលផ្លូវហើយបង! ពូកែណាស់!",
      almost_there: "ជិតដល់ហើយបង! យេ!",
      break_time: "បងបើកមួយម៉ោងហើយ! ឈប់ទិញភេសជ្ជៈផងបង ប្អូនស្រេកទឹក!",
      chatter: ["បង... ប្អូនចូលចិត្តជិះជាមួយបងណាស់!", "បងៗ ពេលដល់ ទិញនំឱ្យប្អូនមួយផងណា!"],
    },
  };
  for (const p of PACKS) {
    const ex = EXTRA[p.id] || {};
    for (const ev of ALL_EVENTS) {
      const base = p.lines[ev] == null ? [] : [].concat(p.lines[ev]);
      const more = ex[ev] == null ? [] : [].concat(ex[ev]);
      const list = base.concat(more);
      if (list.length) p.lines[ev] = list; else delete p.lines[ev];
    }
  }

  const TAG = /\[[^\]]*\]\s*/g;
  for (const p of PACKS) {
    p.say = {};
    for (const ev of Object.keys(p.lines)) {
      p.say[ev] = p.lines[ev].slice();
      p.lines[ev] = p.lines[ev].map((x) => x.replace(TAG, "").replace(/\s{2,}/g, " ").trim());
    }
  }

  /** For voice/packs: every (pack, event, text) – used by the build script and the recording guide. */
  function allLines() {
    const out = [];
    for (const p of PACKS) for (const ev of ALL_EVENTS) (p.lines[ev] || []).forEach((km, i) =>
      out.push({ pack: p.id, event: ev, take: i + 1, file: clipPath(p.id, ev, i), km, say: p.say[ev][i] }));
    return out;
  }

  /** a random take index for this pack moment, avoiding the one used last time */
  const lastTake = {};
  function pickTake(p, ev) {
    const n = (p.lines[ev] || []).length;
    if (n <= 1) return 0;
    let i = Math.floor(Math.random() * n);
    if (i === lastTake[p.id + ev]) i = (i + 1) % n;
    lastTake[p.id + ev] = i;
    return i;
  }

  return { EVENTS, MORE_EVENTS, ALL_EVENTS, pickTake, PACKS, byId, clipPath, eventForStep, allLines };
});
