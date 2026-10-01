import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free weekly digest; Pro unlocks full history, technical notes, CSV export and alerts.",
};

const tiers = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    features: [
      "Deals from the last 30 days",
      "Weekly email digest with one chart",
      "Basic company and investor pages",
      "First line of every technical note",
    ],
    cta: "Get the digest",
  },
  {
    name: "Pro",
    price: "₹999",
    period: "/month · or ₹9,999/year",
    features: [
      "Full history from 2024, every filter",
      "Full technical note on every deal",
      "CSV export",
      "Government grants and non-dilutive funding",
      "Alerts by sub-sector or investor",
    ],
    cta: "Coming soon",
  },
  {
    name: "Team",
    price: "₹4,999",
    period: "/month · up to 5 seats",
    features: ["Everything in Pro", "JSON API", "Quarterly report data", "Co-investor network view"],
    cta: "Coming soon",
  },
];

export default function PricingPage() {
  return (
    <>
      <h1>Pricing</h1>
      <p className="lede">
        The digest stays free. Pro is for analysts, angels and founders who need the full history and the technical read.
      </p>
      <div className="pricing">
        {tiers.map((t) => (
          <div key={t.name} className="card">
            <h3>{t.name}</h3>
            <div className="price">{t.price}</div>
            <div className="muted small">{t.period || "forever"}</div>
            <ul>
              {t.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <span className={t.name === "Free" ? "btn" : "btn secondary"} aria-disabled="true">
              {t.cta}
            </span>
          </div>
        ))}
      </div>
      <p className="muted small" style={{ marginTop: 24 }}>
        Paid plans open after launch. Custom sector reports are available on request.
      </p>
    </>
  );
}
