const state = { categories: [] };
const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cache();
  bindEvents();
  await loadCategories();
  renderCategorySections();
  updateYear();
}

function cache() {
  el.menuToggle = document.getElementById("menuToggle");
  el.mobileMenu = document.getElementById("mobileMenu");
  el.categorySections = document.getElementById("categorySections");
  el.categoryPageLinks = document.getElementById("categoryPageLinks");
  el.year = document.getElementById("year");
  el.homeCount = document.getElementById("homeCount");
  el.aboutCount = document.getElementById("aboutCount");
  el.vendorCount = document.getElementById("vendorCount");
}

function bindEvents() {
  el.menuToggle?.addEventListener("click", () => {
    const open = el.mobileMenu.classList.toggle("open");
    el.menuToggle.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", e => {
    if (!e.target.closest(".site-header")) {
      el.mobileMenu?.classList.remove("open");
      el.menuToggle?.setAttribute("aria-expanded", "false");
    }
  });
}

async function loadCategories() {
  const res = await fetch("data/categories.json");
  const json = await res.json();
  state.categories = json.categories || [];
  renderCategoryNavLinks();
}

function renderCategoryNavLinks() {
  if (!el.categoryPageLinks) return;
  el.categoryPageLinks.innerHTML = `
    <li><a href="#home">Home</a></li>
    <li><a href="#about">About</a></li>
    <li><a href="#categories">Categories</a></li>
    <li><a href="#vendor-cta">Become a vendor</a></li>
    <li><a href="#contact">Contact</a></li>
  `;
}

async function renderCategorySections() {
  if (!el.categorySections) return;
  const sections = [];
  for (const category of state.categories) {
    const data = await fetchJson(category.path);
    const vendors = (data.vendors || []).slice(0, 4);
    sections.push(`
      <section class="category-block card section" id="${category.id}">
        <div class="category-head">
          <div>
            <h3>${category.name}</h3>
            <div class="small">${category.description}</div>
          </div>
          <a href="category.html?category=${category.id}">View all</a>
        </div>
        <div class="vendor-grid">
          ${vendors.map(v => vendorCardHtml(v, true)).join("")}
        </div>
      </section>
    `);
  }
  el.categorySections.innerHTML = sections.join("");
  el.homeCount.textContent = `${state.categories.length} categories`;
  el.aboutCount.textContent = "Static JSON architecture";
  el.vendorCount.textContent = "30 example vendors";
}

function vendorCardHtml(vendor, withTag) {
  return `
    <a class="vendor-card" href="vendor.html?vendor=${vendor.id}" aria-label="Open ${vendor.name}">
      <div class="vendor-card-inner">
        <div>
          <h4>${vendor.name}</h4>
          <div class="vendor-owner">${vendor.owner}</div>
          <div class="vendor-rating">${vendor.reviewProvider} • ${vendor.rating.toFixed(1)} / 5</div>
          <div class="vendor-meta">${vendor.address}</div>
          ${withTag ? `<div class="vendor-chip">${vendor.categoryTag}</div>` : ""}
        </div>
        <img class="vendor-avatar" src="${vendor.image}" alt="${vendor.name}" loading="lazy">
      </div>
    </a>
  `;
}

function updateYear() {
  if (el.year) el.year.textContent = new Date().getFullYear();
}

async function fetchJson(path) {
  const res = await fetch(path);
  return await res.json();
}