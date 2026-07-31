# MarketNest

MarketNest is a full-stack grocery commerce app built with React, Vite, Express, MongoDB, and Tailwind CSS. It includes a customer storefront, cart and checkout flow, seller dashboard, inventory controls, coupons, and order management.

## Highlights

- Modern storefront with responsive navbar, hero, product grids, footer, and mobile-friendly layouts
- User authentication with role-aware flows for customers and sellers
- Product browsing with search, filters, sorting, category pages, and product details
- Cart, address management, checkout, coupon application, and order history
- Seller dashboard for product management, bulk stock updates, order handling, and coupon management
- Inventory-aware ordering with stock reservation and release logic
- COD and Razorpay checkout support
- Order cancel and return request flows
- Security basics including rate limiting, security headers, and protected routes

## Tech Stack

- Frontend: React 19, Vite, React Router, Tailwind CSS, Axios
- Backend: Express 5, Mongoose, JWT auth, Joi validation
- Database: MongoDB Atlas or self-hosted MongoDB, with optional Neon/Postgres checkout and payment writes
- Media: Cloudinary
- Payments: Razorpay

## Project Structure

```text
frontend/   React storefront and seller dashboard
backend/    Express API, models, controllers, routes, scripts
```

## Main Features

### Storefront

- Browse products by category
- Search by name, category, and description
- Filter by category, price range, stock, and discount
- Sort by price, newest, and savings
- View responsive product cards and product details

### Cart and Checkout

- Add, update, and remove cart items
- Address selection and creation
- Coupon application at checkout
- COD and Razorpay order placement
- INR currency display

### Orders

- Customer order history
- Cancel eligible orders
- Request returns
- Seller-side order filters and status updates

### Seller Dashboard

- Add and edit products
- Delete products
- Update stock one-by-one or in bulk
- View sales summary cards
- Manage DB-backed coupons with expiry, usage limits, and minimum order rules

## API Areas

The backend exposes these main route groups:

- `/api/user`
- `/api/product`
- `/api/cart`
- `/api/address`
- `/api/order`
- `/api/payment`
- `/api/coupon`
- `/health`
- `/health/services`
- `/health/observability`

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd MarketNest
```

Install frontend dependencies:

```bash
cd frontend
npm install
```

Install backend dependencies:

```bash
cd ../backend
npm install
```

### 2. Configure environment variables

Create `backend/.env` from your deployment or local secret store.

Required backend variables:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-secret
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/marketnest
DATABASE_URL=postgresql://username:password@host/marketnest?sslmode=require
ORDER_STORAGE=mongo
MESSAGE_QUEUE=in-memory
RABBITMQ_URL=amqp://localhost:5672
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

Frontend:

- if needed, create `frontend/.env`
- set `VITE_API_BASE_URL` when the frontend should call a deployed backend instead of the local Vite proxy
- set `VITE_CURRENCY` for currency display

Example:

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_CURRENCY=₹
```

### 3. Start the app

Run the API:

```bash
cd backend
npm run server
```

Run the frontend:

```bash
cd frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Docker Setup

Docker support is intended for reproducible local/demo runtime and future portability. Production targets remain Vercel for `frontend/` and Render for `backend/`.

The Compose stack includes:

- `frontend`: Vite production build served by nginx on `http://localhost:5173`
- `backend`: Express API on `http://localhost:5000`
- `rabbitmq`: RabbitMQ broker and management UI on `http://localhost:15672`

MongoDB and Postgres are not started by Compose. Keep MongoDB external through `MONGODB_URI`, and use Neon or another cloud Postgres through `DATABASE_URL` when `ORDER_STORAGE=postgres`.

### 1. Prepare env files

Create or update `backend/.env` with your external service credentials:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-secret
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/marketnest
DATABASE_URL=postgresql://username:password@host/marketnest?sslmode=require
ORDER_STORAGE=mongo
MESSAGE_QUEUE=rabbitmq
RABBITMQ_URL=amqp://rabbitmq:5672
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

Optional frontend build variables can be supplied from your shell or a root Docker Compose `.env` file before building:

```env
VITE_API_BASE_URL=/
VITE_CURRENCY=INR
```

The Docker frontend defaults `VITE_API_BASE_URL=/` so browser requests go to nginx, which proxies `/api/*` to the backend container.

### 2. Validate and start

```bash
docker compose config
docker compose up --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- RabbitMQ management: `http://localhost:15672` with the default local credentials `guest` / `guest`

To stop the stack:

```bash
docker compose down
```

To remove the RabbitMQ volume as well:

```bash
docker compose down -v
```

## Seed Products

The project includes a bulk seed script that maps products to local asset images and uploads them through Cloudinary before inserting them into MongoDB.

Run it from the backend folder:

```bash
npm run seed:products
```

## Available Scripts

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

### Backend

```bash
npm start
npm run server
npm run test
npm run db:migrate
npm run seed:products
```

## Health Check

The API now exposes a basic runtime health endpoint:

```bash
GET /health
GET /health/services
GET /health/observability
```

Example local URL:

```bash
http://localhost:5000/health
```

Example response:

```json
{
  "status": "ok",
  "service": "marketnest-api",
  "environment": "development",
  "uptimeSeconds": 123,
  "timestamp": "2026-03-07T00:00:00.000Z",
  "startedAt": "2026-03-07T00:00:00.000Z",
  "database": {
    "mongo": "connected",
    "postgres": "not_configured"
  },
  "integrations": {
    "cloudinaryConfigured": true,
    "razorpayConfigured": true,
    "messageQueue": "in-memory"
  }
}
```

`/health` returns `200` when MongoDB or Postgres is healthy. It returns `503` when no configured database is reachable.

## Production Deployment

MarketNest is configured for:

- Frontend: Vercel from `frontend/`
- Backend: Render from `backend/` using the root `render.yaml`
- Online payments: Razorpay only
- Checkout/payment writes: set `ORDER_STORAGE=postgres` to use Neon/Postgres
- Message queue: start with `MESSAGE_QUEUE=in-memory`; switch to `MESSAGE_QUEUE=rabbitmq` after a RabbitMQ broker and `RABBITMQ_URL` are provisioned

### Render Backend

Use the root `render.yaml` as a Render Blueprint, or create a Render Web Service manually with:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`

Required Render environment variables:

```env
NODE_ENV=production
PORT=<provided by Render>
JWT_SECRET=<long random production secret>
MONGODB_URI=<MongoDB Atlas connection string>
DATABASE_URL=<Neon/Postgres connection string>
ORDER_STORAGE=postgres
MESSAGE_QUEUE=in-memory
RABBITMQ_URL=<RabbitMQ URL when MESSAGE_QUEUE=rabbitmq>
RAZORPAY_KEY_ID=<Razorpay key id>
RAZORPAY_KEY_SECRET=<Razorpay key secret>
RAZORPAY_WEBHOOK_SECRET=<Razorpay webhook secret>
CLOUDINARY_NAME=<Cloudinary cloud name>
CLOUDINARY_API_KEY=<Cloudinary API key>
CLOUDINARY_API_SECRET=<Cloudinary API secret>
CLIENT_URL=https://<your-vercel-project>.vercel.app
CORS_ORIGINS=https://<your-vercel-project>.vercel.app
```

Render injects `PORT` automatically for Web Services. Keep it documented, but do not hardcode it unless Render asks for it.

Before first production traffic with `ORDER_STORAGE=postgres`, run the Postgres migrations against `DATABASE_URL`:

```bash
cd backend
npm run db:migrate
```

Razorpay webhook URL:

```text
https://<your-render-service>.onrender.com/api/payment/razorpay/webhook
```

### Vercel Frontend

Deploy the frontend as a Vercel project with:

- Root directory: `frontend`
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Required Vercel environment variables:

```env
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
VITE_CURRENCY=₹
```

After Vercel gives the production URL, set the same URL in Render as both `CLIENT_URL` and `CORS_ORIGINS`. For multiple Vercel domains or preview domains, use a comma-separated `CORS_ORIGINS` list.

### Deployment Order

1. Create or confirm MongoDB Atlas, Neon/Postgres, Cloudinary, and Razorpay production credentials.
2. Create the Render backend from `render.yaml` and add all secret env vars.
3. Run `npm run db:migrate` in `backend/` against the production `DATABASE_URL`.
4. Deploy the Vercel frontend from `frontend/` with `VITE_API_BASE_URL` pointing to Render.
5. Update Render `CLIENT_URL` and `CORS_ORIGINS` with the Vercel production URL.
6. Configure Razorpay webhooks to the Render webhook URL.
7. Verify `/health`, `/health/services`, and `/health/observability` on the Render URL.
8. Smoke test login, product listing, cart, COD checkout, Razorpay checkout, seller product upload, and seller order management.

## Deployment Checklist

Use this checklist before deploying:

- Set production values for `NODE_ENV`, `CLIENT_URL`, `CORS_ORIGINS`, `ORDER_STORAGE`, and `MESSAGE_QUEUE`
- Add all secrets through your hosting provider environment variables, not committed `.env` files
- Rotate any previously exposed MongoDB, Cloudinary, or Razorpay credentials
- Confirm MongoDB Atlas network access or firewall rules allow your deployment host
- Confirm Neon/Postgres allows Render connections when `ORDER_STORAGE=postgres`
- Confirm `/health` returns `200` after deployment
- Confirm `/health/services` and `/health/observability` return JSON snapshots
- Verify Cloudinary is configured if seller uploads are required
- Verify Razorpay keys and webhook secret are configured if online payments are enabled
- Verify `VITE_API_BASE_URL` points to the Render backend origin, not a path under the Vercel frontend
- Build the frontend with `npm run build` inside `frontend`
- Start the backend and confirm startup logs show MongoDB connected
- Test the full user journey: login, browse, cart, coupon, COD order, seller login, stock update
- Test at least one failure path: invalid coupon, out-of-stock product, unauthenticated protected route
- Confirm CORS works from the deployed frontend domain only
- Ensure cookies/auth work over HTTPS in production
- Check browser console and server logs for runtime errors after first deploy

## Current Product Scope

The app is already set up for:

- groceries
- fruits and vegetables
- dairy
- bakery
- grains
- drinks
- packaged essentials

## Quality Notes

- frontend lint passes with only two existing React Fast Refresh warnings in `AppContext.jsx`
- inventory logic now protects against invalid restocks on delivered or shipped order deletion
- seller dashboard and modal layouts have been adjusted for better desktop and mobile behavior


## License

This project is licensed under the MIT License unless you choose otherwise for your distribution.
# MarketNest
