import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import { Readable } from "node:stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteDir = path.join(__dirname, "_site");
const siteOrigin = process.env.SITE_ORIGIN || "https://applehand.dev";

const app = express();
const port = process.env.PORT || 8080;
const trustedIngressIps = new Set(
  (process.env.TRUSTED_INGRESS_IPS || "127.0.0.1,::1")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);

// --- GEOAssistant RAG API proxy (public host -> private backend) ---
// Bound narrowly to the 4 known rag-geo-api routes (not a blanket /api/*
// wildcard) so this can never shadow other /api/* routes on this site,
// e.g. the existing /api/status below.
// The real backend URL is deployment config, not code: set RAG_API_BASE
// in the environment (e.g. in the systemd unit / .env on the proxy host).
const RAG_API_BASE = process.env.RAG_API_BASE || "http://127.0.0.1:8100";
const RAG_API_PATHS = new Set([
  "/api/healthz",
  "/api/quota",
  "/api/controls",
  "/api/knobs", // legacy alias for cached pages
  "/api/chat",
]);
// GET-only prefix for retrieved-screenshot images (/api/media/<slug>/<variant>.jpg).
const RAG_MEDIA_PREFIX = "/api/media/";
const SCHEMA_API_BASE = process.env.SCHEMA_API_BASE || "http://127.0.0.1:8120";
const SCHEMA_API_PREFIX = "/api/schema/";

app.use(express.json({ limit: "512kb" }));

function clientIpForUpstream(req) {
  const peer = req.socket.remoteAddress || "unknown";
  if (trustedIngressIps.has(peer) && req.headers["cf-connecting-ip"]) {
    return req.headers["cf-connecting-ip"];
  }
  return peer;
}

async function proxyToRagApi(req, res) {
  const targetUrl = `${RAG_API_BASE}${req.originalUrl}`;
  const headers = { "content-type": req.headers["content-type"] || "application/json" };
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  // Forward the real client IP so the backend's per-IP soft quota cap
  // applies to actual visitors, not to this proxy's own address. Use the
  // Cloudflare-Tunnel-provided CF-Connecting-IP (set by cloudflared, not
  // spoofable by clients) and send it as X-Real-IP, which the backend
  // trusts. Never forward the client-supplied X-Forwarded-For: its first
  // hop is attacker-controlled and would let anyone reset the per-IP cap
  // with a forged header.
  headers["x-real-ip"] = clientIpForUpstream(req);

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = JSON.stringify(req.body ?? {});
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    res.status(502).json({ error: "rag-geo-api unreachable", detail: String(err?.message || err) });
    return;
  }

  res.status(upstream.status);
  for (const [key, value] of upstream.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === "content-length" || lower === "set-cookie" || lower === "content-encoding") continue;
    res.setHeader(key, value);
  }
  // Node 20's fetch Headers exposes multiple Set-Cookie values via
  // getSetCookie(); plain .get()/.entries() would incorrectly join them.
  const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);

  if (!upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).pipe(res);
}

app.all("/api/*", (req, res, next) => {
  const isMedia = req.method === "GET" && req.path.startsWith(RAG_MEDIA_PREFIX);
  if (!RAG_API_PATHS.has(req.path) && !isMedia) return next();
  return proxyToRagApi(req, res);
});

async function proxyToSchemaApi(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.status(405).json({ error: "method not allowed" });
    return;
  }
  const origin = req.headers.origin;
  if (req.method === "POST" && origin && origin !== siteOrigin) {
    res.status(403).json({ error: "request origin is not allowed" });
    return;
  }
  const targetUrl = `${SCHEMA_API_BASE}${req.originalUrl}`;
  const headers = {
    "content-type": req.headers["content-type"] || "application/json",
    "x-real-ip": clientIpForUpstream(req),
  };
  if (req.headers.cookie) headers.cookie = req.headers.cookie;
  if (origin) headers.origin = origin;

  const init = { method: req.method, headers };
  if (req.method === "POST") init.body = JSON.stringify(req.body ?? {});

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch {
    res.status(502).json({ error: "schema architect service is unavailable" });
    return;
  }

  res.status(upstream.status);
  for (const [key, value] of upstream.headers.entries()) {
    const lower = key.toLowerCase();
    if (["content-length", "set-cookie", "content-encoding"].includes(lower)) continue;
    res.setHeader(key, value);
  }
  const cookies =
    typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
  if (cookies.length) res.setHeader("set-cookie", cookies);
  if (!upstream.body) {
    res.end();
    return;
  }
  Readable.fromWeb(upstream.body).pipe(res);
}

app.all("/api/schema/*", (req, res) => proxyToSchemaApi(req, res));

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "request body is too large" });
    return;
  }
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({ error: "invalid JSON request body" });
    return;
  }
  next(err);
});

const SKIP_EXTENSIONS = new Set([
  ".css",
  ".gif",
  ".ico",
  ".jpg",
  ".jpeg",
  ".js",
  ".json",
  ".map",
  ".pdf",
  ".png",
  ".txt",
  ".webp",
  ".xml",
]);

function countWritings() {
  const writingsDir = path.join(siteDir, "writings");
  if (!fs.existsSync(writingsDir)) return 0;
  return fs
    .readdirSync(writingsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory()).length;
}

function gitInfo() {
  try {
    const repo = path.resolve(__dirname, "..");
    const commit = execSync(`git -C ${repo} rev-parse --short HEAD`, {
      encoding: "utf8",
    }).trim();
    const lastCommitDate = execSync(`git -C ${repo} log -1 --format=%cI`, {
      encoding: "utf8",
    }).trim();
    return { commit, lastCommitDate };
  } catch {
    return {};
  }
}

function parseAcceptHeader(acceptHeader = "") {
  return acceptHeader.split(",").map((part) => {
    const [type, ...params] = part.trim().split(";");
    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split("=");
      if (key === "q" && value) {
        q = Number.parseFloat(value);
      }
    }
    return { type: type.trim().toLowerCase(), q: Number.isFinite(q) ? q : 1 };
  });
}

function prefersMarkdown(acceptHeader) {
  const types = parseAcceptHeader(acceptHeader);
  const markdown = types.find((entry) => entry.type === "text/markdown");
  if (!markdown || markdown.q <= 0) {
    return false;
  }

  const html = types.find((entry) => entry.type === "text/html");
  return !html || markdown.q >= html.q;
}

function isNegotiablePath(urlPath) {
  if (urlPath.startsWith("/api/") || urlPath.startsWith("/admin")) {
    return false;
  }

  const ext = path.extname(urlPath.split("?")[0]).toLowerCase();
  return !ext || !SKIP_EXTENSIONS.has(ext);
}

function resolveSidecarPath(urlPath) {
  const normalized = urlPath.split("?")[0];

  if (normalized.endsWith("/")) {
    return path.join(siteDir, normalized, "index.md");
  }

  if (normalized.endsWith(".html")) {
    return path.join(
      siteDir,
      normalized.slice(1).replace(/\.html$/, ".md"),
    );
  }

  const indexPath = path.join(siteDir, normalized.slice(1), "index.md");
  if (fs.existsSync(indexPath)) {
    return indexPath;
  }

  return path.join(siteDir, `${normalized.slice(1)}.md`);
}

function canonicalUrl(urlPath) {
  const normalized = urlPath.split("?")[0] || "/";
  if (normalized === "/") {
    return `${siteOrigin}/`;
  }
  if (normalized.endsWith("/")) {
    return `${siteOrigin}${normalized}`;
  }
  if (normalized.endsWith(".html")) {
    return `${siteOrigin}${normalized}`;
  }
  return `${siteOrigin}${normalized}/`;
}

function sidecarPathForHtmlFile(filePath) {
  if (path.basename(filePath) === "index.html") {
    return path.join(path.dirname(filePath), "index.md");
  }
  return filePath.replace(/\.html$/, ".md");
}

function canonicalUrlForHtmlFile(filePath) {
  const relative = path.relative(siteDir, filePath).split(path.sep).join("/");

  if (relative === "index.html") {
    return `${siteOrigin}/`;
  }
  if (relative.endsWith("/index.html")) {
    return `${siteOrigin}/${relative.replace(/index\.html$/, "")}`;
  }
  return `${siteOrigin}/${relative}`;
}

app.get("/api/status", (req, res) => {
  const git = gitInfo();
  res.json({
    status: "ok",
    site: "applehand.dev",
    host: os.hostname(),
    writings: countWritings(),
    lastCommitDate: git.lastCommitDate ?? null,
    gitCommit: git.commit ?? null,
    timestamp: new Date().toISOString(),
  });
});

app.use((req, res, next) => {
  if (!isNegotiablePath(req.path)) {
    return next();
  }

  const sidecarPath = resolveSidecarPath(req.path);
  const hasSidecar = fs.existsSync(sidecarPath);

  if (prefersMarkdown(req.headers.accept) && hasSidecar) {
    res.set("Content-Type", "text/markdown; charset=utf-8");
    res.set("Vary", "Accept");
    res.set("X-Robots-Tag", "noindex, follow");
    return res.sendFile(sidecarPath);
  }

  if (hasSidecar) {
    res.set("Vary", "Accept");
    res.set(
      "Link",
      `<${canonicalUrl(req.path)}>; rel="alternate"; type="text/markdown"`,
    );
  }

  return next();
});

app.use(
  express.static(siteDir, {
    setHeaders(res, filePath) {
      if (!filePath.endsWith(".html")) {
        return;
      }

      const sidecarPath = sidecarPathForHtmlFile(filePath);
      if (!fs.existsSync(sidecarPath)) {
        return;
      }

      res.setHeader("Vary", "Accept");
      res.setHeader(
        "Link",
        `<${canonicalUrlForHtmlFile(filePath)}>; rel="alternate"; type="text/markdown"`,
      );
    },
  }),
);

app.use((req, res) => {
  res.status(404).send("Sorry, can't find that!");
});

app.listen(port, () => {
  console.log(`Eleventy site served at http://localhost:${port}`);
});
