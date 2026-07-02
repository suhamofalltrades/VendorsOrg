const params = new URLSearchParams(location.search);
const categoryId = params.get("category");
const el = {};

document.addEventListener("DOMContentLoaded", initCategory);

async function initCategory() {
  cache();
  bindMobileMenu();
  if (!categoryId) return renderError("Category not specified.");
  const category = await fetchJson(`data/${categoryId}.json`);
  if (!category) return renderError("Category not found.");
  renderCategory(category);
  el.year.textContent = new Date().getFullYear();
}

function cache() {
  el.menuToggle = document.getElementById("menuToggle");
  el.mobileMenu = document.getElementById("mobileMenu");
  el.title = document.getElementById("categoryTitle");
  el.subtitle = document.getElementById("categorySubtitle");
  el.count = document.getElementById("categoryCount");
  el.grid = document.getElementById("categoryVendorGrid");
  el.breadcrumb = document.getElementById("breadcrumb");
  el.year = document.getElementById("year");
}

function bindMobileMenu() {
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

function renderCategory(category) {
  el.title.textContent = category.name;
  el.subtitle.textContent = "Sorted by rank. Cards show business name, owner, rating, and provider.";
  el.count.textContent = `${category.businessCount} businesses`;
  el.breadcrumb.textContent = category.name;
  el.grid.innerHTML = (category.vendors || [])
    .sort((a,b) => a.rank - b.rank)
    .map(v => `
      <a class="vendor-card" href="vendor.html?vendor=${v.id}" aria-label="Open ${v.name}">
        <div class="vendor-card-inner">
          <div>
            <h4>${v.name}</h4>
            <div class="vendor-owner">${v.owner}</div>
            <div class="vendor-rating">${v.reviewProvider} • ${v.rating.toFixed(1)} / 5</div>
            <div class="vendor-meta">${v.address}</div>
          </div>
          <img class="vendor-avatar" src="${v.image}" alt="${v.name}" loading="lazy">
        </div>
      </a>
    `).join("");
}

function renderError(message) {
  el.title.textContent = "Category";
  el.subtitle.textContent = message;
  el.grid.innerHTML = `<div class="empty">${message}</div>`;
}

async function fetchJson(path) {
  const res = await fetch(path);
  return await res.json();
}