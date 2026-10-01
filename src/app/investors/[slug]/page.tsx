import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DealsTable from "@/components/DealsTable";
import { coInvestors, dealRows, getCompany, getInvestor, investors, roundsForInvestor, subsectorName, verticals } from "@/lib/data";
import { INVESTOR_TYPE_LABEL } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return investors.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const i = getInvestor((await params).slug);
  if (!i) return {};
  return {
    title: `${i.name} — deeptech and healthtech portfolio`,
    description: `Every Indian deeptech and healthtech round ${i.name} has joined, with co-investors and sub-sectors.`,
  };
}

export default async function InvestorPage({ params }: Params) {
  const i = getInvestor((await params).slug);
  if (!i) notFound();

  const rs = roundsForInvestor(i.slug);
  const led = rs.filter((r) => r.investors.some((x) => x.slug === i.slug && x.is_lead)).length;
  const co = coInvestors(i.slug);

  const bySub = new Map<string, number>();
  for (const r of rs) {
    const sub = getCompany(r.company)?.subsector;
    if (sub) bySub.set(sub, (bySub.get(sub) ?? 0) + 1);
  }

  return (
    <>
      <p className="small">
        <Link href="/investors/">← All investors</Link>
      </p>
      <h1>{i.name}</h1>
      <div className="meta">
        <span className="badge accent">{INVESTOR_TYPE_LABEL[i.type] ?? i.type}</span>
        {[...bySub].map(([s, n]) => (
          <span key={s} className="badge">
            {subsectorName(s)} · {n}
          </span>
        ))}
      </div>

      <div className="facts">
        <div>
          <span>Deals</span>
          <strong>{rs.length}</strong>
        </div>
        <div>
          <span>Led</span>
          <strong>{led}</strong>
        </div>
        <div>
          <span>Co-investors</span>
          <strong>{co.length}</strong>
        </div>
      </div>

      <h2>Deals</h2>
      <DealsTable rows={dealRows(rs)} verticals={verticals} compact />

      {co.length > 0 && (
        <>
          <h2>Frequent co-investors</h2>
          <ul className="list-plain">
            {co.map(({ investor, count }) => (
              <li key={investor.slug}>
                <Link href={`/investors/${investor.slug}/`}>{investor.name}</Link>
                <span className="muted">
                  {count} shared {count === 1 ? "deal" : "deals"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
