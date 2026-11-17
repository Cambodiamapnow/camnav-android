# CamNAV – នាំផ្លូវ for Android

**បើកបរដោយសុវត្ថិភាព · Drive safely**

## Build the APK on GitHub (free, no Android Studio)

This folder is a complete Android app project (CamNAV: Google-Maps-style navigation for Cambodia with Khmer + English voice, speed-limit warnings, speed cameras, traffic lights, nearby places and driver reports). GitHub's free servers turn it into **CamNAV.apk** for you.

## Get your APK (about 10 minutes, one time)

1. Go to **github.com** and sign in (or create a free account).
2. Click **+** (top right) → **New repository** → name: `camnav-android` → **Public** → **Create repository**.
3. On the empty repo page, click **uploading an existing file**.
4. Open this folder on your computer, select **everything inside it**, and drag it onto the page.
   *The `.github` folder is hidden on Mac. Press **Cmd + Shift + .** in Finder to show it, then include it.*
   Click **Commit changes**.
5. Click the **Actions** tab. A job called **Build APK** starts by itself. Wait 3–5 minutes until it shows a green ✓.
   (If it says workflows are disabled, click the green button to enable them, then **Build APK → Run workflow**.)
6. On the repo's main page, click **Releases** (right side) → newest **CamNAV build** → **CamNAV.apk**.
   Open that same page **on your phone** to download the APK directly.

### If the `.github` folder didn't upload
Click **Actions → set up a workflow yourself**, paste the contents of `.github/workflows/build-apk.yml`, and click **Commit changes**.

## Install on the phone
1. Download **CamNAV.apk** on the phone and tap it.
2. Android asks to allow installing from Chrome/Files → **Allow** → **Install**.
   (Google Play Protect may warn "unknown app" because it is not from the Play Store → **Install anyway**.)
3. Open CamNAV → allow **Location**.
4. For the Khmer voice: ⚙️ → Voice → ខ្មែរ → **Test voice**. If it says no Khmer voice, tap **Open voice settings** →
   Google → Install voice data → **Khmer**.

## Updating the app
Edit files in `app/src/main/assets/` (the web app: `index.html`, `js/…`), commit, and GitHub builds a new APK automatically.
Raise `versionCode` in `app/build.gradle` each time so the phone installs it over the old one.

## Build with Android Studio instead (optional)
Open this folder in Android Studio → wait for sync → **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.

## Notes
- This is a **debug-signed** APK: perfect for you and testers. For the Play Store you need a release build with your own signing key (ask Claude to add it).
- The app needs mobile data (map, search and routing come from the internet).
- Bluetooth to the ESP32 car screen does **not** work inside the APK (Android WebView has no Web Bluetooth). Use the Chrome web version for that, or ask for a native Bluetooth bridge.
