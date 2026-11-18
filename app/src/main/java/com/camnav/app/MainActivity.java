package com.camnav.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.WindowManager;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * CamNav Android shell: shows the web app (bundled in assets/) in a WebView,
 * served from a private https origin, and adds what a WebView lacks:
 * native Khmer/English text-to-speech, GPS permission, and keep-screen-on.
 */
public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    // Requests to this host are answered from the APK's assets, never the network.
    private static final String ASSET_HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + ASSET_HOST + "/index.html";
    private static final int REQ_LOCATION = 42;

    private WebView web;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;

    private String pendingDeepLink;   // camnav://login?... waiting for the page to load
    private boolean pageReady = false;

    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        tts = new TextToSpeech(this, this);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setGeolocationEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);

        web.addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        web.addJavascriptInterface(new AppBridge(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (ASSET_HOST.equals(u.getHost())) return loadAsset(u.getPath());
                return null; // tiles, routing, search, fonts: normal network
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                deliverDeepLink();
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (ASSET_HOST.equals(u.getHost())) return false;
                // links to other sites open in the browser
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (hasLocationPermission()) {
                    callback.invoke(origin, true, true);
                } else {
                    pendingGeoOrigin = origin;
                    pendingGeoCallback = callback;
                    askLocationPermission();
                }
            }
        });

        if (!hasLocationPermission()) askLocationPermission();

        rememberDeepLink(getIntent());
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(START_URL);
    }

    // ---------------- camnav://login deep link (Google sign-in) ----------------
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        rememberDeepLink(intent);
        deliverDeepLink();
    }

    private void rememberDeepLink(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri u = intent.getData();
        if ("camnav".equals(u.getScheme())) pendingDeepLink = u.toString();
    }

    private void deliverDeepLink() {
        if (!pageReady || pendingDeepLink == null || web == null) return;
        String js = "window.CamNAV && CamNAV.onDeepLink(" + org.json.JSONObject.quote(pendingDeepLink) + ")";
        pendingDeepLink = null;
        web.evaluateJavascript(js, null);
    }

    // ---------------- assets over https ----------------
    private WebResourceResponse loadAsset(String path) {
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        String file = path.startsWith("/") ? path.substring(1) : path;
        try {
            InputStream in = getAssets().open(file);
            WebResourceResponse r = new WebResourceResponse(mimeOf(file), "UTF-8", in);
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-cache");
            h.put("Access-Control-Allow-Origin", "*");
            r.setResponseHeaders(h);
            return r;
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                    new HashMap<String, String>(), null);
        }
    }

    private static String mimeOf(String f) {
        String n = f.toLowerCase(Locale.ROOT);
        if (n.endsWith(".html")) return "text/html";
        if (n.endsWith(".js")) return "application/javascript";
        if (n.endsWith(".css")) return "text/css";
        if (n.endsWith(".json") || n.endsWith(".webmanifest")) return "application/json";
        if (n.endsWith(".png")) return "image/png";
        if (n.endsWith(".svg")) return "image/svg+xml";
        if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
        if (n.endsWith(".mp3")) return "audio/mpeg";
        if (n.endsWith(".wav")) return "audio/wav";
        if (n.endsWith(".ogg")) return "audio/ogg";
        return "application/octet-stream";
    }

    // ---------------- location permission ----------------
    private boolean hasLocationPermission() {
        return checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private void askLocationPermission() {
        requestPermissions(new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != REQ_LOCATION) return;
        boolean granted = hasLocationPermission();
        if (pendingGeoCallback != null) {
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, granted);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        } else if (granted && web != null) {
            web.reload(); // restart GPS watch now that we are allowed
        }
    }

    // ---------------- text-to-speech ----------------
    @Override
    public void onInit(int status) {
        ttsReady = status == TextToSpeech.SUCCESS;
        if (ttsReady) {
            tts.setLanguage(Locale.US);
            // tell the web app when each sentence has finished, so recorded clips and
            // text-to-speech can take turns without talking over each other
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { notifyDone(id); }
                @Override public void onError(String id) { notifyDone(id); }
            });
            runOnUiThread(() -> {
                if (web != null) web.evaluateJavascript("window.Voice && Voice._refresh && Voice._refresh()", null);
            });
        }
    }

    private void notifyDone(String id) {
        if (id == null) return;
        final String safe = id.replaceAll("[^A-Za-z0-9_]", "");
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window.Voice && Voice._ttsDone && Voice._ttsDone('" + safe + "')", null);
        });
    }

    private static Locale localeOf(String lang) {
        return "km".equals(lang) ? new Locale("km", "KH") : Locale.US;
    }

    /** Exposed to JavaScript as window.AndroidTTS */
    private class TtsBridge {
        @JavascriptInterface
        public void speak(String text, String lang, boolean flush, double rate, String utteranceId) {
            if (!ttsReady || text == null || text.trim().isEmpty()) { notifyDone(utteranceId); return; }
            synchronized (tts) {
                tts.setLanguage(localeOf(lang));
                tts.setSpeechRate((float) rate);
                tts.speak(text, flush ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, null,
                        utteranceId != null ? utteranceId : "u" + System.nanoTime());
            }
        }

        @JavascriptInterface
        public void stop() {
            if (ttsReady) tts.stop();
        }

        @JavascriptInterface
        public boolean hasLang(String lang) {
            if (!ttsReady) return false;
            int r = tts.isLanguageAvailable(localeOf(lang));
            return r >= TextToSpeech.LANG_AVAILABLE;
        }

        @JavascriptInterface
        public void openTtsSettings() {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent("com.android.settings.TTS_SETTINGS");
                    i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (Exception e) {
                    try {
                        Intent i = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                        startActivity(i);
                    } catch (Exception ignored) { }
                }
            });
        }
    }

    /** Exposed to JavaScript as window.AndroidApp */
    private class AppBridge {
        /** open a link in the phone's browser (Google blocks sign-in inside app web views) */
        @JavascriptInterface
        public void openExternal(String url) {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) { }
            });
        }

        /** save a data:image/png;base64,... picture into the gallery (Pictures/CamNAV) */
        @JavascriptInterface
        public boolean saveImage(String dataUrl, String fileName) {
            try {
                String b64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= 29) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                    v.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                    v.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/CamNAV");
                    Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) return false;
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) { os.write(bytes); }
                } else {
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "CamNAV");
                    if (!dir.exists() && !dir.mkdirs()) return false;
                    File f = new File(dir, fileName);
                    try (FileOutputStream os = new FileOutputStream(f)) { os.write(bytes); }
                    sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(f)));
                }
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void share(String text) {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(Intent.EXTRA_TEXT, text);
                try { startActivity(Intent.createChooser(i, null)); } catch (Exception ignored) { }
            });
        }
    }

    // ---------------- lifecycle ----------------
    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        if (web != null) web.saveState(outState);
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) { web.destroy(); web = null; }
        super.onDestroy();
    }
}
