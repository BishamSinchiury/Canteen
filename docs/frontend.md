Frontend summary
----------------

This project includes a minimal React frontend (Vite) that provides a Point-of-Sale interface and printing flows.

Key components
- `POS.jsx` - The main POS UI: shows menu items, cart, checkout flow. After a successful transaction the stored receipt payload is fetched and printed via `window.print()`.
- `ReceiptPrint.jsx` - A printable receipt layout optimized for thermal printers (80mm). Uses `ReceiptPrint.module.css` for print rules.
- `TransactionDetail.jsx` - View to fetch stored receipt for a transaction and re-print it. Reprinting does not modify accounting entries.
- `TransactionsList.jsx` - Lists recent transactions and links to re-print pages.
- `Login.jsx` + `AuthContext.jsx` - Simple auth flow that stores JWT in `localStorage`.

Tests
- Tests use Vitest + Testing Library. Run once (non-interactive) with: `npm test` (script is `vitest --run`).

Build & Deploy
- Build the frontend with `npm run build` — the output is placed at `/frontend/build` and is served by the Nginx service in Docker Compose.

Notes
- Tests are configured to run in a Node + JSDOM environment and are lightweight unit tests for components.
- For E2E / integration tests, consider using Playwright or Cypress in CI.
