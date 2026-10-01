import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DealsTable from "@/components/DealsTable";
import { companies, dealRows, getCompany, getVertical, roundsForCompany, subsectorName, verticals } from "@/lib/data";
import { formatInr } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = getCompany((await params).slug);
  if (!c) return {};
  return {
    title: `${c.name} funding — ${subsectorName(c.subsector)} startup, ${c.city}`,
    description: `${c.name}: ${c.description} Funding rounds, grants and investors.`,
  };
}

export default async function CompanyPage({ params }: Params) {
  const c = getCompany((await params).slug);
  if (!c) notFound();

  const rs = roundsForCompany(c.slug);
  const total = rs.reduce((s, r) => s + (r.is_undisclosed ? 0 : (r.amount_inr ?? 0)), 0);
  const grants = rs.filter((r) => r.kind === "grant");
  const vertical = getVertical(c.vertical);

  return (
    <>
      <p className="small">
        <Link href="/companies/">← All companies</Link>
      </p>
      <h1>{c.name}</h1>
      <p className="lede">{c.description}</p>
      <div className="meta">
        {vertical && (
          <Link className="badge accent" href={`/sectors/${vertical.slug}/`}>
            {vertical.name}
          </Link>
        )}
        <span className="badge">{subsectorName(c.subsector)}</span>
        <span className="badge">{c.city}</span>
        {c.founded_year && <span className="badge">Founded {c.founded_year}</span>}
        {c.is_adjacent && <span className="badge">adjacent</span>}
        {c.website && (
          <a className="badge" href={c.website} rel="noopener nofollow">
            Website ↗
          </a>
        )}
      </div>

      <div className="facts">
        <div>
          <span>Rounds tracked</span>
          <strong>{rs.length}</strong>
        </div>
        <div>
          <span>Disclosed total</span>
          <strong>{formatInr(total)}</strong>
        </div>
        <div>
          <span>Grants</span>
          <strong>{grants.length}</strong>
        </div>
      </div>

      {grants.length > 0 && rs.some((r) => r.kind === "equity" && r.announced_on > grants[grants.length - 1].announced_on) && (
        <p className="card small">
          <strong>Grant to equity:</strong> {c.name} received non-dilutive funding before raising an equity round.
        </p>
      )}

      <h2>Funding history</h2>
      <DealsTable rows={dealRows(rs)} verticals={verticals} compact />
    </>
  );
}
