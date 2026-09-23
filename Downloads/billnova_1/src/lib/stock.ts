export function validateStockAvailability({
  available,
  requested,
}: {
  available: number;
  requested: number;
}): { ok: boolean; message?: string; available: number; requested: number } {
  if (requested <= 0) return { ok: true, available, requested };
  if (requested > available) {
    return {
      ok: false,
      message: `Only ${Number(available).toFixed(3).replace(/\.?0+$/, '')} in stock.`,
      available,
      requested,
    };
  }
  return { ok: true, available, requested };
}

export function getStockDeltaMessage(currentQty: number, deltaQty: number): string {
  const delta = Math.abs(deltaQty);
  const direction = deltaQty >= 0 ? 'Added' : 'Removed';
  const itemWord = delta === 1 ? 'item' : 'items';
  const newQty = currentQty + deltaQty;
  return `${direction} ${Number(delta).toFixed(3).replace(/\.?0+$/, '')} ${itemWord}. New stock: ${Number(newQty).toFixed(3).replace(/\.?0+$/, '')}.`;
}
