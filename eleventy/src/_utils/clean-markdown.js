import matter from "gray-matter";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});
turndown.remove(["script", "style", "noscript"]);

export function cleanMarkdownFromSource(sourceContent) {
  const { data, content } = matter(sourceContent);
  const parts = [];

  if (data.title) {
    parts.push(`# ${data.title}`);
  }
  if (data.description) {
    parts.push(String(data.description).trim());
  }
  if (content.trim()) {
    parts.push(content.trim());
  }

  return `${parts.join("\n\n")}\n`;
}

export function cleanMarkdownFromHtml(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");

  return `${turndown.turndown(content).trim()}\n`;
}
