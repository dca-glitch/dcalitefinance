export const paymentMethodOptions = [
  'Wise Bank',
  'Revolut Bank',
  'Wise Card',
  'Revolut Card',
  'Cash',
  'Bank Transfer',
  'Stripe',
] as const;

export function getPaymentMethodOptions(currentValue: string): string[] {
  const trimmed = currentValue.trim();

  if (!trimmed) {
    return [...paymentMethodOptions];
  }

  if (paymentMethodOptions.includes(trimmed as (typeof paymentMethodOptions)[number])) {
    return [...paymentMethodOptions];
  }

  return [trimmed, ...paymentMethodOptions];
}
