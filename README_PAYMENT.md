# Payment Feature (Agora)

## Overview

This document describes the newly added payment functionality for Trip / Workshop registrations. Users (STUDENT, STAFF, TA, PROFESSOR) can pay using:

- Wallet balance (full amount)
- Mixed: partial wallet + Stripe card (remaining amount)
- Card only (Stripe Checkout or PaymentIntent)

## Backend Endpoints

Base path: `/api/payments`

| Method | Path                         | Description                                                                                                                                                                        |
| ------ | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/wallet`                    | Pay full registration price using wallet if sufficient balance.                                                                                                                    |
| POST   | `/checkout`                  | Create Stripe Checkout Session (card only). Returns `{ sessionId }`.                                                                                                               |
| POST   | `/mixed-intent`              | Deduct specified wallet amount then create PaymentIntent for remainder. Returns `{ paid, clientSecret, remaining, walletDeducted }`. If `paid=true` the wallet covered full price. |
| GET    | `/status?registrationId=...` | Poll payment status after initiating a mixed/card payment.                                                                                                                         |
| POST   | `/webhook`                   | Stripe webhook (raw body). Handles `checkout.session.completed`, `payment_intent.succeeded`, and `payment_intent.payment_failed`.                                                  |

## Models Added / Modified

- `registrationModel`: Added payment fields (status, method, price snapshot, walletDeducted, Stripe IDs, attempts).
- `userModel`: Added `walletBalance` numeric field.
- `eventModel`: Reintroduced `workshopDetails.price` and root `price` for workshops.
- `paymentAttemptModel`: Logs each payment attempt (`INITIATED`, `SUCCEEDED`, `FAILED`) with amounts and method.

## Payment Status Fields

`paymentStatus`: `UNPAID | PENDING | PAID | FAILED`
`paymentMethod`: `NONE | WALLET | STRIPE | MIXED`

## Mixed Payment Flow

1. Frontend calls `POST /payments/mixed-intent` with `{ registrationId, walletAmount }`.
2. Service deducts wallet atomically (if amount > 0).
3. If wallet covers full price: registration marked PAID immediately.
4. Else: Stripe PaymentIntent created; response returns `clientSecret` to confirm card payment via Stripe Elements.
5. Frontend confirms payment using `stripe.confirmCardPayment(clientSecret)`.
6. Webhook or client success updates registration to `PAID`.

## Environment Variables

Backend:

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:5173
```

Frontend (Vite):

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Adding Wallet Funds (Example)

(Not implemented in UI yet.) Use a protected admin endpoint or Mongo shell to increment `walletBalance`:

```js
// Mongo shell example
db.users.updateOne(
  { email: "student@guc.edu.eg" },
  { $inc: { walletBalance: 100 } }
);
```

## Error Handling

- All endpoints return JSON `{ error: 'message' }` on failure.
- Atomic wallet deductions ensure no negative balances.
- PaymentAttempt records allow audit of failures.

## Frontend Integration

Use `PaymentDialog` component. Provide props: `registrationId`, `price`, `walletBalance`, `onPaid` (callback), `onClose`.
Ensure Stripe publishable key is set; component uses Stripe Elements for mixed/card payments.

## Logging

- Wallet transactions stored in `walletTransactionModel`.
- Attempts stored in `paymentAttemptModel`.

## Future Enhancements

- Admin wallet top-up endpoints.
- Refund handling (update wallet + transactions).
- Display payment history per registration.

---

This feature introduces minimal schema changes while keeping existing flows intact. Update migrations or inform ops to add new fields if necessary.
