# Rentwise Rental Ledger

A rental-management workspace for Ugandan landlords, caretakers, and tenants to track properties, rent, repairs, agreements, and receipts.

## Run & Operate

- The `artifacts/rental-ledger` web artifact runs through its managed Replit workflow.
- `pnpm --filter @workspace/rental-ledger run typecheck` — typecheck the app.
- `pnpm --filter @workspace/rental-ledger run build` — build the static web app.
- Rental records are stored in this browser's `localStorage`; there is no API server, account sync, or database.

## Stack

- pnpm workspaces, React, Vite, TypeScript
- Client-side persistence: browser `localStorage`
- Routing: Wouter

## Where things live

- `artifacts/rental-ledger/src/App.tsx` — app routes, pages, and workspace interactions.
- `artifacts/rental-ledger/src/lib/local-data.ts` — browser persistence, demo records, and derived ledger data.
- `artifacts/rental-ledger/src/rental.css` — rental-management styles.

## Architecture decisions

- Rental records stay local to the browser and are not transmitted to a server.
- The dashboard, activity feed, balances, and analytics are derived from the same locally stored records.

## Product

The app supports property and unit setup, tenant assignment, rent collection and receipts, repair tracking, agreement summaries, activity history, and analytics.

## User preferences

- Keep the rental workflows browser-only; do not add server APIs or cross-device account sync.

## Gotchas

- Browser-stored records are isolated to the current browser profile and do not sync to other devices or users.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
