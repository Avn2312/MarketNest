import test from "node:test";
import assert from "node:assert/strict";
import { getCloudinaryPublicId } from "../utils/cloudinaryHelper.js";

test("getCloudinaryPublicId extracts public ID from standard and versioned Cloudinary URLs", () => {
    const simpleUrl = "https://res.cloudinary.com/demo/image/upload/sample.jpg";
    assert.equal(getCloudinaryPublicId(simpleUrl), "sample");

    const versionedFolderUrl = "https://res.cloudinary.com/demo/image/upload/v1234567890/products/groceries/apple.png";
    assert.equal(getCloudinaryPublicId(versionedFolderUrl), "products/groceries/apple");

    const fallbackUrl = "https://example.com/images/item.png";
    assert.equal(getCloudinaryPublicId(fallbackUrl), "item");
});
