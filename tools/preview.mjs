// tools/preview.mjs — open the app in headless Chrome with the real map and save screenshots.
// Used by the GitHub build so every APK comes with a preview of how the map looks.
import puppeteer from "puppeteer-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("app/src/main/assets");
const TYPES = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".webmanifest": "application/json", ".mp3": "audio/mpeg" };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]).replace(/^\/+/, "") || "index.html");
  fs.readFile(p, (err, data) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" }); res.end(data);
  });
}).listen(8099);

const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--enable-webgl", "--ignore-gpu-blocklist"] });
const shots = [["dark", "km", "preview-dark.png"], ["light", "en", "preview-light.png"]];
let errors = [];
for (const [tiles, lang, file] of shots) {
  const ctx = await browser.createBrowserContext();
  await ctx.overridePermissions("http://localhost:8099", ["geolocation"]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await page.setGeolocation({ latitude: 11.5765, longitude: 104.9230 });
  await page.evaluateOnNewDocument((tiles, lang) => {
    localStorage.setItem("camnav.settings", JSON.stringify({ tiles, lang, styleV: 2 }));
    localStorage.setItem("camnav.lastCenter", JSON.stringify([104.9230, 11.5765]));
  }, tiles, lang);
  await page.goto("http://localhost:8099/index.html", { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 9000));
  await page.screenshot({ path: file });
  console.log("saved", file);
  await ctx.close();
}
await browser.close();
server.close();
console.log("page errors:", errors.length ? errors.join("\n") : "none");
fs.writeFileSync("preview-log.txt", errors.length ? errors.join("\n") : "no page errors\n");
if (errors.some((e) => /style|layer|expression/i.test(e))) process.exit(1);
