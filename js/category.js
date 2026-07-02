const params = new URLSearchParams(window.location.search);
const categoryId = params.get("category");

const state = {
    categories: [],
    vendors: []
};

const el = {};

document.addEventListener("DOMContentLoaded", initCategory);

async function initCategory() {

    cache();

    bindMobileMenu();

    if (!categoryId) {
        renderError("Category not specified.");
        return;
    }

    await loadCategories();
    await loadVendors();

    renderCategory();

    if (el.year) {
        el.year.textContent = new Date().getFullYear();
    }

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

        el.menuToggle.setAttribute("aria-expanded", open);

    });

    document.addEventListener("click", (event) => {

        if (!event.target.closest(".site-header")) {

            el.mobileMenu?.classList.remove("open");

            el.menuToggle?.setAttribute("aria-expanded", "false");

        }

    });

}

async function loadCategories() {

    const response = await fetch("data/categories.json");

    const json = await response.json();

    state.categories = json.categories || [];

}

async function loadVendors() {

    const response = await fetch("data/vendors.json");

    const json = await response.json();

    state.vendors = json.vendors || [];

}

function renderCategory() {

    const category = state.categories.find(c => c.id === categoryId);

    if (!category) {

        renderError("Category not found.");

        return;

    }

    const vendors = state.vendors

        .filter(v => v.category === categoryId)

        .sort((a, b) => b.rating - a.rating);

    el.title.textContent = category.name;

    el.subtitle.textContent =
        "Businesses are sorted by highest rating.";

    el.count.textContent =
        `${vendors.length} businesses`;

    el.breadcrumb.textContent =
        category.name;

    el.grid.innerHTML = vendors
        .map(createVendorCard)
        .join("");

}

function createVendorCard(vendor) {

    return `

    <a class="vendor-card"

       href="vendor.html?vendor=${vendor.id}"

       aria-label="${vendor.name}">

        <div class="vendor-card-inner">

            <div>

                <h4>${vendor.name}</h4>

                <div class="vendor-owner">

                    ${vendor.owner}

                </div>

                <div class="vendor-rating">

                    ★ ${vendor.rating.toFixed(1)} / 5

                </div>

                <div class="vendor-meta">

                    ${vendor.address}

                </div>

            </div>

            <img

                class="vendor-avatar"

                src="${vendor.image}"

                alt="${vendor.name}"

                loading="lazy"

            >

        </div>

    </a>

    `;

}

function renderError(message) {

    el.title.textContent = "Category";

    el.subtitle.textContent = message;

    el.grid.innerHTML =

        `<div class="empty">${message}</div>`;

}
