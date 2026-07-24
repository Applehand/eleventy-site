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
  if (Array.isArray(payload?.detail) && payload.detail.length) {
    const lines = payload.detail.slice(0, 3).map((item) => {
      const loc = (item.loc || [])
        .filter((part) => part !== "body" && part !== "site")
        .map((part) => (typeof part === "number" ? `#${part + 1}` : part))
        .join(" ");
      return loc ? `${loc}: ${item.msg}` : item.msg;
    });
    return `Check the form. ${lines.join(". ")}.`;
  }
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
            lastError = new Error(
              errorMessage(payload, response.statusText || `Request failed (HTTP ${response.status}).`),
            );
            break;
          }
          throw new Error(
            errorMessage(payload, response.statusText || `Request failed (HTTP ${response.status}).`),
          );
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
  const withScheme = value.includes("://") ? value : `https://${value}`;
  const url = new URL(withScheme);
  if (url.username || url.password) throw new Error("Site URL must not include credentials.");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Site URL must be the homepage origin only.");
  }
  return `${url.protocol}//${url.host}`;
}

function parseSocialUrls(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const urls = [];
  const invalid = [];
  for (const line of lines) {
    const candidate = line.includes("://") ? line : `https://${line}`;
    try {
      urls.push(new URL(candidate).toString());
    } catch (error) {
      invalid.push(line);
    }
  }
  if (invalid.length) {
    throw new Error(`These social URLs are not valid: ${invalid.join(", ")}`);
  }
  return urls;
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
      "Founded in 2012 by head baker Priya Nandakumar. Downtown location: 412 Harbor Street, open 7am-3pm daily, phone (555) 014-2200. Harborview location: 77 Dock Street, open 7am-1pm weekends only. Email orders@northwindbakery.example. Price range $. Seasonal menus published monthly; online orders for pickup.",
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
      "Founded in 2019 by CEO Dana Okafor; headquartered in Denver, Colorado. Browser-based web application with a free trial tier; Pro plan is $49 per user per month. Hiring is remote-first across the US. Support email support@summitanalytics.example. Docs live on a separate subdomain.",
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
      "Founded in 2016; editor-in-chief is Maya Chen. Twelve freelance contributors, each with a byline and profile page. Hotel reviews use a 1-5 star scale from staff visits. Affiliate links on hotel pages. Editorial contact editors@horizontravel.example.",
  },
  {
    label: "Oak & Page Books: events + reviews",
    business_name: "Oak & Page Books",
    site_url: "https://oakandpage.example",
    business_description:
      "Independent bookstore hosting author events, book clubs, and a small online shop for signed editions.",
    business_category: "Independent bookstore",
    social_urls: [
      "https://www.instagram.com/oakandpagebooks",
      "https://www.facebook.com/oakandpagebooks",
    ],
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
      "Owned by Theo Marsh since 2015. Store address: 88 Alder Lane, open Tuesday-Sunday 10am-7pm, phone (555) 023-4471, email hello@oakandpage.example. Events are usually free with RSVP; ticketed signings around $15. Signed editions ship within the US.",
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
      "Founded in 2017 by Sam Driftwood. Ships from two US warehouses; prices in USD with free shipping over $75. Product pages show in-stock status and collect verified buyer reviews with star ratings. Support email gear@driftwoodoutdoor.example, phone (555) 067-3300.",
    commerce: {
      sells_online: true,
      ships_to_countries: ["US", "CA"],
      free_shipping_threshold: "$75",
      delivery_window_days: 5,
      return_window_days: 30,
      loyalty_program_name: "Trailhead Rewards",
      loyalty_benefits: "Points on every order and early access to gear drops",
      has_variants: true,
      uses_merchant_center: true,
    },
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
      "Founded in 2020 by chefs Nora Alvarez and Sam Whitfield. Every recipe is tested three times before publishing and lists prep time, cook time, and servings. Contact kitchen@goldenladle.example. New recipes publish every Tuesday.",
  },
  {
    label: "Brightpath Learning: courses + webinars",
    business_name: "Brightpath Learning",
    site_url: "https://brightpathlearning.example",
    business_description:
      "Online course provider teaching data skills to career changers, with cohort-based classes, live webinars, and a student question board.",
    business_category: "Online education provider",
    social_urls: [
      "https://www.linkedin.com/company/brightpath-learning",
      "https://www.youtube.com/@brightpathlearning",
    ],
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
      "Founded in 2021. Six-week cohorts; tuition is $1,800 with scholarships available. Lead instructor Devon Park teaches SQL Fundamentals. Webinars are free and recorded. The question board shows an accepted answer with upvotes. Admissions email admissions@brightpathlearning.example, phone (555) 088-2040.",
  },
  {
    label: "Cascade Talent Group: job board",
    business_name: "Cascade Talent Group",
    site_url: "https://cascadetalent.example",
    business_description:
      "Regional staffing agency posting engineering and manufacturing roles across the Pacific Northwest, with salary guides and hiring resources.",
    business_category: "Staffing agency",
    social_urls: [
      "https://www.linkedin.com/company/cascade-talent-group",
      "https://www.facebook.com/cascadetalentgroup",
    ],
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
      "Founded in 2011; office at 340 Rainier Way, Tacoma, Washington, phone (555) 051-6600. Roles include full-time, contract, and contract-to-hire. Every listing shows a posted date, valid-through date, and a salary range in USD. Recruiting director is Anh Tran.",
  },
  {
    label: "Lumen Film Society: screenings + reviews",
    business_name: "Lumen Film Society",
    site_url: "https://lumenfilm.example",
    business_description:
      "Member-supported cinema screening restored classics and international films, with critic essays and a member discussion forum.",
    business_category: "Independent cinema",
    social_urls: [
      "https://www.instagram.com/lumenfilmsociety",
      "https://letterboxd.com/lumenfilmsociety",
    ],
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
      "Founded in 1978; program director is Iris Kellerman. Theater address: 200 Meridian Avenue, box office phone (555) 019-7800, email tickets@lumenfilm.example. Tickets $8 members / $14 general; screenings Thursday-Sunday. Films are shown with title, director, and release year on each screening page.",
  },
  {
    label: "Tidewater Stays: vacation rentals",
    business_name: "Tidewater Stays",
    site_url: "https://tidewaterstays.example",
    business_description:
      "Family-run vacation rental company managing twelve coastal cottages and cabins with direct online booking.",
    business_category: "Vacation rental management",
    social_urls: [
      "https://www.instagram.com/tidewaterstays",
      "https://www.facebook.com/tidewaterstays",
    ],
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
      "Family-run by Ruth and Calvin Osei since 2014. Office at 15 Marina Row, Oceanside, phone (555) 032-7700, email stay@tidewaterstays.example. Each rental lists a street address, capacity, bedrooms and bathrooms, a nightly rate in USD, and verified guest ratings. Check-in 4pm, checkout 10am.",
  },
  {
    label: "Cedarline Dermatology: medical practice",
    business_name: "Cedarline Dermatology",
    site_url: "https://cedarlinederm.example",
    business_description:
      "Board-certified dermatology practice offering medical, surgical, and cosmetic skin care across two clinic locations.",
    business_category: "Dermatology clinic",
    social_urls: ["https://www.linkedin.com/company/cedarline-dermatology"],
    templates: [
      {
        name: "provider profile",
        example_path: "/providers/dr-elena-ruiz",
        description:
          "Physician bios with credentials, board certifications, specialties, and accepted insurance.",
      },
      {
        name: "condition guide",
        example_path: "/conditions/eczema",
        description:
          "Patient education articles covering symptoms, causes, and treatment options, reviewed by our physicians.",
      },
      {
        name: "location",
        example_path: "/locations/eastside",
        description: "Clinic hours, address, phone, parking, and directions for each office.",
      },
      {
        name: "patient faq",
        example_path: "/faq/first-visit",
        description: "Common questions about appointments, insurance, billing, and telehealth.",
      },
    ],
    notes:
      "Eastside clinic: 900 Cedar Avenue, Suite 210, phone (555) 044-8100, open Monday-Friday 8am-5pm. Physicians: Dr. Elena Ruiz and Dr. Marcus Webb. Accepts most major insurance plans.",
  },
  {
    label: "Open Climate Data Lab: research datasets",
    business_name: "Open Climate Data Lab",
    site_url: "https://openclimatedata.example",
    business_description:
      "University-affiliated research lab publishing open climate datasets, methodology articles, and reproducible analysis notebooks.",
    business_category: "Research organization",
    social_urls: [
      "https://github.com/open-climate-data-lab",
      "https://www.linkedin.com/company/open-climate-data-lab",
    ],
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
      "Directed by Dr. Ida Mansour; affiliated with Cascadia State University since 2018. All datasets are CC-BY 4.0 with versioned releases and citations; data available as CSV and NetCDF. Contact data@openclimatedata.example.",
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

  const commerce = sample.commerce || {};
  if (form.sellsOnline) form.sellsOnline.checked = Boolean(commerce.sells_online);
  form.shipsTo.value = (commerce.ships_to_countries || []).join(", ");
  form.returnWindowDays.value = commerce.return_window_days ?? "";
  form.returnPolicyUrl.value = commerce.return_policy_url || "";
  form.freeShippingThreshold.value = commerce.free_shipping_threshold || "";
  form.deliveryWindowDays.value = commerce.delivery_window_days ?? "";
  form.loyaltyName.value = commerce.loyalty_program_name || "";
  form.loyaltyBenefits.value = commerce.loyalty_benefits || "";
  form.hasVariants.checked = Boolean(commerce.has_variants);
  form.usesMerchantCenter.checked = Boolean(commerce.uses_merchant_center);
  syncCommerceVisibility();

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
  const site = {
    business_name: form.businessName.value.trim(),
    site_url: normalizeOrigin(form.siteUrl.value.trim()),
    business_description: form.businessDescription.value.trim(),
    business_category: form.businessCategory.value.trim(),
    social_urls: socialRaw ? parseSocialUrls(socialRaw) : [],
    templates,
    notes: form.notes.value.trim() || null,
  };
  const commerce = collectCommerceDetails(form);
  if (commerce) site.commerce = commerce;
  return site;
}

function collectCommerceDetails(form) {
  if (!form.sellsOnline?.checked) return null;
  const commerce = { sells_online: true };
  const countries = form.shipsTo.value
    .split(/[,\s]+/)
    .map((code) => code.trim().toUpperCase())
    .filter((code) => /^[A-Z]{2}$/.test(code));
  if (countries.length) commerce.ships_to_countries = countries;
  const returnDays = Number.parseInt(form.returnWindowDays.value, 10);
  if (Number.isFinite(returnDays)) commerce.return_window_days = returnDays;
  if (form.returnPolicyUrl.value.trim()) {
    commerce.return_policy_url = form.returnPolicyUrl.value.trim();
  }
  if (form.freeShippingThreshold.value.trim()) {
    commerce.free_shipping_threshold = form.freeShippingThreshold.value.trim();
  }
  const deliveryDays = Number.parseInt(form.deliveryWindowDays.value, 10);
  if (Number.isFinite(deliveryDays)) commerce.delivery_window_days = deliveryDays;
  if (form.loyaltyName.value.trim()) commerce.loyalty_program_name = form.loyaltyName.value.trim();
  if (form.loyaltyBenefits.value.trim()) {
    commerce.loyalty_benefits = form.loyaltyBenefits.value.trim();
  }
  if (form.hasVariants.checked) commerce.has_variants = true;
  if (form.usesMerchantCenter.checked) commerce.uses_merchant_center = true;
  return commerce;
}

function syncCommerceVisibility() {
  const checkbox = $("#sells-online");
  const fields = $("#commerce-fields");
  if (checkbox && fields) fields.hidden = !checkbox.checked;
  if (checkbox?.checked) {
    const nudge = $("#commerce-nudge");
    if (nudge) nudge.hidden = true;
  }
}

const COMMERCE_HINT_RE =
  /\b(e-?commerce|online (store|shop|retailer)|product|shop|store|cart|checkout|pricing|sku|merch)\b/i;

function maybeNudgeCommerce() {
  const checkbox = $("#sells-online");
  const nudge = $("#commerce-nudge");
  if (!checkbox || !nudge || checkbox.checked) return;
  const form = $("#site-form");
  const haystack = [
    form?.businessCategory?.value || "",
    form?.businessDescription?.value || "",
    ...[...(form?.querySelectorAll('[name="templateDescription"]') || [])].map(
      (input) => input.value,
    ),
  ].join(" ");
  nudge.hidden = !COMMERCE_HINT_RE.test(haystack);
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

const GRAPH_PALETTE = {
  paper: "#fffdf7",
  ink: "#171717",
  muted: "#68635c",
  accent: "#5b4bdb",
  accentSoft: "#eeeaff",
};

function entityKind(entity) {
  // The backend mints stable @id fragments (StableIdPolicy), which are far
  // more reliable than type heuristics: the AI may retype the business to a
  // subtype like EmploymentAgency or Bakery that no name pattern catches.
  const id = entity.id || "";
  const fragment = id.includes("#") ? id.slice(id.indexOf("#") + 1) : "";
  if (fragment === "organization") return "org";
  if (fragment === "website") return "site";
  if (fragment === "webpage") return "page";
  if (fragment === "breadcrumb") return "crumb";
  if (fragment.startsWith("person-")) return "person";
  const types = entity.types;
  if (fragment.startsWith("page-entity-")) {
    // The template's primary entity: the page's subject. When it is typed as
    // a plain WebPage it doubles as the page node itself.
    return types.includes("WebPage") ? "page" : "content";
  }
  if (types.includes("Organization") || types.some((t) => t.endsWith("Business"))) return "org";
  if (types.includes("WebSite")) return "site";
  if (types.includes("BreadcrumbList")) return "crumb";
  if (types.includes("Person")) return "person";
  if (types.includes("WebPage") || types.some((t) => t.endsWith("Page"))) return "page";
  return "content";
}

function buildGraphData(manifest) {
  const nodes = new Map();
  for (const entity of manifest.entities) {
    const name = entity.properties.find(
      (prop) => prop.property === "name" && typeof prop.value === "string",
    )?.value;
    const primaryType = entity.types[0] || "Thing";
    const label = name && name !== primaryType ? `${name} (${primaryType})` : primaryType;
    nodes.set(entity.id, {
      id: entity.id,
      label: label.length > 34 ? `${label.slice(0, 33)}…` : label,
      kind: entityKind(entity),
      degree: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      pinned: false,
    });
  }
  const links = [];
  for (const entity of manifest.entities) {
    for (const prop of entity.properties) {
      if (prop.kind !== "reference" || typeof prop.value !== "string") continue;
      const source = nodes.get(entity.id);
      const target = nodes.get(prop.value);
      if (!source || !target) continue;
      links.push({ source, target, property: prop.property });
      source.degree += 1;
      target.degree += 1;
    }
  }
  return { nodes: [...nodes.values()], links };
}

const SVG_NS = "http://www.w3.org/2000/svg";
let activeGraph = null;

function createForceGraph(container, data, detailsById) {
  const WORLD = { w: 1040, h: Math.max(640, data.nodes.length * 26 + 320) };
  const view = { x: 0, y: 0, w: WORLD.w, h: WORLD.h };
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${WORLD.w} ${WORLD.h}`);
  svg.setAttribute("aria-label", "Interactive entity graph");
  svg.style.background = GRAPH_PALETTE.paper;
  container.innerHTML = "";
  container.append(svg);

  const edgeLayer = document.createElementNS(SVG_NS, "g");
  const nodeLayer = document.createElementNS(SVG_NS, "g");
  svg.append(edgeLayer, nodeLayer);

  // Default arrangement: semantic columns matching the markup hierarchy
  // (business → people/site → pages → content → breadcrumbs), then a few
  // barycenter sweeps so each node sits beside the nodes it links to instead
  // of crossing the canvas. Every node starts quietly pinned so the layout is
  // stable and directly arrangeable; unpinning hands a node to the physics.
  const KIND_COLUMN = { org: 0, person: 1, site: 1, page: 2, content: 3, crumb: 4 };
  function applyDefaultLayout() {
    const neighbors = new Map(data.nodes.map((node) => [node, []]));
    for (const link of data.links) {
      neighbors.get(link.source).push(link.target);
      neighbors.get(link.target).push(link.source);
    }
    const columnOf = (node) => KIND_COLUMN[node.kind] ?? 3;
    const columns = new Map();
    for (const node of data.nodes) {
      const rank = columnOf(node);
      if (!columns.has(rank)) columns.set(rank, []);
      columns.get(rank).push(node);
    }
    const ranks = [...columns.keys()].sort((a, b) => a - b);
    // rowOf holds each node's normalized vertical slot (0..1) so columns of
    // different sizes can still compare positions during the sweeps.
    const rowOf = new Map();
    const setRows = (column) =>
      column.forEach((node, index) => rowOf.set(node, (index + 1) / (column.length + 1)));
    ranks.forEach((rank) => setRows(columns.get(rank)));
    const barycenter = (node, rank) => {
      const across = neighbors.get(node).filter((other) => columnOf(other) !== rank);
      if (!across.length) return rowOf.get(node);
      return across.reduce((sum, other) => sum + rowOf.get(other), 0) / across.length;
    };
    for (let sweep = 0; sweep < 4; sweep += 1) {
      const order = sweep % 2 ? [...ranks].reverse() : ranks;
      for (const rank of order) {
        const column = columns.get(rank);
        column.sort((a, b) => barycenter(a, rank) - barycenter(b, rank));
        setRows(column);
      }
    }
    ranks.forEach((rank, columnIndex) => {
      const column = columns.get(rank);
      const x =
        ranks.length === 1
          ? WORLD.w / 2
          : 120 + (columnIndex * (WORLD.w - 240)) / (ranks.length - 1);
      column.forEach((node) => {
        node.x = x;
        node.y = 60 + rowOf.get(node) * (WORLD.h - 120);
        node.pinned = true;
        node.autoPinned = true;
      });
    });
    // A column holding a single node (usually the business) sits level with
    // the average of its neighbors rather than at an arbitrary center.
    for (const rank of ranks) {
      const column = columns.get(rank);
      if (column.length !== 1) continue;
      const node = column[0];
      const linked = neighbors.get(node);
      if (!linked.length) continue;
      const y = linked.reduce((sum, other) => sum + other.y, 0) / linked.length;
      node.y = Math.min(WORLD.h - 60, Math.max(60, y));
    }
  }
  applyDefaultLayout();

  const edgeEls = data.links.map((link, index) => {
    link.labelT = 0.32 + (index % 5) * 0.09;
    const group = document.createElementNS(SVG_NS, "g");
    const isSubject = link.property === "mainEntity";
    group.setAttribute("class", isSubject ? "g-edge is-subject" : "g-edge");
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("stroke", isSubject ? GRAPH_PALETTE.accent : GRAPH_PALETTE.ink);
    line.setAttribute("stroke-width", isSubject ? "2.2" : "1.3");
    line.setAttribute("opacity", isSubject ? "0.85" : "0.4");
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "g-edge-label");
    label.setAttribute("text-anchor", "middle");
    label.textContent = link.property;
    group.append(line, label);
    edgeLayer.append(group);
    return { link, group, line, label };
  });

  const nodeEls = data.nodes.map((node) => {
    const group = document.createElementNS(SVG_NS, "g");
    group.setAttribute("class", "g-node");
    const size = Math.min(30, 13 + node.degree * 2.2);
    node.size = size;
    const rect = document.createElementNS(SVG_NS, "rect");
    rect.setAttribute("width", size);
    rect.setAttribute("height", size);
    const fills = {
      org: GRAPH_PALETTE.accent,
      site: GRAPH_PALETTE.ink,
      person: GRAPH_PALETTE.accentSoft,
      crumb: GRAPH_PALETTE.paper,
      page: "#fff",
      content: "#ffe8a3",
    };
    rect.setAttribute("fill", fills[node.kind] || "#fff");
    rect.setAttribute("stroke", GRAPH_PALETTE.ink);
    rect.setAttribute("stroke-width", "2");
    const label = document.createElementNS(SVG_NS, "text");
    label.setAttribute("class", "g-node-label");
    label.setAttribute("text-anchor", "middle");
    label.textContent = node.label;
    const pinBadge = document.createElementNS(SVG_NS, "rect");
    pinBadge.setAttribute("class", "g-pin-badge");
    pinBadge.setAttribute("width", "9");
    pinBadge.setAttribute("height", "9");
    pinBadge.setAttribute("fill", GRAPH_PALETTE.accent);
    pinBadge.setAttribute("stroke", GRAPH_PALETTE.ink);
    pinBadge.setAttribute("stroke-width", "1.5");
    pinBadge.setAttribute("visibility", "hidden");
    group.append(rect, label, pinBadge);
    nodeLayer.append(group);
    group.__node = node;
    return { node, group, rect, label, pinBadge };
  });

  let alpha = 1;
  let frame = null;

  function step() {
    const nodes = data.nodes;
    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      if (a.pinned || a.dragging) continue;
      for (let j = 0; j < nodes.length; j += 1) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = Math.max(240, dx * dx + dy * dy);
        const force = 3400 / d2;
        const d = Math.sqrt(d2);
        a.vx += (dx / d) * force;
        a.vy += (dy / d) * force;
      }
      // gentle pull toward the center keeps the cluster on canvas
      a.vx += (WORLD.w / 2 - a.x) * 0.004;
      a.vy += (WORLD.h / 2 - a.y) * 0.004;
    }
    for (const { source, target } of data.links) {
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const stretch = ((d - 145) / d) * 0.04;
      if (!source.pinned && !source.dragging) {
        source.vx += dx * stretch;
        source.vy += dy * stretch;
      }
      if (!target.pinned && !target.dragging) {
        target.vx -= dx * stretch;
        target.vy -= dy * stretch;
      }
    }
    for (const node of data.nodes) {
      if (node.pinned || node.dragging) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx *= 0.82;
      node.vy *= 0.82;
      node.x += node.vx * alpha;
      node.y += node.vy * alpha;
      node.x = Math.min(WORLD.w - 60, Math.max(60, node.x));
      node.y = Math.min(WORLD.h - 44, Math.max(34, node.y));
    }
    // hard minimum separation so labels never overlap
    for (let i = 0; i < data.nodes.length; i += 1) {
      for (let j = i + 1; j < data.nodes.length; j += 1) {
        const a = data.nodes[i];
        const b = data.nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.max(0.01, Math.sqrt(dx * dx + dy * dy));
        const minD = 62;
        if (d < minD) {
          const push = (minD - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          if (!a.pinned && !a.dragging) {
            a.x -= ux * push;
            a.y -= uy * push;
          }
          if (!b.pinned && !b.dragging) {
            b.x += ux * push;
            b.y += uy * push;
          }
        }
      }
    }
    render();
    alpha *= 0.994;
    frame = alpha > 0.03 ? requestAnimationFrame(step) : null;
  }

  function render() {
    for (const { node, group, rect, label, pinBadge } of nodeEls) {
      rect.setAttribute("x", node.x - node.size / 2);
      rect.setAttribute("y", node.y - node.size / 2);
      const userPinned = node.pinned && !node.autoPinned;
      rect.setAttribute("stroke", userPinned ? GRAPH_PALETTE.accent : GRAPH_PALETTE.ink);
      rect.setAttribute("stroke-width", userPinned ? "3" : "2");
      label.setAttribute("x", node.x);
      label.setAttribute("y", node.y + node.size / 2 + 13);
      pinBadge.setAttribute("x", node.x + node.size / 2 - 3);
      pinBadge.setAttribute("y", node.y - node.size / 2 - 6);
      pinBadge.setAttribute("visibility", userPinned ? "visible" : "hidden");
      group.classList.toggle("is-pinned", userPinned);
    }
    for (const { link, line, label } of edgeEls) {
      line.setAttribute("x1", link.source.x);
      line.setAttribute("y1", link.source.y);
      line.setAttribute("x2", link.target.x);
      line.setAttribute("y2", link.target.y);
      const t = link.labelT;
      label.setAttribute("x", link.source.x + (link.target.x - link.source.x) * t);
      label.setAttribute("y", link.source.y + (link.target.y - link.source.y) * t - 5);
    }
  }

  function reheat(energy = 0.6) {
    alpha = Math.max(alpha, energy);
    if (!frame) frame = requestAnimationFrame(step);
  }

  function applyView() {
    svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  }

  function toWorld(event) {
    const rect = svg.getBoundingClientRect();
    return {
      x: view.x + ((event.clientX - rect.left) / rect.width) * view.w,
      y: view.y + ((event.clientY - rect.top) / rect.height) * view.h,
    };
  }

  svg.addEventListener("wheel", (event) => {
    event.preventDefault();
    if (!selectedNode) panel.hidden = true;
    const factor = event.deltaY > 0 ? 1.13 : 1 / 1.13;
    const anchor = toWorld(event);
    view.w = Math.min(WORLD.w * 3, Math.max(160, view.w * factor));
    view.h = view.w * (WORLD.h / WORLD.w);
    view.x = anchor.x - ((event.clientX - svg.getBoundingClientRect().left) / svg.getBoundingClientRect().width) * view.w;
    view.y = anchor.y - ((event.clientY - svg.getBoundingClientRect().top) / svg.getBoundingClientRect().height) * view.h;
    applyView();
  }, { passive: false });

  const panel = document.createElement("div");
  panel.className = "node-panel";
  panel.hidden = true;
  container.append(panel);
  let panelTimer = null;
  let hideTimer = null;

  let panelNode = null;
  let selectedNode = null;

  function setHighlight(node) {
    svg.classList.toggle("has-selection", Boolean(node));
    const touches = (link, target) => link.source === target || link.target === target;
    const isNeighbor = (candidate) =>
      data.links.some(
        (link) =>
          (link.source === node && link.target === candidate) ||
          (link.target === node && link.source === candidate),
      );
    for (const el of nodeEls) {
      el.group.classList.toggle("is-selected", el.node === node);
      el.group.classList.toggle(
        "is-dim",
        Boolean(node) && el.node !== node && !isNeighbor(el.node),
      );
    }
    for (const el of edgeEls) {
      const active = Boolean(node) && touches(el.link, node);
      el.group.classList.toggle("is-active", active);
      el.group.classList.toggle("is-dim", Boolean(node) && !active);
    }
  }

  function clearSelection() {
    selectedNode = null;
    panel.hidden = true;
    setHighlight(null);
  }

  function connectionRows(node) {
    const outgoing = data.links
      .filter((link) => link.source === node)
      .map(
        (link) =>
          `<div class="node-panel-row"><span class="node-panel-key">${escapeHtml(link.property)} →</span><span class="node-panel-value">${escapeHtml(link.target.label)}</span></div>`,
      );
    const incoming = data.links
      .filter((link) => link.target === node)
      .map(
        (link) =>
          `<div class="node-panel-row"><span class="node-panel-key">← ${escapeHtml(link.property)}</span><span class="node-panel-value">from ${escapeHtml(link.source.label)}</span></div>`,
      );
    return [...outgoing, ...incoming].join("");
  }

  function showPanel(node) {
    const details = detailsById?.get(node.id);
    panelNode = node;
    const locked = selectedNode === node;
    const connections = connectionRows(node);
    const rows = (details?.fields || [])
      .map(
        ([key, value]) =>
          `<div class="node-panel-row"><span class="node-panel-key">${escapeHtml(key)}</span><span class="node-panel-value">${escapeHtml(value)}</span></div>`,
      )
      .join("");
    const userPinned = node.pinned && !node.autoPinned;
    const pinButton = `<button type="button" class="node-panel-pin" aria-label="${userPinned ? "Unpin node" : "Pin node in place"}">${userPinned ? "unpin" : "pin"}</button>`;
    const closeButton = locked
      ? '<button type="button" class="node-panel-close" aria-label="Close details">×</button>'
      : "";
    panel.innerHTML = `
      <div class="node-panel-head">
        <p class="node-panel-title">${escapeHtml(node.label)}</p>
        <span class="node-panel-actions">${pinButton}${closeButton}</span>
      </div>
      ${connections ? `<p class="node-panel-sub">connections</p>${connections}` : ""}
      <p class="node-panel-sub node-panel-sub-gap">fields to fill in the snippet</p>
      ${rows || '<p class="node-panel-sub">No fields beyond identity.</p>'}
    `;
    panel.querySelector(".node-panel-pin")?.addEventListener("click", () => {
      if (!panelNode) return;
      const wasPinned = panelNode.pinned && !panelNode.autoPinned;
      panelNode.pinned = !wasPinned;
      panelNode.autoPinned = false;
      if (!panelNode.pinned) reheat(0.5);
      render();
      showPanel(panelNode);
    });
    panel.querySelector(".node-panel-close")?.addEventListener("click", clearSelection);
    panel.hidden = false;
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      // A clicked (selected) node keeps its card open until dismissed.
      if (!selectedNode) panel.hidden = true;
    }, 180);
  }

  panel.addEventListener("pointerenter", () => window.clearTimeout(hideTimer));
  panel.addEventListener("pointerleave", scheduleHide);

  let dragNode = null;
  let dragMoved = 0;
  let dragOffset = { x: 0, y: 0 };
  let panStart = null;
  let panMoved = 0;

  svg.addEventListener("pointerover", (event) => {
    const nodeGroup = event.target.closest(".g-node");
    if (!nodeGroup || dragNode || selectedNode) return;
    window.clearTimeout(panelTimer);
    window.clearTimeout(hideTimer);
    panelTimer = window.setTimeout(() => showPanel(nodeGroup.__node), 220);
  });

  svg.addEventListener("pointerout", (event) => {
    if (event.target.closest(".g-node")) {
      window.clearTimeout(panelTimer);
      scheduleHide();
    }
  });

  svg.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    window.clearTimeout(panelTimer);
    if (!selectedNode) panel.hidden = true;
    const nodeGroup = event.target.closest(".g-node");
    svg.setPointerCapture(event.pointerId);
    if (nodeGroup) {
      dragNode = nodeGroup.__node;
      dragNode.dragging = true;
      dragMoved = 0;
      const grab = toWorld(event);
      dragOffset = { x: dragNode.x - grab.x, y: dragNode.y - grab.y };
      reheat(0.5);
    } else {
      panStart = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
      panMoved = 0;
    }
  });

  svg.addEventListener("pointermove", (event) => {
    if (dragNode) {
      const point = toWorld(event);
      const nextX = point.x + dragOffset.x;
      const nextY = point.y + dragOffset.y;
      dragMoved += Math.abs(nextX - dragNode.x) + Math.abs(nextY - dragNode.y);
      dragNode.x = nextX;
      dragNode.y = nextY;
      reheat(0.35);
      render();
    } else if (panStart) {
      const rect = svg.getBoundingClientRect();
      panMoved += Math.abs(event.clientX - panStart.x) + Math.abs(event.clientY - panStart.y);
      view.x = panStart.vx - ((event.clientX - panStart.x) / rect.width) * view.w;
      view.y = panStart.vy - ((event.clientY - panStart.y) / rect.height) * view.h;
      applyView();
    }
  });

  svg.addEventListener("pointerup", () => {
    if (dragNode) {
      dragNode.dragging = false;
      if (dragMoved > 6) {
        // a real move pins the node in place
        dragNode.pinned = true;
        dragNode.autoPinned = false;
      } else {
        // a plain click selects: card stays open until dismissed
        selectedNode = dragNode;
        setHighlight(selectedNode);
        showPanel(selectedNode);
      }
      if (panelNode === dragNode && dragMoved > 6) showPanel(dragNode);
      render();
      reheat(0.3);
      dragNode = null;
    } else if (panStart && panMoved <= 6) {
      // a click on empty canvas dismisses the selection
      clearSelection();
    }
    panStart = null;
  });

  render();
  reheat(0.2);

  return {
    reset() {
      clearSelection();
      applyDefaultLayout();
      view.x = 0;
      view.y = 0;
      view.w = WORLD.w;
      view.h = WORLD.h;
      applyView();
      render();
      reheat(0.2);
    },
    destroy() {
      if (frame) cancelAnimationFrame(frame);
      svg.remove();
      panel.remove();
    },
  };
}

const KIND_META = {
  org: { label: "Business", fill: GRAPH_PALETTE.accent },
  site: { label: "Website", fill: GRAPH_PALETTE.ink },
  page: { label: "Page", fill: "#fff" },
  content: { label: "Content", fill: "#ffe8a3" },
  person: { label: "Person", fill: GRAPH_PALETTE.accentSoft },
  crumb: { label: "Breadcrumb trail", fill: GRAPH_PALETTE.paper },
};

function renderGraphKey(data) {
  const container = $("#graph-key");
  if (!container) return;
  const present = [...new Set(data.nodes.map((node) => node.kind))];
  const order = ["org", "site", "page", "content", "person", "crumb"];
  const chips = order
    .filter((kind) => present.includes(kind))
    .map((kind) => {
      const meta = KIND_META[kind];
      return `<span class="key-item"><span class="key-swatch" style="background:${meta.fill}"></span>${meta.label}</span>`;
    });
  const hasSubject = data.links.some((link) => link.property === "mainEntity");
  const edges = [
    `<span class="key-item"><span class="key-swatch key-swatch-pinned"></span>pinned (unpin from its card)</span>`,
    `<span class="key-item"><span class="key-line"></span>link</span>`,
    hasSubject
      ? `<span class="key-item"><span class="key-line key-line-subject"></span>page subject (mainEntity)</span>`
      : "",
  ];
  container.innerHTML = chips.join("") + edges.join("");
}

function buildSnippetDetails(blueprint) {
  const details = new Map();
  for (const snippet of blueprint.scaffolds || []) {
    for (const node of snippet.jsonld?.["@graph"] || []) {
      const id = node["@id"];
      if (!id || details.has(id)) continue;
      const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      const isReference = (value) =>
        value && typeof value === "object" && !Array.isArray(value) &&
        Object.keys(value).length === 1 && "@id" in value;
      const fields = Object.entries(node)
        .filter(([key, value]) => {
          if (key.startsWith("@")) return false;
          if (isReference(value)) return false;
          if (Array.isArray(value) && value.length && value.every(isReference)) return false;
          return true;
        })
        .map(([key, value]) => {
          const rendered = typeof value === "string" ? value : JSON.stringify(value);
          return [key, rendered.length > 80 ? `${rendered.slice(0, 79)}…` : rendered];
        });
      details.set(id, { types, fields });
    }
  }
  return details;
}

function renderDiagram(blueprint) {
  const sourceNode = $("#mermaid-source");
  if (sourceNode) sourceNode.textContent = blueprint.mermaid;
  const container = $("#diagram");
  if (!container) return;
  if (activeGraph) activeGraph.destroy();
  const data = buildGraphData(blueprint.graph);
  renderGraphKey(data);
  activeGraph = createForceGraph(container, data, buildSnippetDetails(blueprint));
}

function renderPropertyCitations(item) {
  const all = item.property_citations || [];
  if (!all.length) return "";
  const missing = new Set(item.missing_required_properties || []);
  // required first, then recommended, capped so org-style manifests with two
  // dozen identifier properties don't wall the card
  const citations = [...all]
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "required" ? -1 : 1))
    .slice(0, 12);
  const overflow = all.length - citations.length;
  const links = citations.map((citation) => {
    const classes = ["prop-cite"];
    if (citation.level === "required") classes.push("prop-cite-required");
    if (missing.has(citation.property)) classes.push("prop-cite-missing");
    const title = `${citation.level}. Documented under "${citation.heading}" in Google Search Central.`;
    return `<span class="${classes.join(" ")}" title="${escapeAttr(title)}">${escapeHtml(citation.property)}</span>`;
  });
  const more = overflow > 0 ? ` <span class="hint">+${overflow} more in the docs</span>` : "";
  return `<p class="prop-cites"><span class="prop-cites-label">Documented properties:</span> ${links.join(" ")}${more}</p>`;
}

const FEATURE_BENEFITS = {
  article: "headline and image treatment in Top Stories and Discover",
  breadcrumb: "your site hierarchy replaces the raw URL in results",
  carousel: "items can appear in a swipeable carousel",
  "course-list": "courses listed with provider and summary",
  dataset: "indexed and searchable in Google Dataset Search",
  "discussion-forum": "threads surfaced in Discussions and Forums",
  "education-qa": "flashcard-style Q&A in education results",
  "employer-rating": "star ratings shown on job listings",
  event: "date, venue, and ticket info in event experiences",
  "image-metadata": "creator and license details on image results",
  "job-posting": "listed in Google's jobs experience",
  "local-business": "hours, phone, and directions in the knowledge panel and Maps",
  "math-solver": "step-by-step solver surfaced for math queries",
  movie: "poster and details in movie carousels",
  organization: "logo and company details in the knowledge panel",
  "paywalled-content": "paywalled pages indexed without cloaking penalties",
  product: "price, availability, and ratings directly in the result",
  "profile-page": "creator name, avatar, and stats in profile results",
  "qa-page": "the question and top answer shown in results",
  recipe: "cook time, rating, and image in recipe cards",
  "review-snippet": "star ratings under the result",
  "software-app": "app rating and install info in results",
  speakable: "sections read aloud by Google Assistant",
  "vacation-rental": "rental details in travel results",
  video: "thumbnail, duration, and key moments on results",
};

function opportunityState(item) {
  if (!item.eligible) return "blocked";
  if ((item.stubbed_properties || []).length) return "tokens";
  return "ready";
}

const STATE_META = {
  ready: { badge: "Qualifies now", order: 0 },
  tokens: { badge: "Needs values", order: 1 },
  blocked: { badge: "Missing data", order: 2 },
};

function opportunityStatusLine(item, state) {
  if (state === "blocked") {
    const missing = (item.missing_required_properties || []).map(escapeHtml).join(", ");
    return `<p class="opportunity-line">Google also requires <strong>${missing}</strong>, which needs real nested content (a person, place, or media object). GRAFF leaves it out rather than invent one; edit the snippet to add it and qualify.</p>`;
  }
  if (state === "tokens") {
    const stubs = (item.stubbed_properties || []).map(escapeHtml).join(", ");
    return `<p class="opportunity-line">Meets Google's requirements once the placeholder values for <strong>${stubs}</strong> are replaced with real ones.</p>`;
  }
  return `<p class="opportunity-line">The generated markup already meets Google's requirements for this result.</p>`;
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

  // one breadcrumb story, not one card per page
  const breadcrumbs = items.filter((item) => item.feature_id === "breadcrumb");
  const rest = items.filter((item) => item.feature_id !== "breadcrumb");
  const cards = [...rest];
  if (breadcrumbs.length) {
    const allEligible = breadcrumbs.every((item) => item.eligible);
    cards.push({
      ...breadcrumbs[0],
      template_name:
        breadcrumbs.length === 1
          ? breadcrumbs[0].template_name
          : `all ${breadcrumbs.length} template pages`,
      eligible: allEligible,
    });
  }
  cards.sort((a, b) => STATE_META[opportunityState(a)].order - STATE_META[opportunityState(b)].order);

  const counts = { ready: 0, tokens: 0, blocked: 0 };
  for (const item of cards) counts[opportunityState(item)] += 1;
  const summaryParts = [];
  if (counts.ready) summaryParts.push(`${counts.ready} qualify now`);
  if (counts.tokens) summaryParts.push(`${counts.tokens} awaiting values`);
  if (counts.blocked) summaryParts.push(`${counts.blocked} missing data`);
  const summary = document.createElement("p");
  summary.className = "opportunity-summary mono";
  summary.textContent = summaryParts.join(" · ");
  container.append(summary);

  const grid = document.createElement("div");
  grid.className = "card-grid";
  container.append(grid);

  for (const item of cards) {
    const state = opportunityState(item);
    const card = document.createElement("article");
    card.className = "result-card";
    card.dataset.state = state;
    const policy = item.policy_url
      ? `<a href="${escapeAttr(item.policy_url)}" target="_blank" rel="noopener">Search Central docs</a>`
      : "";
    const benefit = FEATURE_BENEFITS[item.feature_id];
    const citations = renderPropertyCitations(item);
    card.innerHTML = `
      <div class="result-card-head">
        <h4>${escapeHtml(item.feature_name)}${item.template_name ? ` · ${escapeHtml(item.template_name)}` : ""}</h4>
        <span class="state-badge" data-state="${state}">${STATE_META[state].badge}</span>
      </div>
      ${benefit ? `<p class="opportunity-benefit">${escapeHtml(benefit)}</p>` : ""}
      ${opportunityStatusLine(item, state)}
      ${citations ? `<details class="card-docs"><summary>property documentation</summary>${citations}</details>` : ""}
      ${policy ? `<div class="result-card-links">${policy}</div>` : ""}
    `;
    grid.append(card);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const TOKEN_RE = /\{\{[A-Z0-9_]+\}\}/g;

function countTokens(text) {
  return (text.match(TOKEN_RE) || []).length;
}

function tokenMarkup(text) {
  return escapeHtml(text).replace(TOKEN_RE, '<span class="token-mark">$&</span>');
}

function caretTextOffset(pre) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (!pre.contains(range.startContainer)) return null;
  const probe = document.createRange();
  probe.selectNodeContents(pre);
  probe.setEnd(range.startContainer, range.startOffset);
  return probe.toString().length;
}

function restoreCaret(pre, offset) {
  const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node;
  let last = null;
  while ((node = walker.nextNode())) {
    last = node;
    const length = node.textContent.length;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= length;
  }
  if (last) {
    const range = document.createRange();
    range.setStart(last, last.textContent.length);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function highlightTokens(pre) {
  const text = pre.textContent || "";
  const caret = caretTextOffset(pre);
  pre.innerHTML = tokenMarkup(text);
  if (caret !== null) restoreCaret(pre, Math.min(caret, text.length));
}

function updateTokenCounts() {
  let total = 0;
  document.querySelectorAll(".snippet-block").forEach((block) => {
    const pre = block.querySelector(".jsonld-output");
    const badges = block.querySelectorAll(".token-count");
    if (!pre || !badges.length) return;
    const count = countTokens(pre.textContent || "");
    total += count;
    for (const badge of badges) {
      badge.dataset.state = count === 0 ? "done" : "todo";
      badge.textContent =
        count === 0 ? "all values filled" : `${count} value${count === 1 ? "" : "s"} to fill`;
    }
  });
  const progress = $("#token-progress");
  const pill = $("#token-total-pill");
  const hint = $("#token-total-hint");
  if (!progress || !pill || !hint) return;
  progress.hidden = false;
  pill.dataset.state = total === 0 ? "done" : "todo";
  if (total === 0) {
    pill.textContent = "0 placeholder values left";
    hint.textContent =
      "Fully customized: every snippet below carries real data and is ready to publish.";
  } else {
    pill.textContent = `${total} placeholder value${total === 1 ? "" : "s"} to fill`;
    hint.textContent =
      "Counts update as you replace {{TOKENS}} in the snippets below. Zero means fully customized structured data.";
  }
}

const MERCHANT_CHECK_LABELS = {
  present: "✓ in markup",
  stubbed: "fill the token",
  missing: "not in markup",
};

function renderMerchantReadiness(items) {
  const section = $("#section-merchant");
  const container = $("#merchant-readiness");
  if (!section || !container) return;
  if (!items || !items.length) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }
  section.hidden = false;
  container.innerHTML = items
    .map((item) => {
      const rows = item.checks
        .map(
          (check) =>
            `<div class="merchant-check" data-state="${check.status}"><span class="merchant-attr">${escapeHtml(check.attribute)}</span><code>${escapeHtml(check.property)}</code><span class="merchant-state">${MERCHANT_CHECK_LABELS[check.status] || check.status}</span></div>`,
        )
        .join("");
      const verdict = item.ready
        ? "Every crawlable attribute is present or token-stubbed — fill the tokens and this template can seed a Merchant Center feed."
        : "Attributes marked “not in markup” need real values before Merchant Center's crawl can use this template.";
      return `<article class="merchant-card"><h4>${escapeHtml(item.template_name)}</h4><p class="hint">${verdict}</p>${rows}</article>`;
    })
    .join("");
}

const TOMBSTONE_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 16.17v-9.17a3 3 0 0 1 3 -3h4a3 3 0 0 1 3 3v9.171"/><path d="M12 7v5"/><path d="M10 9h4"/><path d="M5 21v-2a3 3 0 0 1 3 -3h8a3 3 0 0 1 3 3v2h-14"/></svg>';

function renderRetiredFeatures(features) {
  const container = $("#retired-features");
  if (!container) return;
  const retired = (features || []).filter((feature) => feature.status === "retired");
  if (!retired.length) {
    const details = $("#retired-features-details");
    if (details) details.hidden = true;
    return;
  }
  retired.sort((a, b) => (b.retired_at || "").localeCompare(a.retired_at || ""));
  container.innerHTML = retired
    .map(
      (feature) =>
        `<div class="retired-feature">${TOMBSTONE_SVG}<span class="retired-name">${escapeHtml(feature.name)}</span><span class="retired-date">${escapeHtml(feature.retired_at || "")}</span><span class="retired-note">${escapeHtml(feature.note || "")}</span></div>`,
    )
    .join("");
  document.querySelectorAll(".tombstone-icon").forEach((el) => {
    el.innerHTML = TOMBSTONE_SVG;
  });
}

function renderSnippets(snippets) {
  const container = $("#scaffolds");
  if (!container) return;
  container.innerHTML = "";
  snippets.forEach((snippet, index) => {
    const block = document.createElement("details");
    block.className = "snippet-block";
    block.dataset.template = snippet.template_name;
    if (index === 0) block.open = true;
    const json = JSON.stringify(snippet.jsonld, null, 2);
    block.innerHTML = `
      <summary>
        <span class="snippet-label">${escapeHtml(snippet.label)}</span>
        <span class="hint mono">${escapeHtml(snippet.example_url)}</span>
        <span class="token-count" data-state="todo"></span>
      </summary>
      <div class="snippet-body">
        <div class="snippet-toolbar">
          <button type="button" class="secondary copy-scaffold">Copy JSON-LD</button>
          <button type="button" class="secondary restore-snippet">Restore generated</button>
          <span class="token-count" data-state="todo"></span>
          <span class="json-validity" data-valid="true">valid JSON</span>
          <span class="hint">editable: click into the block and type</span>
        </div>
        <pre class="jsonld-output" contenteditable="plaintext-only" spellcheck="false">${tokenMarkup(json)}</pre>
      </div>
    `;
    block.dataset.json = json;
    container.append(block);
  });
  const validate = (block) => {
    const pre = block.querySelector(".jsonld-output");
    const badge = block.querySelector(".json-validity");
    if (!pre || !badge) return;
    try {
      JSON.parse(pre.textContent);
      badge.dataset.valid = "true";
      badge.textContent = "valid JSON";
    } catch (error) {
      badge.dataset.valid = "false";
      badge.textContent = "invalid JSON";
    }
    updateTokenCounts();
  };
  container.querySelectorAll(".snippet-block").forEach((block) => {
    block.querySelector(".jsonld-output")?.addEventListener("input", (event) => {
      highlightTokens(event.currentTarget);
      validate(block);
    });
    block.querySelector(".copy-scaffold")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const text = block.querySelector(".jsonld-output")?.textContent || "";
      await navigator.clipboard.writeText(text);
      announce("JSON-LD copied to clipboard.");
      button.textContent = "Copied";
      setTimeout(() => {
        button.textContent = "Copy JSON-LD";
      }, 1500);
    });
    block.querySelector(".restore-snippet")?.addEventListener("click", () => {
      const pre = block.querySelector(".jsonld-output");
      if (pre) pre.innerHTML = tokenMarkup(block.dataset.json || "");
      validate(block);
      announce("Snippet restored to the generated version.");
    });
  });
  updateTokenCounts();
}

function currentSnippetText(templateName, fallback) {
  const pre = document.querySelector(
    `.snippet-block[data-template="${CSS.escape(templateName)}"] .jsonld-output`,
  );
  return pre?.textContent ?? fallback;
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

const EXPORT_PART_KEYS = ["snippets", "mermaid", "graph"];

function buildExportBundle(blueprint, parts) {
  const bundle = {
    generated_at: new Date().toISOString(),
    tool: "GRAFF (Graph Registry Attribute & Field Framework)",
    model_used: blueprint.model_used,
    model_degraded: blueprint.model_degraded,
    degradation_reason: blueprint.degradation_reason ?? null,
    delivery_summary: blueprint.delivery_summary,
  };
  if (parts.has("snippets")) {
    bundle.snippets = blueprint.scaffolds.map((snippet) => {
      const entry = {
        label: snippet.label,
        template_name: snippet.template_name,
        example_url: snippet.example_url,
        usage_note: snippet.usage_note,
      };
      const text = currentSnippetText(
        snippet.template_name,
        JSON.stringify(snippet.jsonld, null, 2),
      );
      try {
        entry.jsonld = JSON.parse(text);
      } catch (error) {
        entry.jsonld_text = text;
        entry.parse_error = "edited snippet is not valid JSON; exported as text";
      }
      return entry;
    });
  }
  if (parts.has("mermaid")) bundle.mermaid = blueprint.mermaid;
  if (parts.has("graph")) bundle.graph = blueprint.graph;
  return bundle;
}

function selectedExportParts() {
  const checked = [...document.querySelectorAll("#export-options input:checked")].map(
    (input) => input.dataset.export,
  );
  return new Set(checked);
}

function exportBlueprint(parts) {
  if (!latestBlueprint?.scaffolds?.length) return;
  if (!parts.size) {
    announce("Select at least one section to export.");
    return;
  }
  const full = parts.size === EXPORT_PART_KEYS.length;
  const name = full ? "graff-blueprint.json" : "graff-export.json";
  downloadJson(name, buildExportBundle(latestBlueprint, parts));
  announce(full ? "Full blueprint exported." : `Exported ${parts.size} section(s).`);
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
  if (blueprint.model_degraded) {
    pill.textContent =
      DEGRADATION_LABELS[blueprint.degradation_reason] ||
      "AI routing unavailable. Deterministic mapping used.";
    pill.dataset.state = "warn";
    pill.removeAttribute("hidden");
  } else {
    pill.setAttribute("hidden", "");
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

let railObserver = null;

function initSectionRail() {
  if (railObserver) return;
  const links = [...document.querySelectorAll(".section-rail a")];
  if (!links.length) return;
  const byTarget = new Map(
    links.map((link) => [link.getAttribute("href").slice(1), link]),
  );
  railObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const link = byTarget.get(entry.target.id);
        if (!link) continue;
        if (entry.isIntersecting) {
          links.forEach((item) => delete item.dataset.active);
          link.dataset.active = "true";
        }
      }
    },
    { rootMargin: "-25% 0px -65% 0px" },
  );
  for (const id of byTarget.keys()) {
    const target = document.getElementById(id);
    if (target) railObserver.observe(target);
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

  try {
    renderDiagram(blueprint);
  } catch (error) {
    const diagram = $("#diagram");
    if (diagram) {
      diagram.innerHTML =
        '<p class="hint">Could not render the graph. Open “Graph source” below to view the raw definition.</p>';
    }
  }
  renderRichResults(blueprint.rich_results || []);
  renderMerchantReadiness(blueprint.merchant_readiness || []);
  renderSnippets(blueprint.scaffolds);
  renderSchemaResources(blueprint);
  initSectionRail();
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

function updateUsagePill(stats) {
  const pill = $("#usage-stats");
  if (!pill || !stats) return;
  const visitors = stats.unique_visitors ?? 0;
  const graphs = stats.blueprints_generated ?? 0;
  const typeCount = (stats.types || []).length;
  const visitorPhrase =
    visitors === 1
      ? "1 visitor has come to GRAFF for Graphing"
      : `${visitors} visitors have come to GRAFF for Graphing`;
  pill.textContent = `⚡ ${visitorPhrase} · GRAFF graphed ${graphs} graph${graphs === 1 ? "" : "s"} · ${typeCount} schema.org type${typeCount === 1 ? "" : "s"} recorded`;
  pill.hidden = false;
  renderTypeLedger(stats);
}

function renderTypeLedger(stats) {
  const ledger = $("#type-ledger");
  const body = $("#type-ledger-body");
  if (!ledger || !body) return;
  const types = stats.types || [];
  if (!types.length) {
    ledger.hidden = true;
    return;
  }
  body.innerHTML = types
    .map(
      (entry) =>
        `<tr><td><a href="https://schema.org/${encodeURIComponent(entry.name)}" target="_blank" rel="noopener">${escapeHtml(entry.name)}</a></td><td>${entry.count}</td></tr>`,
    )
    .join("");
  ledger.hidden = false;
}

async function initStatus() {
  try {
    const [health, quota] = await Promise.all([fetchJson("/health"), fetchJson("/quota")]);
    fetchJson("/stats")
      .then(updateUsagePill)
      .catch(() => {});
    fetchJson("/features")
      .then((payload) => renderRetiredFeatures(payload.features))
      .catch(() => {});
    setPill(
      "#api-status",
      health.ok ? "Service ready" : "Service degraded",
      health.ok ? "ok" : "warn",
    );
    const versionNote = $("#registry-version");
    if (versionNote && health.registry?.schema_version) {
      versionNote.textContent = ` Currently loaded: Schema.org v${health.registry.schema_version}.`;
    }
    quotaState = {
      enforced: quota.quota_enforced !== false,
      remaining: quota.model_operations_remaining,
    };
    updateQuotaPill(quota.model_operations_remaining, quota.quota_enforced);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Service unavailable";
    setPill("#api-status", message, "error");
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
    updateUsagePill(payload.stats);
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

function syncThemeToggle() {
  const toggle = $("#theme-toggle");
  if (!toggle) return;
  const dark = document.documentElement.dataset.theme === "dark";
  toggle.textContent = dark ? "☀" : "☾";
  toggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("graff-theme", next);
  } catch (error) {
    /* private browsing: theme just won't persist */
  }
  syncThemeToggle();
  announce(`Switched to ${next} mode.`);
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
  $("#sells-online")?.addEventListener("change", syncCommerceVisibility);
  $("#site-form")?.addEventListener("input", (event) => {
    const name = event.target?.name || "";
    if (["businessCategory", "businessDescription", "templateDescription"].includes(name)) {
      maybeNudgeCommerce();
    }
  });
  $("#export-full")?.addEventListener("click", () => {
    exportBlueprint(new Set(EXPORT_PART_KEYS));
  });
  $("#export-selected")?.addEventListener("click", () => {
    exportBlueprint(selectedExportParts());
  });
  document.querySelectorAll(".section-rail a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      document
        .querySelector(link.getAttribute("href"))
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  $("#start-over")?.addEventListener("click", () => activateTab("form"));
  $("#theme-toggle")?.addEventListener("click", toggleTheme);
  $("#graph-reset")?.addEventListener("click", () => activeGraph?.reset());
  const stage = $("#graph-stage");
  const fullscreenButton = $("#graph-fullscreen");
  fullscreenButton?.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage?.requestFullscreen?.();
  });
  document.addEventListener("fullscreenchange", () => {
    if (fullscreenButton) {
      fullscreenButton.textContent = document.fullscreenElement
        ? "Exit full screen"
        : "Full screen";
    }
  });
  syncThemeToggle();
  for (const name of Object.keys(TAB_PANELS)) {
    $(`#tab-${name}`)?.addEventListener("click", () => activateTab(name));
  }
}

ensureTemplateRows();
bindEvents();
initStatus();
