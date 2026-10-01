import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DealsTable from "@/components/DealsTable";
import { dealRows, getCompany, getVertical, roundsForVertical, verticals } from "@/lib/data";
import { formatInr } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return verticals.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const v = getVertical((await params).slug);
  if (!v) return {};
  return {
    title: `${v.name} startup funding in India`,
    description: `Funding rounds and grants for Indian ${v.name.toLowerCase()} startups: ${v.subsectors.map((s) => s.name).join(", ")}.`,
  };
}

export default async function SectorPage({ params }: Params) {
  const v = getVertical((await params).slug);
  if (!v) notFound();

  const rs = roundsForVertical(v.slug);
  const total = rs.reduce((s, r) => s + (r.is_undisclosed ? 0 : (r.amount_inr ?? 0)), 0);

  return (
    <>
      <p className="small">
        <Link href="/sectors/">← All sectors</Link>
      </p>
      <h1>{v.name}</h1>
      <div className="meta">
        {v.subsectors.map((s) => {
          const n = rs.filter((r) => getCompany(r.company)?.subsector === s.slug).length;
          return (
            <span key={s.slug} className="badge">
              {s.name} · {n}
            </span>
          );
        })}
      </div>
      <div className="facts">
        <div>
          <span>Rounds</span>
          <strong>{rs.length}</strong>
        </div>
        <div>
          <span>Disclosed total</span>
          <strong>{formatInr(total)}</strong>
        </div>
      </div>
      <DealsTable rows={dealRows(rs)} verticals={verticals} compact />
    </>
  );
}
