import test from "node:test";
import assert from "node:assert/strict";
import {
    buildProductListQuery,
    createProductCatalogService,
    parseProductListOptions,
} from "../services/productCatalogService.js";
import {
    PRODUCT_SEARCH_EVENTS,
    clearProductSearchEventHandlers,
    publishProductSearchEvent,
    subscribeProductSearchEvent,
} from "../services/productSearchEventBus.js";

class TestError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
    }
}

const createFindChain = (products, calls) => ({
    sort(sort) {
        calls.sort = sort;
        return this;
    },
    skip(skip) {
        calls.skip = skip;
        return this;
    },
    limit(limit) {
        calls.limit = limit;
        return this;
    },
    lean: async () => products,
});

test("product list options clamp pagination and build active public filters", () => {
    const options = parseProductListOptions({
        page: "2",
        limit: "250",
        category: "Vegetables",
        search: "tomato",
    });
    const filter = buildProductListQuery(options);

    assert.equal(options.page, 2);
    assert.equal(options.limit, 100);
    assert.equal(options.skip, 100);
    assert.equal(filter.category, "Vegetables");
    assert.deepEqual(filter.$and[0], {
        $or: [{ status: "active" }, { status: { $exists: false } }],
    });
    assert.equal(filter.$and[1].$or.length, 3);
});

test("product catalog service returns paginated product results", async () => {
    const calls = {};
    const ProductModel = {
        find: (filter) => {
            calls.filter = filter;
            return createFindChain(
                [
                    {
                        _id: "p1",
                        name: "Tomato",
                        category: "Vegetables",
                        stockQuantity: 5,
                        status: "active",
                    },
                ],
                calls
            );
        },
        countDocuments: async (filter) => {
            calls.countFilter = filter;
            return 11;
        },
    };
    const catalog = createProductCatalogService({
        ProductModel,
        ErrorClass: TestError,
    });

    const result = await catalog.listProducts({
        page: "2",
        limit: "5",
        category: "Vegetables",
    });

    assert.deepEqual(calls.filter, {
        category: "Vegetables",
        $or: [{ status: "active" }, { status: { $exists: false } }],
    });
    assert.deepEqual(calls.countFilter, calls.filter);
    assert.deepEqual(calls.sort, { createdAt: -1 });
    assert.equal(calls.skip, 5);
    assert.equal(calls.limit, 5);
    assert.equal(result.products[0].inStock, true);
    assert.deepEqual(result.pagination, {
        page: 2,
        limit: 5,
        total: 11,
        pages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
    });
});

test("product updates are scoped to seller ownership and emit search events", async () => {
    const events = [];
    const calls = {};
    const ProductModel = {
        findOneAndUpdate: async (filter, update) => {
            calls.filter = filter;
            calls.update = update;
            return {
                _id: filter._id,
                sellerId: filter.sellerId,
                name: update.name,
                stockQuantity: update.stockQuantity,
                status: update.status,
            };
        },
    };
    const catalog = createProductCatalogService({
        ProductModel,
        ErrorClass: TestError,
        publishSearchEvent: async (eventName, payload) => {
            events.push({ eventName, payload });
        },
    });

    const product = await catalog.updateProduct({
        productId: "p1",
        sellerId: "s1",
        updates: {
            name: "Updated Tomato",
            stockQuantity: 0,
            status: "draft",
        },
    });

    assert.deepEqual(calls.filter, { _id: "p1", sellerId: "s1" });
    assert.equal(calls.update.inStock, false);
    assert.equal(product.inStock, false);
    assert.equal(events[0].eventName, PRODUCT_SEARCH_EVENTS.PRODUCT_UPDATED);
    assert.deepEqual(events[0].payload, {
        productId: "p1",
        sellerId: "s1",
        status: "draft",
        product,
    });
});

test("product search event bus fan-outs events to subscribers", async () => {
    clearProductSearchEventHandlers();
    const received = [];
    const unsubscribe = subscribeProductSearchEvent(
        PRODUCT_SEARCH_EVENTS.PRODUCT_CREATED,
        async (payload) => {
            received.push(payload);
        }
    );

    await publishProductSearchEvent(PRODUCT_SEARCH_EVENTS.PRODUCT_CREATED, {
        productId: "p1",
    });
    unsubscribe();
    await publishProductSearchEvent(PRODUCT_SEARCH_EVENTS.PRODUCT_CREATED, {
        productId: "p2",
    });

    assert.deepEqual(received, [{ productId: "p1" }]);
});
