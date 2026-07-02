const state = {
    categories: [],
    vendors: []
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    cache();
    bindEvents();

    await loadCategories();
    await loadVendors();

    renderCategorySections();
    updateYear();
}

function cache() {
    el.menuToggle = document.getElementById("menuToggle");
    el.mobileMenu = document.getElementById("mobileMenu");
    el.categorySections = document.getElementById("categorySections");
    el.year = document.getElementById("year");
}

function bindEvents() {
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

function renderCategorySections() {

    if (!el.categorySections) return;

    el.categorySections.innerHTML = "";

    state.categories.forEach(category => {

        const categoryVendors = state.vendors
            .filter(vendor => vendor.category === category.id)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 4);

        const vendorCards = categoryVendors
            .map(vendor => createVendorCard(vendor, true))
            .join("");

        el.categorySections.insertAdjacentHTML("beforeend", `
            <section class="category-block card section">

                <div class="category-head">

                    <div>

                        <h3>${category.name}</h3>

                    </div>

                    <a href="category.html?category=${category.id}">
                        View all
                    </a>

                </div>

                <div class="vendor-grid">

                    ${vendorCards}

                </div>

            </section>
        `);

    });

}

function createVendorCard(vendor, showCategoryTag = true) {

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

                ${showCategoryTag
                    ? `<div class="vendor-chip">${vendor.categoryName}</div>`
                    : ""
                }

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

function updateYear() {

    if (el.year) {

        el.year.textContent = new Date().getFullYear();

    }

}
