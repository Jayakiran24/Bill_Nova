function formatQty(n) {
  const s = Number(n).toFixed(3).replace(/\.?0+$/, '');
  return s === '-0' ? '0' : s;
}

export function validateStockAvailability({ available, requested }) {
  if (requested <= 0) return { ok: true, available, requested };
  if (requested > available) {
    return {
      ok: false,
      message: `Only ${formatQty(available)} in stock.`,
      available,
      requested,
    };
  }
  return { ok: true, available, requested };
}

export function getStockDeltaMessage(currentQty, deltaQty) {
  const delta = Math.abs(deltaQty);
  const direction = deltaQty >= 0 ? 'Added' : 'Removed';
  const unit = delta === 1 ? 'item' : 'items';
  const newQty = currentQty + deltaQty;
  return `${direction} ${formatQty(delta)} ${unit}. New stock: ${formatQty(newQty)}.`;
}
