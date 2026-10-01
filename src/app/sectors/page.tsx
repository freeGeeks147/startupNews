import type { Metadata } from "next";
import Link from "next/link";
import { roundsForVertical, verticals } from "@/lib/data";
import { formatInr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Deeptech sectors we track",
  description: "Space and defence, energy and climate hardware, semiconductors, advanced manufacturing and science-led healthtech.",
};

export default function SectorsPage() {
  return (
    <>
      <h1>Sectors</h1>
      <p className="lede">
        A deal is included when the company&apos;s core value depends on science, hardware or defensible IP — not on
        distribution or software alone.
      </p>
      <div className="grid">
        {verticals.map((v) => {
          const rs = roundsForVertical(v.slug);
          const total = rs.reduce((s, r) => s + (r.is_undisclosed ? 0 : (r.amount_inr ?? 0)), 0);
          return (
            <Link key={v.slug} href={`/sectors/${v.slug}/`} className="card" style={{ color: "inherit" }}>
              <h3>{v.name}</h3>
              <p className="small" style={{ marginBottom: 8 }}>
                {rs.length} {rs.length === 1 ? "round" : "rounds"} · {formatInr(total)}
              </p>
              <p className="muted small" style={{ margin: 0 }}>
                {v.subsectors.map((s) => s.name).join(", ")}
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}
