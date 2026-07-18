import fs from "fs";
import path from "path";
import {
  cleanMarkdownFromHtml,
  cleanMarkdownFromSource,
} from "./clean-markdown.js";

const SKIP_DIRS = new Set(["admin", "reveal", "img"]);
const SKIP_BASENAMES = new Set(["sitemap.xml"]);

function shouldSkip(relativePath) {
  const parts = relativePath.split(path.sep);
  if (parts.some((part) => SKIP_DIRS.has(part))) {
    return true;
  }
  if (SKIP_BASENAMES.has(path.basename(relativePath))) {
    return true;
  }
  return !relativePath.endsWith(".html");
}

function sidecarPathForHtml(htmlPath) {
  if (path.basename(htmlPath) === "index.html") {
    return path.join(path.dirname(htmlPath), "index.md");
  }
  return htmlPath.replace(/\.html$/, ".md");
}

function writingsSlugFromPath(relativePath) {
  const match = relativePath.match(/^writings\/([^/]+)\/index\.html$/);
  return match ? match[1] : null;
}

function walkHtmlFiles(outputDir, callback, relativeBase = "") {
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    const relativePath = relativeBase
      ? path.join(relativeBase, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      walkHtmlFiles(path.join(outputDir, entry.name), callback, relativePath);
      continue;
    }

    if (!shouldSkip(relativePath)) {
      callback(path.join(outputDir, entry.name), relativePath);
    }
  }
}

export function generateMarkdownSidecars({ outputDir, inputDir }) {
  let generated = 0;

  walkHtmlFiles(outputDir, (htmlPath, relativePath) => {
    const slug = writingsSlugFromPath(relativePath);
    let markdown;

    if (slug) {
      const sourcePath = path.join(inputDir, "writings", `${slug}.md`);
      if (fs.existsSync(sourcePath)) {
        markdown = cleanMarkdownFromSource(
          fs.readFileSync(sourcePath, "utf8"),
        );
      }
    }

    if (!markdown) {
      markdown = cleanMarkdownFromHtml(fs.readFileSync(htmlPath, "utf8"));
    }

    const mdPath = sidecarPathForHtml(htmlPath);
    fs.writeFileSync(mdPath, markdown);
    generated += 1;
  });

  return generated;
}
