export function formatCurrency(amount: number | undefined | null): string {
  const num = Number(amount) || 0;
  return num.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
