const API = "/api/schema";

const $ = (selector) => document.querySelector(selector);

function announce(message) {
  const node = $("#announcer");
  if (node) node.textContent = message;
}

function setPill(id, text, state) {
  const pill = $(id);
  if (!pill) return;
  pill.textContent = text;
  pill.dataset.state = state;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.detail || payload?.error?.message || response.statusText;
    throw new Error(typeof detail === "string" ? detail : "Request failed.");
  }
  return payload;
}

function normalizeOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password) throw new Error("Site URL must not include credentials.");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Site URL must be the homepage origin only.");
  }
  return `${url.protocol}//${url.host}`;
}

function parseSocialUrls(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function templateRow(index, data = {}) {
  const row = document.createElement("div");
  row.className = "template-row";
  row.dataset.index = String(index);
  row.innerHTML = `
    <div class="field">
      <label>Template name</label>
      <input name="templateName" required maxlength="100" placeholder="blog post" value="${escapeAttr(data.name || "")}" />
    </div>
    <div class="field">
      <label>Example path</label>
      <input name="templatePath" required maxlength="500" placeholder="/blog/my-post" value="${escapeAttr(data.example_path || "")}" />
    </motion.div>
    <div class="field wide">
      <label>What does this page show?</label>
      <input name="templateDescription" required maxlength="2000" placeholder="Long-form articles with author bylines." value="${escapeAttr(data.description || "")}" />
    </motion.div>
    <button type="button" class="icon-button remove-template" aria-label="Remove template" title="Remove template">×</button>
  `;
  row.querySelector(".remove-template")?.addEventListener("click", () => {
    const rows = $("#template-rows");
    if (rows && rows.children.length > 1) row.remove();
  });
  return row;
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function ensureTemplateRows() {
  const container = $("#template-rows");
  if (!container) return;
  if (!container.children.length) {
    container.append(templateRow(0, { name: "blog post", example_path: "/blog/example", description: "Articles and essays." }));
  }
}

function collectSiteDescription(form) {
  const socialRaw = form.socialUrls.value.trim();
  const templates = [...form.querySelectorAll(".template-row")].map((row) => ({
    name: row.querySelector('[name="templateName"]').value.trim(),
    example_path: row.querySelector('[name="templatePath"]').value.trim(),
    description: row.querySelector('[name="templateDescription"]').value.trim(),
  }));
  if (!templates.length) throw new Error("Add at least one page template.");
  return {
    business_name: form.businessName.value.trim(),
    site_url: normalizeOrigin(form.siteUrl.value.trim()),
    business_description: form.businessDescription.value.trim(),
    business_category: form.businessCategory.value.trim(),
    social_urls: socialRaw ? parseSocialUrls(socialRaw) : [],
    templates,
    notes: form.notes.value.trim() || null,
  };
}

let mermaidReady = false;

async function ensureMermaid() {
  if (mermaidReady) return;
  const mermaid = (await import("/schema-architect/vendor/mermaid.esm.min.mjs")).default;
  mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
  window.__schemaMermaid = mermaid;
  mermaidReady = true;
}

async function renderDiagram(source) {
  await ensureMermaid();
  const diagram = $("#diagram");
  const sourceNode = $("#mermaid-source");
  if (!diagram || !sourceNode) return;
  sourceNode.textContent = source;
  diagram.innerHTML = "";
  const { svg } = await window.__schemaMermaid.render(`schema-graph-${Date.now()}`, source);
  diagram.innerHTML = svg;
}

function renderRichResults(items) {
  const container = $("#rich-results");
  if (!container) return;
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = '<p class="hint">No specific rich result types were detected for your templates.</p>';
    return;
  }
  for (const item of items) {
    const card = document.createElement("article");
    card.className = "result-card";
    const policy = item.policy_url
      ? `<a href="${escapeAttr(item.policy_url)}" target="_blank" rel="noopener">Google guidance</a>`
      : "";
    card.innerHTML = `
      <h4>${escapeHtml(item.feature_name)}${item.template_name ? ` · ${escapeHtml(item.template_name)}` : ""}</h4>
      <p>${escapeHtml(item.message)}</p>
      ${policy}
    `;
    container.append(card);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderScaffolds(scaffolds) {
  const container = $("#scaffolds");
  if (!container) return;
  container.innerHTML = "";
  scaffolds.forEach((scaffold, index) => {
    const block = document.createElement("article");
    block.className = "scaffold-block";
    const json = JSON.stringify(scaffold.jsonld, null, 2);
    block.innerHTML = `
      <div class="scaffold-block-header">
        <div>
          <h4>${escapeHtml(scaffold.label)}</h4>
          <p class="hint mono">${escapeHtml(scaffold.example_url)}</p>
        </div>
        <button type="button" class="secondary copy-scaffold" data-index="${index}">Copy JSON-LD</button>
      </div>
      <pre class="jsonld-output">${escapeHtml(json)}</pre>
    `;
    block.dataset.json = json;
    container.append(block);
  });
  container.querySelectorAll(".copy-scaffold").forEach((button) => {
    button.addEventListener("click", async () => {
      const article = button.closest(".scaffold-block");
      const text = article?.dataset.json || "";
      await navigator.clipboard.writeText(text);
      announce("JSON-LD copied to clipboard.");
      button.textContent = "Copied!";
      setTimeout(() => {
        button.textContent = "Copy JSON-LD";
      }, 1500);
    });
  });
}

let latestScaffolds = [];

function downloadAll(scaffolds) {
  const bundle = scaffolds.map((scaffold) => ({
    label: scaffold.label,
    template_name: scaffold.template_name,
    example_url: scaffold.example_url,
    usage_note: scaffold.usage_note,
    jsonld: scaffold.jsonld,
  }));
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "schema-blueprint.json";
  link.click();
  URL.revokeObjectURL(url);
}

function showResults(blueprint, remaining) {
  $("#form-panel")?.setAttribute("hidden", "");
  const results = $("#results-panel");
  results?.removeAttribute("hidden");

  const summary = $("#results-summary");
  if (summary) {
    const parts = [`${blueprint.scaffolds.length} scaffold${blueprint.scaffolds.length === 1 ? "" : "s"} ready.`];
    if (blueprint.model_used) parts.push("Tailored with AI.");
    else if (blueprint.model_degraded) parts.push("Generated from your answers without AI.");
    summary.textContent = parts.join(" ");
  }

  renderDiagram(blueprint.mermaid);
  renderRichResults(blueprint.rich_results || []);
  renderScaffolds(blueprint.scaffolds);
  latestScaffolds = blueprint.scaffolds;
  updateQuotaPill(remaining);
  announce("Blueprint generated.");
  results?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateQuotaPill(remaining) {
  if (typeof remaining === "number") {
    const label = remaining === 1 ? "1 generation left today" : `${remaining} generations left today`;
    setPill("#quota-status", label, remaining > 0 ? "ok" : "warn");
  }
}

async function initStatus() {
  try {
    const [health, quota] = await Promise.all([fetchJson("/health"), fetchJson("/quota")]);
    setPill("#api-status", health.ok ? "Service ready" : "Service degraded", health.ok ? "ok" : "warn");
    const version = health.registry?.version ? `Schema.org ${health.registry.version}` : "Schema.org registry unavailable";
    setPill("#registry-status", version, health.registry ? "ok" : "warn");
    updateQuotaPill(quota.model_operations_remaining);
  } catch {
    setPill("#api-status", "Service unavailable", "error");
    setPill("#registry-status", "Registry unknown", "error");
    setPill("#quota-status", "Quota unknown", "error");
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = $("#generate-btn");
  let site;
  try {
    site = collectSiteDescription(form);
  } catch (error) {
    announce(error.message);
    alert(error.message);
    return;
  }

  button.disabled = true;
  button.textContent = "Generating…";
  try {
    const payload = await fetchJson("/blueprint", {
      method: "POST",
      body: JSON.stringify({ site, use_model: true }),
    });
    showResults(payload.blueprint, payload.model_operations_remaining);
  } catch (error) {
    announce(error.message);
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Generate blueprint";
  }
}

function bindEvents() {
  $("#site-form")?.addEventListener("submit", handleSubmit);
  $("#add-template")?.addEventListener("click", () => {
    const container = $("#template-rows");
    container?.append(templateRow(container.children.length));
  });
  $("#download-all")?.addEventListener("click", () => {
    if (!latestScaffolds.length) return;
    downloadAll(latestScaffolds);
  });
  $("#start-over")?.addEventListener("click", () => window.location.reload());
}

ensureTemplateRows();
bindEvents();
initStatus();
