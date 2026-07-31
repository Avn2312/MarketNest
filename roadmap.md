# MarketNest Roadmap: Production-Grade + AI Upgrade

This roadmap combines practical marketplace engineering upgrades with AI features that are meaningful in interviews and useful in a real product.

## 1. Must-Have: Industry Baseline

These are not "extra features." These are the minimum expectations for a serious commerce backend.

### Auth System: JWT + Refresh Tokens

What to build:

- Short-lived access tokens.
- Long-lived refresh tokens stored server-side as hashes.
- Token rotation on refresh.
- Logout by revoking refresh tokens.
- Role-based access for customer, seller, and admin.

Why it is important:

- Access tokens reduce database reads.
- Refresh tokens give better UX without keeping users logged in forever.
- Token revocation is needed when users log out or accounts are compromised.

How this is used in real companies:

- Access token expiry is usually short.
- Refresh token storage is audited.
- Suspicious refresh attempts can trigger account protection.

Why interviewers care:

- It tests whether you know real auth beyond "generate JWT and done."

Common mistakes engineers make:

- Storing raw refresh tokens.
- Never rotating tokens.
- Keeping JWT expiry too long.
- Trusting frontend role checks instead of backend authorization.

### Proper Order Lifecycle

What to build:

Order statuses:

```text
cart -> payment_pending -> confirmed -> packed -> shipped -> delivered
                             -> cancelled
                             -> return_requested -> return_approved -> refunded
```

Add:

- `order_status_history`
- seller-visible fulfillment state
- cancellation rules
- return/refund rules
- payment state separate from order state

Why it is important:

- Real commerce is not just "order placed."
- Support, refunds, shipping, and seller operations need audit history.

How this is used in real companies:

- Every status change is tracked for support teams, dispute resolution, and analytics.

Why interviewers care:

- It shows product engineering maturity and domain modeling.

Common mistakes engineers make:

- Using one string field without transition rules.
- Allowing impossible transitions like `delivered -> packed`.
- Mixing payment status and delivery status.

### Input Validation

What to build:

- Validate all request bodies using Zod/Joi.
- Validate route params.
- Validate query params for pagination/search.
- Strip unknown fields.
- Keep separate schemas for create/update operations.

Why it is important:

- Prevents invalid data from entering the system.
- Reduces security and runtime errors.

How this is used in real companies:

- APIs validate at boundaries before business logic runs.
- Validation errors are structured and consistent.

Why interviewers care:

- It shows you understand backend trust boundaries.

Common mistakes engineers make:

- Validating only on the frontend.
- Accepting arbitrary fields and writing them to DB.
- Not validating pagination limits.

### Logging

What to build:

- Structured logs with Winston or Pino.
- Request ID/correlation ID.
- User ID where safe.
- Service name and route.
- Error stack in server logs, clean error response to client.

Why it is important:

- Debugging production without structured logs is painful.

How this is used in real companies:

- Logs are shipped to systems like ELK, Datadog, Grafana Loki, or CloudWatch.

Why interviewers care:

- Production engineering is not just writing endpoints; it is operating them.

Common mistakes engineers make:

- Using only `console.log`.
- Logging secrets, tokens, or full payment payloads.
- No request correlation across services.

### Error Handling

What to build:

- Central error middleware.
- Custom error classes.
- Standard response shape.
- Domain errors: `OUT_OF_STOCK`, `PAYMENT_FAILED`, `INVALID_COUPON`.
- Retry-safe handling for queues and webhooks.

Why it is important:

- Users need clear failures.
- Engineers need debuggable failures.

How this is used in real companies:

- Error codes are used by frontend, support dashboards, and monitoring alerts.

Why interviewers care:

- It shows reliability thinking.

Common mistakes engineers make:

- Returning raw exception messages.
- Treating all errors as HTTP 500.
- Not distinguishing user errors from system errors.

## 2. Strong Differentiators

These make MarketNest look less like a clone and more like a real marketplace platform.

### Advanced Search: Elasticsearch/OpenSearch

What to build:

- Product search index.
- Filters by category, price, seller, rating, availability.
- Sorting by relevance, price, newest, discount.
- Typo tolerance and autocomplete.

Why it matters:

- Marketplace conversion depends heavily on discovery.

How this is used in real companies:

- Product data is stored in PostgreSQL but search reads from Elasticsearch/OpenSearch.
- Product updates publish events to refresh the search index.

Why interviewers care:

- Search separates demo apps from real catalog systems.

Common mistakes engineers make:

- Querying the primary DB with inefficient regex search.
- Rebuilding the whole index on every product update.
- Forgetting eventual consistency between DB and search index.

### Recommendation System

What to build:

- Similar products.
- Frequently bought together.
- Personalized home feed.
- Recently viewed and cart-based recommendations.

Why it matters:

- Recommendations increase conversion and average order value.

How this is used in real companies:

- Start rule-based, then add collaborative filtering or embeddings.
- Track events like views, add-to-cart, purchase, and search clicks.

Why interviewers care:

- It shows you can connect product impact with data systems.

Common mistakes engineers make:

- Adding AI before collecting user behavior events.
- Recommending out-of-stock products.
- Not measuring click-through or conversion.

### Seller Dashboard

What to build:

- Product CRUD with seller ownership.
- SKU inventory controls.
- Low-stock alerts.
- Revenue by product.
- Order fulfillment board.
- Return/refund queue.
- Product approval status.

Why it matters:

- A marketplace succeeds only if sellers can operate efficiently.

How this is used in real companies:

- Seller tools are often a major internal product, not an afterthought.

Why interviewers care:

- It shows that you understand both buyer-side and seller-side product engineering.

Common mistakes engineers make:

- Letting any seller edit any product.
- Showing global revenue instead of seller-specific revenue.
- No audit trail for seller changes.

### Real-Time Updates

What to build:

- WebSocket or Server-Sent Events for order status.
- Seller dashboard live order updates.
- Low-stock events.
- Payment success/failure updates.

Why it matters:

- Users should not manually refresh after payment or order changes.

How this is used in real companies:

- Real-time systems subscribe to backend events and push updates to users.

Why interviewers care:

- It tests event-driven thinking and frontend/backend coordination.

Common mistakes engineers make:

- Polling every second.
- Broadcasting private order data to the wrong user.
- Not handling reconnects.

## 3. Advanced Engineering

### Redis Caching

What to build:

- Cache product listing pages.
- Cache category metadata.
- Cache public coupons.
- Use Redis rate limiting instead of in-memory maps.

Why it matters:

- Product browsing traffic is much higher than checkout traffic.

How this is used in real companies:

- Redis reduces DB load and helps with distributed locks/rate limits.

Why interviewers care:

- It shows you can identify hot paths and reduce load safely.

Common mistakes engineers make:

- Caching user-specific data without proper keys.
- No cache invalidation strategy.
- Caching stale stock values during checkout.

### CDN Usage

What to build:

- Serve product images through Cloudinary/CDN transformations.
- Use responsive image sizes.
- Cache static frontend assets.

Why it matters:

- Images dominate e-commerce page weight.

How this is used in real companies:

- Product images are optimized, resized, cached, and served from edge locations.

Why interviewers care:

- Frontend performance affects conversion and SEO.

Common mistakes engineers make:

- Uploading huge images and serving originals everywhere.
- Not setting cache headers.
- Ignoring mobile image sizes.

### Message Queues: Kafka/RabbitMQ

What to build:

- Events: `OrderCreated`, `PaymentSucceeded`, `InventoryReserved`, `OrderCancelled`, `ReturnRequested`.
- Retry policy.
- Dead letter queue.
- Idempotent consumers.

Why it matters:

- Checkout, notifications, analytics, and fulfillment should not all block one request.

How this is used in real companies:

- Queues decouple services and absorb traffic spikes.

Why interviewers care:

- Distributed systems interviews often test async communication and failure handling.

Common mistakes engineers make:

- Assuming events are processed exactly once.
- No idempotency key.
- No dead letter queue.

### Inventory Locking

What to build:

- Stock reservation table.
- Reservation expiry time.
- Transaction-safe decrement.
- Release stock on payment timeout/cancel/refund.

Why it matters:

- Overselling destroys marketplace trust.

How this is used in real companies:

- Inventory systems reserve stock during checkout and release it if payment fails.

Why interviewers care:

- Concurrency is one of the hardest real-world e-commerce problems.

Common mistakes engineers make:

- Checking stock in one query and decrementing in another without transaction/lock.
- Not handling payment timeout.
- Not testing parallel checkout.

### Observability: Logging and Monitoring

What to build:

- Winston/Pino structured logs.
- Prometheus metrics.
- Grafana dashboards.
- OpenTelemetry tracing.
- Alerts for payment failures, webhook errors, high 500 rate, queue lag.

Why it matters:

- You cannot operate microservices blindly.

How this is used in real companies:

- Teams watch p95 latency, error rate, throughput, queue lag, and payment success rate.

Why interviewers care:

- It shows production readiness.

Common mistakes engineers make:

- Adding logs but no metrics.
- Adding metrics but no alerts.
- Not tracing requests across services.

## 4. AI Integration: Detailed

### 1. Smart Product Recommendation

Problem it solves:

- Users need relevant products without browsing the entire catalog.
- Sellers need better product discovery.

How it works:

1. Track events: product view, search, add-to-cart, purchase, wishlist.
2. Generate product embeddings from title, category, description, tags, and reviews.
3. Store embeddings in a vector DB.
4. For a product page, fetch nearest products by vector similarity.
5. Rerank by stock, price, margin, rating, and user behavior.

System design flow:

```text
User Event -> Event Queue -> Recommendation Pipeline -> Vector DB
Product Page -> Recommendation API -> Vector DB -> Reranker -> Response
```

Tech stack:

- Embeddings: OpenAI embeddings or sentence-transformers.
- Vector DB: Qdrant, Pinecone, Weaviate, or pgvector.
- Pipeline: Node worker, Python worker, or scheduled batch job.
- Storage: PostgreSQL for product metadata, vector DB for similarity.

How this is used in real companies:

- Companies combine ML similarity with business rules. Pure vector similarity is rarely enough.

Why interviewers care:

- It shows you understand ranking systems, not just "call an AI API."

Common mistakes engineers make:

- Recommending unavailable products.
- Not tracking impressions/clicks.
- No offline or online evaluation.

### 2. AI Search Ranking

Problem it solves:

- Keyword search fails for intent-based queries like "healthy breakfast under 200" or "snacks for kids."

How it works:

1. Convert query to embedding.
2. Retrieve semantically similar products from vector DB.
3. Combine with Elasticsearch keyword matches.
4. Rerank by availability, rating, seller reliability, price, and conversion history.

System design flow:

```text
Search Query -> Search API
  -> Elasticsearch keyword search
  -> Vector DB semantic search
  -> Ranking Service
  -> Product Results
```

Tech stack:

- Elasticsearch/OpenSearch for keyword and filters.
- Vector DB or Elasticsearch vector search for semantic retrieval.
- LLM optional for query understanding/category extraction.
- Redis cache for popular queries.

How this is used in real companies:

- Search systems often blend lexical search, semantic search, personalization, and business constraints.

Why interviewers care:

- Search is a high-impact marketplace feature with real system design depth.

Common mistakes engineers make:

- Using only LLM responses instead of returning real catalog items.
- Ignoring filters after semantic search.
- No latency budget.

### 3. Fraud Detection

Problem it solves:

- Detects risky transactions, coupon abuse, fake accounts, suspicious COD orders, and refund abuse.

How it works:

1. Collect behavior features: account age, order velocity, failed payments, address reuse, coupon usage, return rate.
2. Start with rule-based scoring.
3. Move to anomaly detection or supervised classification when enough labels exist.
4. Flag suspicious orders for manual review.

System design flow:

```text
Checkout Attempt -> Fraud Service
  -> Feature Store
  -> Rules/ML Model
  -> Risk Score
  -> Allow / Review / Block
```

Tech stack:

- PostgreSQL for historical features.
- Redis for velocity counters.
- Python sklearn/XGBoost for ML model.
- Queue for async review workflows.
- LLM only for explaining risk reasons to internal support, not as the source of truth.

How this is used in real companies:

- Fraud systems usually start with rules and gradually become ML-assisted.

Why interviewers care:

- It proves you understand marketplace trust and risk.

Common mistakes engineers make:

- Blocking users based only on LLM output.
- No audit trail for fraud decisions.
- No way to review false positives.

### 4. Review Sentiment Analysis

Problem it solves:

- Buyers need summarized product quality signals.
- Sellers need feedback about product issues.
- Marketplace needs moderation for spam/abuse.

How it works:

1. User submits review.
2. Review Service stores raw review.
3. NLP pipeline classifies sentiment and extracts topics.
4. Moderation model flags abusive/spam content.
5. Product page shows sentiment summary and common pros/cons.

System design flow:

```text
Review Submitted -> Review DB -> NLP Worker
  -> Sentiment Score
  -> Topic Extraction
  -> Moderation Flag
  -> Product Review Summary
```

Tech stack:

- LLM for topic extraction and summarization.
- Smaller NLP model for sentiment classification.
- Queue for async processing.
- PostgreSQL for review data.
- Search index for review filtering.

How this is used in real companies:

- Reviews are used for ranking, trust, moderation, seller quality, and product improvement.

Why interviewers care:

- It connects AI with trust/safety and marketplace quality.

Common mistakes engineers make:

- Running expensive LLM calls synchronously during review submission.
- Not storing model outputs separately.
- No human moderation path.

## 5. Learning Mapping

| Feature | Topic | Concepts | YouTube Search Keywords |
|---|---|---|---|
| JWT + refresh tokens | Authentication | Token rotation, revocation, cookie security | "JWT refresh token rotation Node.js" |
| Role-based access | Authorization | RBAC, seller ownership, admin permissions | "role based access control Node.js Express" |
| Order lifecycle | Domain Modeling | State machines, audit history, transitions | "order management system design ecommerce" |
| Input validation | API Security | Zod/Joi schemas, request boundaries | "Joi validation Express API", "Zod Express validation" |
| Structured logging | Observability | Correlation ID, log aggregation | "Winston structured logging Node.js" |
| Error handling | Backend Reliability | Custom errors, error codes, retryable failures | "Express error handling best practices" |
| Elasticsearch | Search | Inverted index, filters, autocomplete, ranking | "Elasticsearch ecommerce search tutorial" |
| Recommendation system | ML Systems | Collaborative filtering, embeddings, reranking | "recommendation system design ecommerce" |
| Seller dashboard | Marketplace Product | Seller analytics, fulfillment, product moderation | "marketplace seller dashboard features" |
| Real-time updates | Realtime Systems | WebSockets, SSE, event subscriptions | "WebSocket order tracking Node.js" |
| Redis caching | Scalability | Cache-aside, TTL, invalidation, rate limiting | "Redis caching Node.js tutorial" |
| CDN | Web Performance | Image optimization, edge caching, cache headers | "CDN explained web performance" |
| Kafka/RabbitMQ | Distributed Systems | Events, retries, DLQ, idempotency | "RabbitMQ microservices Node.js", "Kafka event driven architecture" |
| Inventory locking | Concurrency | Row locks, reservations, overselling prevention | "PostgreSQL row lock inventory system" |
| Monitoring | Production Ops | Metrics, dashboards, alerts, SLOs | "Prometheus Grafana Node.js monitoring" |
| AI recommendations | AI/ML | Embeddings, vector similarity, reranking | "vector embeddings recommendation system" |
| AI search ranking | AI Search | Semantic search, hybrid search, query understanding | "semantic search ecommerce vector database" |
| Fraud detection | Risk Systems | Anomaly detection, feature engineering, velocity rules | "fraud detection machine learning ecommerce" |
| Review sentiment | NLP | Sentiment analysis, topic extraction, moderation | "review sentiment analysis NLP pipeline" |

## Execution Order

Recommended build order:

1. PostgreSQL schema and migration scripts.
2. Auth with refresh tokens.
3. Order lifecycle and payment state redesign.
4. Razorpay Payment Service.
5. Inventory reservation with transactions.
6. API Gateway.
7. Product Service extraction.
8. Order Service extraction.
9. Redis cache and rate limiting.
10. Message queue and Notification Service.
11. Elasticsearch search.
12. Recommendation and AI search.
13. Fraud detection.
14. Review sentiment analysis.
15. Observability dashboards and load testing.

This order is intentionally boring. Real production migrations should be boring: one risky change at a time, measured, tested, and reversible.
