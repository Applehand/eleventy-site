const API_CANDIDATES = ["/api/schema"];
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  API_CANDIDATES.push("http://127.0.0.1:8120/api/schema");
}

const GENERATION_TIMEOUT_MS = 120_000;

const GENERATION_STEPS = [
  {
    id: "intake",
    label: "Reading your site description",
    detail: "Parsing business details and page templates from your form.",
  },
  {
    id: "core",
    label: "Building core entities",
    detail: "Creating Organization, WebSite, and homepage nodes with stable IDs.",
  },
  {
    id: "types",
    label: "Mapping templates to Schema.org types",
    detail: "Matching each page template to registry-valid Schema.org types.",
  },
  {
    id: "ai",
    label: "AI-assisted graph routing",
    detail: "Refining types, properties, and relationships with Gemini.",
    aiOnly: true,
  },
  {
    id: "validate",
    label: "Validating the entity graph",
    detail: "Checking every property against the Schema.org registry.",
  },
  {
    id: "rich",
    label: "Checking rich result opportunities",
    detail: "Comparing your graph to Google Search structured-data rules.",
  },
  {
    id: "scaffolds",
    label: "Building JSON-LD scaffolds",
    detail: "Generating copy-paste blocks with placeholders for each template.",
  },
  {
    id: "summary",
    label: "Preparing your blueprint summary",
    detail: "Writing a plain-language overview of what we built.",
  },
];

let quotaState = { enforced: true, remaining: null };

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

async function fetchJson(path, options = {}, fetchOptions = {}) {
  const { timeoutMs = 0, retryOnTransient = false } = fetchOptions;
  let lastError = new Error("Request failed.");
  const bases = [apiBase, ...API_CANDIDATES.filter((base) => base !== apiBase)];
  const attempts = retryOnTransient ? 2 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    for (const base of bases) {
      const controller = timeoutMs > 0 ? new AbortController() : null;
      const timer =
        controller && timeoutMs > 0
          ? window.setTimeout(() => controller.abort(), timeoutMs)
          : null;
      try {
        const response = await fetch(`${base}${path}`, {
          credentials: base.startsWith("http") ? "omit" : "same-origin",
          cache: "no-store",
          headers: { "content-type": "application/json", ...(options.headers || {}) },
          signal: controller?.signal,
          ...options,
        });
        if (timer) window.clearTimeout(timer);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const retryable = retryOnTransient && attempt === 0 && response.status >= 502;
          if (retryable) {
            lastError = new Error(errorMessage(payload, response.statusText));
            break;
          }
          throw new Error(errorMessage(payload, response.statusText));
        }
        apiBase = base;
        return payload;
      } catch (error) {
        if (timer) window.clearTimeout(timer);
        if (error instanceof DOMException && error.name === "AbortError") {
          lastError = new Error(
            "Generation is taking longer than expected. Please wait a moment and try again.",
          );
        } else {
          lastError = error instanceof Error ? error : new Error("Request failed.");
        }
        if (retryOnTransient && attempt === 0) break;
      }
    }
    if (retryOnTransient && attempt === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
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
    label: "Northwind Bakery: local business + menu",
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
      {
        name: "baking recipe",
        example_path: "/recipes/overnight-sourdough",
        description:
          "Step-by-step home baking recipes with ingredients, prep time, and yield.",
      },
      {
        name: "catering faq",
        example_path: "/catering/faq",
        description: "Common questions about catering orders, lead times, and delivery radius.",
      },
    ],
    notes:
      "Downtown location: 412 Harbor Street, open 7am-3pm daily, phone (555) 014-2200. We publish seasonal menus and accept online orders for pickup. Founded in 2012.",
  },
  {
    label: "Summit Analytics: SaaS + careers",
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
        description:
          "Marketing pages for individual software capabilities and integrations of the Summit web application.",
      },
      {
        name: "case study",
        example_path: "/customers/acme-logistics",
        description: "Customer success stories with measurable outcomes, written by our content team.",
      },
      {
        name: "pricing",
        example_path: "/pricing",
        description: "Plan tiers, feature comparison, and frequently asked billing questions.",
      },
      {
        name: "job opening",
        example_path: "/careers/senior-backend-engineer",
        description:
          "Open roles with responsibilities, salary range, location, and application deadline.",
      },
    ],
    notes:
      "Multiple product lines under one brand; docs live on a separate subdomain. Hiring is remote-first across the US. The platform is a browser-based web application with a free trial tier.",
  },
  {
    label: "Horizon Travel Guides: publisher + video",
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
      {
        name: "video itinerary",
        example_path: "/videos/48-hours-in-seattle",
        description:
          "Short travel videos with an upload date, duration, and narrated walkthrough of an itinerary.",
      },
      {
        name: "contributor profile",
        example_path: "/contributors/maya-chen",
        description: "Bio pages for each travel writer with their beats and published guides.",
      },
    ],
    notes:
      "Affiliate links on hotel pages; twelve freelance contributors, each with a byline and profile page. Hotel reviews use a 1-5 star scale from staff visits.",
  },
  {
    label: "Oak & Page Books: events + reviews",
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
        description: "Curated book recommendations with short staff reviews.",
      },
      {
        name: "signed edition",
        example_path: "/shop/signed-first-edition-tidelands",
        description: "Shop listings for signed books with price, condition, and availability.",
      },
    ],
    notes:
      "Store address: 88 Alder Lane, open Tuesday-Sunday. Events are usually free with RSVP; some ticketed signings around $15.",
  },
  {
    label: "Driftwood Outdoor Co.: e-commerce + guides",
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
        description: "Product detail pages with specs, verified buyer reviews, and availability.",
      },
      {
        name: "how-to guide",
        example_path: "/guides/backpack-fit",
        description: "Instructional articles with gear recommendations.",
      },
      {
        name: "video walkthrough",
        example_path: "/videos/tent-setup",
        description: "Gear setup videos with duration, upload date, and a transcript.",
      },
    ],
    notes:
      "Ships from two US warehouses; prices in USD. Product pages show in-stock status and collect verified buyer reviews with star ratings.",
  },
  {
    label: "Golden Ladle: recipes + cooking videos",
    business_name: "Golden Ladle Kitchen",
    site_url: "https://goldenladle.example",
    business_description:
      "Food blog publishing tested weeknight recipes, technique videos, and seasonal menu plans from a two-person test kitchen.",
    business_category: "Food publisher",
    social_urls: [
      "https://www.youtube.com/@goldenladlekitchen",
      "https://www.instagram.com/goldenladle",
    ],
    templates: [
      {
        name: "recipe",
        example_path: "/recipes/miso-butter-noodles",
        description:
          "Tested recipes with ingredient lists, step-by-step instructions, prep and cook times, and servings.",
      },
      {
        name: "technique video",
        example_path: "/videos/knife-skills-basics",
        description: "Cooking technique videos with duration, upload date, and chapters.",
      },
      {
        name: "chef profile",
        example_path: "/about/nora-alvarez",
        description: "Profile pages for the two chefs with bios and their published recipes.",
      },
      {
        name: "kitchen faq",
        example_path: "/faq/substitutions",
        description: "Common questions about ingredient substitutions and equipment.",
      },
      {
        name: "seasonal collection",
        example_path: "/collections/weeknight-pasta",
        description: "Curated ranked collections linking out to our published recipes.",
      },
    ],
    notes:
      "Every recipe is tested three times before publishing. Recipes list prep time, cook time, and servings. Chefs: Nora Alvarez and Sam Whitfield.",
  },
  {
    label: "Brightpath Learning: courses + webinars",
    business_name: "Brightpath Learning",
    site_url: "https://brightpathlearning.example",
    business_description:
      "Online course provider teaching data skills to career changers, with cohort-based classes, live webinars, and a student question board.",
    business_category: "Online education provider",
    social_urls: ["https://www.linkedin.com/company/brightpath-learning"],
    templates: [
      {
        name: "course",
        example_path: "/courses/sql-fundamentals",
        description:
          "Course pages with syllabus, instructor, duration in weeks, tuition price, and enrollment dates.",
      },
      {
        name: "webinar",
        example_path: "/webinars/portfolio-review-night",
        description: "Free live online events with a start time, host, and registration link.",
      },
      {
        name: "instructor profile",
        example_path: "/instructors/devon-park",
        description: "Instructor bios with credentials and the courses they teach.",
      },
      {
        name: "student question",
        example_path: "/community/questions/window-functions-vs-group-by",
        description:
          "Community Q&A threads where students post a question and instructors post accepted answers.",
      },
    ],
    notes:
      "Six-week cohorts, tuition listed in USD with scholarships. Webinars are free and recorded. The question board shows an accepted answer with upvotes.",
  },
  {
    label: "Cascade Talent Group: job board",
    business_name: "Cascade Talent Group",
    site_url: "https://cascadetalent.example",
    business_description:
      "Regional staffing agency posting engineering and manufacturing roles across the Pacific Northwest, with salary guides and hiring resources.",
    business_category: "Staffing agency",
    social_urls: ["https://www.linkedin.com/company/cascade-talent-group"],
    templates: [
      {
        name: "job listing",
        example_path: "/jobs/cnc-machinist-tacoma",
        description:
          "Job postings with title, employer, salary range, employment type, location, and application deadline.",
      },
      {
        name: "salary guide",
        example_path: "/resources/2026-manufacturing-salary-guide",
        description: "Annual salary report articles with regional pay data by role.",
      },
      {
        name: "employer page",
        example_path: "/employers/pacific-fabrication",
        description: "Profiles of hiring companies with industry, size, and open roles.",
      },
    ],
    notes:
      "Roles include full-time, contract, and contract-to-hire. Every listing shows a posted date, valid-through date, and a salary range in USD.",
  },
  {
    label: "Lumen Film Society: screenings + reviews",
    business_name: "Lumen Film Society",
    site_url: "https://lumenfilm.example",
    business_description:
      "Member-supported cinema screening restored classics and international films, with critic essays and a member discussion forum.",
    business_category: "Independent cinema",
    social_urls: ["https://www.instagram.com/lumenfilmsociety"],
    templates: [
      {
        name: "screening",
        example_path: "/screenings/seven-samurai-4k",
        description:
          "Screening events with film title, director, showtimes, venue, and ticket prices.",
      },
      {
        name: "film essay",
        example_path: "/essays/kurosawa-composition",
        description: "Critic essays and film analysis articles with author bylines.",
      },
      {
        name: "forum thread",
        example_path: "/forum/best-restorations-2026",
        description:
          "Member discussion threads with an original post and threaded replies.",
      },
      {
        name: "film page",
        example_path: "/films/seven-samurai",
        description:
          "Film detail pages with director, cast, release year, runtime, and poster image.",
      },
    ],
    notes:
      "Theater address: 200 Meridian Avenue. Tickets $8 members / $14 general. Films are shown with title, director, and release year on each screening page.",
  },
  {
    label: "Tidewater Stays: vacation rentals",
    business_name: "Tidewater Stays",
    site_url: "https://tidewaterstays.example",
    business_description:
      "Family-run vacation rental company managing twelve coastal cottages and cabins with direct online booking.",
    business_category: "Vacation rental management",
    social_urls: ["https://www.instagram.com/tidewaterstays"],
    templates: [
      {
        name: "rental listing",
        example_path: "/rentals/heron-cottage",
        description:
          "Vacation rental pages with occupancy, bedrooms, nightly rate, amenities, and photo gallery.",
      },
      {
        name: "area guide",
        example_path: "/guides/things-to-do-oceanside",
        description: "Local area guides covering beaches, restaurants, and seasonal activities.",
      },
      {
        name: "guest faq",
        example_path: "/faq/check-in",
        description: "Common questions about check-in, pets, parking, and cancellation policies.",
      },
    ],
    notes:
      "Each rental lists a street address, capacity, number of bedrooms and bathrooms, a nightly rate in USD, and verified guest ratings. Office phone (555) 032-7700.",
  },
  {
    label: "Open Climate Data Lab: research datasets",
    business_name: "Open Climate Data Lab",
    site_url: "https://openclimatedata.example",
    business_description:
      "University-affiliated research lab publishing open climate datasets, methodology articles, and reproducible analysis notebooks.",
    business_category: "Research organization",
    social_urls: ["https://github.com/open-climate-data-lab"],
    templates: [
      {
        name: "dataset",
        example_path: "/datasets/pnw-snowpack-1950-2025",
        description:
          "Dataset landing pages with description, variables measured, license, temporal coverage, and download formats.",
      },
      {
        name: "methodology article",
        example_path: "/methods/station-homogenization",
        description: "Peer-reviewed methodology write-ups with authors and publication dates.",
      },
      {
        name: "researcher profile",
        example_path: "/people/dr-ida-mansour",
        description: "Researcher bios with affiliations, ORCID links, and published datasets.",
      },
    ],
    notes:
      "All datasets are CC-BY 4.0 with versioned releases and citations. Data available as CSV and NetCDF. Lab is affiliated with Cascadia State University.",
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

function populateSampleSelect() {
  const select = $("#sample-select");
  if (!select) return;
  SAMPLE_PROFILES.forEach((sample, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = sample.label;
    select.append(option);
  });
}

function fillSelectedSample(event) {
  const index = Number.parseInt(event.target.value, 10);
  const sample = SAMPLE_PROFILES[index];
  if (sample) fillFormFromSample(sample);
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

function generationStepsForRequest(useAi) {
  return GENERATION_STEPS.filter((step) => !step.aiOnly || useAi);
}

function stepMarker(state, index) {
  if (state === "complete") return "✓";
  return String(index + 1);
}

function createGenerationProgress(site, useAi) {
  const panel = $("#loading-panel");
  const stepsList = $("#loading-steps");
  const context = $("#loading-context");
  const detail = $("#loading-detail");
  const progress = $("#loading-progress");
  const progressBar = $("#loading-progress-bar");
  const steps = generationStepsForRequest(useAi);
  let activeIndex = 0;
  let timers = [];
  let finishing = false;

  const templateCount = site.templates.length;
  const pageLabel =
    templateCount === 1 ? "1 page template" : `${templateCount} page templates`;

  function clearTimers() {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
  }

  function progressPercent() {
    if (steps.length === 0) return 0;
    if (activeIndex >= steps.length) return 100;
    return Math.round(((activeIndex + 0.35) / steps.length) * 100);
  }

  function render() {
    if (!stepsList) return;
    stepsList.replaceChildren();
    for (const [index, step] of steps.entries()) {
      let state = "pending";
      if (index < activeIndex) state = "complete";
      else if (index === activeIndex && activeIndex < steps.length) state = "active";

      const item = document.createElement("li");
      item.className = "loading-step";
      item.dataset.state = state;
      item.innerHTML = `
        <span class="loading-step-marker" aria-hidden="true">${stepMarker(state, index)}</span>
        <div class="loading-step-body">
          <p class="loading-step-label">${escapeHtml(step.label)}</p>
          <p class="loading-step-detail">${escapeHtml(step.detail)}</p>
        </div>
      `;
      stepsList.append(item);
    }

    const current = steps[Math.min(activeIndex, steps.length - 1)];
    if (detail && current) {
      detail.textContent = current.detail;
    }
    if (progress && progressBar) {
      const percent = progressPercent();
      progressBar.style.width = `${percent}%`;
      progress.setAttribute("aria-valuenow", String(percent));
    }
    if (current && activeIndex < steps.length) {
      announce(current.label);
    }
  }

  function show() {
    if (context) {
      context.textContent = `Generating for ${site.business_name}: ${pageLabel} plus homepage.`;
    }
    enableTab("generation");
    activateTab("generation");
    panel?.setAttribute("aria-busy", "true");
    activeIndex = 0;
    render();
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function advance() {
    if (activeIndex < steps.length - 1) {
      activeIndex += 1;
      render();
    }
  }

  function start() {
    show();
    const aiIndex = steps.findIndex((step) => step.id === "ai");
    const stopBefore = aiIndex >= 0 ? aiIndex : steps.length - 1;
    let scheduled = 0;

    const schedule = () => {
      if (scheduled >= stopBefore || finishing) return;
      timers.push(
        window.setTimeout(() => {
          advance();
          scheduled += 1;
          schedule();
        }, 1100),
      );
    };
    schedule();

    if (aiIndex >= 0) {
      timers.push(
        window.setTimeout(() => {
          if (!finishing && activeIndex === aiIndex && detail) {
            detail.textContent =
              "Gemini is still routing the templates. Complex sites can take up to a minute.";
          }
        }, 18_000),
      );
    }
  }

  function wait(ms) {
    return new Promise((resolve) => {
      timers.push(window.setTimeout(resolve, ms));
    });
  }

  async function finish() {
    finishing = true;
    clearTimers();
    while (activeIndex < steps.length - 1) {
      advance();
      await wait(320);
    }
    activeIndex = steps.length;
    render();
    if (detail) detail.textContent = "Blueprint ready.";
    panel?.setAttribute("aria-busy", "false");
    announce("Blueprint ready.");
    await wait(450);
  }

  function cancel() {
    finishing = true;
    clearTimers();
    panel?.setAttribute("aria-busy", "false");
    if (detail) detail.textContent = "Generation failed. Adjust the inputs and retry.";
    activateTab("form");
  }

  return { start, finish, cancel };
}

const TAB_PANELS = {
  form: "#form-panel",
  generation: "#loading-panel",
  blueprint: "#results-panel",
};

function activateTab(name) {
  for (const [tabName, panelSelector] of Object.entries(TAB_PANELS)) {
    const tab = $(`#tab-${tabName}`);
    const panel = $(panelSelector);
    const active = tabName === name;
    if (tab) tab.setAttribute("aria-selected", active ? "true" : "false");
    if (panel) {
      if (active) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    }
  }
}

function enableTab(name) {
  const tab = $(`#tab-${name}`);
  if (tab) tab.disabled = false;
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

function renderPropertyCitations(item) {
  const citations = item.property_citations || [];
  if (!citations.length) return "";
  const missing = new Set(item.missing_required_properties || []);
  const links = citations.map((citation) => {
    const classes = ["prop-cite"];
    if (citation.level === "required") classes.push("prop-cite-required");
    if (missing.has(citation.property)) classes.push("prop-cite-missing");
    const title = `${citation.level}. Documented under "${citation.heading}" in Google Search Central.`;
    return `<a class="${classes.join(" ")}" href="${escapeAttr(citation.url)}" target="_blank" rel="noopener" title="${escapeAttr(title)}">${escapeHtml(citation.property)}</a>`;
  });
  return `<p class="prop-cites"><span class="prop-cites-label">Documented properties:</span> ${links.join(" ")}</p>`;
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
    const missing = item.missing_required_properties || [];
    const status =
      item.eligible === false && missing.length
        ? `<p class="hint">Requires real data for: <strong>${missing.map(escapeHtml).join(", ")}</strong>. ` +
          "These properties need actual content (a person, place, or media object) rather " +
          "than a placeholder. Add them to the JSON-LD to qualify.</p>"
        : "";
    const citations = renderPropertyCitations(item);
    card.innerHTML = `
      <h4>${escapeHtml(item.feature_name)}${item.template_name ? ` · ${escapeHtml(item.template_name)}` : ""}</h4>
      ${status}
      <p>${escapeHtml(item.message)}</p>
      ${citations}
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

function renderSnippets(snippets) {
  const container = $("#scaffolds");
  if (!container) return;
  container.innerHTML = "";
  snippets.forEach((snippet, index) => {
    const block = document.createElement("details");
    block.className = "snippet-block";
    if (index === 0) block.open = true;
    const json = JSON.stringify(snippet.jsonld, null, 2);
    block.innerHTML = `
      <summary>
        <span class="snippet-label">${escapeHtml(snippet.label)}</span>
        <span class="hint mono">${escapeHtml(snippet.example_url)}</span>
      </summary>
      <div class="snippet-body">
        <button type="button" class="secondary copy-scaffold">Copy JSON-LD</button>
        <pre class="jsonld-output">${escapeHtml(json)}</pre>
      </div>
    `;
    block.dataset.json = json;
    container.append(block);
  });
  container.querySelectorAll(".copy-scaffold").forEach((button) => {
    button.addEventListener("click", async () => {
      const block = button.closest(".snippet-block");
      const text = block?.dataset.json || "";
      await navigator.clipboard.writeText(text);
      announce("JSON-LD copied to clipboard.");
      button.textContent = "Copied";
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
  link.type = "application/json";
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 2000);
}

function downloadBlueprint(blueprint) {
  if (!blueprint?.scaffolds?.length) return;
  const bundle = {
    generated_at: new Date().toISOString(),
    graph: blueprint.graph,
    rich_results: blueprint.rich_results,
    findings: blueprint.findings,
    snippets: blueprint.scaffolds.map((snippet) => ({
      label: snippet.label,
      template_name: snippet.template_name,
      example_url: snippet.example_url,
      usage_note: snippet.usage_note,
      jsonld: snippet.jsonld,
    })),
    model_used: blueprint.model_used,
    model_degraded: blueprint.model_degraded,
    degradation_reason: blueprint.degradation_reason ?? null,
  };
  downloadJson("schema-architect-blueprint.json", bundle);
  announce("Blueprint downloaded as JSON.");
}

const DEGRADATION_LABELS = {
  quota: "AI quota reached. Deterministic mapping used.",
  gemini_api: "AI service error. Deterministic mapping used.",
  gemini_invalid_response: "AI returned an invalid response. Deterministic mapping used.",
  incomplete_routing: "AI routing incomplete. Deterministic structure used.",
  validation_fallback: "AI output failed validation. Deterministic mapping used.",
  not_configured: "AI not configured. Deterministic mapping used.",
};

function updateModePill(blueprint) {
  const pill = $("#results-mode");
  if (!pill) return;
  pill.removeAttribute("hidden");
  if (blueprint.model_degraded) {
    pill.textContent =
      DEGRADATION_LABELS[blueprint.degradation_reason] ||
      "AI routing unavailable. Deterministic mapping used.";
    pill.dataset.state = "warn";
  } else if (blueprint.model_used) {
    pill.textContent = "Tailored with AI";
    pill.dataset.state = "ok";
  } else {
    pill.textContent = "Deterministic mapping (AI off)";
    pill.dataset.state = "ok";
  }
}

function composeResultsSummary(blueprint) {
  const count = blueprint.scaffolds.length;
  const eligible = (blueprint.rich_results || []).filter((item) => item.eligible).length;
  const total = (blueprint.rich_results || []).length;
  const parts = [`${count} JSON-LD snippet${count === 1 ? "" : "s"} generated.`];
  if (total) parts.push(`${eligible}/${total} rich result opportunities already eligible.`);
  return parts.join(" ");
}

function collectSchemaTerms(blueprint) {
  const types = new Set();
  const properties = new Set();
  const visitNode = (node) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) return;
    const rawTypes = node["@type"];
    for (const name of Array.isArray(rawTypes) ? rawTypes : rawTypes ? [rawTypes] : []) {
      types.add(String(name));
    }
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith("@")) continue;
      properties.add(key);
      for (const child of Array.isArray(value) ? value : [value]) visitNode(child);
    }
  };
  for (const entity of blueprint.graph?.entities || []) {
    entity.types.forEach((name) => types.add(name));
    entity.properties.forEach((prop) => properties.add(prop.property));
  }
  for (const snippet of blueprint.scaffolds || []) {
    for (const node of snippet.jsonld?.["@graph"] || []) visitNode(node);
  }
  return { types: [...types].sort(), properties: [...properties].sort() };
}

function renderSchemaResources(blueprint) {
  const container = $("#schema-resources");
  if (!container) return;
  const { types, properties } = collectSchemaTerms(blueprint);
  const chip = (name) =>
    `<a class="prop-cite" href="https://schema.org/${encodeURIComponent(name)}" target="_blank" rel="noopener">${escapeHtml(name)}</a>`;
  container.innerHTML = `
    <p class="prop-cites"><span class="prop-cites-label">Types (${types.length}):</span> ${types.map(chip).join(" ")}</p>
    <p class="prop-cites"><span class="prop-cites-label">Properties (${properties.length}):</span> ${properties.map(chip).join(" ")}</p>
  `;
}

function updateGraphAiSummary(blueprint) {
  const box = $("#graph-ai-summary");
  const text = $("#graph-ai-summary-text");
  if (!box || !text) return;
  const show =
    blueprint.model_used && !blueprint.model_degraded && blueprint.delivery_summary;
  if (show) {
    text.textContent = blueprint.delivery_summary;
    box.removeAttribute("hidden");
  } else {
    text.textContent = "";
    box.setAttribute("hidden", "");
  }
}

function showResults(blueprint, remaining, quotaEnforced = true) {
  enableTab("blueprint");
  activateTab("blueprint");

  const summary = $("#results-summary");
  if (summary) {
    summary.textContent = composeResultsSummary(blueprint);
  }
  updateModePill(blueprint);
  updateGraphAiSummary(blueprint);

  void renderDiagram(blueprint.mermaid).catch(() => {
    const diagram = $("#diagram");
    if (diagram) {
      diagram.innerHTML =
        '<p class="hint">Could not render the graph diagram. Open “Graph source” below to view the raw definition.</p>';
    }
  });
  renderRichResults(blueprint.rich_results || []);
  renderSnippets(blueprint.scaffolds);
  renderSchemaResources(blueprint);
  latestBlueprint = blueprint;
  updateQuotaPill(remaining, quotaEnforced);
  announce("Blueprint generated.");
  $("#results-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateQuotaPill(remaining, quotaEnforced = true) {
  if (quotaEnforced === false) {
    setPill("#quota-status", "AI mapping enabled", "ok");
    return;
  }
  if (typeof remaining === "number") {
    const label =
      remaining === 0
        ? "AI limit reached. Deterministic mode until next week."
        : `${remaining} AI generation${remaining === 1 ? "" : "s"} left this week`;
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
    quotaState = {
      enforced: quota.quota_enforced !== false,
      remaining: quota.model_operations_remaining,
    };
    updateQuotaPill(quota.model_operations_remaining, quota.quota_enforced);
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
  const useAi =
    !quotaState.enforced ||
    quotaState.remaining === null ||
    quotaState.remaining > 0;
  const progress = createGenerationProgress(site, useAi);
  progress.start();

  try {
    const payload = await fetchJson(
      "/blueprint",
      {
        method: "POST",
        body: JSON.stringify({ site, use_model: true }),
      },
      { timeoutMs: GENERATION_TIMEOUT_MS, retryOnTransient: true },
    );
    await progress.finish();
    quotaState = {
      enforced: payload.quota_enforced !== false,
      remaining: payload.model_operations_remaining,
    };
    showResults(
      payload.blueprint,
      payload.model_operations_remaining,
      payload.quota_enforced,
    );
  } catch (error) {
    progress.cancel();
    const message =
      error instanceof Error ? error.message : "Blueprint generation failed.";
    announce(message);
    alert(message);
  } finally {
    button.disabled = false;
  }
}

function bindEvents() {
  $("#site-form")?.addEventListener("submit", handleSubmit);
  $("#add-template")?.addEventListener("click", () => {
    const container = $("#template-rows");
    container?.append(templateRow(container.children.length));
    updateTemplateLabels();
  });
  populateSampleSelect();
  $("#sample-select")?.addEventListener("change", fillSelectedSample);
  $("#download-all")?.addEventListener("click", () => {
    if (!latestBlueprint?.scaffolds?.length) return;
    downloadBlueprint(latestBlueprint);
  });
  $("#start-over")?.addEventListener("click", () => activateTab("form"));
  for (const name of Object.keys(TAB_PANELS)) {
    $(`#tab-${name}`)?.addEventListener("click", () => activateTab(name));
  }
}

ensureTemplateRows();
bindEvents();
initStatus();
