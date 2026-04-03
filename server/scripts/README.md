`seedProducts.js` uploads one image per product from `client/src/assets` to Cloudinary and upserts the full catalog into MongoDB.

Run from `server/`:

```bash
npm run seed:products
```

Requirements:

- `MONGODB_URI`
- `CLOUDINARY_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
