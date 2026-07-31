# MarketNest Frontend

React + Vite frontend for the MarketNest storefront and seller dashboard.

## Environment

Local development can use the Vite proxy in `vite.config.js`, so `VITE_API_BASE_URL` is optional locally.

```env
VITE_API_BASE_URL=http://localhost:5000
VITE_CURRENCY=₹
```

For Vercel production, set:

```env
VITE_API_BASE_URL=https://<your-render-service>.onrender.com
VITE_CURRENCY=₹
```

The backend must allow the Vercel URL through `CLIENT_URL` and `CORS_ORIGINS`.

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```
