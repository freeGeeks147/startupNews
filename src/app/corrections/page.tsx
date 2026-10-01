import type { Metadata } from "next";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Corrections",
  description: "Report a missing deal or an error in the DeepFund India database.",
};

const ISSUES_URL = "https://github.com/freeGeeks147/startupNews/issues/new";

export default function CorrectionsPage() {
  return (
    <div className="prose">
      <h1>Corrections</h1>
      <p className="lede">Spotted a wrong amount, a missing investor or a deal we haven&apos;t covered? Let us know.</p>
      <p>Please include:</p>
      <ul>
        <li>The company and round (or a link to the deal page)</li>
        <li>What&apos;s wrong or missing</li>
        <li>A public source — press release, filing or news article</li>
      </ul>
      <p>
        {site.contactEmail ? (
          <a className="btn" href={`mailto:${site.contactEmail}?subject=Correction`}>
            Email a correction
          </a>
        ) : (
          <a className="btn" href={ISSUES_URL} rel="noopener">
            Open a correction request
          </a>
        )}
      </p>
      <p className="muted small">Founders can also ask us to update company details or add a website.</p>
    </div>
  );
}
