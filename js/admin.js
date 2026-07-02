import { Octokit } from "@octokit/rest";

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN;

const octokit = new Octokit({ auth: TOKEN });

const VENDORS_PATH = "data/vendors.json";
const CATEGORIES_PATH = "data/categories.json";

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  if (!OWNER || !REPO || !TOKEN) {
    return res.status(500).json({
      success: false,
      message: "Missing GitHub environment variables.",
    });
  }

  try {
    const body = parseBody(req);

    const vendorInput = normalizeVendorInput(body);
    validateVendorInput(vendorInput);

    const categoriesState = await readJsonFile(CATEGORIES_PATH, { categories: [] });
    const vendorsState = await readJsonFile(VENDORS_PATH, { vendors: [] });

    const categoryResult = resolveCategory(categoriesState, vendorInput);
    const vendorId = generateVendorId(vendorsState.vendors || []);

    const newVendor = {
      id: vendorId,
      name: vendorInput.name,
      owner: vendorInput.owner,
      phone: vendorInput.phone,
      email: vendorInput.email || "",
      website: vendorInput.website || "",
      maps: vendorInput.maps,
      address: vendorInput.address,
      description: vendorInput.description,
      category: categoryResult.categoryId,
      categoryName: categoryResult.categoryName,
      workingDays: vendorInput.workingDays,
      openingTime: vendorInput.openingTime,
      closingTime: vendorInput.closingTime,
      rating: Number.isFinite(vendorInput.rating) ? vendorInput.rating : 0,
      services: vendorInput.services,
      social: {
        instagram: vendorInput.instagram || "",
        facebook: vendorInput.facebook || "",
      },
      image: vendorInput.image || "",
      logo: vendorInput.logo || "",
      gallery: Array.isArray(vendorInput.gallery) ? vendorInput.gallery : [],
      reviewProvider: vendorInput.reviewProvider || "Google",
      isVerified: Boolean(vendorInput.isVerified ?? false),
      createdAt: new Date().toISOString(),
    };

    const vendors = Array.isArray(vendorsState.vendors) ? vendorsState.vendors : [];
    vendors.push(newVendor);

    await writeJsonFile(
      VENDORS_PATH,
      { vendors },
      `Add vendor: ${newVendor.name}`,
      vendorsState.sha
    );

    if (categoryResult.createdCategory) {
      const categories = Array.isArray(categoriesState.categories) ? categoriesState.categories : [];
      categories.push({
        id: categoryResult.categoryId,
        name: categoryResult.categoryName,
      });

      await writeJsonFile(
        CATEGORIES_PATH,
        { categories },
        `Add category: ${categoryResult.categoryName}`,
        categoriesState.sha
      );
    }

    return res.status(200).json({
      success: true,
      message: "Vendor added successfully.",
      vendor: newVendor,
      categoryAdded: Boolean(categoryResult.createdCategory),
    });
  } catch (error) {
    console.error("add-vendor error:", error);

    const message =
      error instanceof Error ? error.message : "Unable to add vendor.";

    return res.status(400).json({
      success: false,
      message,
    });
  }
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      throw new Error("Invalid JSON body.");
    }
  }
  return req.body;
}

function normalizeVendorInput(body) {
  const workingDays = Array.isArray(body.workingDays) ? body.workingDays : [];
  const services = Array.isArray(body.services)
    ? body.services
    : typeof body.services === "string"
      ? body.services
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  return {
    name: cleanText(body.name),
    owner: cleanText(body.owner),
    phone: cleanText(body.phone),
    email: cleanText(body.email),
    website: cleanText(body.website),
    maps: cleanText(body.maps),
    address: cleanText(body.address),
    description: cleanText(body.description),
    category: cleanText(body.category),
    newCategory: cleanText(body.newCategory),
    workingDays: workingDays.map(cleanText).filter(Boolean),
    openingTime: cleanText(body.openingTime),
    closingTime: cleanText(body.closingTime),
    rating: body.rating === "" || body.rating == null ? 0 : Number(body.rating),
    services: services.map(cleanText).filter(Boolean),
    social: body.social && typeof body.social === "object" ? body.social : {},
    instagram: cleanText(body.instagram),
    facebook: cleanText(body.facebook),
    image: cleanText(body.image),
    logo: cleanText(body.logo),
    gallery: Array.isArray(body.gallery) ? body.gallery.map(cleanText).filter(Boolean) : [],
    reviewProvider: cleanText(body.reviewProvider) || "Google",
    isVerified: Boolean(body.isVerified),
  };
}

function validateVendorInput(vendor) {
  const required = [
    ["name", "Business name is required."],
    ["owner", "Owner name is required."],
    ["phone", "Phone number is required."],
    ["maps", "Google Maps link is required."],
    ["address", "Address is required."],
    ["description", "Description is required."],
    ["openingTime", "Opening time is required."],
    ["closingTime", "Closing time is required."],
  ];

  for (const [field, message] of required) {
    if (!vendor[field]) {
      throw new Error(message);
    }
  }

  if (!vendor.workingDays.length) {
    throw new Error("Select at least one working day.");
  }

  if (!vendor.category && !vendor.newCategory) {
    throw new Error("Select a category or add a new one.");
  }

  if (Number.isNaN(vendor.rating)) {
    vendor.rating = 0;
  }
}

function resolveCategory(categoriesState, vendorInput) {
  const categories = Array.isArray(categoriesState.categories)
    ? categoriesState.categories
    : [];

  const existing = categories.find(
    (item) => item.id === vendorInput.category
  );

  if (existing) {
    return {
      categoryId: existing.id,
      categoryName: existing.name,
      createdCategory: false,
    };
  }

  if (!vendorInput.newCategory && vendorInput.category) {
    const fallbackName =
      prettifyLabel(vendorInput.category);

    return {
      categoryId: vendorInput.category,
      categoryName: fallbackName,
      createdCategory: false,
    };
  }

  const categoryName = vendorInput.newCategory || prettifyLabel(vendorInput.category);

  return {
    categoryId: slugify(categoryName || vendorInput.category),
    categoryName,
    createdCategory: !existing,
  };
}

async function readJsonFile(path, fallbackValue) {
  try {
    const response = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: BRANCH,
    });

    const data = Array.isArray(response.data) ? null : response.data;

    if (!data || !("content" in data)) {
      return { ...fallbackValue, sha: null };
    }

    const content = Buffer.from(data.content, data.encoding || "base64").toString("utf8");
    const parsed = safeParseJson(content, fallbackValue);

    return {
      ...parsed,
      sha: data.sha,
    };
  } catch (error) {
    if (error?.status === 404) {
      return { ...fallbackValue, sha: null };
    }

    throw error;
  }
}

async function writeJsonFile(path, payload, message, sha) {
  const content = JSON.stringify(payload, null, 2);
  const encoded = Buffer.from(content, "utf8").toString("base64");

  const request = {
    owner: OWNER,
    repo: REPO,
    path,
    message,
    content: encoded,
    branch: BRANCH,
  };

  if (sha) {
    request.sha = sha;
  }

  await octokit.repos.createOrUpdateFileContents(request);
}

function safeParseJson(text, fallbackValue) {
  try {
    return JSON.parse(text);
  } catch {
    return fallbackValue;
  }
}

function generateVendorId(vendors) {
  const existing = new Set(
    vendors.map((vendor) => String(vendor.id))
  );

  let id = Date.now();

  while (existing.has(String(id))) {
    id += 1;
  }

  return id;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prettifyLabel(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}
