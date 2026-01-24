# Meilleur Insights

> **Multi-Service Business Intelligence Dashboard** for Revenue, Debt & Performance Management

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)

## Overview

Meilleur Insights is a comprehensive business intelligence dashboard designed for companies operating **multiple service lines**. It provides real-time visibility into revenue, expenses, debts, and performance metrics across all business units.

### Who is it for?

- **Business owners** managing multiple services or divisions
- **Finance teams** tracking revenue and expenses across departments
- **Operations managers** monitoring service performance
- **Executives** needing quick insights for decision-making

### Key Features

| Feature | Description |
|---------|-------------|
| 📊 **KPI Dashboard** | Real-time key performance indicators at a glance |
| 💰 **Revenue Tracking** | Daily, monthly, and yearly revenue monitoring per service |
| 📉 **Expense Management** | Track costs by category and service |
| 💳 **Debt Management** | Track money owed by customers with aging reports and payment history |
| 🎯 **Goal Setting** | Set and monitor targets at company and service levels |
| 📈 **Service Comparison** | Compare performance across all business units |
| 📋 **Reports & Export** | Generate PDF reports, export to CSV/JSON |
| 🔔 **Notifications** | Alerts for overdue debts, goal progress, and more |
| ⚙️ **Configurable Settings** | Currency, timezone, appearance, and business preferences |

### Supported Services

The dashboard is designed to handle any service-based business, including:
- Transport & Logistics
- Real Estate & Property Management
- Agriculture & Farming
- Retail & E-commerce
- Construction & Contracting
- Professional Services
- And more...

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **TanStack Query** for data fetching
- **React Router v6** for navigation
- **Recharts** for data visualization

### Backend
- **Node.js** with TypeScript
- **Hono** - lightweight web framework
- **Drizzle ORM** - type-safe database access
- **SQLite** (development) / PostgreSQL (production)
- **JWT** authentication with jose
- **Zod** for validation

---

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/FrankEWallace/multiservices_mgr.git
cd multiservices_mgr

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Seed the database with sample data
npm run db:seed
```

### Running the Application

```bash
# Terminal 1: Start the backend server
cd backend
npm run dev
# Server runs at http://localhost:3000

# Terminal 2: Start the frontend
cd ..
npm run dev
# App runs at http://localhost:8080
```

### Default Login

After seeding, use these credentials:
- **Email:** admin@meilleur.com
- **Password:** admin123

---

## Project Structure

```
meilleur-insights/
├── src/                    # Frontend source code
│   ├── components/         # React components
│   │   ├── dashboard/      # Dashboard widgets
│   │   ├── forms/          # CRUD forms
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # React contexts (Auth, Notifications)
│   ├── hooks/              # Custom hooks
│   ├── layouts/            # Page layouts
│   ├── lib/                # Utilities and API client
│   └── pages/              # Route pages
├── backend/                # Backend source code
│   ├── src/
│   │   ├── db/             # Database schema, migrations, seed
│   │   ├── routes/         # API routes
│   │   └── middleware/     # Auth middleware
│   ├── drizzle/            # Migration files
│   └── data/               # SQLite database file
├── public/                 # Static assets
└── ROADMAP.md              # Development roadmap
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/register` | User registration |
| GET | `/api/auth/me` | Get current user |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/kpis` | Key performance indicators |
| GET | `/api/dashboard/revenue-trend` | Revenue trend data |
| GET | `/api/dashboard/insights` | Quick insights |

### Services
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/services` | List all services |
| POST | `/api/services` | Create a service |
| PUT | `/api/services/:id` | Update a service |
| DELETE | `/api/services/:id` | Delete a service |

### Revenue & Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/revenue` | List revenue entries |
| POST | `/api/revenue` | Record revenue |
| GET | `/api/revenue/summary` | Revenue summary |

### Debts (Madeni)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/madeni` | List all debts |
| POST | `/api/madeni` | Create a debt record |
| POST | `/api/madeni/:id/payments` | Record a payment |
| GET | `/api/madeni/aging` | Aging report |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List all goals |
| POST | `/api/goals` | Create a goal |
| PUT | `/api/goals/:id` | Update a goal |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| POST | `/api/settings` | Create/update a setting |
| PUT | `/api/settings/bulk` | Bulk update settings |

---

## Database Migrations

```bash
cd backend

# Generate a new migration after schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Push schema directly (development)
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

---

## Configuration

The Settings page allows configuration of:

- **General**: App name, timezone, date format
- **Currency**: Code, symbol, position, decimal places
- **Notifications**: Email, push, debt reminders, goal alerts
- **Appearance**: Theme, primary color, compact mode
- **Reports**: Default period, company info, logo
- **Business**: Fiscal year, overdue days, working days

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Roadmap

See [ROADMAP.md](./ROADMAP.md) for the detailed development plan.

### Upcoming Features
- [ ] Advanced analytics & AI insights
- [ ] Financial projections & forecasting
- [ ] Automated report scheduling
- [ ] Multi-user roles & permissions
- [ ] Mobile app (React Native)
- [ ] API rate limiting & caching
- [ ] PostgreSQL support for production

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Hono](https://hono.dev/) for the lightweight backend framework
- [Drizzle ORM](https://orm.drizzle.team/) for type-safe database access
- [Recharts](https://recharts.org/) for data visualization
