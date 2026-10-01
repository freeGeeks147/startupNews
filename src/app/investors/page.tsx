import type { Metadata } from "next";
import Link from "next/link";
import { investors, roundsForInvestor } from "@/lib/data";
import { INVESTOR_TYPE_LABEL } from "@/lib/format";

export const metadata: Metadata = {
  title: "Deeptech and healthtech investors in India",
  description: "Investors and grant bodies backing Indian deeptech and healthtech, with every round they joined.",
};

export default function InvestorsPage() {
  const list = investors
    .map((i) => {
      const rs = roundsForInvestor(i.slug);
      return { i, count: rs.length, leads: rs.filter((r) => r.investors.some((x) => x.slug === i.slug && x.is_lead)).length };
    })
    .sort((a, b) => b.count - a.count || a.i.name.localeCompare(b.i.name));

  return (
    <>
      <h1>Investors</h1>
      <p className="lede">Who backs Indian deeptech and healthtech, and how often they lead.</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Investor</th>
              <th>Type</th>
              <th>Deals</th>
              <th>Led</th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ i, count, leads }) => (
              <tr key={i.slug}>
                <td>
                  <Link className="deal-company" href={`/investors/${i.slug}/`}>
                    {i.name}
                  </Link>
                </td>
                <td>{INVESTOR_TYPE_LABEL[i.type] ?? i.type}</td>
                <td className="num">{count}</td>
                <td className="num">{leads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
