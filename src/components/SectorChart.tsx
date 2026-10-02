import Link from "next/link";
import type { Vertical } from "@/lib/data";
import { formatInr } from "@/lib/format";

interface Row {
  vertical: Vertical;
  total: number;
  count: number;
}

/** Horizontal bars of disclosed funding per vertical. One series, so one colour and no legend. */
export default function SectorChart({ rows }: { rows: Row[] }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <figure className="bars" aria-label="Disclosed funding by sector">
      {rows.map((r) => {
        const pct = (r.total / max) * 100;
        const tip = `${r.vertical.name}: ${formatInr(r.total)} across ${r.count} ${r.count === 1 ? "deal" : "deals"}`;
        return (
          <Link key={r.vertical.slug} href={`/sectors/${r.vertical.slug}/`} className="bar-row" title={tip}>
            <span className="bar-label">{r.vertical.name}</span>
            <span className="bar-track">
              <span className="bar-fill" style={{ width: r.total > 0 ? `max(${pct}%, 4px)` : 0 }} />
            </span>
            <span className="bar-value">
              {r.total > 0 ? formatInr(r.total) : "—"}
              <span className="muted"> · {r.count}</span>
            </span>
          </Link>
        );
      })}
      <figcaption className="muted small">Disclosed amounts; number of deals after the dot.</figcaption>
    </figure>
  );
}
