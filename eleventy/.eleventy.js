export default function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("src/admin");
    eleventyConfig.addPassthroughCopy({
      "static/img/uploads": "img/uploads"
  });
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("audit.js");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/bill-summary");

  eleventyConfig.addPassthroughCopy({
    "node_modules/reveal.js/dist": "reveal/dist",
    "node_modules/reveal.js/plugin": "reveal/plugin"
});
    
    return {
      dir: {
        input: "src",         // Use root as input
        output: "_site"     // Default output for the built site
      }
    };
  };
  