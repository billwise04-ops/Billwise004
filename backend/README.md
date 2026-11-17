# AgriLedger backend (starter)

Express + Prisma (PostgreSQL) API for the AgriLedger SACCO loan tracker.

## What is included
- Login (`/api/auth/login`), Members (create, search, profile, update), Loans (preview, disburse, list, detail with schedule), Repayments (log, history) and Dashboard (summary, overdue list)
- `src/services/balanceCalculator.js`: pure loan maths (total repayable, schedule, repayment handling, overdue status, days overdue)
- `src/services/loanService.js`: connects the maths to the database and keeps loan status up to date (runs on startup and every hour)
- `tests/`: 35 Jest tests covering the calculator and the loan service
- Prisma schema matching your ERD, plus a seed script for the first officer

## Setup
1. Install PostgreSQL and create an empty database called `agriledger`.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env`, then set your Postgres password in `DATABASE_URL` and a long random `JWT_SECRET`.
4. Create the tables: `npx prisma migrate dev --name init`
5. Create the first officer: `npm run seed`
6. Run the tests: `npm test`
7. Start the API: `npm run dev` (http://localhost:4000)

If you already ran `npx prisma init` earlier, keep your existing `.env` and just replace `prisma/schema.prisma` with the one here.

Prisma is pinned to version 6 on purpose; newer major versions configure the database connection differently and would not match this setup. Passwords use `bcryptjs` (no native build step, so it installs cleanly on Windows).

## Try it
```bash
# health check
curl http://localhost:4000/api/health

# log in (use the SEED_EMAIL / SEED_PASSWORD from .env)
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"officer@sacco.local","password":"ChangeMe123!"}'

# create a member (paste the token from the login response)
curl -X POST http://localhost:4000/api/members \
  -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" \
  -d '{"fullName":"Jane Mwangi","registrationNumber":"M-001","phone":"0712345678","farmDetails":"3 acres tea, Kericho"}'
```
Creating `M-001` a second time returns `409` with "M-001 is already registered to Jane Mwangi." (the error state in your Add Member design).

## Endpoints
All routes except health and login need the header `Authorization: Bearer <token>`.

| Method | Path | Notes |
|---|---|---|
| GET | /api/health | no login needed |
| POST | /api/auth/login | returns a JWT valid for 8 hours |
| POST | /api/members | create; duplicate registration number returns 409 |
| GET | /api/members?search= | list with loan count and status |
| GET | /api/members/:id | profile, loans, and totals |
| PUT | /api/members/:id | send only fields to change |
| POST | /api/loans/preview | live summary for the Disburse form (saves nothing) |
| POST | /api/loans | disburse a loan |
| GET | /api/loans?status=&memberId= | list |
| GET | /api/loans/:id | detail, schedule, repayment history |
| POST | /api/loans/:id/repayments | log a repayment (overpayment is rejected) |
| GET | /api/repayments?limit= | recent repayments across all loans |
| GET | /api/dashboard/summary?from=&to= | totals, repayment rate, monthly chart data |
| GET | /api/dashboard/overdue | overdue loans, worst first |

