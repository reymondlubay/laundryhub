# LaundryHub Web

React + TypeScript SPA for LaundryHub operations: transactions, inventory, expenses, reports, and settings.

## Requirements

- Node.js 20+
- LaundryHub backend running (see `laundryhubbackend`)

## Setup

```bash
npm install
cp .env.example .env   # if present; set VITE_API_BASE_URL
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite dev server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Production build |

## Deployment

See [Publishing.MD](./Publishing.MD) for IIS and environment-specific builds.

## Responsive layout

Mobile/tablet browser guidelines: [docs/responsive.md](./docs/responsive.md).

## Project structure

- `src/pages/` — route screens
- `src/components/` — shared UI
- `src/services/` — API clients
- `src/constants/` — routes, messages, API paths
- `src/utils/` — helpers and report calculations
