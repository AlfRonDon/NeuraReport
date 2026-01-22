# NeuraReport Frontend

This package contains the NeuraReport web UI built with React + Vite + MUI. The theme enforces flat 12px surfaces with outlined papers, so please avoid reintroducing component-level elevations or oversized rounded corners.

## Install

```sh
npm install
```

## Development

- `npm run dev` - start the Vite dev server
- `npm run lint` - run ESLint checks
- `npm run test:ui` / `npm run test:a11y` / `npm run test:visual` - execute Playwright suites

Tip: copy `frontend/.env.example` to `frontend/.env.local` to configure the backend URL and mock mode.

## Layout Sanity Checklist

- Spot-check Setup (Connect, Generate Templates, Generate Report) and Generate routes at 360, 390, 414, 768, 1024, 1280, and 1440 px widths for zero horizontal scroll.
- Run the automated viewport guard: `npm run test:ui -- tests/e2e/no-horizontal-scroll.spec.js`.
- Ensure tables, previews, and dialogs stay within their containers with responsive wrapping before merging layout changes.

## Release Checklist

Run the build pipeline from a clean slate to ensure the UI renders with the latest theme overrides:

1. `npm run clean`
2. `npm run build`
3. `npm run preview`

The `clean` script removes the Vite build output and cache folders (`dist`, `node_modules/.vite`) so the subsequent build reflects current sources.
