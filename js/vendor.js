const params = new URLSearchParams(window.location.search);
const vendorId = params.get("vendor");

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    cacheElements();
    bindEvents();

    if (!vendorId) {
        renderError("Vendor not specified.");
        return;
    }

    try {
        const data = await fetch("data/vendors.json");
        const json = await data.json();

        const vendor = json.vendors.find(
            v => String(v.id) === String(vendorId)
        );

        if (!vendor) {
            renderError("Vendor not found.");
            return;
        }

        renderVendor(vendor);

    } catch (error) {
        console.error(error);
        renderError("Unable to load vendor.");
    }

    if (el.year) {
        el.year.textContent = new Date().getFullYear();
    }
}

function cacheElements() {

    el.menuToggle = document.getElementById("menuToggle");
    el.mobileMenu = document.getElementById("mobileMenu");

    el.breadcrumb = document.getElementById("vendorBreadcrumb");

    el.name = document.getElementById("vendorName");
    el.owner = document.getElementById("vendorOwner");
    el.rating = document.getElementById("vendorRating");
    el.category = document.getElementById("vendorCategory");
    el.provider = document.getElementById("vendorProvider");
    el.address = document.getElementById("vendorAddress");
    el.description = document.getElementById("vendorDescription");

    el.image = document.getElementById("vendorImage");
    el.logo = document.getElementById("vendorLogo");

    el.services = document.getElementById("vendorServices");
    el.hours = document.getElementById("vendorHours");
    el.gallery = document.getElementById("vendorGallery");

    el.contact = document.getElementById("vendorContact");
    el.reviewSummary = document.getElementById("vendorReviewSummary");
    el.social = document.getElementById("vendorSocial");

    el.year = document.getElementById("year");
}

function bindEvents() {

    el.menuToggle?.addEventListener("click", () => {

        const open = el.mobileMenu.classList.toggle("open");

        el.menuToggle.setAttribute(
            "aria-expanded",
            String(open)
        );

    });

    document.addEventListener("click", (event) => {

        if (!event.target.closest(".site-header")) {

            el.mobileMenu?.classList.remove("open");

            el.menuToggle?.setAttribute(
                "aria-expanded",
                "false"
            );

        }

    });

}

function renderVendor(vendor) {

    document.title = `${vendor.name} | VendorsOrg`;

    el.breadcrumb.textContent = vendor.categoryName;

    el.name.textContent = vendor.name;

    el.owner.textContent = vendor.owner;

    el.rating.textContent =
        `★ ${vendor.rating.toFixed(1)} / 5`;

    el.category.textContent =
        vendor.categoryName;

    el.provider.textContent =
        vendor.reviewProvider;

    el.address.textContent =
        vendor.address;

    el.description.textContent =
        vendor.description;

    el.image.src = vendor.image;
    el.image.alt = vendor.name;

    el.logo.src = vendor.logo;
    el.logo.alt = vendor.name;

    renderServices(vendor);

    renderWorkingHours(vendor);

    renderGallery(vendor);

    renderContact(vendor);

    renderSocial(vendor);

    el.reviewSummary.textContent =
        `${vendor.reviewProvider} Rating: ${vendor.rating.toFixed(1)} / 5`;

}

function renderServices(vendor) {

    if (!vendor.services) {

        el.services.innerHTML = "";

        return;

    }

    el.services.innerHTML =
        vendor.services.map(service =>

            `<span class="badge">${service}</span>`

        ).join("");

}

function renderWorkingHours(vendor) {

    if (!vendor.workingDays) {

        el.hours.innerHTML = "";

        return;

    }

    el.hours.innerHTML = `
        <li>
            <span>${vendor.workingDays.join(", ")}</span>

            <strong>
                ${vendor.openingTime}
                -
                ${vendor.closingTime}
            </strong>
        </li>
    `;

}

function renderGallery(vendor) {

    if (!vendor.gallery) {

        el.gallery.innerHTML = "";

        return;

    }

    el.gallery.innerHTML =
        vendor.gallery.map(image =>

            `<img
                src="${image}"
                alt="${vendor.name}"
                loading="lazy"
            >`

        ).join("");

}

function renderContact(vendor) {

    el.contact.innerHTML = `

        <div class="stack">

            <div>

                <strong>Phone</strong>

                <div>

                    <a href="tel:${vendor.phone}">
                        ${vendor.phone}
                    </a>

                </div>

            </div>

            ${vendor.email ? `

            <div>

                <strong>Email</strong>

                <div>

                    <a href="mailto:${vendor.email}">
                        ${vendor.email}
                    </a>

                </div>

            </div>

            ` : ""}

            ${vendor.website ? `

            <div>

                <strong>Website</strong>

                <div>

                    <a
                        href="${vendor.website}"
                        target="_blank"
                    >
                        ${vendor.website}
                    </a>

                </div>

            </div>

            ` : ""}

            ${vendor.maps ? `

            <div>

                <strong>Google Maps</strong>

                <div>

                    <a
                        href="${vendor.maps}"
                        target="_blank"
                    >
                        Open Location
                    </a>

                </div>

            </div>

            ` : ""}

        </div>

    `;

}

function renderSocial(vendor) {

    if (!vendor.social) {

        el.social.innerHTML = "";

        return;

    }

    el.social.innerHTML = `

        ${vendor.social.instagram ?

        `<a
            class="btn secondary"
            href="${vendor.social.instagram}"
            target="_blank"
        >
            Instagram
        </a>`

        : ""}

        ${vendor.social.facebook ?

        `<a
            class="btn secondary"
            href="${vendor.social.facebook}"
            target="_blank"
        >
            Facebook
        </a>`

        : ""}

    `;

}

function renderError(message) {

    document.querySelector("main").innerHTML = `

        <div class="container section">

            <div class="empty">

                ${message}

            </div>

        </div>

    `;

}
