# Kurk

Persoonlijke wijnvoorraad als iPhone-PWA. Vite + React, data in `localStorage`, CSV-export/import voor backup.

## Lokaal draaien

```bash
npm install
npm run dev
```

## Build

```bash
npm run build       # output in dist/
npm run preview     # serveer de build lokaal
```

## Live

Wordt automatisch gedeployed naar GitHub Pages via `.github/workflows/deploy.yml` op pushes naar `claude/setup-vite-react-wine-xhTDp` of `main`.

URL: https://paulienb.github.io/Paulien/

**Eenmalige setup in GitHub**: Settings → Pages → Build and deployment → Source: **GitHub Actions**.

## Iconen regenereren

```bash
node scripts/generate-icons.mjs
```

## Verhuizen naar een eigen repo / custom domain

De Vite `base` is configureerbaar via env-var:

```bash
# bij een eigen repo "kurk":
VITE_BASE=/kurk/ npm run build

# bij custom domain in root:
VITE_BASE=/ npm run build
```

Update ook `start_url`, `scope` en `id` in `public/manifest.webmanifest`, en pas de branch in `.github/workflows/deploy.yml` aan.

## iPhone installeren

1. Open de URL in **Safari** (niet Chrome).
2. Tik op delen-icoon → **Zet op beginscherm**.
3. Open vanaf het beginscherm — draait als standalone app.
