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

## Git
Add a root `.gitignore` containing `node_modules`, `.env` and `dist` before your first commit.
