const CRORE = 10_000_000;

/** ₹40 Cr, ₹1,200 Cr, ₹1.5 Cr, or "Undisclosed". */
export function formatInr(amount: number | null): string {
  if (amount == null) return "Undisclosed";
  const cr = amount / CRORE;
  const digits = cr >= 10 ? 0 : 1;
  return `₹${cr.toLocaleString("en-IN", { maximumFractionDigits: digits })} Cr`;
}

/** $4.8M, $357K. */
export function formatUsd(amount: number | null): string {
  if (amount == null) return "";
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(amount / 1000)}K`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "22 Sep 2026" from "2026-09-22" — parsed by hand so server and client agree. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function stageLabel(stage: string): string {
  if (stage === "A" || stage === "B" || stage === "C+") return `Series ${stage}`;
  if (stage === "pre-seed") return "Pre-seed";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

export const INVESTOR_TYPE_LABEL: Record<string, string> = {
  vc: "Venture capital",
  angel: "Angel network",
  cvc: "Corporate venture",
  govt: "Government / grant body",
  family_office: "Family office",
};
