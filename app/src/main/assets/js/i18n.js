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
      slowTraffic: "Slow traffic? Report a jam", report: "Report", reports: { police: "Police", accident: "Crash", jam: "Traffic jam", hazard: "Hazard", flood: "Flood", roadwork: "Roadwork", camera: "Speed camera", bump: "Speed bump", school: "School zone", rail: "Railway crossing", toll: "Toll booth", stop: "Stop sign", give_way: "Give way", signal: "Traffic light", crossing: "Pedestrian crossing", hazard: "Danger ahead", curve: "Sharp curve", junction_danger: "Dangerous junction", animal: "Animal crossing", no_overtake: "No overtaking" },
      reportSaved: "Report added. Thanks!", reportNote: "Reports are kept on this phone for now. Sharing them with all drivers needs a server.", clearReports: "Clear my reports",
      shareEta: "I'm on my way to {dest}. Arriving around {time} ({left}).", copied: "Copied — paste it in a message",
      layers: "Map type", mapDefault: "Default", mapOsm: "Khmer labels", mapDark: "Dark (K-Map)", mapLight: "Light", mapDetails: "Map details",
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
      then: "Then", mute: "Mute", headingUpOn: "Map turns with you", northUpOn: "North up", accountName: "Account name", payStep1: "Scan with ABA, ACLEDA, Wing or any bank app and pay {amount}.", payStep2: "In the remark, write your phone number: {phone}.", payStep3: "Tap “I've paid”. Pro switches on as soon as K'MAP sees your payment.", yourPhone: "your phone number", iPaid: "I've paid", paidPending: "Thank you! Your payment is waiting for confirmation. Pro switches on as soon as it's checked (usually within a few hours).", billRef: "Reference", myAccount: "My account", cloudOff: "Accounts are not switched on in this build yet.", signedIn: "Signed in ✓", signedOut: "Signed out", enterCode: "Enter the 6-digit code", codeSent: "We sent an SMS code to {phone}.", verify: "Verify", badCode: "Please enter the 6-digit code", signInTitle: "Sign in", signInWhy: "Keep your points, saved places and Pro on every phone. You can keep using the map as a guest.", phoneNumber: "Phone number", sendCode: "Send SMS code", or: "or", google: "Continue with Google", continueGuest: "Continue as guest", badPhone: "Please enter a Cambodian number, e.g. 12 345 678", finishInBrowser: "Finish signing in in the browser, then come back to K-Map", stFree: "Free", stTrial: "Free trial", stPro: "Pro", stExpired: "Expired", guest: "Guest", daysLeft: "{n} days left", points: "points", nextRank: "{n} points to {rank}", topRank: "Top rank reached — thank you!", renewCoffee: "Renew – $1/month coffee", coffeeCta: "Buy the developer a coffee – $1/month", voicePacks: "Voice packs", signOut: "Sign out", perkVoices: "Funny Khmer voice packs", perkAdFree: "Ad-free, forever", perkOffline: "Offline maps & voices (coming soon)", perkShortcuts: "Advanced shortcuts", coffeeTitle: "Buy the developer a coffee", month: "month", coffeeWhy: "K-Map is made in Cambodia by K'MAP, a Khmer developer. One coffee a month keeps the map, servers and voices running for everyone.", proUntil: "Pro is active until {date}", startTrial: "Start 7-day free trial", payKhqr: "Pay $1 with ABA / Bakong", payPlay: "Google Play subscription", payNote: "KHQR gives 30 days of Pro. We remind you 3 days before it ends. No automatic charges.", notNow: "Not now", trialStarted: "7-day free trial started — enjoy Pro!", playSoon: "Google Play subscriptions are coming soon. Please use KHQR for now.", makingQr: "Making your KHQR…", khqrFail: "Couldn't make the KHQR right now. Please try again later.", scanToPay: "Scan with ABA, ACLEDA, Wing or any Bakong app. This screen updates by itself when paid.", saveQr: "Save QR to photos", saveQrHow: "Paying on this phone? Save the QR, then in your bank app choose Scan → upload from gallery.", qrExpired: "This QR has expired. Close and try again.", thanksCoffee: "Thank you for the coffee!", qrSaved: "QR saved to your photos", qrSaveFail: "Couldn't save the picture", free: "Free", renewSoon: "Pro ends in {n} days", renew: "Renew", stillThere: "Still there", cleared: "Cleared", thanksPoints: "Thanks! +{n} points", reportShared: "Shared with drivers nearby · +{n} points", reportShareNote: "Your report is shared live with drivers nearby and disappears after 45 minutes unless others confirm it.", showSigns: "Road signs: speed bumps, schools, railway, toll", rules: "Traffic rules", rulesShort: "Rules", reminders: "Helmet / seat-belt reminder at start", chatter: "Voice characters chat and joke on long straight roads", motoNoExpress: "Motorbike: routes avoid the expressway", kmVoiceType: "Khmer voice", kmNatural: "Natural (recorded)", kmPhone: "Phone voice", naturalReady: "Natural Khmer voice installed ({n} clips)", naturalMissing: "Natural Khmer voice not installed yet — using the phone voice", recenter: "Re-centre", loadingRoad: "Loading speed limits and cameras…", noMore: "",
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
      slowTraffic: "ចរាចរណ៍យឺត? រាយការណ៍ការស្ទះ", report: "រាយការណ៍", reports: { police: "ប៉ូលិស", accident: "គ្រោះថ្នាក់", jam: "ស្ទះចរាចរណ៍", hazard: "ឧបសគ្គ", flood: "ទឹកលិចផ្លូវ", roadwork: "ជួសជុលផ្លូវ", camera: "កាមេរ៉ាល្បឿន", bump: "ដុំបន្ថយល្បឿន", school: "តំបន់សាលារៀន", rail: "ផ្លូវរថភ្លើងកាត់", toll: "ស្ថានីយបង់ថ្លៃផ្លូវ", stop: "ស្លាកឈប់", give_way: "ផ្តល់សិទ្ធិ", signal: "ភ្លើងស្តុប", crossing: "កន្លែងឆ្លងផ្លូវ", hazard: "គ្រោះថ្នាក់ខាងមុខ", curve: "ផ្លូវកោងខ្លាំង", junction_danger: "ផ្លូវប្រសព្វគ្រោះថ្នាក់", animal: "សត្វឆ្លងផ្លូវ", no_overtake: "ហាមវ៉ាជែង" },
      reportSaved: "បានបន្ថែមរបាយការណ៍។ អរគុណ!", reportNote: "បច្ចុប្បន្ន របាយការណ៍រក្សាទុកតែលើទូរស័ព្ទនេះ។ ការចែករំលែកជាមួយអ្នកបើកបរទាំងអស់ត្រូវការម៉ាស៊ីនមេ។", clearReports: "លុបរបាយការណ៍របស់ខ្ញុំ",
      shareEta: "ខ្ញុំកំពុងធ្វើដំណើរទៅ {dest}។ នឹងមកដល់ប្រហែលម៉ោង {time} ({left})។", copied: "បានចម្លង — បិទភ្ជាប់ក្នុងសារ",
      layers: "ប្រភេទផែនទី", mapDefault: "លំនាំដើម", mapOsm: "ឈ្មោះខ្មែរ", mapDark: "ងងឹត (K-Map)", mapLight: "ភ្លឺ", mapDetails: "ព័ត៌មានលើផែនទី",
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
      then: "បន្ទាប់មក", mute: "បិទសំឡេង", headingUpOn: "ផែនទីបង្វិលតាមទិសអ្នក", northUpOn: "ទិសខាងជើងនៅលើ", accountName: "ឈ្មោះគណនី", payStep1: "ស្កេនជាមួយ ABA, ACLEDA, Wing ឬកម្មវិធីធនាគារណាមួយ ហើយបង់ {amount}។", payStep2: "ក្នុងកំណត់សម្គាល់ សូមសរសេរលេខទូរស័ព្ទរបស់អ្នក៖ {phone}។", payStep3: "ចុច «ខ្ញុំបានបង់ហើយ»។ Pro នឹងបើកភ្លាមៗ ពេល K'MAP ឃើញការបង់ប្រាក់របស់អ្នក។", yourPhone: "លេខទូរស័ព្ទរបស់អ្នក", iPaid: "ខ្ញុំបានបង់ហើយ", paidPending: "អរគុណ! ការបង់ប្រាក់របស់អ្នកកំពុងរង់ចាំការបញ្ជាក់។ Pro នឹងបើកភ្លាមៗពេលពិនិត្យរួច (ជាធម្មតាក្នុងរយៈពេលពីរបីម៉ោង)។", billRef: "លេខយោង", myAccount: "គណនីរបស់ខ្ញុំ", cloudOff: "មុខងារគណនីមិនទាន់បើកក្នុងកំណែនេះទេ។", signedIn: "បានចូលគណនី ✓", signedOut: "បានចាកចេញ", enterCode: "បញ្ចូលលេខកូដ ៦ ខ្ទង់", codeSent: "យើងបានផ្ញើលេខកូដ SMS ទៅ {phone}។", verify: "ផ្ទៀងផ្ទាត់", badCode: "សូមបញ្ចូលលេខកូដ ៦ ខ្ទង់", signInTitle: "ចូលប្រើប្រាស់គណនី", signInWhy: "រក្សាពិន្ទុ ទីកន្លែងដែលបានរក្សាទុក និង Pro នៅលើគ្រប់ទូរស័ព្ទ។ អ្នកអាចបន្តប្រើផែនទីជាភ្ញៀវបាន។", phoneNumber: "លេខទូរស័ព្ទ", sendCode: "ផ្ញើលេខកូដ SMS", or: "ឬ", google: "បន្តជាមួយ Google", continueGuest: "បន្តជាភ្ញៀវ", badPhone: "សូមបញ្ចូលលេខទូរស័ព្ទកម្ពុជា ឧ. ១២ ៣៤៥ ៦៧៨", finishInBrowser: "សូមបញ្ចប់ការចូលក្នុងកម្មវិធីរុករក រួចត្រឡប់មក K-Map វិញ", stFree: "ឥតគិតថ្លៃ", stTrial: "សាកល្បងឥតគិតថ្លៃ", stPro: "Pro", stExpired: "ផុតកំណត់", guest: "ភ្ញៀវ", daysLeft: "នៅសល់ {n} ថ្ងៃ", points: "ពិន្ទុ", nextRank: "{n} ពិន្ទុទៀតដល់ {rank}", topRank: "អ្នកឡើងដល់ឋានៈខ្ពស់បំផុតហើយ — អរគុណ!", renewCoffee: "បន្ត – កាហ្វេ $1/ខែ", coffeeCta: "កាហ្វេមួយកែវសម្រាប់ Developer – $1/ខែ", voicePacks: "សំឡេងនាំផ្លូវ", signOut: "ចាកចេញ", perkVoices: "សំឡេងនាំផ្លូវកំប្លែងជាភាសាខ្មែរ", perkAdFree: "គ្មានពាណិជ្ជកម្មជារៀងរហូត", perkOffline: "ផែនទី និងសំឡេងគ្មានអ៊ីនធឺណិត (ឆាប់ៗនេះ)", perkShortcuts: "ផ្លូវកាត់កម្រិតខ្ពស់", coffeeTitle: "កាហ្វេមួយកែវសម្រាប់ Developer", month: "ខែ", coffeeWhy: "K-Map បង្កើតនៅកម្ពុជា ដោយ K'MAP ជា Developer ខ្មែរ។ កាហ្វេមួយកែវក្នុងមួយខែ ជួយឱ្យផែនទី ម៉ាស៊ីនមេ និងសំឡេង ដំណើរការសម្រាប់មនុស្សគ្រប់គ្នា។", proUntil: "Pro ដំណើរការរហូតដល់ {date}", startTrial: "សាកល្បងឥតគិតថ្លៃ ៧ ថ្ងៃ", payKhqr: "បង់ $1 តាម ABA / បាគង", payPlay: "ជាវតាម Google Play", payNote: "KHQR ផ្តល់ Pro ៣០ ថ្ងៃ។ យើងរំលឹកអ្នក ៣ ថ្ងៃមុនផុតកំណត់។ មិនកាត់លុយដោយស្វ័យប្រវត្តិទេ។", notNow: "ពេលក្រោយ", trialStarted: "បានចាប់ផ្តើមសាកល្បង ៧ ថ្ងៃ — រីករាយជាមួយ Pro!", playSoon: "ការជាវតាម Google Play នឹងមានឆាប់ៗនេះ។ សូមប្រើ KHQR សិន។", makingQr: "កំពុងបង្កើត KHQR…", khqrFail: "មិនអាចបង្កើត KHQR បានទេឥឡូវនេះ។ សូមព្យាយាមម្តងទៀតពេលក្រោយ។", scanToPay: "ស្កេនជាមួយ ABA, ACLEDA, Wing ឬកម្មវិធីបាគងណាមួយ។ អេក្រង់នេះនឹងប្តូរដោយស្វ័យប្រវត្តិពេលបង់រួច។", saveQr: "រក្សាទុក QR ក្នុងរូបថត", saveQrHow: "បង់លើទូរស័ព្ទនេះ? រក្សាទុក QR រួចក្នុងកម្មវិធីធនាគារ ជ្រើស ស្កេន → ពីរូបថត។", qrExpired: "QR នេះផុតកំណត់ហើយ។ សូមបិទ ហើយសាកម្តងទៀត។", thanksCoffee: "អរគុណសម្រាប់កាហ្វេ!", qrSaved: "បានរក្សាទុក QR ក្នុងរូបថត", qrSaveFail: "មិនអាចរក្សាទុករូបភាពបានទេ", free: "ឥតគិតថ្លៃ", renewSoon: "Pro នឹងផុតក្នុង {n} ថ្ងៃទៀត", renew: "បន្ត", stillThere: "នៅស្ទះ", cleared: "ផុតហើយ", thanksPoints: "អរគុណ! +{n} ពិន្ទុ", reportShared: "បានចែករំលែកជាមួយអ្នកបើកបរក្បែរនោះ · +{n} ពិន្ទុ", reportShareNote: "របាយការណ៍របស់អ្នកត្រូវបានចែករំលែកផ្ទាល់ជាមួយអ្នកបើកបរក្បែរនោះ ហើយនឹងបាត់វិញក្រោយ ៤៥ នាទី លុះត្រាតែមានអ្នកផ្សេងបញ្ជាក់។", showSigns: "ស្លាកសញ្ញា៖ ដុំបន្ថយល្បឿន សាលារៀន ផ្លូវរថភ្លើង បង់ថ្លៃផ្លូវ", rules: "ច្បាប់ចរាចរណ៍", rulesShort: "ច្បាប់", reminders: "រំលឹកពាក់មួក / ខ្សែក្រវាត់ ពេលចាប់ផ្តើម", chatter: "តួអង្គសំឡេងនិយាយលេង ពេលបើកលើផ្លូវត្រង់វែង", motoNoExpress: "ម៉ូតូ៖ ផ្លូវជៀសវាងផ្លូវល្បឿនលឿន", kmVoiceType: "សំឡេងខ្មែរ", kmNatural: "ធម្មជាតិ (ថតទុក)", kmPhone: "សំឡេងទូរស័ព្ទ", naturalReady: "បានដំឡើងសំឡេងខ្មែរធម្មជាតិ ({n} ឃ្លា)", naturalMissing: "មិនទាន់មានសំឡេងខ្មែរធម្មជាតិ — កំពុងប្រើសំឡេងទូរស័ព្ទ", recenter: "ត្រឡប់មកឡាន", loadingRoad: "កំពុងទាញយកល្បឿនកំណត់ និងកាមេរ៉ា…", noMore: "",
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
      road: { bump: "មានដុំបន្ថយល្បឿននៅខាងមុខ", school: "តំបន់សាលារៀននៅខាងមុខ សូមបន្ថយល្បឿន", rail: "ផ្លូវរថភ្លើងកាត់នៅខាងមុខ សូមប្រុងប្រយ័ត្ន", toll: "ស្ថានីយបង់ថ្លៃផ្លូវនៅខាងមុខ", stop: "ស្លាកឈប់នៅខាងមុខ", hazard: "គ្រោះថ្នាក់នៅខាងមុខ សូមប្រុងប្រយ័ត្ន", curve: "ផ្លូវកោងខ្លាំងនៅខាងមុខ សូមបន្ថយល្បឿន", junction_danger: "ផ្លូវប្រសព្វគ្រោះថ្នាក់នៅខាងមុខ", animal: "ប្រយ័ត្នសត្វឆ្លងផ្លូវ", no_overtake: "ហាមវ៉ាជែង" },
      helmet: "សូមពាក់មួកសុវត្ថិភាព ទាំងអ្នកបើកបរ និងអ្នកជិះពីក្រោយ",
      seatbelt: "សូមពាក់ខ្សែក្រវាត់សុវត្ថិភាព",
      report: {
        police: "មានប៉ូលិសនៅខាងមុខ",
        accident: "មានគ្រោះថ្នាក់នៅខាងមុខ",
        jam: "ស្ទះចរាចរណ៍នៅខាងមុខ",
        hazard: "មានឧបសគ្គនៅលើផ្លូវខាងមុខ",
        flood: "ផ្លូវលិចទឹកនៅខាងមុខ",
        roadwork: "មានការជួសជុលផ្លូវនៅខាងមុខ",
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
      road: { bump: "Speed bump ahead", school: "School zone ahead, slow down", rail: "Railway crossing ahead, take care", toll: "Toll booth ahead", stop: "Stop sign ahead", hazard: "Danger ahead, take care", curve: "Sharp curve ahead, slow down", junction_danger: "Dangerous junction ahead", animal: "Watch out for animals crossing", no_overtake: "No overtaking" },
      helmet: "Please wear a helmet, rider and passenger",
      seatbelt: "Please fasten your seat belt",
      report: {
        police: "Police reported ahead",
        accident: "Accident reported ahead",
        jam: "Traffic jam ahead",
        hazard: "Hazard on the road ahead",
        flood: "Flooded road ahead",
        roadwork: "Roadwork ahead",
        camera: "Speed camera ahead",
      },
    },
  };

  // ---------- traffic rules summary (Cambodian Road Traffic Law + Sub-Decree on fines) ----------
  const RULES = {
    km: {
      intro: "សង្ខេបច្បាប់ចរាចរណ៍សំខាន់ៗ ដើម្បីជួយអ្នកបើកបរដោយសុវត្ថិភាព។ នេះមិនមែនជាដំបូន្មានផ្លូវច្បាប់ទេ — សូមគោរពស្លាកសញ្ញា និងប៉ូលិសចរាចរណ៍។ ចំនួនពិន័យអាចផ្លាស់ប្តូរ។",
      common: ["ល្បឿនកំណត់ពេលគ្មានស្លាក៖ ក្នុងទីក្រុង ឡាន ៤០ គ.ម/ម៉ ម៉ូតូ ៣០ គ.ម/ម៉ · ក្រៅទីក្រុង ៩០ គ.ម/ម៉ · ផ្លូវល្បឿនលឿន តាមស្លាក",
        "ស្រា៖ ជាតិអាល់កុលក្នុងដង្ហើម ០.២៥ mg/L ឡើងទៅ ត្រូវពិន័យ · ០.៤០ mg/L ឡើងទៅ ជាបទល្មើសព្រហ្មទណ្ឌ (ពន្ធនាគារ និងពិន័យ)",
        "ហាមកាន់ទូរស័ព្ទពេលបើកបរ",
        "ឈប់ពេលភ្លើងក្រហម និងនៅស្លាកឈប់ · ផ្តល់សិទ្ធិអ្នកថ្មើរជើងនៅកន្លែងឆ្លងផ្លូវ",
        "ត្រូវមានប័ណ្ណបើកបរ និងឯកសារយានយន្តត្រឹមត្រូវ"],
      car: ["អ្នកបើកបរ និងអ្នកជិះកៅអីមុខ ត្រូវពាក់ខ្សែក្រវាត់សុវត្ថិភាព", "កុមារគួរអង្គុយកៅអីក្រោយ"],
      moto: ["អ្នកបើកបរ និងអ្នកជិះពីក្រោយ ត្រូវពាក់មួកសុវត្ថិភាព (ពិន័យម្នាក់ៗ)", "ម៉ូតូមិនត្រូវបានអនុញ្ញាតលើផ្លូវល្បឿនលឿន (ភ្នំពេញ–ព្រះសីហនុ)", "បើកភ្លើងហ្វាពេលយប់ ហើយកុំបើកបរទន្ទឹមគ្នា"],
      car_t: "ឡាន", moto_t: "ម៉ូតូ", common_t: "ទាំងអស់គ្នា", signs_t: "ស្លាកសញ្ញា",
      signsIntro: "ស្លាកសញ្ញា និងព័ត៌មានផ្លូវដែល K-Map តាមដាន (ពី OpenStreetMap និងរបាយការណ៍អ្នកបើកបរ)។ K-Map ព្រមានអ្នកមុនពេលទៅដល់។",
    },
    en: {
      intro: "A short summary of key Cambodian traffic rules to help you drive safely. Not legal advice — always follow road signs and traffic police. Fine amounts can change.",
      common: ["Speed limits where no sign: in towns 40 km/h for cars, 30 km/h for motorbikes · outside towns 90 km/h · expressway: as signed",
        "Alcohol: 0.25 mg/L breath alcohol or more is fined · 0.40 mg/L or more is a criminal offence (prison and fine)",
        "No handheld phone while driving",
        "Stop at red lights and stop signs · give way to pedestrians at crossings",
        "Carry a valid driving licence and vehicle papers"],
      car: ["Driver and front passenger must wear seat belts", "Children are safest in the back seat"],
      moto: ["Rider and passenger must both wear helmets (each can be fined)", "Motorbikes are not allowed on the expressway (Phnom Penh–Sihanoukville)", "Lights on at night and don't ride side by side"],
      car_t: "Car", moto_t: "Motorbike", common_t: "Everyone", signs_t: "Signs",
      signsIntro: "Signs and road features K-Map tracks (from OpenStreetMap and driver reports). K-Map warns you before you reach them.",
    },
  };

  return { UI, ALERTS, RULES, kmNum, isKhmer, distText, action, sentence, streetFor };
});
