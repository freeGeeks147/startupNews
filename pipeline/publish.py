"""Weekly publish: push confident pending deals live and retire the sample data.

Usage:
  python -m pipeline.publish            # what the Sunday workflow runs
  python -m pipeline.publish --dry-run

Deals at or above AUTO_PUBLISH_MIN_CONFIDENCE (pipeline/config.py) are published with
reviewed=False, which shows an "Unreviewed" badge on the site until you run
`python -m pipeline.review verify ID`. Everything else stays in data/pending/.
"""

import argparse
import os

from . import config
from .review import approve_records


def remove_sample_data() -> int:
    """Drop the fictional demo records once at least one real round is published."""
    rounds = config.load_json(config.ROUNDS_FILE, [])
    if not any(not r.get("sample") for r in rounds) or not any(r.get("sample") for r in rounds):
        return 0
    real = [r for r in rounds if not r.get("sample")]
    companies = [c for c in config.load_json(config.COMPANIES_FILE, []) if not c.get("sample")]
    investors = [i for i in config.load_json(config.INVESTORS_FILE, []) if not i.get("sample")]
    config.save_json(config.ROUNDS_FILE, real)
    config.save_json(config.COMPANIES_FILE, companies)
    config.save_json(config.INVESTORS_FILE, investors)
    return len(rounds) - len(real)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    pending = [config.load_json(p, {}) for p in sorted(config.PENDING.glob("*.json"))]
    ready = [
        r for r in pending
        if config.AUTO_PUBLISH
        and r.get("confidence", 0) >= config.AUTO_PUBLISH_MIN_CONFIDENCE
        and r.get("announced_on")
    ]
    held = len(pending) - len(ready)

    if args.dry_run:
        for r in ready:
            print(f"would publish {r['id']} (conf {r['confidence']:.2f})")
        print(f"\nDry run: {len(ready)} to publish, {held} held for review.")
        return

    published = approve_records([r["id"] for r in ready], reviewed=False)
    removed = remove_sample_data()

    summary = (
        f"### Weekly publish\n\n"
        f"- Published: **{len(published)}** new rounds (marked unreviewed)\n"
        f"- Held for manual review: **{held}**\n"
        + (f"- Removed {removed} sample records\n" if removed else "")
    )
    print(summary)
    if path := os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(path, "a", encoding="utf-8") as f:
            f.write(summary)


if __name__ == "__main__":
    main()
