import type { Metadata } from "next";
import Link from "next/link";
import { verticals } from "@/lib/data";

export const metadata: Metadata = {
  title: "About and methodology",
  description: "What DeepFund India tracks, how deals are collected and checked, and how the technical notes are written.",
};

export default function AboutPage() {
  return (
    <div className="prose">
      <h1>About and methodology</h1>
      <p className="lede">
        Structured funding data for India&apos;s science-heavy startups, with the technical judgment that generic trackers
        don&apos;t provide.
      </p>

      <h2>What&apos;s included</h2>
      <p>
        A deal is included when the company&apos;s core value depends on science, hardware or defensible IP — not on
        distribution or software alone. We track:
      </p>
      <ul>
        {verticals.map((v) => (
          <li key={v.slug}>
            <Link href={`/sectors/${v.slug}/`}>{v.name}</Link>: {v.subsectors.map((s) => s.name).join(", ")}
          </li>
        ))}
      </ul>
      <p>
        <strong>Excluded:</strong> pure SaaS, consumer apps, fintech, D2C, quick commerce, telemedicine marketplaces and
        edtech.
      </p>
      <p>
        <strong>Adjacent deals</strong> — for example, an EV brand that buys rather than builds its batteries — stay in
        the database but are hidden from the default filters.
      </p>

      <h2>How deals are collected</h2>
      <ol>
        <li>A daily job reads public funding roundups, press releases and grant announcements.</li>
        <li>A language model extracts the facts (company, amount, stage, investors, date) into a fixed schema.</li>
        <li>Duplicates across sources are merged, and amounts are converted to INR and USD at the announcement-date rate.</li>
        <li>Every round is reviewed by a person before it is published.</li>
      </ol>
      <p>We store facts and a link to the source only. We never republish article text.</p>

      <h2>The technical note</h2>
      <p>Each reviewed deal gets a short note:</p>
      <ul>
        <li><strong>One-liner</strong> — what the company actually builds, in plain words.</li>
        <li><strong>Core tech</strong> — the physics, chemistry or ML underneath.</li>
        <li><strong>TRL</strong> — technology readiness level, 1–9, with a reason.</li>
        <li><strong>Technical risk</strong> — the hardest unsolved problem.</li>
        <li><strong>Comparables</strong> — 2–3 Indian or global companies doing similar work.</li>
        <li><strong>Take</strong> — is the round size sensible for what has to be proven next?</li>
      </ul>
      <p className="muted">Notes are analysis, not investment advice.</p>

      <h2>Corrections</h2>
      <p>
        If something is wrong or missing, <Link href="/corrections/">tell us</Link> and we&apos;ll fix it.
      </p>
    </div>
  );
}
