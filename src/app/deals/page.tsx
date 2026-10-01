import type { Metadata } from "next";
import DealsTable from "@/components/DealsTable";
import { dealRows, verticals } from "@/lib/data";

export const metadata: Metadata = {
  title: "Deeptech and healthtech funding deals in India",
  description: "Filter Indian deeptech and healthtech funding rounds and grants by sub-sector, stage, year, city, investor and amount.",
};

export default function DealsPage() {
  return (
    <>
      <h1>Deals</h1>
      <p className="lede">
        Equity rounds, debt and government grants for Indian companies whose core value depends on science, hardware or
        defensible IP. Adjacent deals are hidden by default.
      </p>
      <DealsTable rows={dealRows()} verticals={verticals} />
    </>
  );
}
