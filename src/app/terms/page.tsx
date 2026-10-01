import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

// Draft placeholder — have this reviewed before taking payments.
export default function TermsPage() {
  return (
    <div className="prose">
      <h1>Terms of use</h1>
      <p className="muted">Draft — to be finalised before paid plans launch.</p>
      <ul>
        <li>The data is compiled from public sources and provided as-is. We work to keep it accurate but can&apos;t guarantee it.</li>
        <li>Technical notes are opinion and analysis, not investment, legal or financial advice.</li>
        <li>You may quote and cite individual data points with attribution to DeepFund India.</li>
        <li>Bulk copying, scraping or reselling the database is not permitted.</li>
      </ul>
    </div>
  );
}
