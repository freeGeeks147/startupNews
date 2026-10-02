import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import DealsTable from "@/components/DealsTable";
import {
  companies,
  dealRows,
  domainOf,
  getCompany,
  getInvestor,
  getVertical,
  roundsForCompany,
  similarCompanies,
  subsectorName,
  verticals,
} from "@/lib/data";
import { formatDate, formatInr } from "@/lib/format";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return companies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = getCompany((await params).slug);
  if (!c) return {};
  const where = c.city ? `, ${c.city}` : "";
  return {
    title: `${c.name} funding — ${subsectorName(c.subsector)} startup${where}`,
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
  const domain = domainOf(c.website);
  const backers = [...new Set(rs.flatMap((r) => r.investors.map((i) => i.slug)))].map((s) => getInvestor(s)).filter(Boolean);
  const news = rs.flatMap((r) => r.sources.map((s) => ({ ...s, date: r.announced_on })));
  const similar = similarCompanies(c.slug);

  return (
    <>
      <p className="small">
        <Link href="/companies/">← All companies</Link>
      </p>
      <div className="title-row">
        <Avatar name={c.name} domain={domain} size={56} />
        <h1>{c.name}</h1>
      </div>
      <p className="lede">{c.description}</p>
      <div className="meta">
        {vertical && (
          <Link className="badge accent" href={`/sectors/${vertical.slug}/`}>
            {vertical.name}
          </Link>
        )}
        <span className="badge">{subsectorName(c.subsector)}</span>
        {c.city && <span className="badge">{c.city}</span>}
        {c.founded_year && <span className="badge">Founded {c.founded_year}</span>}
        {c.is_adjacent && <span className="badge">adjacent</span>}
      </div>
      {c.website && (
        <div className="actions-row">
          <a className="btn" href={c.website} target="_blank" rel="noopener nofollow">
            Visit {domain} ↗
          </a>
        </div>
      )}

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
          <span>Investors</span>
          <strong>{backers.length}</strong>
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
      <DealsTable rows={dealRows(rs)} verticals={verticals} compact onCompanyPage />

      {backers.length > 0 && (
        <>
          <h2>Backed by</h2>
          <div className="meta">
            {backers.map((i) => (
              <Link key={i!.slug} className="badge" href={`/investors/${i!.slug}/`}>
                {i!.name}
              </Link>
            ))}
          </div>
        </>
      )}

      {news.length > 0 && (
        <>
          <h2>In the news</h2>
          <ul className="list-plain">
            {news.map((n) => (
              <li key={n.url}>
                <a href={n.url} target="_blank" rel="noopener nofollow">
                  {n.publisher} ↗
                </a>
                <span className="muted small">{formatDate(n.date)}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {similar.length > 0 && (
        <>
          <h2>Similar companies</h2>
          <div className="grid">
            {similar.map((s) => (
              <Link key={s.slug} href={`/companies/${s.slug}/`} className="card highlight">
                <span className="who">
                  <Avatar name={s.name} domain={domainOf(s.website)} size={32} />
                  <strong>{s.name}</strong>
                </span>
                <span className="muted small">{s.description}</span>
                <span className="small">{subsectorName(s.subsector)}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
