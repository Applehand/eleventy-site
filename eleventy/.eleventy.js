export default function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("src/admin");
    eleventyConfig.addPassthroughCopy({
      "static/img/uploads": "img/uploads"
  });
  eleventyConfig.addPassthroughCopy("styles.css");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
    
    return {
      dir: {
        input: "src",         // Use root as input
        output: "_site"     // Default output for the built site
      }
    };
  };
  