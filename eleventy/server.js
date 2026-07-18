import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import fs from "fs";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const siteDir = path.join(__dirname, "_site");
const siteOrigin = "https://applehand.dev";

const app = express();
const port = process.env.PORT || 8080;

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
