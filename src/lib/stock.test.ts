import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStockAvailability, getStockDeltaMessage } from './stock';

test('sales must not exceed available stock', () => {
  const result = validateStockAvailability({ available: 10, requested: 11 });
  assert.equal(result.ok, false);
  assert.equal(result.message, 'Only 10 in stock.');
});

test('positive stock adjustment messages show quantity change', () => {
  assert.equal(getStockDeltaMessage(10, 1), 'Added 1 item. New stock: 11.');
  assert.equal(getStockDeltaMessage(10, -2), 'Removed 2 items. New stock: 8.');
});
