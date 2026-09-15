export function cents(value: string) {
  if (!/^\d{1,5}(\.\d{1,2})?$/.test(value))
    throw new Error('Enter a price between 0 and 99999.99.');
  return Math.round(Number(value) * 100);
}
export const money = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    value / 100,
  );
export function bundlePrice(
  bundle: number,
  images: { price_cents: number; owned: boolean; credit_cents: number }[],
) {
  const remaining = images.filter((i) => !i.owned);
  const credit = images
    .filter((i) => i.owned)
    .reduce((sum, i) => sum + i.credit_cents, 0);
  return Math.min(
    remaining.reduce((sum, i) => sum + i.price_cents, 0),
    Math.max(0, bundle - credit),
  );
}
