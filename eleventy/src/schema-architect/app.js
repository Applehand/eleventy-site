const API_CANDIDATES = ["/api/schema"];
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  API_CANDIDATES.push("http://127.0.0.1:8120/api/schema");
}

let apiBase = API_CANDIDATES[0];

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

function errorMessage(payload, fallback) {
  if (typeof payload?.detail === "string") return payload.detail;
  if (typeof payload?.error === "string") return payload.error;
  if (typeof payload?.error?.message === "string") return payload.error.message;
  return fallback;
}

async function fetchJson(path, options = {}) {
  let lastError = new Error("Request failed.");
  const bases = [apiBase, ...API_CANDIDATES.filter((base) => base !== apiBase)];

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, {
        credentials: base.startsWith("http") ? "omit" : "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json", ...(options.headers || {}) },
        ...options,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(errorMessage(payload, response.statusText));
      }
      apiBase = base;
      return payload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Request failed.");
    }
  }

  throw lastError;
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

function updateTemplateLabels() {
  document.querySelectorAll(".template-row").forEach((row, index) => {
    const label = row.querySelector(".template-row-index");
    if (label) label.textContent = `Template ${index + 1}`;
    const removeButton = row.querySelector(".remove-template");
    if (removeButton) {
      removeButton.disabled = document.querySelectorAll(".template-row").length <= 1;
    }
  });
}

function templateRow(index, data = {}) {
  const row = document.createElement("div");
  row.className = "template-row";
  row.dataset.index = String(index);
  row.innerHTML = `
    <span class="template-row-index" aria-hidden="true">Template ${index + 1}</span>
    <div class="field template-field">
      <label class="sr-only">Template name</label>
      <input name="templateName" required maxlength="100" placeholder="blog post" value="${escapeAttr(data.name || "")}" />
    </div>
    <div class="field template-field">
      <label class="sr-only">Example path</label>
      <input name="templatePath" required maxlength="500" placeholder="/blog/my-post" value="${escapeAttr(data.example_path || "")}" />
    </div>
    <div class="field template-field template-description">
      <label class="sr-only">What does this page show?</label>
      <input name="templateDescription" required maxlength="2000" placeholder="Long-form articles with author bylines." value="${escapeAttr(data.description || "")}" />
    </div>
    <button type="button" class="icon-button remove-template" aria-label="Remove template" title="Remove template">×</button>
  `;
  row.querySelector(".remove-template")?.addEventListener("click", () => {
    const rows = $("#template-rows");
    if (rows && rows.children.length > 1) {
      row.remove();
      updateTemplateLabels();
    }
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
    container.append(
      templateRow(0, {
        name: "blog post",
        example_path: "/blog/example",
        description: "Articles and essays.",
      }),
    );
  }
  updateTemplateLabels();
}

const SAMPLE_PROFILES = [
  {
    label: "Northwind Bakery",
    business_name: "Northwind Bakery",
    site_url: "https://northwindbakery.example",
    business_description:
      "Neighborhood bakery selling sourdough, pastries, and coffee with two dine-in locations and weekend catering.",
    business_category: "Local bakery",
    social_urls: [
      "https://www.instagram.com/northwindbakery",
      "https://www.facebook.com/northwindbakery",
    ],
    templates: [
      {
        name: "menu item",
        example_path: "/menu/sourdough-loaf",
        description: "Individual products with ingredients, allergens, and pricing.",
      },
      {
        name: "location",
        example_path: "/locations/downtown",
        description: "Store hours, address, and directions for each bakery location.",
      },
    ],
    notes: "We publish seasonal menus and accept online orders for pickup.",
  },
  {
    label: "Summit Analytics",
    business_name: "Summit Analytics",
    site_url: "https://summitanalytics.example",
    business_description:
      "B2B SaaS platform that helps operations teams monitor warehouse KPIs and automate inventory alerts.",
    business_category: "B2B SaaS",
    social_urls: [
      "https://www.linkedin.com/company/summit-analytics",
      "https://github.com/summit-analytics",
    ],
    templates: [
      {
        name: "product feature",
        example_path: "/platform/inventory-alerts",
        description: "Marketing pages for individual product capabilities and integrations.",
      },
      {
        name: "case study",
        example_path: "/customers/acme-logistics",
        description: "Customer success stories with measurable outcomes.",
      },
      {
        name: "pricing",
        example_path: "/pricing",
        description: "Plan tiers, feature comparison, and FAQ.",
      },
    ],
    notes: "Multiple product lines under one brand; docs live on a separate subdomain.",
  },
  {
    label: "Horizon Travel Guides",
    business_name: "Horizon Travel Guides",
    site_url: "https://horizontravel.example",
    business_description:
      "Independent travel publisher covering city guides, hotel reviews, and itinerary planning for North America.",
    business_category: "Online publisher",
    social_urls: [
      "https://www.youtube.com/@horizontravel",
      "https://www.pinterest.com/horizontravel",
    ],
    templates: [
      {
        name: "city guide",
        example_path: "/guides/portland",
        description: "Long-form destination guides with maps and neighborhood tips.",
      },
      {
        name: "hotel review",
        example_path: "/hotels/riverfront-inn",
        description: "Property reviews with ratings, amenities, and booking links.",
      },
    ],
    notes: "Affiliate links on hotel pages; several freelance contributors.",
  },
  {
    label: "Oak & Page Books",
    business_name: "Oak & Page Books",
    site_url: "https://oakandpage.example",
    business_description:
      "Independent bookstore hosting author events, book clubs, and a small online shop for signed editions.",
    business_category: "Independent bookstore",
    social_urls: ["https://www.instagram.com/oakandpagebooks"],
    templates: [
      {
        name: "event",
        example_path: "/events/spring-poetry-night",
        description: "Upcoming readings and signings with date, venue, and ticket info.",
      },
      {
        name: "staff pick",
        example_path: "/picks/march-fiction",
        description: "Curated book recommendations with short reviews.",
      },
    ],
    notes: null,
  },
  {
    label: "Driftwood Outdoor Co.",
    business_name: "Driftwood Outdoor Co.",
    site_url: "https://driftwoodoutdoor.example",
    business_description:
      "E-commerce retailer for camping gear, trail maps, and how-to guides for weekend hikers.",
    business_category: "E-commerce retailer",
    social_urls: [
      "https://www.tiktok.com/@driftwoodoutdoor",
      "https://www.reddit.com/r/driftwoodoutdoor",
    ],
    templates: [
      {
        name: "product",
        example_path: "/gear/ultralight-tent",
        description: "Product detail pages with specs, reviews, and availability.",
      },
      {
        name: "how-to guide",
        example_path: "/guides/backpack-fit",
        description: "Instructional articles with gear recommendations.",
      },
    ],
    notes: "Ships from two US warehouses; some pages include video walkthroughs.",
  },
];

function fillFormFromSample(sample) {
  const form = $("#site-form");
  const container = $("#template-rows");
  if (!form || !container) return;

  form.businessName.value = sample.business_name;
  form.siteUrl.value = sample.site_url;
  form.businessDescription.value = sample.business_description;
  form.businessCategory.value = sample.business_category;
  form.socialUrls.value = (sample.social_urls || []).join("\n");
  form.notes.value = sample.notes || "";

  container.replaceChildren();
  sample.templates.forEach((template, index) => {
    container.append(templateRow(index, template));
  });
  updateTemplateLabels();
  announce(`Filled form with sample: ${sample.label}.`);
}

function fillRandomSample() {
  const sample = SAMPLE_PROFILES[Math.floor(Math.random() * SAMPLE_PROFILES.length)];
  fillFormFromSample(sample);
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
    container.innerHTML =
      '<p class="hint">No specific rich result types were detected for your templates.</p>';
    return;
  }
  for (const item of items) {
    const card = document.createElement("article");
    card.className = "result-card";
    const policy = item.policy_url
      ? `<a href="${escapeAttr(item.policy_url)}" target="_blank" rel="noopener">${escapeHtml(item.feature_name)} in Search Central</a>`
      : "";
    const status =
      item.eligible === false
        ? '<p class="hint">Not yet eligible — add the missing required properties listed below.</p>'
        : "";
    card.innerHTML = `
      <h4>${escapeHtml(item.feature_name)}${item.template_name ? ` · ${escapeHtml(item.template_name)}` : ""}</h4>
      ${status}
      <p>${escapeHtml(item.message)}</p>
      ${policy}
    `;
    container.append(card);
  }
}

function renderFindings(findings) {
  const container = $("#schema-findings");
  if (!container) return;
  const errors = (findings || []).filter((item) => item.severity === "error");
  if (!errors.length) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }
  container.hidden = false;
  const list = document.createElement("ul");
  for (const finding of errors.slice(0, 8)) {
    const item = document.createElement("li");
    item.textContent = finding.message;
    list.append(item);
  }
  container.replaceChildren(list);
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

let latestBlueprint = null;

function downloadJson(filename, data) {
  const safeName = filename.toLowerCase().endsWith(".json") ? filename : `${filename}.json`;
  const body = `${JSON.stringify(data, null, 2)}\n`;
  const type = "application/json;charset=utf-8";
  const blob =
    typeof File === "function"
      ? new File([body], safeName, { type })
      : new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = safeName;
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 0);
}

function downloadBlueprint(blueprint) {
  if (!blueprint?.scaffolds?.length) return;
  const bundle = {
    generated_at: new Date().toISOString(),
    graph: blueprint.graph,
    rich_results: blueprint.rich_results,
    findings: blueprint.findings,
    scaffolds: blueprint.scaffolds.map((scaffold) => ({
      label: scaffold.label,
      template_name: scaffold.template_name,
      example_url: scaffold.example_url,
      usage_note: scaffold.usage_note,
      jsonld: scaffold.jsonld,
    })),
    model_used: blueprint.model_used,
    model_degraded: blueprint.model_degraded,
  };
  downloadJson("schema-architect-blueprint.json", bundle);
  announce("Blueprint downloaded as JSON.");
}

function showResults(blueprint, remaining) {
  $("#form-panel")?.setAttribute("hidden", "");
  const results = $("#results-panel");
  results?.removeAttribute("hidden");

  const summary = $("#results-summary");
  if (summary) {
    const parts = [
      `${blueprint.scaffolds.length} scaffold${blueprint.scaffolds.length === 1 ? "" : "s"} ready.`,
    ];
    if (blueprint.model_used) parts.push("Tailored with AI.");
    else if (blueprint.model_degraded) parts.push("Generated from your answers without AI.");
    summary.textContent = parts.join(" ");
  }

  void renderDiagram(blueprint.mermaid).catch(() => {
    const diagram = $("#diagram");
    if (diagram) {
      diagram.innerHTML =
        '<p class="hint">Could not render the graph diagram. Open “Graph source” below to view the raw definition.</p>';
    }
  });
  renderFindings(blueprint.findings || []);
  renderRichResults(blueprint.rich_results || []);
  renderScaffolds(blueprint.scaffolds);
  latestBlueprint = blueprint;
  updateQuotaPill(remaining);
  announce("Blueprint generated.");
  results?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateQuotaPill(remaining) {
  if (typeof remaining === "number") {
    const label =
      remaining === 1 ? "1 generation left today" : `${remaining} generations left today`;
    setPill("#quota-status", label, remaining > 0 ? "ok" : "warn");
  }
}

async function initStatus() {
  try {
    const [health, quota] = await Promise.all([fetchJson("/health"), fetchJson("/quota")]);
    setPill(
      "#api-status",
      health.ok ? "Service ready" : "Service degraded",
      health.ok ? "ok" : "warn",
    );
    const version = health.registry?.schema_version
      ? `Schema.org v${health.registry.schema_version}`
      : "Schema.org registry unavailable";
    setPill("#registry-status", version, health.registry ? "ok" : "warn");
    updateQuotaPill(quota.model_operations_remaining);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service unavailable";
    setPill("#api-status", message, "error");
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
    updateTemplateLabels();
  });
  $("#fill-sample")?.addEventListener("click", fillRandomSample);
  $("#download-all")?.addEventListener("click", () => {
    if (!latestBlueprint?.scaffolds?.length) return;
    downloadBlueprint(latestBlueprint);
  });
  $("#start-over")?.addEventListener("click", () => window.location.reload());
}

ensureTemplateRows();
bindEvents();
initStatus();
