Receipt generation & printing

Overview
--------
Every successful transaction creates an immutable Receipt record that contains a deterministic token and a JSON payload representing the printable receipt. Receipt creation happens inside the same database transaction that creates the Transaction and updates the CashBook/CreditAccount. This guarantees that receipts are only created when accounting updates succeed.

Token format
------------
- EECOHM-<YEAR>-<6-digit-transaction-id> e.g. EECOHM-2025-000123

Atomicity
---------
The service layer function `create_transaction_atomic` wraps the following in `transaction.atomic()`:

- Create Transaction and TransactionLines
- Update CashBook entries and/or CreditAccount balances (with `select_for_update()` on accounts)
- Generate deterministic receipt payload and insert `Receipt` row

This ensures that either all of these steps succeed or none of them are committed.

Re-printing
-----------
Reprinting fetches the stored receipt payload via `GET /api/transactions/{id}/receipt/` and renders it in a minimal printable component on the client. Reprinting does not change accounting data.

Frontend printing behavior
-------------------------
1. POS creates a transaction via `/api/transactions/` and receives the transaction response.
2. Frontend calls `/api/transactions/{id}/receipt/` to retrieve the payload.
3. Frontend renders `ReceiptPrint` component, then calls `window.print()` to open print dialog. The print styles are optimized for thermal printers (80mm) using `ReceiptPrint.module.css`.

Notes
-----
- Receipt payload is stored as JSON and is immutable. If a transaction is canceled, a reversal creates accounting entries and the original receipt remains as an immutable record (the cancelation event can be linked separately).
- To support server-side printing (receipt forwarded to a network printer), add a background task or integrate CUPS/printer API and send the stored payload to the printer when requested (not implemented in this version).
