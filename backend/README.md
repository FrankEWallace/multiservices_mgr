# Meilleur Insights - Backend API

Node.js/TypeScript backend using Hono + Bun for the Meilleur Insights dashboard.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono (ultra-fast, TypeScript-first)
- **Database:** SQLite (dev) / PostgreSQL (prod)
- **ORM:** Drizzle ORM
- **Auth:** JWT tokens
- **Validation:** Zod

## Setup

### Prerequisites
- Bun installed (`curl -fsSL https://bun.sh/install | bash`)

### Installation

```bash
cd backend
bun install
```

### Environment Setup

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Database Setup

```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Seed with sample data
bun run db:seed
```

### Development

```bash
bun run dev
```

Server runs at http://localhost:3000

## API Documentation

- Health check: GET /
- API routes: /api/*

### Endpoints

```
Auth:
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me

Dashboard:
GET    /api/dashboard/kpis
GET    /api/dashboard/revenue-trend
GET    /api/dashboard/insights

Services:
GET    /api/services
POST   /api/services
GET    /api/services/:id
PUT    /api/services/:id
DELETE /api/services/:id

Revenue:
GET    /api/revenue
POST   /api/revenue
GET    /api/revenue/summary
GET    /api/revenue/by-service

Madeni:
GET    /api/madeni
POST   /api/madeni
GET    /api/madeni/:id
PUT    /api/madeni/:id
POST   /api/madeni/:id/payment
GET    /api/madeni/aging

Goals:
GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
GET    /api/goals/progress
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts          # App entry point
│   ├── db/
│   │   ├── index.ts      # Database connection
│   │   ├── schema.ts     # Drizzle schema
│   │   └── seed.ts       # Seed data
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── dashboard.ts
│   │   ├── services.ts
│   │   ├── revenue.ts
│   │   ├── madeni.ts
│   │   └── goals.ts
│   ├── middleware/
│   │   └── auth.ts
│   └── utils/
│       └── helpers.ts
├── drizzle/              # Migrations
├── .env.example
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```
