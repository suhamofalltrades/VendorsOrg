import { Octokit } from "@octokit/rest";
import formidable from "formidable";
import mimeTypes from "mime-types";
import { readFile } from "node:fs/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || "main";
const TOKEN = process.env.GITHUB_TOKEN;

const octokit = TOKEN ? new Octokit({ auth: TOKEN }) : null;

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

  if (!OWNER || !REPO || !TOKEN || !octokit) {
    return res.status(500).json({
      success: false,
      message: "Missing GitHub environment variables.",
    });
  }

  try {
    const { fields, files } = await parseMultipartForm(req);
    const vendorInput = parseVendorInput(fields.vendor);
    const imageFile = getSingleFile(files.image);

    validateVendorInput(vendorInput, imageFile);

    const categoriesState = await readJsonFile(CATEGORIES_PATH, { categories: [] });
    const vendorsState = await readJsonFile(VENDORS_PATH, { vendors: [] });

    const categoryResult = resolveCategory(categoriesState.categories || [], vendorInput);
    const vendorId = generateVendorId(vendorsState.vendors || []);

    const imagePath = await uploadImage({
      file: imageFile,
      categoryId: categoryResult.categoryId,
      vendorName: vendorInput.name,
      vendorId,
    });

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
      reviewProvider: vendorInput.reviewProvider || "Google",
      isVerified: Boolean(vendorInput.isVerified ?? false),
      image: imagePath,
      logo: vendorInput.logo || imagePath,
      gallery: [imagePath],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      categoryAdded: categoryResult.createdCategory,
      imagePath,
    });
  } catch (error) {
    console.error("add-vendor error:", error);

    return res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unable to add vendor.",
    });
  }
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function parseMultipartForm(req) {
  const form = formidable({
    multiples: false,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
    filename: (name, ext, part) => {
      const original = part.originalFilename || "upload";
      return `${Date.now()}-${sanitizeFileName(original)}${ext || ""}`;
    },
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

function parseVendorInput(rawVendor) {
  const vendorString = getFormValue(rawVendor);

  if (!vendorString) {
    throw new Error("Missing vendor data.");
  }

  let parsed;
  try {
    parsed = JSON.parse(vendorString);
  } catch {
    throw new Error("Invalid vendor JSON.");
  }

  const services = Array.isArray(parsed.services)
    ? parsed.services
    : typeof parsed.services === "string"
      ? parsed.services.split("\n").map(cleanText).filter(Boolean)
      : [];

  const workingDays = Array.isArray(parsed.workingDays)
    ? parsed.workingDays.map(cleanText).filter(Boolean)
    : [];

  return {
    name: cleanText(parsed.name),
    owner: cleanText(parsed.owner),
    phone: cleanText(parsed.phone),
    email: cleanText(parsed.email),
    website: cleanText(parsed.website),
    maps: cleanText(parsed.maps),
    address: cleanText(parsed.address),
    description: cleanText(parsed.description),
    category: cleanText(parsed.category),
    newCategory: cleanText(parsed.newCategory),
    workingDays,
    openingTime: cleanText(parsed.openingTime),
    closingTime: cleanText(parsed.closingTime),
    rating: parsed.rating === "" || parsed.rating == null ? 0 : Number(parsed.rating),
    services,
    social: parsed.social && typeof parsed.social === "object" ? parsed.social : {},
    instagram: cleanText(parsed.social?.instagram ?? parsed.instagram),
    facebook: cleanText(parsed.social?.facebook ?? parsed.facebook),
    reviewProvider: cleanText(parsed.reviewProvider) || "Google",
    isVerified: Boolean(parsed.isVerified),
    logo: cleanText(parsed.logo),
  };
}

function validateVendorInput(vendor, imageFile) {
  const requiredFields = [
    ["name", "Business name is required."],
    ["owner", "Owner name is required."],
    ["phone", "Phone number is required."],
    ["maps", "Google Maps link is required."],
    ["address", "Address is required."],
    ["description", "Description is required."],
    ["openingTime", "Opening time is required."],
    ["closingTime", "Closing time is required."],
  ];

  for (const [field, message] of requiredFields) {
    if (!vendor[field]) throw new Error(message);
  }

  if (!vendor.workingDays.length) {
    throw new Error("Select at least one working day.");
  }

  const wantsNewCategory = vendor.category === "__new__";
  if (!vendor.category && !wantsNewCategory) {
    throw new Error("Select a category.");
  }

  if (wantsNewCategory && !vendor.newCategory) {
    throw new Error("Enter a new category name.");
  }

  if (!imageFile) {
    throw new Error("Select a photo for the vendor.");
  }

  if (Number.isNaN(vendor.rating)) {
    vendor.rating = 0;
  }
}

function resolveCategory(categories, vendorInput) {
  if (vendorInput.category === "__new__") {
    const categoryName = prettifyLabel(vendorInput.newCategory);
    return {
      categoryId: slugify(categoryName),
      categoryName,
      createdCategory: true,
    };
  }

  const existing = categories.find((cat) => String(cat.id) === String(vendorInput.category));
  if (!existing) {
    throw new Error("Selected category is not valid.");
  }

  return {
    categoryId: existing.id,
    categoryName: existing.name,
    createdCategory: false,
  };
}

async function uploadImage({ file, categoryId, vendorName, vendorId }) {
  const filePath = getFilePath(file);
  const buffer = await readFile(filePath);

  const original = file.originalFilename || "image";
  const extFromName = getFileExtension(original);
  const extFromMime = getMimeExtension(file.mimetype);
  const ext = extFromName || extFromMime || "jpg";

  const baseName = `${slugify(vendorName)}-${vendorId}`;
  const path = `assets/vendors/${categoryId}/${baseName}.${ext}`;

  await octokit.repos.createOrUpdateFileContents({
    owner: OWNER,
    repo: REPO,
    path,
    message: `Add vendor image: ${vendorName}`,
    content: buffer.toString("base64"),
    branch: BRANCH,
  });

  return path;
}

async function readJsonFile(path, fallbackValue) {
  try {
    const response = await octokit.repos.getContent({
      owner: OWNER,
      repo: REPO,
      path,
      ref: BRANCH,
    });

    if (Array.isArray(response.data) || !response.data?.content) {
      return { ...fallbackValue, sha: null };
    }

    const content = Buffer.from(response.data.content, response.data.encoding || "base64").toString("utf8");
    const parsed = safeParseJson(content, fallbackValue);

    return {
      ...parsed,
      sha: response.data.sha,
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
  const request = {
    owner: OWNER,
    repo: REPO,
    path,
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch: BRANCH,
  };

  if (sha) {
    request.sha = sha;
  }

  await octokit.repos.createOrUpdateFileContents(request);
}

function getSingleFile(fileValue) {
  if (!fileValue) return null;
  return Array.isArray(fileValue) ? fileValue[0] : fileValue;
}

function getFormValue(value) {
  if (Array.isArray(value)) return value[0] ?? "";
  return typeof value === "string" ? value : "";
}

function getFilePath(file) {
  return file.filepath || file.path || file.tempFilePath;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeFileName(value) {
  return String(value || "file")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getFileExtension(filename) {
  const index = String(filename || "").lastIndexOf(".");
  if (index === -1) return "";
  return String(filename).slice(index + 1).toLowerCase();
}

function getMimeExtension(mime) {
  if (!mime) return "";
  const ext = mimeTypes.extension(mime);
  return ext || "";
}

function generateVendorId(vendors) {
  const ids = new Set(vendors.map((vendor) => String(vendor.id)));
  let id = Date.now();

  while (ids.has(String(id))) {
    id += 1;
  }

  return id;
}

function safeParseJson(text, fallbackValue) {
  try {
    return JSON.parse(text);
  } catch {
    return fallbackValue;
  }
}

