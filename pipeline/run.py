"""Daily pipeline: ingest -> extract/classify -> normalize -> dedupe -> review queue.

Usage:
  python -m pipeline.run                    # poll RSS feeds
  python -m pipeline.run --url URL [--url URL ...]   # process specific articles (testing, backfill)
  python -m pipeline.run --urls-file FILE   # backfill: one URL per line
  python -m pipeline.run --dry-run ...      # print results without writing anything

New rounds land in data/pending/ for review with `python -m pipeline.review`.
"""

import argparse
from datetime import datetime, timezone

from . import config
from .dedupe import find_match
from .extract import ExtractionUnavailable, backend, check_available, extract_deals
from .fetch import Article, PoliteFetcher, new_articles, url_hash
from .normalize import amounts, slugify


def _pending_records() -> list[dict]:
    return [config.load_json(p, {}) for p in sorted(config.PENDING.glob("*.json"))]


def _approved_as_records() -> list[dict]:
    companies = {c["slug"]: c for c in config.load_json(config.COMPANIES_FILE, [])}
    out = []
    for r in config.load_json(config.ROUNDS_FILE, []):
        c = companies.get(r["company"], {})
        out.append({**r, "company_name": c.get("name", r["company"]), "_approved": True})
    return out


def _add_source(record: dict, source: dict) -> bool:
    if any(s["url"] == source["url"] for s in record.get("sources", [])):
        return False
    record.setdefault("sources", []).append(source)
    return True


def process(articles: list[Article], dry_run: bool) -> None:
    seen: set[str] = set(config.load_json(config.SEEN_FILE, []))
    fetcher = PoliteFetcher()
    pending = _pending_records()
    approved = _approved_as_records()
    rounds_changed = False
    created = merged = 0

    if len(articles) > config.MAX_ARTICLES_PER_RUN:
        print(f"Processing {config.MAX_ARTICLES_PER_RUN} of {len(articles)}; the rest wait for the next run.")
        articles = articles[: config.MAX_ARTICLES_PER_RUN]

    for art in articles:
        print(f"- {art.publisher}: {art.title}")
        text = fetcher.text(art.url)
        if not text:
            seen.add(url_hash(art.url))
            continue
        try:
            deals = extract_deals(art.title, text, art.published)
        except ExtractionUnavailable as exc:
            # Leave this and later articles unseen so the next run picks them up.
            print(f"  ! stopping early, Claude unavailable: {exc}")
            break
        seen.add(url_hash(art.url))
        if not dry_run:
            # Save progress per article so an interrupted run doesn't redo finished work.
            config.save_json(config.SEEN_FILE, sorted(seen))
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        source = {"url": art.url, "publisher": art.publisher, "fetched_at": now}

        for d in deals:
            inr, usd = amounts(d.amount_value, d.amount_unit, d.currency, d.announced_on)
            slug = slugify(d.company)
            record = {
                "id": f"{slug}-{d.announced_on or 'undated'}-{d.stage}",
                "status": "pending",
                "company_name": d.company,
                "company_slug": slug,
                "company_description": d.company_description,
                "city": d.city,
                "vertical": d.vertical,
                "subsector": d.subsector,
                "is_adjacent": d.is_adjacent,
                "announced_on": d.announced_on,
                "kind": d.kind,
                "stage": d.stage,
                "amount_inr": None if d.is_undisclosed else inr,
                "amount_usd": None if d.is_undisclosed else usd,
                "currency_original": d.currency,
                "is_undisclosed": d.is_undisclosed or inr is None,
                "investors": [i.model_dump() for i in d.investors],
                "sources": [source],
                "confidence": d.confidence,
            }

            match = find_match(record, pending + approved)
            if match is not None:
                if _add_source(match, source):
                    merged += 1
                    print(f"    = merged into {match['id']}")
                    if match.get("_approved"):
                        rounds_changed = True
                    elif not dry_run:
                        config.save_json(config.PENDING / f"{match['id']}.json", match)
                continue

            pending.append(record)
            created += 1
            amount = "undisclosed" if record["is_undisclosed"] else f"₹{record['amount_inr'] / 1e7:,.1f} Cr"
            print(f"    + {d.company} · {d.stage} · {amount} · {d.subsector} (conf {d.confidence:.2f})")
            if not dry_run:
                config.save_json(config.PENDING / f"{record['id']}.json", record)

    if dry_run:
        print(f"\nDry run: {created} new, {merged} merged. Nothing written.")
        return

    if rounds_changed:
        clean = [{k: v for k, v in r.items() if k not in ("company_name", "_approved")} for r in approved]
        config.save_json(config.ROUNDS_FILE, clean)
    config.save_json(config.SEEN_FILE, sorted(seen))
    print(f"\n{created} new rounds pending review, {merged} sources merged.")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", action="append", default=[], help="Process a specific article URL")
    ap.add_argument("--urls-file", help="File with one article URL per line (backfill)")
    ap.add_argument("--publisher", default="Manual", help="Publisher name for --url / --urls-file")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    urls = list(args.url)
    if args.urls_file:
        with open(args.urls_file, encoding="utf-8") as f:
            urls += [line.strip() for line in f if line.strip() and not line.startswith("#")]

    if urls:
        articles = [Article(url=u, title=u, published=None, publisher=args.publisher) for u in urls]
    else:
        seen = set(config.load_json(config.SEEN_FILE, []))
        articles = new_articles(seen)
    print(f"{len(articles)} candidate articles (Claude via {backend()})")
    if articles:
        try:
            check_available()
        except ExtractionUnavailable as exc:
            raise SystemExit(f"Claude is not reachable, nothing processed: {exc}")
    process(articles, args.dry_run)


if __name__ == "__main__":
    main()
