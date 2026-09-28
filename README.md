# React + TypeScript + TanStack Query Testing Lab

A realistic practice project for component/integration testing with:

- React + TypeScript
- Vite
- TanStack Query
- Vitest
- React Testing Library
- user-event
- Mock Service Worker (MSW)

## Goal

The application code is already present. Your job is to implement the test tickets in `TICKETS.md` without testing third-party library internals.

## Install

```bash
npm install
```

## Run the app

```bash
npm run dev
```

For development, the Vite dev server contains a tiny in-memory `/api/products` API so the app works without a separate backend. The tests deliberately do **not** use that dev API: Vitest requests are controlled through MSW.

## Run tests

```bash
npm test
```

Run once:

```bash
npm run test:run
```

## Recommended workflow

1. Run the existing smoke test and make sure the setup works.
2. Open `TICKETS.md`.
3. Implement one ticket at a time in new files such as:
   - `tests/ProductList.test.tsx`
   - `tests/CreateProductForm.test.tsx`
   - `tests/ProductFeature.integration.test.tsx`
4. Send me each finished ticket and I will review it like a code review rather than giving you the answer first.

## Architecture

```text
src/
├── api/                  HTTP functions
├── components/           UI components
├── hooks/                TanStack Query custom hooks
├── lib/                  QueryClient factory
├── mocks/                MSW handlers + test server
├── types/                TypeScript domain models
├── App.tsx
└── testSetup.ts

tests/
├── renderWithProviders.tsx
└── smoke.test.tsx
```

## Important testing principle

`ProductList` uses `useProducts()`, which uses `useQuery()`. Tests therefore render it inside a `QueryClientProvider`. `renderWithProviders()` creates a new QueryClient for every test to avoid cache leakage between tests.

MSW intercepts the real `fetch()` calls made by the API layer. This lets the component, hook and API layer work together while the test controls the server response.

## Ticket test files

The exercise tickets are pre-created as `it.todo(...)` tests in `tests/`. Implement them one by one and remove `.todo` only when you start a ticket.
