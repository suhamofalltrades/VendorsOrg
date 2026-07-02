const elements = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cache();
  bindMenu();
  await loadCategories();
  bindForm();
  document.getElementById("year").textContent = new Date().getFullYear();
}

function cache() {
  elements.menuToggle = document.getElementById("menuToggle");
  elements.mobileMenu = document.getElementById("mobileMenu");
  elements.form = document.getElementById("vendorForm");
  elements.category = document.getElementById("category");
  elements.newCategoryGroup = document.getElementById("newCategoryGroup");
  elements.photo = document.getElementById("photo");
}

function bindMenu() {
  elements.menuToggle?.addEventListener("click", () => {
    const open = elements.mobileMenu.classList.toggle("open");
    elements.menuToggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".site-header")) {
      elements.mobileMenu?.classList.remove("open");
      elements.menuToggle?.setAttribute("aria-expanded", "false");
    }
  });
}

async function loadCategories() {
  try {
    const res = await fetch("data/categories.json");
    const json = await res.json();

    const current = elements.category.value;
    elements.category.innerHTML =
      '<option value="">Choose category</option>';

    (json.categories || []).forEach(cat => {
      const option = document.createElement("option");
      option.value = cat.id;
      option.textContent = cat.name;
      elements.category.appendChild(option);
    });

    const add = document.createElement("option");
    add.value = "__new__";
    add.textContent = "+ Add New Category";
    elements.category.appendChild(add);

    elements.category.value = current;

  } catch (err) {
    console.error(err);
  }
}

function bindForm() {

  elements.category.addEventListener("change", () => {
    elements.newCategoryGroup.classList.toggle(
      "hidden",
      elements.category.value !== "__new__"
    );
  });

  elements.photo.addEventListener("change", previewImage);

  elements.form.addEventListener("reset", () => {
    setTimeout(() => {
      elements.newCategoryGroup.classList.add("hidden");
      removePreview();
    }, 0);
  });

  elements.form.addEventListener("submit", submitForm);
}

async function submitForm(e) {
  e.preventDefault();

  const days = [...document.querySelectorAll(
    'input[name="workingDays"]:checked'
  )].map(x => x.value);

  if (days.length === 0) {
    alert("Select at least one working day.");
    return;
  }

  const services = document.getElementById("services")
    .value
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  const vendor = {
    id: Date.now(),
    name: value("businessName"),
    owner: value("ownerName"),
    phone: value("phone"),
    email: value("email"),
    website: value("website"),
    maps: value("maps"),
    address: value("address"),
    description: value("description"),
    category:
      elements.category.value === "__new__"
        ? slug(value("newCategoryName"))
        : elements.category.value,
    newCategory:
      elements.category.value === "__new__"
        ? value("newCategoryName")
        : null,
    workingDays: days,
    openingTime: value("openingTime"),
    closingTime: value("closingTime"),
    rating: parseFloat(value("rating")) || 0,
    services,
    social: {
      instagram: value("instagram"),
      facebook: value("facebook")
    },
    image: elements.photo.files[0]
      ? elements.photo.files[0].name
      : "",
    logo: value("logo"),
    gallery: [],
    reviewProvider: "Google",
    categoryName: "",
    isVerified: false
  };

  try {

    const response = await fetch("/api/add-vendor", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(vendor)
    });

    const result = await response.json();

    alert(result.message);

    if (result.success) {
        elements.form.reset();
        removePreview();
    }

} catch (error) {

    console.error(error);

    alert("Unable to contact the server.");

}
}

function value(id) {
  return document.getElementById(id).value.trim();
}

function slug(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function previewImage() {

  removePreview();

  const file = elements.photo.files[0];
  if (!file) return;

  const img = document.createElement("img");
  img.id = "imagePreview";
  img.style.marginTop = "1rem";
  img.style.maxWidth = "220px";
  img.style.borderRadius = "16px";

  img.src = URL.createObjectURL(file);

  elements.photo.parentElement.appendChild(img);
}

function removePreview() {
  document.getElementById("imagePreview")?.remove();
}
