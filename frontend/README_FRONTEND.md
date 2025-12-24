Frontend usage & printing notes

- Dev: run `npm run dev` (Vite) in `/frontend`.
-- Build for production: `npm run build` (this project is configured to output to `/frontend/build` via `vite.config.js`, which is what the Nginx container serves).
- Printing flow (client-side): after a successful transaction, frontend fetches `/api/transactions/{id}/receipt/` and renders the payload via `ReceiptPrint` component then calls `window.print()`.
- Thermal (80mm) friendly style is provided in `ReceiptPrint.module.css`; test with browser print preview and set paper width to 80mm.

Re-print: visit `/transactions/{id}` and click Re-print — this fetches the stored receipt payload and does NOT modify accounting entries.
