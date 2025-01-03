export default function(eleventyConfig) {
    eleventyConfig.addPassthroughCopy("src/admin");
    eleventyConfig.addPassthroughCopy("static");
  
    return {
      dir: {
        input: "src",         // Use root as input
        output: "_site"     // Default output for the built site
      }
    };
  };
  