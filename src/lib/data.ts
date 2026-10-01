// Data access for the static site. Everything is read from /data/*.json at build time;
// the pipeline writes approved rounds into those files. When the project moves to
// Supabase, only this module needs to change.
import companiesJson from "@data/companies.json";
import investorsJson from "@data/investors.json";
import roundsJson from "@data/rounds.json";
import taxonomyJson from "@data/taxonomy.json";

export type Kind = "equity" | "debt" | "grant" | "acquisition";
export type InvestorType = "vc" | "angel" | "cvc" | "govt" | "family_office";

export interface Company {
  slug: string;
  name: string;
  website: string | null;
  city: string;
  founded_year: number | null;
  vertical: string;
  subsector: string;
  is_adjacent: boolean;
  description: string;
  sample?: boolean;
}

export interface Investor {
  slug: string;
  name: string;
  type: InvestorType;
  sample?: boolean;
}

export interface Note {
  one_liner: string;
  core_tech: string;
  trl: number;
  trl_reason: string;
  technical_risk: string;
  comparables: string[];
  take: string;
  written_on: string;
}

export interface Round {
  id: string;
  company: string;
  announced_on: string;
  kind: Kind;
  stage: string;
  amount_inr: number | null;
  amount_usd: number | null;
  currency_original: string | null;
  is_undisclosed: boolean;
  investors: { slug: string; is_lead: boolean }[];
  sources: { url: string; publisher: string }[];
  sample?: boolean;
  note: Note | null;
}

export interface Vertical {
  slug: string;
  name: string;
  subsectors: { slug: string; name: string }[];
}

export const companies = companiesJson as Company[];
export const investors = investorsJson as Investor[];
export const rounds = (roundsJson as Round[])
  .slice()
  .sort((a, b) => b.announced_on.localeCompare(a.announced_on));
export const verticals = taxonomyJson.verticals as Vertical[];

const companyBySlug = new Map(companies.map((c) => [c.slug, c]));
const investorBySlug = new Map(investors.map((i) => [i.slug, i]));

export const getCompany = (slug: string) => companyBySlug.get(slug);
export const getInvestor = (slug: string) => investorBySlug.get(slug);
export const getRound = (id: string) => rounds.find((r) => r.id === id);
export const getVertical = (slug: string) => verticals.find((v) => v.slug === slug);

export function subsectorName(slug: string): string {
  for (const v of verticals) {
    const s = v.subsectors.find((s) => s.slug === slug);
    if (s) return s.name;
  }
  return slug;
}

export const roundsForCompany = (slug: string) => rounds.filter((r) => r.company === slug);
export const roundsForInvestor = (slug: string) =>
  rounds.filter((r) => r.investors.some((i) => i.slug === slug));
export const roundsForVertical = (slug: string) =>
  rounds.filter((r) => getCompany(r.company)?.vertical === slug);

/** Investors who appeared in the same rounds as `slug`, with a count of shared deals. */
export function coInvestors(slug: string): { investor: Investor; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of roundsForInvestor(slug)) {
    for (const i of r.investors) {
      if (i.slug !== slug) counts.set(i.slug, (counts.get(i.slug) ?? 0) + 1);
    }
  }
  return [...counts]
    .map(([s, count]) => ({ investor: getInvestor(s)!, count }))
    .filter((x) => x.investor)
    .sort((a, b) => b.count - a.count);
}

export const hasSampleData = rounds.some((r) => r.sample);

/** Flat row used by the client-side deals table. */
export interface DealRow {
  id: string;
  date: string;
  company: string;
  companySlug: string;
  city: string;
  vertical: string;
  subsector: string;
  subsectorName: string;
  isAdjacent: boolean;
  kind: Kind;
  stage: string;
  amountInr: number | null;
  amountUsd: number | null;
  investors: { slug: string; name: string; isLead: boolean }[];
  oneLiner: string | null;
}

export function dealRows(list: Round[] = rounds): DealRow[] {
  return list.map((r) => {
    const c = getCompany(r.company);
    return {
      id: r.id,
      date: r.announced_on,
      company: c?.name ?? r.company,
      companySlug: r.company,
      city: c?.city ?? "",
      vertical: c?.vertical ?? "",
      subsector: c?.subsector ?? "",
      subsectorName: subsectorName(c?.subsector ?? ""),
      isAdjacent: c?.is_adjacent ?? false,
      kind: r.kind,
      stage: r.stage,
      amountInr: r.is_undisclosed ? null : r.amount_inr,
      amountUsd: r.is_undisclosed ? null : r.amount_usd,
      investors: r.investors.map((i) => ({
        slug: i.slug,
        name: getInvestor(i.slug)?.name ?? i.slug,
        isLead: i.is_lead,
      })),
      oneLiner: r.note?.one_liner ?? null,
    };
  });
}
