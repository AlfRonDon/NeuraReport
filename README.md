NeuraReport — Frontend Scaffolding

This repo scaffolds the React frontend per requirements while stubbing backend/desktop folders for later work. Backend logic is intentionally omitted for now.

What’s included
- Vite + React 18 (JavaScript)
- MUI, React Router, Zustand, React Query
- Yup + react-hook-form for validation
- Mock API layer to run without backend
- Two-tab UI skeleton: Setup and Generate

Getting started
1) Frontend
   - cd `frontend`
   - `npm install`
   - `npm run dev`

   Env vars (optional in `.env.local`):
   - `VITE_API_BASE_URL` (default: http://127.0.0.1:8000)
   - `VITE_USE_MOCK` (default: true)

2) Backend (placeholder)
   - See `backend/README.md`. No code yet. Requirements captured in `backend/requirements.txt`.

3) Desktop/Tauri (placeholder)
   - See `desktop/README.md`. No code yet.

Structure highlights
- `frontend/src/pages/Setup/` — Connect DB, Upload Template, Preview & Approve
- `frontend/src/pages/Generate/` — Template Picker, Run Config, Run Monitor
- `frontend/src/api/` — Axios client and mock functions
- `frontend/src/store/` — Zustand app store

Next steps
- Hook real FastAPI endpoints into `frontend/src/api/*` and switch `VITE_USE_MOCK=false`.
- Flesh out PDF preview + mapping assistant UI per spec.
- Add Tauri `src-tauri` and sidecar to run the backend locally.

