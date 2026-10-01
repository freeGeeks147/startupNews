import type { Metadata } from "next";
import Link from "next/link";
import { companies, getVertical, roundsForCompany, subsectorName } from "@/lib/data";
import { formatInr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Indian deeptech and healthtech startups",
  description: "Every company in the DeepFund India database with its funding history.",
};

export default function CompaniesPage() {
  const list = companies
    .map((c) => {
      const rs = roundsForCompany(c.slug);
      const total = rs.reduce((s, r) => s + (r.is_undisclosed ? 0 : (r.amount_inr ?? 0)), 0);
      return { c, count: rs.length, total };
    })
    .sort((a, b) => a.c.name.localeCompare(b.c.name));

  return (
    <>
      <h1>Companies</h1>
      <p className="lede">{list.length} companies with at least one tracked round or grant.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Sector</th>
              <th>City</th>
              <th>Rounds</th>
              <th>Disclosed total</th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ c, count, total }) => (
              <tr key={c.slug}>
                <td>
                  <Link className="deal-company" href={`/companies/${c.slug}/`}>
                    {c.name}
                  </Link>
                  <div className="deal-sub">{c.description}</div>
                </td>
                <td>
                  {subsectorName(c.subsector)}
                  <div className="deal-sub">{getVertical(c.vertical)?.name}</div>
                </td>
                <td>{c.city}</td>
                <td className="num">{count}</td>
                <td className="num">{formatInr(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
