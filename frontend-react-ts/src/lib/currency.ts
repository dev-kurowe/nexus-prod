export function formatRupiah(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "Rp 0";
  const numeric =
    typeof amount === "string" ? parseFloat(amount) : typeof amount === "number" ? amount : 0;
  if (isNaN(numeric)) return "Rp 0";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(numeric);
}
