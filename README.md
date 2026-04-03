# MarketNest

MarketNest is a full-stack grocery commerce app built with React, Vite, Express, MongoDB, and Tailwind CSS. It includes a customer storefront, cart and checkout flow, seller dashboard, inventory controls, coupons, and order management.

## Highlights

- Modern storefront with responsive navbar, hero, product grids, footer, and mobile-friendly layouts
- User authentication with role-aware flows for customers and sellers
- Product browsing with search, filters, sorting, category pages, and product details
- Cart, address management, checkout, coupon application, and order history
- Seller dashboard for product management, bulk stock updates, order handling, and coupon management
- Inventory-aware ordering with stock reservation and release logic
- COD and Stripe checkout support
- Order cancel and return request flows
- Security basics including rate limiting, security headers, and protected routes

## Tech Stack

- Frontend: React 19, Vite, React Router, Tailwind CSS, Axios
- Backend: Express 5, Mongoose, JWT auth, Joi validation
- Database: MongoDB Atlas or self-hosted MongoDB
- Media: Cloudinary
- Payments: Stripe

## Project Structure

```text
client/   React storefront and seller dashboard
server/   Express API, models, controllers, routes, scripts
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
- COD and Stripe order placement
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
- `/api/coupon`
- `/health`

## Local Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd MarketNest
```

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

### 2. Configure environment variables

Create `server/.env` from [server/.env.example](/e:/NEXT%20JS/2025%20NEW/marketnest/server/.env.example).

Required backend variables:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=replace-with-a-long-secret
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/marketnest
CLOUDINARY_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

Frontend:

- if needed, create `client/.env`
- current frontend setup only requires currency display in most local setups

Example:

```env
VITE_CURRENCY=₹
```

### 3. Start the app

Run the API:

```bash
cd server
npm run server
```

Run the frontend:

```bash
cd client
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Seed Products

The project includes a bulk seed script that maps products to local asset images and uploads them through Cloudinary before inserting them into MongoDB.

Run it from the server folder:

```bash
npm run seed:products
```

## Available Scripts

### Client

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

### Server

```bash
npm start
npm run server
npm run seed:products
```

## Health Check

The API now exposes a basic runtime health endpoint:

```bash
GET /health
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
    "status": "connected"
  },
  "integrations": {
    "cloudinaryConfigured": true,
    "stripeConfigured": false
  }
}
```

If MongoDB is not connected, `/health` returns `503`.

## Deployment Checklist

Use this checklist before deploying:

- Set production values for `NODE_ENV`, `CLIENT_URL`, and `CORS_ORIGINS`
- Add all secrets through your hosting provider environment variables, not committed `.env` files
- Rotate any previously exposed MongoDB, Cloudinary, or Stripe credentials
- Confirm MongoDB Atlas network access or firewall rules allow your deployment host
- Confirm `/health` returns `200` after deployment
- Verify Cloudinary is configured if seller uploads are required
- Verify Stripe keys and webhook secret are configured if online payments are enabled
- Build the frontend with `npm run build` inside `client`
- Start the backend and confirm startup logs show MongoDB connected
- Test the full user journey: login, browse, cart, coupon, COD order, seller login, stock update
- Test at least one failure path: invalid coupon, out-of-stock product, unauthenticated protected route
- Confirm CORS works from the deployed frontend domain only
- Ensure cookies/auth work over HTTPS in production
- Check browser console and server logs for runtime errors after first deploy

## Deployment Notes

- set production values for `CLIENT_URL` and `CORS_ORIGINS`
- keep all secrets in deployment environment variables, not committed files
- configure Stripe webhook secret in production
- allow your deployment host in MongoDB Atlas network access if using Atlas

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
