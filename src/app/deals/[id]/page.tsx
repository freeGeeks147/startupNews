import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import DealNote from "@/components/DealNote";
import { domainOf, getCompany, getInvestor, getRound, getVertical, rounds, subsectorName } from "@/lib/data";
import { formatDate, formatInr, formatUsd, stageLabel } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export const dynamicParams = false;
export function generateStaticParams() {
  return rounds.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const r = getRound((await params).id);
  const c = r && getCompany(r.company);
  if (!r || !c) return {};
  return {
    title: `${c.name} raises ${formatInr(r.amount_inr)} ${stageLabel(r.stage)}`,
    description: r.note?.one_liner ?? c.description,
  };
}

export default async function DealPage({ params }: Params) {
  const r = getRound((await params).id);
  const c = r && getCompany(r.company);
  if (!r || !c) notFound();

  const vertical = getVertical(c.vertical);

  return (
    <article>
      <p className="small">
        <Link href="/deals/">← All deals</Link>
      </p>
      <div className="title-row">
        <Avatar name={c.name} domain={domainOf(c.website)} size={56} />
        <h1>
          <Link href={`/companies/${c.slug}/`} style={{ color: "inherit" }}>
            {c.name}
          </Link>{" "}
          · {stageLabel(r.stage)}
        </h1>
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
        {c.is_adjacent && <span className="badge">adjacent</span>}
        {r.sample && <span className="badge">sample record</span>}
        {r.reviewed === false && <span className="badge">unreviewed</span>}
      </div>

      <div className="actions-row">
        {r.sources[0] && (
          <a className="btn" href={r.sources[0].url} target="_blank" rel="noopener nofollow">
            Read the story on {r.sources[0].publisher} ↗
          </a>
        )}
        <Link className="btn secondary" href={`/companies/${c.slug}/`}>
          {c.name} profile
        </Link>
        {c.website && (
          <a className="btn secondary" href={c.website} target="_blank" rel="noopener nofollow">
            Website ↗
          </a>
        )}
      </div>

      {r.reviewed === false && (
        <p className="card small muted">
          These details were extracted automatically from the source below and haven&apos;t been checked by a person yet.
        </p>
      )}

      <div className="facts">
        <div>
          <span>Amount</span>
          <strong>{formatInr(r.is_undisclosed ? null : r.amount_inr)}</strong>{" "}
          <span style={{ display: "inline" }}>{formatUsd(r.amount_usd)}</span>
        </div>
        <div>
          <span>Announced</span>
          <strong>{formatDate(r.announced_on)}</strong>
        </div>
        <div>
          <span>Type</span>
          <strong>{r.kind.charAt(0).toUpperCase() + r.kind.slice(1)}</strong>
        </div>
        <div>
          <span>Founded</span>
          <strong>{c.founded_year ?? "—"}</strong>
        </div>
      </div>

      <h2>Investors</h2>
      <ul className="list-plain">
        {r.investors.map((i) => {
          const inv = getInvestor(i.slug);
          return (
            <li key={i.slug}>
              <Link href={`/investors/${i.slug}/`}>{inv?.name ?? i.slug}</Link>
              {i.is_lead && <span className="badge lead">Lead</span>}
            </li>
          );
        })}
      </ul>

      {r.note ? (
        <DealNote note={r.note} />
      ) : (
        <p className="card muted" style={{ marginTop: 24 }}>
          The technical note for this deal hasn&apos;t been written yet.
        </p>
      )}

      <h2>Sources</h2>
      {r.sources.length > 0 ? (
        <ul>
          {r.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} rel="noopener nofollow">
                {s.publisher}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">{r.sample ? "Sample record — no source." : "No source recorded."}</p>
      )}
      <p className="small muted">
        Spotted an error? <Link href="/corrections/">Send a correction</Link>.
      </p>
    </article>
  );
}
