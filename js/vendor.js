const params = new URLSearchParams(location.search);
const vendorId = params.get("vendor");
const el = {};

document.addEventListener("DOMContentLoaded", initVendor);

async function initVendor() {
  cache();
  bindMobileMenu();
  if (!vendorId) return renderError("Vendor not specified.");
  const index = await fetchJson("data/vendors-index.json");
  const found = (index.vendors || []).find(v => v.id === vendorId);
  if (!found) return renderError("Vendor not found.");
  const vendor = await fetchJson(found.path);
  renderVendor(vendor);
  el.year.textContent = new Date().getFullYear();
}

function cache() {
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
  el.phoneLink = document.getElementById("vendorPhoneLink");
  el.whatsAppLink = document.getElementById("vendorWhatsAppLink");
  el.reviewSummary = document.getElementById("vendorReviewSummary");
  el.social = document.getElementById("vendorSocial");
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

function renderVendor(v) {
  document.title = `${v.name} — VendorsOrg`;
  el.breadcrumb.textContent = v.categoryTag;
  el.name.textContent = v.name;
  el.owner.textContent = v.owner;
  el.rating.textContent = `${v.rating.toFixed(1)} / 5`;
  el.category.textContent = v.categoryTag;
  el.provider.textContent = v.reviewProvider;
  el.address.textContent = v.address;
  el.description.textContent = v.description;
  el.image.src = v.image;
  el.image.alt = v.name;
  el.logo.src = v.logo;
  el.logo.alt = v.name;
  el.services.innerHTML = v.services.map(item => `<span class="badge">${item}</span>`).join("");
  el.hours.innerHTML = `
    <li><span>Mon–Sat</span><strong>9:00 AM – 8:00 PM</strong></li>
    <li><span>Sunday</span><strong>10:00 AM – 2:00 PM</strong></li>
  `;
  el.gallery.innerHTML = v.gallery.map(img => `<img src="${img}" alt="${v.name}" loading="lazy">`).join("");
  el.contact.innerHTML = `
    <div class="stack">
      <div><strong>Phone</strong><div><a href="tel:${v.phone}">${v.phone}</a></div></div>
      <div><strong>Email</strong><div><a href="mailto:${v.email}">${v.email}</a></div></div>
      <div><strong>Website</strong><div><a href="${v.website}" target="_blank" rel="noreferrer">${v.website}</a></div></div>
      <div class="detail-actions">
        <a class="btn" href="tel:${v.phone}">Call now</a>
        <a class="btn secondary" href="https://wa.me/${String(v.phone).replace(/\D/g,'')}" target="_blank" rel="noreferrer">WhatsApp</a>
      </div>
    </div>
  `;
  el.reviewSummary.textContent = `${v.reviewProvider} rating: ${v.rating.toFixed(1)} / 5`;
  if (el.phoneLink) el.phoneLink.href = `tel:${v.phone}`;
  if (el.whatsAppLink) el.whatsAppLink.href = `https://wa.me/${String(v.phone).replace(/\\D/g,'')}`;
  el.social.innerHTML = `
    <a class="btn secondary" href="${v.social.instagram}" target="_blank" rel="noreferrer">Instagram</a>
    <a class="btn secondary" href="${v.social.facebook}" target="_blank" rel="noreferrer">Facebook</a>
  `;
}

function renderError(message) {
  document.querySelector("main").innerHTML = `<div class="container section"><div class="empty">${message}</div></div>`;
}

async function fetchJson(path) {
  const res = await fetch(path);
  return await res.json();
}