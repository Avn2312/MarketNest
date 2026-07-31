# MarketNest Senior-Level Upgrade Plan

## 0. Implementation Progress as of 2026-05-23

Overall status: the project has completed the first senior-level refactor pass. The codebase has moved from the old `client/` and `server/` layout into `frontend/` and `backend/`, and the backend now contains modular slices for gateway routing, checkout, inventory, orders, payments, product catalog, notifications, observability, PostgreSQL readiness, and Docker runtime support. This is not yet a true deployed microservices system; it is a modular monolith with service boundaries prepared for later extraction.

Verification status: `npm test` in `backend/` passes with 60 tests after adding the RabbitMQ queue layer and focused mocked RabbitMQ coverage. Production deployment configuration has now been added for a Vercel frontend and Render backend, with Docker files added for reproducible local/demo runtime.

Current product decisions:

- Payment provider: Razorpay only. The backend, frontend, tests, docs, package dependencies, and schema/provider enums now use Razorpay as the only online payment provider.
- Deployment target: Vercel for `frontend/`, Render for `backend/`.
- Containerization target: Docker support is now present for backend, frontend, and RabbitMQ local/demo runtime.
- Message queue target: RabbitMQ.
- PostgreSQL target: cloud-hosted Postgres, preferably Neon, rather than local PostgreSQL.

Approximate completion against the senior upgrade plan: 80-85%.

What this means: the architecture groundwork is strong, the online payment path is now Razorpay-only, checkout/payment writes can be switched to Postgres behind a feature flag, RabbitMQ can be enabled as the durable business event queue, and the app now has first-pass production deployment plus Docker runtime configuration. The project still needs broader runtime PostgreSQL migration for reads and lifecycle operations, real production environment provisioning, and production smoke testing before it feels fully production-ready.

### Completed

| Plan Area | Current Progress |
|---|---|
| Monolith modularization | Payment, checkout, inventory, order lifecycle, product catalog, notifications, event bus, and observability logic have been split into focused backend service modules. |
| API Gateway groundwork | `backend/src/gateway/apiGateway.js` now routes gateway aliases for auth, cart, addresses, coupons, products, orders, and payments. Gateway middleware adds correlation IDs, auth context, request logging, and rate limiting. |
| Order domain rules | `backend/src/domain/orderState.js` owns cancellation, return, fulfillment, and inventory transition rules. |
| Inventory reservation | `backend/src/services/inventoryService.js` supports stock decrement, release, and rollback when multi-item reservation fails. |
| Razorpay-only payments | Stripe has been removed from app code, tests, docs, package dependencies, and payment provider constraints. Razorpay order creation, checkout signature verification, webhook verification, duplicate event suppression, frontend verification, and reconciliation helpers are implemented. |
| Payment event flow | Payment events publish success/failure messages, and `paymentOrderConsumer` updates or releases orders from those events. |
| Notification service | Notification consumers listen to order/payment events and isolate notification failures from checkout/order flow. |
| Product catalog service | Product listing now supports pagination, filtering, sorting, seller ownership scoping, status handling, and search-index event publishing. |
| RabbitMQ queue option | `MESSAGE_QUEUE=rabbitmq` routes order, payment, and product-search events through durable RabbitMQ topic exchanges using `amqplib`; in-memory queues remain the default with the existing event names and payload shapes. |
| PostgreSQL foundation | `backend/src/db/migrations/001_marketplace_core.sql` defines core relational tables, constraints, indexes, triggers, payments, payment events, notifications, and product search index support. `002_remove_stripe_provider.sql` removes Stripe from live payment constraints. Both migrations have been applied to the configured Neon database. |
| Postgres repositories | Checkout and payment repository modules cover transactional order creation, stock reservation, payment recording, and payment success/failure updates when Postgres is configured. |
| Runtime checkout/payment flag | `ORDER_STORAGE=postgres` or `USE_POSTGRES_ORDERS=true` routes COD and Razorpay checkout creation through the Postgres checkout repository, while Razorpay success/failure updates use the Postgres payment repository. Mongo remains the default fallback path. |
| Observability groundwork | Correlation IDs, request metrics, event metrics, recent traces, alerts, and health snapshots are implemented. |
| Deployment configuration | Root `render.yaml` defines the Render backend service for `backend/`; `frontend/vercel.json` defines Vite build/output settings for Vercel; README docs list Render and Vercel environment variables and deployment order. |
| Docker runtime | `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, root `docker-compose.yml`, and backend/frontend `.dockerignore` files now support local/demo runs with the Express API, nginx-served Vite build, and RabbitMQ management UI. MongoDB remains external via `MONGODB_URI`; Neon/Postgres remains external via `DATABASE_URL`. |
| Tests | Backend tests cover gateway, checkout, inventory, order service, order state, payment consumer, Razorpay flow, product catalog, Postgres repositories, notifications, and observability. |

### Partially Done

| Plan Area | Current Progress | Remaining Work |
|---|---|---|
| Payment Service extraction | Razorpay logic is isolated in a payment service module and payment routes exist. | Deploy it as an independent service with its own database and service-to-service contract. |
| Order Service extraction | Order orchestration is isolated in `orderService`. | Move from in-process function calls to service APIs/events once the service is extracted. |
| Product Service extraction | Product catalog behavior is isolated and emits search events. | Move catalog ownership to a separate service/database and add a real search engine. |
| Message queue | In-memory business event buses remain the default with retries and idempotent handler dedupe. RabbitMQ can now be enabled with durable exchanges, per-consumer queues, retry queues, and dead-letter queues. | Exercise RabbitMQ in a real deployed environment, add queue lag/consumer health metrics, and decide whether to keep RabbitMQ or introduce Kafka/SQS for later service extraction. |
| PostgreSQL migration | Neon is configured, the schema migration has been applied, repository tests are in place, health checks detect Postgres configuration, and checkout/payment writes can be switched to Postgres by feature flag. | Expand Postgres-backed order reads, seller views, cancellation, returns, and status transitions before making Postgres the default. |
| API Gateway | Gateway aliases are available under `/api/*` while legacy route aliases remain mounted. | Remove legacy aliases after frontend/API clients fully move to gateway paths. |
| Observability | In-memory metrics, traces, alerts, and health endpoints are present. | Add production logging, metrics export, distributed tracing, dashboards, and alert routing. |
| Deployment | Frontend and backend are separated into `frontend/` and `backend/`, with Vercel and Render config/docs added. | Provision real production services, set secrets in Render/Vercel, configure Razorpay webhooks, run migrations, and smoke test the deployed app. |
| Docker | Backend/frontend Dockerfiles, nginx static serving, Compose wiring, RabbitMQ service, and Docker docs are present. | Exercise the full Compose stack against real external MongoDB/Neon credentials and decide whether to add a development-only hot-reload Compose profile later. |

### Not Yet Done

- Independently deployed User, Product, Order, Payment, Notification, Search, Seller, or Inventory services.
- Database-per-service ownership in production.
- Production RabbitMQ broker provisioning and queue monitoring.
- Elasticsearch/OpenSearch search service.
- Final Razorpay webhook setup using the Render backend public URL and `RAZORPAY_WEBHOOK_SECRET`.
- Full runtime switch from MongoDB/Mongoose order reads and lifecycle operations to Neon/Postgres repositories.
- Production-grade refund, settlement, and ledger workflows.
- Distributed tracing with OpenTelemetry or similar.
- CI pipeline and deployment automation for the new `frontend/` and `backend/` layout.

### Current Architecture Snapshot

The current implementation is best described as:

```text
React frontend
  -> Express API Gateway inside backend process
  -> Modular backend services
  -> MongoDB/Mongoose runtime models by default
  -> Optional Postgres checkout/payment write path via ORDER_STORAGE=postgres or USE_POSTGRES_ORDERS=true
  -> MESSAGE_QUEUE=in-memory by default, or MESSAGE_QUEUE=rabbitmq for durable RabbitMQ event transport
```

Next recommended milestone: deploy the configured Render/Vercel stack with production secrets, run the Postgres migrations, verify health endpoints and Razorpay webhooks, then add Postgres-backed order read/lifecycle repositories and RabbitMQ staging monitoring.

## 1. Current Architecture Breakdown

MarketNest currently works as a full-stack monolith:

- React frontend calls one Express API.
- Express owns auth, products, cart, addresses, orders, coupons, inventory, and Razorpay payment logic.
- MongoDB stores users, products, coupons, addresses, and orders.
- Product images are uploaded to Cloudinary.

This is a reasonable junior-to-strong-junior architecture because it is simple to build and deploy. It is not yet a senior-level marketplace architecture because every major business capability lives inside one backend process and one database model layer.

### Bottlenecks

| Area | Current State | Production Problem |
|---|---|---|
| Product listing | Fetches all products and filters mostly client-side | Breaks at scale; no pagination, search index, or ranking |
| Orders | Order, inventory, coupon, cart clearing, and payment setup live in one controller | Hard to test, hard to change, risky under concurrency |
| Inventory | Atomic decrement exists, but multi-product order is not transaction-safe | Partial failures require best-effort rollback |
| Payments | Payment logic has been moved into Razorpay-focused payment modules | Future provider or ledger changes should stay behind the payment boundary |
| Rate limiting/cache | In-memory | Fails across multiple server instances |
| Database | MongoDB documents with limited relationships | Weak fit for payments, orders, transactions, inventory history |

### Tight Coupling Issues

- Product, order, coupon, payment, and cart logic are directly imported into the same backend.
- Order creation knows how to reserve inventory, apply coupons, create Razorpay orders, and clear carts.
- There is no service boundary around payment provider logic.
- Seller and admin capabilities are represented only by a user role, not by marketplace ownership rules.
- Product records do not include seller ownership, SKU-level stock, category metadata, moderation state, or catalog versioning.

### Scalability Limitations

- One Express process must scale every feature together, even if only product browsing traffic increases.
- No async processing for order confirmation, email/SMS, inventory events, or payment reconciliation.
- No message queue, no idempotency model, no distributed cache, and no observability pipeline.
- MongoDB can work for marketplaces, but the current schema is too loose for reliable financial and inventory workflows.

How real companies use this: they often start with a monolith, then extract services only when domain boundaries become painful. Microservices are not a first step; they are a scaling and ownership step.

Why interviewers care: they want to see that you understand the tradeoff. A senior engineer does not blindly split services; they split around business capabilities, data ownership, and operational needs.

Common mistakes engineers make:

- Splitting into microservices before defining data ownership.
- Keeping one shared database across all services.
- Making services call each other synchronously for every small operation.
- Ignoring idempotency in payments and order flows.

## 2. Microservices Migration Plan

Target architecture:

- API Gateway
- User Service
- Product Service
- Order Service
- Payment Service
- Notification Service
- Optional later services: Search Service, Recommendation Service, Review Service, Seller Service, Inventory Service

### Service Breakdown

| Service | Responsibilities | Database Ownership | APIs Exposed | Communication |
|---|---|---|---|---|
| User Service | Registration, login, refresh tokens, roles, customer profile, seller identity basics | `users`, `refresh_tokens`, `user_roles` | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /users/me` | REST for auth; publishes `UserRegistered` |
| Product Service | Catalog, product CRUD, seller product ownership, categories, product images, stock read model | `products`, `categories`, `product_images`, `seller_products` | `GET /products`, `GET /products/:id`, `POST /products`, `PATCH /products/:id`, `PATCH /products/:id/stock` | REST for reads/writes; publishes `ProductCreated`, `StockChanged` |
| Order Service | Cart checkout, order lifecycle, order items, status changes, return requests, inventory reservation coordination | `orders`, `order_items`, `order_status_history`, `inventory_reservations` | `POST /orders`, `GET /orders/me`, `GET /seller/orders`, `PATCH /orders/:id/status` | REST for commands; async events for payment/inventory |
| Payment Service | Razorpay order creation, payment verification, webhook handling, refunds, payment ledger | `payments`, `payment_events`, `refunds`, `transactions` | `POST /payments/razorpay/order`, `POST /payments/verify`, `POST /webhooks/razorpay` | REST from frontend/backend; publishes `PaymentSucceeded`, `PaymentFailed` |
| Notification Service | Email/SMS/WhatsApp notifications, order confirmation, delivery updates, payment failure alerts | `notifications`, `notification_templates`, `notification_attempts` | Internal admin APIs only at first | Consumes events from queue |

### Service Ownership Rules

Each service owns its own tables. Other services cannot directly write to those tables.

Example:

- Order Service owns `orders`.
- Payment Service owns `payments`.
- Product Service owns product catalog.
- If Payment Service needs to mark an order paid, it publishes `PaymentSucceeded`; Order Service consumes it and updates `orders`.

How real companies use this: service boundaries often match team boundaries. Payments may be owned by a fintech/platform team, catalog by marketplace team, and notifications by growth/platform team.

Why interviewers care: data ownership and service contracts are senior-level topics. Saying "make microservices" is easy; explaining who owns which data is the real signal.

Common mistakes engineers make:

- Sharing one database and calling it microservices.
- Making Order Service directly update Payment Service tables.
- Creating too many services before the monolith has clean modules.

## 3. Step-by-Step Migration Strategy: Strangler Pattern

Do not rewrite everything at once. Use the Strangler Pattern: place a gateway in front of the monolith, extract one capability at a time, and route traffic gradually to new services.

### Step 1: Modularize the Monolith First

Before extracting services:

- Move payment logic into a payment module.
- Move inventory reservation logic into an inventory module.
- Move order state transition rules into a dedicated order domain module.
- Add integration tests around checkout, stock decrement, coupon usage, and payment webhook.

Why it matters: if the monolith is messy, microservices only move the mess over the network.

### Step 2: Extract Payment Service First

Payment is a good first extraction because:

- It has a clear external dependency: Razorpay.
- It has strong idempotency requirements.
- It can own payment events without owning the full order lifecycle.

Migration flow:

1. Keep existing Order API.
2. Order Service/monolith creates a pending order.
3. Payment Service creates a Razorpay order.
4. Frontend pays through Razorpay Checkout.
5. Razorpay webhook hits Payment Service.
6. Payment Service verifies webhook and publishes `PaymentSucceeded`.
7. Monolith consumes or receives callback and marks order paid.

### Step 3: Introduce API Gateway

Use the gateway to route:

- `/api/auth/*` to User Service
- `/api/products/*` to Product Service
- `/api/orders/*` to monolith initially, later Order Service
- `/api/payments/*` to Payment Service

Gateway responsibilities:

- Request routing
- Auth token validation
- Rate limiting
- Correlation ID injection
- Request logging

Avoid putting business logic inside the gateway.

### Step 4: Extract Product Service

Extract product catalog after payment because product reads can be scaled independently.

Add:

- Server-side pagination
- Category filtering
- Seller ownership
- Product status: `draft`, `pending_review`, `active`, `rejected`, `archived`
- Search indexing events

### Step 5: Extract Order Service

Order Service is harder because it coordinates inventory, payment, coupons, and notifications.

Use events:

- `OrderCreated`
- `InventoryReserved`
- `PaymentSucceeded`
- `OrderConfirmed`
- `OrderCancelled`
- `ReturnRequested`

Keep order state transitions inside Order Service.

### Step 6: Extract Notification Service

Notification Service should consume events and send:

- Order confirmation
- Payment success/failure
- Shipment updates
- Return/refund updates

This is a safe extraction because notification failure should not block checkout.

### Step 7: Full Transition

Final state:

- Frontend talks to API Gateway.
- Gateway routes to services.
- Services own their own databases.
- Services communicate with REST for direct queries and message queues for business events.
- Shared observability covers logs, metrics, traces, and alerts.

How real companies use this: they migrate one route or capability at a time, monitor error rates, keep rollback paths, and avoid "big bang" rewrites.

Why interviewers care: incremental migration shows judgment. Senior engineers reduce risk while improving architecture.

Common mistakes engineers make:

- Rewriting the whole backend from scratch.
- Migrating database and service architecture at the same time without tests.
- Using async events without idempotency or retries.

## 4. PostgreSQL Migration

### Why Move from MongoDB to PostgreSQL

PostgreSQL is a better default for MarketNest's senior-level version because marketplace systems need strong consistency around:

- Orders
- Payments
- Inventory reservations
- Refunds
- Seller settlements
- Coupon usage
- Audit history

MongoDB can support transactions, but PostgreSQL gives stronger relational modeling, joins, constraints, indexes, and ACID behavior by default.

How real companies use this: payments, orders, ledgers, and inventory usually require relational consistency. Even companies using NoSQL often keep financial systems in relational databases.

Why interviewers care: choosing a database based on access patterns and consistency requirements is a senior signal.

Common mistakes engineers make:

- Moving to PostgreSQL but keeping document-style JSON blobs for everything.
- Forgetting indexes.
- Not using transactions for multi-table order/payment updates.

### Core Schema Design

#### Users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('customer', 'seller', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Products

```sql
CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    parent_id UUID REFERENCES categories(id)
);

CREATE TABLE products (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES users(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    offer_price_cents INTEGER NOT NULL CHECK (offer_price_cents > 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_seller ON products(seller_id);
CREATE INDEX idx_products_status_created ON products(status, created_at DESC);
```

#### Orders

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(40) NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    discount_cents INTEGER NOT NULL DEFAULT 0,
    tax_cents INTEGER NOT NULL DEFAULT 0,
    total_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    product_id UUID NOT NULL REFERENCES products(id),
    seller_id UUID NOT NULL REFERENCES users(id),
    product_name_snapshot VARCHAR(200) NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_order_items_seller ON order_items(seller_id);
```

#### Transactions and Payments

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id),
    provider VARCHAR(40) NOT NULL,
    provider_order_id VARCHAR(120) NOT NULL UNIQUE,
    provider_payment_id VARCHAR(120),
    status VARCHAR(40) NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payment_events (
    id UUID PRIMARY KEY,
    payment_id UUID REFERENCES payments(id),
    provider_event_id VARCHAR(160) NOT NULL UNIQUE,
    event_type VARCHAR(80) NOT NULL,
    payload JSONB NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### PostgreSQL Concepts to Demonstrate

| Concept | How to Use in MarketNest |
|---|---|
| Normalization | Separate users, products, categories, orders, order items, payments |
| Indexing | Index product filters, seller dashboards, order history, payment provider IDs |
| Transactions | Create order, reserve inventory, and create payment record atomically |
| Constraints | Prevent negative stock, invalid order status, duplicate payment events |
| JSONB | Store raw webhook payloads without making core data unstructured |

## 5. Razorpay Integration

Razorpay is the only online payment provider.

### Razorpay Order Creation Flow

1. Frontend sends checkout request to backend.
2. Backend validates cart, address, stock, coupon, and total.
3. Backend creates internal `orders` row with status `payment_pending`.
4. Backend calls Razorpay Orders API with amount in paise.
5. Backend stores `razorpay_order_id` in `payments`.
6. Frontend opens Razorpay Checkout using returned order ID.

### Payment Verification Flow

Real backend flow:

```text
Frontend -> Backend -> Razorpay -> Callback -> Verify Signature -> Update DB
```

After payment:

1. Razorpay returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
2. Frontend sends these values to Payment Service.
3. Payment Service verifies HMAC signature using Razorpay key secret.
4. Payment Service updates payment status to `success`.
5. Payment Service publishes `PaymentSucceeded`.
6. Order Service moves order from `payment_pending` to `confirmed`.

### Webhook Flow

Webhooks are mandatory because frontend callbacks are not reliable.

```text
Razorpay -> Payment Service Webhook -> Verify Webhook Signature -> Store Event -> Publish Payment Event -> Order Service
```

Webhook rules:

- Verify Razorpay webhook signature.
- Store webhook event ID to prevent duplicate processing.
- Process events idempotently.
- Never trust frontend payment success alone.
- Reconcile stuck payments using Razorpay APIs.

How real companies use this: the frontend success page is only a UX signal. The backend webhook is the source of truth.

Why interviewers care: payment correctness is a high-signal topic. Signature verification, idempotency, and reconciliation separate real engineering from demo integration.

Common mistakes engineers make:

- Marking orders paid from frontend callback only.
- Not storing provider event IDs.
- Not handling duplicate webhooks.
- Mixing rupees and paise incorrectly.

## 6. Learning Mapping

| Feature | Topic | What to Learn | YouTube Search Keywords |
|---|---|---|---|
| Microservices | System Design | Service boundaries, data ownership, sync vs async communication | "microservices architecture explained", "microservices database per service" |
| Strangler Pattern | Architecture Migration | Incremental migration from monolith to services | "strangler fig pattern microservices" |
| API Gateway | Backend Architecture | Routing, auth, rate limiting, correlation IDs | "API gateway pattern microservices" |
| PostgreSQL | DBMS | Joins, constraints, indexes, transactions | "PostgreSQL indexing and joins", "Postgres transactions ACID" |
| Order Transactions | Distributed Systems | Atomic order creation, inventory reservation, rollback | "database transactions ecommerce order inventory" |
| Razorpay | Payment Systems | Order creation, signature verification, webhooks | "Razorpay integration Node.js", "Razorpay webhook verification" |
| Message Queues | Distributed Systems | Events, retries, dead letter queues, idempotency | "RabbitMQ Node.js microservices", "Kafka event driven architecture" |
| Observability | Production Engineering | Logs, metrics, traces, alerting | "OpenTelemetry Node.js tutorial", "structured logging microservices" |
| Idempotency | Reliability | Safe retries for payment and order events | "idempotency in distributed systems" |
| Inventory Locking | Concurrency | Prevent overselling under parallel checkout | "ecommerce inventory concurrency locking" |

## 7. System Flow Diagrams

### Order Flow

```text
User
  -> API Gateway
  -> Order Service
  -> Product Service: validate product and price snapshot
  -> Order DB: create order in payment_pending state
  -> Payment Service: create Razorpay order
  -> Payment DB: store provider_order_id
  -> Frontend: return Razorpay checkout config
```

### Payment Flow

```text
User
  -> Razorpay Checkout
  -> Frontend receives payment callback
  -> Payment Service verifies signature
  -> Payment DB marks payment success
  -> Queue publishes PaymentSucceeded
  -> Order Service consumes event
  -> Order DB updates order to confirmed
  -> Notification Service sends confirmation
```

### Inventory Reservation Flow

```text
Order Service
  -> Product/Inventory Service
  -> Begin transaction
  -> Check stock_quantity >= requested_quantity
  -> Decrement stock or create reservation row
  -> Commit transaction
  -> Publish InventoryReserved
```

### Notification Flow

```text
OrderConfirmed Event
  -> Message Queue
  -> Notification Service
  -> Load template
  -> Send email/SMS/WhatsApp
  -> Store notification attempt
```

### Search Indexing Flow

```text
ProductCreated/ProductUpdated Event
  -> Message Queue
  -> Search Service
  -> Transform searchable fields
  -> Update Elasticsearch/OpenSearch index
  -> Product search reads from search index
```
