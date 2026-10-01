import Link from "next/link";
import DealsTable from "@/components/DealsTable";
import Subscribe from "@/components/Subscribe";
import { companies, dealRows, rounds, verticals } from "@/lib/data";
import { formatInr } from "@/lib/format";
import { site } from "@/lib/site";

export default function Home() {
  const inNiche = rounds.filter((r) => !companies.find((c) => c.slug === r.company)?.is_adjacent);
  const disclosed = inNiche.reduce((s, r) => s + (r.is_undisclosed ? 0 : (r.amount_inr ?? 0)), 0);
  const grants = inNiche.filter((r) => r.kind === "grant").length;
  const notes = inNiche.filter((r) => r.note).length;

  // "Last 30 days" is measured at build time; fall back to the latest 8 if it's been quiet.
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const recent = inNiche.filter((r) => r.announced_on >= cutoff);
  const latest = recent.length > 0 ? recent : inNiche.slice(0, 8);

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
          <div className="stat">{grants}</div>
          <div className="muted small">government grants</div>
        </div>
        <div className="card">
          <div className="stat">{notes}</div>
          <div className="muted small">technical notes</div>
        </div>
      </div>

      <h2>{recent.length > 0 ? "Last 30 days" : "Latest deals"}</h2>
      <DealsTable rows={dealRows(latest)} verticals={verticals} compact />
      <p style={{ marginTop: 12 }}>
        <Link href="/deals/">See all deals and filters →</Link>
      </p>

      <h2>Sectors</h2>
      <div className="grid">
        {verticals.map((v) => {
          const count = inNiche.filter((r) => companies.find((c) => c.slug === r.company)?.vertical === v.slug).length;
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
