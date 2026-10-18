const CADENCE = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function formatMoney(amount, currency) {
  const value = Number(amount);
  const code = String(currency || "").trim().toUpperCase();
  if (!Number.isFinite(value) || !/^[A-Z]{3}$/.test(code)) return "";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${code}`;
  }
}

export function formatDate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return "";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function statusLabel(status) {
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "canceled") return "Canceled";
  if (status === "recorded") return "Paid once";
  return "";
}

export function entryMeta(entry) {
  const bits = [];
  if (entry.kind === "subscription") {
    bits.push(CADENCE[entry.cadence] || "Subscription");
    if (entry.renewsOn) bits.push(`renews ${formatDate(entry.renewsOn)}`);
  } else if (entry.paidOn) {
    bits.push(`paid ${formatDate(entry.paidOn)}`);
  }
  if (entry.category) bits.push(entry.category);
  return bits.join(" · ");
}
