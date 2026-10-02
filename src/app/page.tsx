import Link from "next/link";
import Avatar from "@/components/Avatar";
import DealsTable from "@/components/DealsTable";
import SectorChart from "@/components/SectorChart";
import Subscribe from "@/components/Subscribe";
import {
  biggestRound,
  companies,
  dealRows,
  domainOf,
  getCompany,
  rounds,
  sectorTotals,
  subsectorName,
  topInvestors,
  verticals,
} from "@/lib/data";
import { formatInr, INVESTOR_TYPE_LABEL, stageLabel } from "@/lib/format";
import { site } from "@/lib/site";

export default function Home() {
  const inNiche = rounds.filter((r) => !companies.find((c) => c.slug === r.company)?.is_adjacent);
  const disclosed = inNiche.reduce((s, r) => s + (r.is_undisclosed ? 0 : (r.amount_inr ?? 0)), 0);
  const grants = inNiche.filter((r) => r.kind === "grant").length;

  // "Last 30 days" is measured at build time; fall back to the latest 8 if it's been quiet.
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const recent = inNiche.filter((r) => r.announced_on >= cutoff);
  const latest = recent.length > 0 ? recent : inNiche.slice(0, 8);

  const sectors = sectorTotals();
  const top = topInvestors(5);
  const big = biggestRound(latest);
  const bigCo = big && getCompany(big.company);
  const hot = sectors[0];

  return (
    <>
      <section className="hero">
        <h1>{site.tagline}</h1>
        <p className="lede">
          Every Indian deeptech and healthtech round — equity and government grants — in one searchable table, with a
          short technical note on what the company builds, how ready it is, and whether the round size makes sense.
        </p>
        <div className="actions">
          <Link className="btn" href="/deals/">
            Browse deals
          </Link>
          <Link className="btn secondary" href="/about/">
            How we pick deals
          </Link>
        </div>
      </section>

      <div className="stats">
        <div className="card">
          <div className="stat">{inNiche.length}</div>
          <div className="muted small">rounds tracked</div>
        </div>
        <div className="card">
          <div className="stat">{formatInr(disclosed)}</div>
          <div className="muted small">disclosed funding</div>
        </div>
        <div className="card">
          <div className="stat">{companies.length}</div>
          <div className="muted small">companies</div>
        </div>
        <div className="card">
          <div className="stat">{grants}</div>
          <div className="muted small">government grants</div>
        </div>
      </div>

      <div className="highlights">
        {big && bigCo && (
          <Link href={`/deals/${big.id}/`} className="card highlight">
            <span className="kicker">Biggest round {recent.length > 0 ? "this month" : "recently"}</span>
            <span className="who">
              <Avatar name={bigCo.name} domain={domainOf(bigCo.website)} size={40} />
              <span className="big">{bigCo.name}</span>
            </span>
            <span>
              <strong>{formatInr(big.is_undisclosed ? null : big.amount_inr)}</strong> {stageLabel(big.stage)} ·{" "}
              {subsectorName(bigCo.subsector)}
            </span>
            <span className="muted small">{bigCo.description}</span>
          </Link>
        )}
        {top[0] && (
          <Link href={`/investors/${top[0].investor.slug}/`} className="card highlight">
            <span className="kicker">Most active investor</span>
            <span className="big">{top[0].investor.name}</span>
            <span>
              <strong>{top[0].count}</strong> {top[0].count === 1 ? "deal" : "deals"}, led {top[0].leads}
            </span>
            <span className="muted small">{INVESTOR_TYPE_LABEL[top[0].investor.type] ?? top[0].investor.type}</span>
          </Link>
        )}
        {hot && hot.count > 0 && (
          <Link href={`/sectors/${hot.vertical.slug}/`} className="card highlight">
            <span className="kicker">Hottest sector</span>
            <span className="big">{hot.vertical.name}</span>
            <span>
              <strong>{formatInr(hot.total)}</strong> across {hot.count} {hot.count === 1 ? "deal" : "deals"}
            </span>
            <span className="muted small">{hot.vertical.subsectors.map((s) => s.name).join(", ")}</span>
          </Link>
        )}
      </div>

      <h2>{recent.length > 0 ? "Last 30 days" : "Latest deals"}</h2>
      <DealsTable rows={dealRows(latest)} verticals={verticals} compact />
      <p style={{ marginTop: 12 }}>
        <Link href="/deals/">See all deals and filters →</Link>
      </p>

      <div className="two-col">
        <section>
          <h2>Where the money went</h2>
          <SectorChart rows={sectors} />
        </section>
        <section>
          <h2>Top investors</h2>
          <ul className="list-plain">
            {top.map(({ investor, count, leads }) => (
              <li key={investor.slug}>
                <Link href={`/investors/${investor.slug}/`}>{investor.name}</Link>
                <span className="muted small">
                  {count} {count === 1 ? "deal" : "deals"}
                  {leads > 0 && ` · led ${leads}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <h2>Sectors</h2>
      <div className="grid">
        {verticals.map((v) => {
          const count = sectors.find((s) => s.vertical.slug === v.slug)?.count ?? 0;
          return (
            <Link key={v.slug} href={`/sectors/${v.slug}/`} className="card" style={{ color: "inherit" }}>
              <h3>{v.name}</h3>
              <p className="muted small" style={{ margin: 0 }}>
                {count} {count === 1 ? "round" : "rounds"} · {v.subsectors.map((s) => s.name).join(", ")}
              </p>
            </Link>
          );
        })}
      </div>

      <Subscribe />
    </>
  );
}
