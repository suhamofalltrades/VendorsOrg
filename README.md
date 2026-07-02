# VendorsOrg Static v1

A lightweight static prototype for a local vendor discovery site.

## Structure

- `index.html`
- `category.html`
- `vendor.html`
- `css/style.css`
- `js/app.js`
- `js/category.js`
- `js/vendor.js`
- `data/categories.json`
- `data/vendors-index.json`
- `data/<category>.json`
- `data/vendors/<vendor-id>.json`
- `assets/images/*.svg`
- `assets/logos/*.svg`

## Run

Use a local server so `fetch()` works:

```bash
python -m http.server 8000
```

Open:

- `http://localhost:8000/index.html`
- `http://localhost:8000/category.html?category=beauty`
- `http://localhost:8000/vendor.html?vendor=crimson-glow-studio`

## Notes

- Data is static JSON for now.
- The architecture is ready to swap `fetch("data/...")` with a backend API later.
- The images are generated SVG placeholders, so the project stays self-contained.