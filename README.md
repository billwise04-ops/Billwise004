# AgriLedger

Digital loan and repayment tracking system for agricultural SACCOs (SWE final class project, FS 2026).

- `backend/`  Node.js + Express + Prisma + PostgreSQL API
- `frontend/` React + Vite app

## Quick start
1. Install Node.js (LTS) and PostgreSQL; create an empty database named `agriledger`.
2. Backend: `cd backend`, `npm install`, copy `.env.example` to `.env` and fill it in, then
   `npx prisma migrate dev --name init`, `npm run seed`, `npm test`, `npm run dev`.
3. Frontend (second terminal): `cd frontend`, `npm install`, `npm run dev`.
4. Open http://localhost:5173 and sign in with the officer from the seed step
   (default `officer@sacco.local` / `ChangeMe123!` unless you changed it in `.env`; change it before any real use).

## Deploy on Render
The frontend and API are separate services in production. Create a hosted PostgreSQL
database, a Node web service from the `backend/` directory, and a static site from the
`frontend/` directory, all in the same region where possible.

### Backend web service
- Build command: `npm ci --include=dev && npx prisma generate`
- Start command: `npx prisma migrate deploy && npm run seed && npm start`
- Set `DATABASE_URL` to the hosted database's internal connection URL, `JWT_SECRET` to a
  long random secret, and `CORS_ORIGIN` to the static site's exact public HTTPS origin.
- Set `SEED_EMAIL` and `SEED_PASSWORD` to the first officer's login credentials. The start
  command runs the idempotent seed script before starting the API.
- Free web services sleep after inactivity, which can delay requests when they wake up.

### Frontend static site
- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Set `VITE_API_URL` to the backend's public HTTPS origin (without `/api` or a trailing slash).

The static-site URL is needed for the backend's `CORS_ORIGIN`; the backend URL is needed for
the frontend's `VITE_API_URL`. Save both settings and redeploy after setting them. Confirm
the API at `/api/health`, then sign in using the officer credentials above.

Render's free PostgreSQL databases expire after 30 days and are deleted unless upgraded to
a paid compute plan. The hosted database is separate from your local PostgreSQL database.
This deploy creates the schema and first officer, but does not copy local members, loans,
or repayments.
