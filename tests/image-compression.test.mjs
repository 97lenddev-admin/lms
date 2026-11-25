import assert from "node:assert/strict";
import test from "node:test";
import { compressedImageName, scaledImageDimensions } from "../src/app/credit-analyst/image-compression.ts";

test("image compression scales the longest edge without enlarging or distorting", () => {
  assert.deepEqual(scaledImageDimensions(4000, 3000, 1600), { width: 1600, height: 1200 });
  assert.deepEqual(scaledImageDimensions(600, 800, 800), { width: 600, height: 800 });
});

test("compressed images receive a JPEG filename", () => {
  assert.equal(compressedImageName("borrower.photo.png"), "borrower.photo.jpg");
  assert.equal(compressedImageName("photo"), "photo.jpg");
});
