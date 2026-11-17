# AgriLedger frontend

React + Vite app built from the Canva designs: Login, Dashboard, Members (list, add/edit, profile), Loans (list, disburse, detail with repayment form and schedule), Repayments and Reports (CSV export).

## Run it
1. Start the backend first (see `../backend/README.md`), so it is listening on port 4000.
2. In this folder run `npm install`, then `npm run dev`.
3. Open http://localhost:5173 and sign in with the officer you created using `npm run seed` in the backend.

The dev server forwards `/api` calls to `http://localhost:4000`, so no extra CORS setup is needed.

## Production deployment
For a separate frontend and backend host, set `VITE_API_URL` to the backend's public origin
(for example, `https://agriledger-api.example.com`, without a trailing slash or `/api`) in
the frontend host's build environment, then rebuild the frontend. Leave it unset for local
development.

## Structure
- `src/pages/` one file per screen
- `src/components/` layout (sidebar) and shared pieces (status tags, KPI cards, bar chart)
- `src/api.js` fetch wrapper that adds your login token
- `src/styles.css` the palette from your design: forest, moss, cream, gold, brick
