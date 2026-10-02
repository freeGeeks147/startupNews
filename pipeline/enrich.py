"""Enrich: look up each new company on the web for its website, city, founding year and a real description.

Funding roundups often give only a name and an amount, which makes thin company pages. This step
asks Claude Code (with WebSearch and WebFetch) to find the company's own site and fill the gaps,
using only facts from pages it actually read.

Usage:
  python -m pipeline.enrich              # companies not enriched yet, up to ENRICH_PER_RUN
  python -m pipeline.enrich SLUG [SLUG]  # specific companies (re-runs them)
  python -m pipeline.enrich --dry-run
"""

import argparse
import json
import subprocess
from datetime import date
from typing import Optional

import httpx
from pydantic import BaseModel, Field, ValidationError

from . import config
from .config import subsector_label
from .extract import ExtractionUnavailable, _parse_json_object, _run_claude, backend

ENRICH_TIMEOUT = 300

SYSTEM = """You research Indian startups for a funding database. Use WebSearch and WebFetch to find facts about ONE company, then reply with a single JSON object and nothing else.

Rules:
- Only report facts you read on a page you fetched in this session. Never fill gaps from memory or guesswork.
- Make sure you have the right company: it must match the name, sector and funding details given. Many startups share names. If you can't tell which company it is, return nulls.
- website: the company's own official site (home page URL), not a news article, LinkedIn, Crunchbase or Tracxn page.
- city: the Indian city of its headquarters, e.g. "Bengaluru", "Delhi NCR", "Mumbai", "Hyderabad", "Pune", "Chennai".
- founded_year: four-digit year, only if stated.
- description: one or two plain sentences on what the company actually builds and for whom. Concrete, no marketing language, no funding details.
- sources: the URLs you used.

Reply with JSON matching this schema:
"""


class CompanyFacts(BaseModel):
    website: Optional[str] = None
    city: Optional[str] = None
    founded_year: Optional[int] = Field(default=None, ge=1950, le=2030)
    description: Optional[str] = None
    sources: list[str] = []


def _website_ok(url: str) -> str | None:
    """Return the final URL if the site loads, else None."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    try:
        r = httpx.get(url, timeout=15, follow_redirects=True, headers={"User-Agent": config.USER_AGENT})
    except httpx.HTTPError:
        return None
    if r.status_code >= 400 and r.status_code not in (401, 403):  # some sites block bots but exist
        return None
    final = str(r.url)
    blocked = ("linkedin.com", "crunchbase.com", "tracxn.com", "inc42.com", "entrackr.com", "yourstory.com")
    return None if any(b in final for b in blocked) else final.rstrip("/") + "/"


def _context(company: dict, rounds: list[dict], investor_names: dict[str, str]) -> str:
    lines = [
        f"Company: {company['name']}",
        f"Sector: {subsector_label(company['subsector'])}",
        f"Current description: {company.get('description') or 'none'}",
    ]
    for r in rounds:
        inv = ", ".join(investor_names.get(i["slug"], i["slug"]) for i in r["investors"])
        amount = "undisclosed" if r["is_undisclosed"] or not r["amount_inr"] else f"Rs {r['amount_inr'] / 1e7:,.1f} crore"
        lines.append(f"Funding: {r['stage']} round, {amount}, announced {r['announced_on']}, investors: {inv or 'n/a'}")
        lines += [f"Reported at: {s['url']}" for s in r["sources"]]
    return "\n".join(lines)


def enrich(slugs: list[str] | None, dry_run: bool) -> None:
    if backend() != "claude-code":
        print("Enrichment uses the Claude Code CLI (web search); skipping with the API backend.")
        return
    companies = config.load_json(config.COMPANIES_FILE, [])
    rounds = config.load_json(config.ROUNDS_FILE, [])
    investor_names = {i["slug"]: i["name"] for i in config.load_json(config.INVESTORS_FILE, [])}

    if slugs:
        todo = [c for c in companies if c["slug"] in slugs]
    else:
        todo = [c for c in companies if not c.get("enriched_on") and not c.get("sample")]
        todo = todo[: config.ENRICH_PER_RUN]
    print(f"Enriching {len(todo)} companies")

    system = SYSTEM + json.dumps(CompanyFacts.model_json_schema())
    for c in todo:
        print(f"- {c['name']}")
        prompt = _context(c, [r for r in rounds if r["company"] == c["slug"]], investor_names)
        try:
            out = _run_claude(system, prompt, timeout=ENRICH_TIMEOUT, tools="WebSearch,WebFetch")
        except subprocess.TimeoutExpired:
            print("  ! timed out; will retry next run")
            continue
        except ExtractionUnavailable as exc:
            print(f"  ! stopping, Claude unavailable: {exc}")
            break
        payload = _parse_json_object(str(out.get("result", "")))
        try:
            facts = CompanyFacts.model_validate(payload or {})
        except ValidationError as exc:
            print(f"  ! invalid reply ({exc.error_count()} errors)")
            facts = CompanyFacts()

        changes = {}
        if facts.website and not c.get("website"):
            site = _website_ok(facts.website)
            if site:
                changes["website"] = site
            else:
                print(f"  ! website {facts.website} didn't load or isn't an official site; skipped")
        if facts.city and not c.get("city"):
            changes["city"] = facts.city.strip()
        if facts.founded_year and not c.get("founded_year"):
            changes["founded_year"] = facts.founded_year
        if facts.description and len(facts.description) > 30:
            changes["description"] = facts.description.strip()
        for k, v in changes.items():
            print(f"    {k}: {v}")
        if not changes:
            print("    nothing confirmed")
        if not dry_run:
            c.update(changes)
            c["enriched_on"] = date.today().isoformat()
            config.save_json(config.COMPANIES_FILE, companies)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    enrich(args.slugs or None, args.dry_run)


if __name__ == "__main__":
    main()
