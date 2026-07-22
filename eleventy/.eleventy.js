import path from "path";
import { fileURLToPath } from "url";
import { generateMarkdownSidecars } from "./src/_utils/generate-markdown-sidecars.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("src/admin");
    eleventyConfig.addPassthroughCopy({
      "static/img/uploads": "img/uploads"
  });
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("audit.js");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/bill");
  eleventyConfig.addPassthroughCopy("src/btb");
  eleventyConfig.addPassthroughCopy("src/graff");
  eleventyConfig.addPassthroughCopy({
    "node_modules/mermaid/dist/mermaid.esm.min.mjs":
      "graff/vendor/mermaid.esm.min.mjs",
    "node_modules/mermaid/dist/chunks": "graff/vendor/chunks",
  });

  eleventyConfig.addPassthroughCopy({
    "node_modules/reveal.js/dist": "reveal/dist",
    "node_modules/reveal.js/plugin": "reveal/plugin"
});

  eleventyConfig.addCollection("writings", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("writings")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.on("eleventy.after", () => {
    const outputDir = path.join(__dirname, "_site");
    const inputDir = path.join(__dirname, "src");
    const generated = generateMarkdownSidecars({ outputDir, inputDir });
    console.log(`[markdown] Generated ${generated} markdown sidecars`);
  });

    return {
      dir: {
        input: "src",         // Use root as input
        output: "_site"     // Default output for the built site
      }
    };
  };
  