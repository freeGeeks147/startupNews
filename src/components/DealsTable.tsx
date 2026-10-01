"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DealRow, Vertical } from "@/lib/data";
import { formatDate, formatInr, formatUsd, stageLabel } from "@/lib/format";

interface Props {
  rows: DealRow[];
  verticals: Vertical[];
  /** Hide the filter bar (used for short lists on company / investor pages). */
  compact?: boolean;
}

type SortKey = "date" | "amount";

export default function DealsTable({ rows, verticals, compact = false }: Props) {
  const [q, setQ] = useState("");
  const [vertical, setVertical] = useState("");
  const [subsector, setSubsector] = useState("");
  const [stage, setStage] = useState("");
  const [kind, setKind] = useState("");
  const [year, setYear] = useState("");
  const [city, setCity] = useState("");
  const [investor, setInvestor] = useState("");
  const [minCr, setMinCr] = useState("");
  const [showAdjacent, setShowAdjacent] = useState(false);
  const [sort, setSort] = useState<SortKey>("date");

  const options = useMemo(() => {
    const uniq = (xs: string[]) => [...new Set(xs.filter(Boolean))].sort();
    return {
      stages: uniq(rows.map((r) => r.stage)),
      kinds: uniq(rows.map((r) => r.kind)),
      years: uniq(rows.map((r) => r.date.slice(0, 4))).reverse(),
      cities: uniq(rows.map((r) => r.city)),
      investors: [...new Map(rows.flatMap((r) => r.investors).map((i) => [i.slug, i.name]))].sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    };
  }, [rows]);

  const subsectors = verticals.find((v) => v.slug === vertical)?.subsectors ?? verticals.flatMap((v) => v.subsectors);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const min = Number(minCr) * 10_000_000;
    const out = rows.filter((r) => {
      if (!compact && !showAdjacent && r.isAdjacent) return false;
      if (vertical && r.vertical !== vertical) return false;
      if (subsector && r.subsector !== subsector) return false;
      if (stage && r.stage !== stage) return false;
      if (kind && r.kind !== kind) return false;
      if (year && !r.date.startsWith(year)) return false;
      if (city && r.city !== city) return false;
      if (investor && !r.investors.some((i) => i.slug === investor)) return false;
      if (minCr && (r.amountInr ?? 0) < min) return false;
      if (needle) {
        const hay = [r.company, r.subsectorName, r.city, r.oneLiner ?? "", ...r.investors.map((i) => i.name)]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    return sort === "amount"
      ? out.slice().sort((a, b) => (b.amountInr ?? -1) - (a.amountInr ?? -1))
      : out;
  }, [rows, compact, showAdjacent, vertical, subsector, stage, kind, year, city, investor, minCr, q, sort]);

  const total = filtered.reduce((s, r) => s + (r.amountInr ?? 0), 0);

  return (
    <div>
      {!compact && (
        <div className="filters">
          <label>
            Search
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company, tech, investor…" />
          </label>
          <label>
            Vertical
            <select
              value={vertical}
              onChange={(e) => {
                setVertical(e.target.value);
                setSubsector("");
              }}
            >
              <option value="">All verticals</option>
              {verticals.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sub-sector
            <select value={subsector} onChange={(e) => setSubsector(e.target.value)}>
              <option value="">All sub-sectors</option>
              {subsectors.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Stage
            <select value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">All stages</option>
              {options.stages.map((s) => (
                <option key={s} value={s}>
                  {stageLabel(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="">Equity, debt and grants</option>
              {options.kinds.map((k) => (
                <option key={k} value={k}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All years</option>
              {options.years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label>
            City
            <select value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {options.cities.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Investor
            <select value={investor} onChange={(e) => setInvestor(e.target.value)}>
              <option value="">All investors</option>
              {options.investors.map(([slug, name]) => (
                <option key={slug} value={slug}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Minimum amount (₹ Cr)
            <input inputMode="numeric" value={minCr} onChange={(e) => setMinCr(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 10" />
          </label>
          <label className="check">
            <input type="checkbox" checked={showAdjacent} onChange={(e) => setShowAdjacent(e.target.checked)} />
            Include adjacent deals
          </label>
        </div>
      )}

      {!compact && (
        <div className="toolbar">
          <span className="muted">
            {filtered.length} {filtered.length === 1 ? "deal" : "deals"} · {formatInr(total)} disclosed
          </span>
          <Link className="btn secondary" href="/pricing/" title="CSV export is part of Pro">
            Export CSV · Pro
          </Link>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>
                <button onClick={() => setSort("date")}>Date{sort === "date" ? " ↓" : ""}</button>
              </th>
              <th>Company</th>
              <th>Sub-sector</th>
              <th>Stage</th>
              <th>
                <button onClick={() => setSort("amount")}>Amount{sort === "amount" ? " ↓" : ""}</button>
              </th>
              <th>Investors</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="num">
                  <Link href={`/deals/${r.id}/`}>{formatDate(r.date)}</Link>
                </td>
                <td>
                  <Link className="deal-company" href={`/companies/${r.companySlug}/`}>
                    {r.company}
                  </Link>
                  {r.isAdjacent && <span className="badge" style={{ marginLeft: 6 }}>adjacent</span>}
                  {r.unreviewed && (
                    <span className="badge" style={{ marginLeft: 6 }} title="Extracted automatically; not yet checked by a person">
                      unreviewed
                    </span>
                  )}
                  <div className="deal-sub">{r.oneLiner ?? r.city}</div>
                </td>
                <td>{r.subsectorName}</td>
                <td>
                  <span className={r.kind === "grant" ? "badge accent" : "badge"}>{stageLabel(r.stage)}</span>
                </td>
                <td className="num">
                  {formatInr(r.amountInr)}
                  <div className="deal-sub">{formatUsd(r.amountUsd)}</div>
                </td>
                <td>
                  {r.investors.map((i, idx) => (
                    <span key={i.slug}>
                      {idx > 0 && ", "}
                      <Link href={`/investors/${i.slug}/`}>{i.name}</Link>
                      {i.isLead && <span className="muted small"> (lead)</span>}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No deals match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
