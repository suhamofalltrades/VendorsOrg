const elements = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cache();
  bindMenu();
  await loadCategories();
  bindForm();
  setYear();
}

function cache() {
  elements.menuToggle = document.getElementById("menuToggle");
  elements.mobileMenu = document.getElementById("mobileMenu");
  elements.form = document.getElementById("vendorForm");
  elements.category = document.getElementById("category");
  elements.newCategoryGroup = document.getElementById("newCategoryGroup");
  elements.newCategoryName = document.getElementById("newCategoryName");
  elements.photo = document.getElementById("photo");
  elements.year = document.getElementById("year");
}

function bindMenu() {
  elements.menuToggle?.addEventListener("click", () => {
    const open = elements.mobileMenu.classList.toggle("open");
    elements.menuToggle.setAttribute("aria-expanded", String(open));
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".site-header")) {
      elements.mobileMenu?.classList.remove("open");
      elements.menuToggle?.setAttribute("aria-expanded", "false");
    }
  });
}

async function loadCategories() {
  try {
    const response = await fetch("data/categories.json");
    if (!response.ok) {
      throw new Error("Unable to load categories.");
    }

    const data = await response.json();
    renderExistingCategories(data.categories || []);
    const currentValue = elements.category.value;

    elements.category.innerHTML = '<option value="">Choose category</option>';

    (data.categories || []).forEach((category) => {
      const option = document.createElement("option");
      option.value = category.id;
      option.textContent = category.name;
      elements.category.appendChild(option);
    });

    const newOption = document.createElement("option");
    newOption.value = "__new__";
    newOption.textContent = "+ Add New Category";
    elements.category.appendChild(newOption);

    if (currentValue) {
      elements.category.value = currentValue;
    }
  } catch (error) {
    console.error(error);
    showMessage("Could not load categories.", "error");
  }
}

function bindForm() {
  elements.category.addEventListener("change", () => {
    const isNewCategory = elements.category.value === "__new__";
    elements.newCategoryGroup.classList.toggle("hidden", !isNewCategory);

    if (!isNewCategory) {
      elements.newCategoryName.value = "";
    }
  });

  elements.photo.addEventListener("change", previewImage);

  elements.form.addEventListener("reset", () => {
    setTimeout(() => {
      elements.newCategoryGroup.classList.add("hidden");
      elements.newCategoryName.value = "";
      removePreview();
    }, 0);
  });

  elements.form.addEventListener("submit", submitForm);
}

async function submitForm(event) {
  event.preventDefault();

  const validation = validateForm();
  if (!validation.ok) {
    showMessage(validation.message, "error");
    return;
  }

  const services = getMultiLineValue("services");
  const workingDays = [...document.querySelectorAll('input[name="workingDays"]:checked')].map((input) => input.value);
  const photoFile = elements.photo.files?.[0] || null;

  const vendor = {
    name: getValue("businessName"),
    owner: getValue("ownerName"),
    phone: getValue("phone"),
    email: getValue("email"),
    website: getValue("website"),
    maps: getValue("maps"),
    address: getValue("address"),
    description: getValue("description"),
    category: elements.category.value,
    newCategory: elements.category.value === "__new__" ? getValue("newCategoryName") : "",
    workingDays,
    openingTime: getValue("openingTime"),
    closingTime: getValue("closingTime"),
    rating: Number.parseFloat(getValue("rating")) || 0,
    services,
    social: {
      instagram: getValue("instagram"),
      facebook: getValue("facebook")
    },
    reviewProvider: "Google",
    isVerified: false,
    imageName: photoFile ? photoFile.name : "",
    logo: getValue("logo"),
    gallery: []
  };

  const formData = new FormData();
  formData.append("vendor", JSON.stringify(vendor));
  if (photoFile) {
    formData.append("image", photoFile);
  }

  try {
    const submitButton = elements.form.querySelector('button[type="submit"]');
    setLoadingState(submitButton, true);

    const response = await fetch("/api/add-vendor", {
      method: "POST",
      body: formData
    });

    const result = await response.json().catch(() => ({
      success: false,
      message: "Invalid server response."
    }));

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to add vendor.");
    }

    showMessage(result.message || "Vendor added successfully.", "success");
    elements.form.reset();
    removePreview();
    await loadCategories();
  } catch (error) {
    console.error(error);
    showMessage(error.message || "Unable to contact the server.", "error");
  } finally {
    const submitButton = elements.form.querySelector('button[type="submit"]');
    setLoadingState(submitButton, false);
  }
}

function validateForm() {
  const requiredFields = [
    ["businessName", "Business name is required."],
    ["ownerName", "Owner name is required."],
    ["phone", "Phone number is required."],
    ["address", "Address is required."],
    ["description", "Description is required."],
    ["openingTime", "Opening time is required."],
    ["closingTime", "Closing time is required."]
  ];

  for (const [id, message] of requiredFields) {
    if (!getValue(id)) {
      return { ok: false, message };
    }
  }

  const workingDays = document.querySelectorAll('input[name="workingDays"]:checked');
  if (!workingDays.length) {
    return { ok: false, message: "Select at least one working day." };
  }

  if (!elements.category.value) {
    return { ok: false, message: "Select a category." };
  }

  if (elements.category.value === "__new__" && !getValue("newCategoryName")) {
    return { ok: false, message: "Enter a new category name." };
  }

  if (!elements.photo.files?.length) {
    return { ok: false, message: "Select a photo for the vendor." };
  }

  return { ok: true };
}

function getValue(id) {
  return document.getElementById(id)?.value.trim() || "";
}

function getMultiLineValue(id) {
  return getValue(id)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function previewImage() {
  removePreview();

  const file = elements.photo.files?.[0];
  if (!file) return;

  const img = document.createElement("img");
  img.id = "imagePreview";
  img.alt = "Selected vendor photo preview";
  img.style.marginTop = "1rem";
  img.style.maxWidth = "220px";
  img.style.width = "100%";
  img.style.borderRadius = "16px";
  img.style.border = "1px solid rgba(177, 18, 38, 0.18)";
  img.style.boxShadow = "0 10px 25px rgba(58, 31, 31, 0.08)";
  img.src = URL.createObjectURL(file);

  elements.photo.parentElement.appendChild(img);
}

function removePreview() {
  document.getElementById("imagePreview")?.remove();
}

function setLoadingState(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "Adding..." : "Add vendor";
}

function showMessage(message, type = "success") {
  const existing = document.getElementById("adminMessage");
  existing?.remove();

  const box = document.createElement("div");
  box.id = "adminMessage";
  box.className = `admin-message ${type}`;
  box.textContent = message;

  elements.form.prepend(box);

  window.setTimeout(() => {
    box.remove();
  }, 5000);
}

function setYear() {
  if (elements.year) {
    elements.year.textContent = new Date().getFullYear();
  }
}

function renderExistingCategories(categories) {
    const container = document.getElementById("existingCategories");

    if (!container) return;

    container.innerHTML = categories
        .map(category => `
            <div class="badge">
                ${category.name}
            </div>
        `)
        .join("");
}
