`seedProducts.js` uploads one image per product from `frontend/src/assets` to Cloudinary and upserts the full catalog into MongoDB.

`npm run db:migrate` applies PostgreSQL schema migrations from `src/db/migrations`.

Razorpay is the primary online payment path. Use `/api/order/razorpay` to create
the provider order, `/api/payment/razorpay/verify` for backend callback
verification, `/api/payment/razorpay/reconcile` for stuck payment checks, and
`/api/payment/razorpay/webhook` for signed webhook delivery.

Run from `backend/`:

```bash
npm run seed:products
```

Requirements:

- `MONGODB_URI`
- `DATABASE_URL` for PostgreSQL migrations
- `CLOUDINARY_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
