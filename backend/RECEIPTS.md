# Payment Receipt Flow

Successful payments automatically queue a receipt email without delaying the API response.

## Trigger Points

- Wallet full payment (`payFullyWithWallet`)
- Mixed payment fully covered by wallet (`createMixedPaymentIntent` when remaining becomes 0)
- Stripe / Mixed card completion via webhook (`finalizeStripePayment` success)

## Registration Fields

- `receiptSentAt`: Timestamp set after a successful send.
- `lastReceiptError`: Captures the last send failure message (truncated) for diagnostics.

## Utility

`utils/paymentReceipt.js` exposes:

- `queuePaymentReceipt(reg)` – Schedules asynchronous send if `paymentStatus === 'PAID'` and no prior receipt.
- `resendReceipt(regId)` – Clears `receiptSentAt` and re-queues sending (basic stub for future admin usage).

## Email Content

Includes: Event title, start time (if available), total paid, method, wallet/card breakdown. Uses user snapshot (name/email) if present for historical accuracy.

## Error Handling

Errors during send are swallowed; `lastReceiptError` is stored. This prevents blocking payment success flows.

## Future Enhancements (Not Implemented)

- Admin endpoint to list failed receipt sends.
- Automatic retry queue with exponential backoff.
- Internationalization of receipt template.
