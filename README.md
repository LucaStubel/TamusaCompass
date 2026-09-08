# Jaguar Campus Compass

A pure outdoor **campus compass**: point your phone and it shows which building is
ahead of you and how far, using the device compass + GPS. Self‑contained static
site — deploy anywhere that serves HTTPS (GitHub Pages works; compass + GPS need
HTTPS, not file://).

## Files (edit these)
- **index.html** – page structure and on‑screen text
- **style.css** – all styling / design (colors are the `:root` variables at the top)
- **app.js** – compass sensors, GPS, and the building list (`CONFIG.buildings` at the top: name + lat/lon)
- **images/**
  - `tamu-logo.png` – top brand logo
  - `compass-map.jpg` – map inside the compass dial

## Add / edit buildings
Open `app.js`, edit `CONFIG.buildings` — each entry is `{n:"Name", lat:…, lon:…}`
(add `lot:true` for a parking lot). The compass engine updates automatically.

## Deploy on GitHub Pages
1. Upload all files **and** the `images/` folder, `index.html` at the repo root.
2. Settings → Pages → Branch `main` / `/ (root)` → Save.
3. Open on a phone and tap “Enable compass”.
