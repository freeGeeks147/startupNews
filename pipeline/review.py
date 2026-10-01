"""Review queue: approve or reject pending rounds, then write the technical note.

Usage:
  python -m pipeline.review list
  python -m pipeline.review show ID
  python -m pipeline.review approve ID [ID ...]
  python -m pipeline.review reject ID [ID ...]
  python -m pipeline.review note ID        # prompts for the six note fields
  python -m pipeline.review unreviewed     # auto-published rounds nobody has checked yet
  python -m pipeline.review verify ID [ID ...]

Before approving, fix anything wrong by editing data/pending/ID.json directly.
"""

import argparse
import json
import sys
from datetime import date

from . import config
from .normalize import canonical_investor, slugify


def _pending_path(rid: str):
    return config.PENDING / f"{rid}.json"


def _load_pending(rid: str) -> dict:
    p = _pending_path(rid)
    if not p.exists():
        sys.exit(f"No pending round {rid!r}")
    return config.load_json(p, {})


def cmd_list(_args) -> None:
    files = sorted(config.PENDING.glob("*.json"))
    if not files:
        print("Review queue is empty.")
        return
    for p in files:
        r = config.load_json(p, {})
        amount = "undisclosed" if r["is_undisclosed"] else f"₹{r['amount_inr'] / 1e7:,.1f} Cr"
        flag = " [adjacent]" if r.get("is_adjacent") else ""
        print(f"{r['id']}\n    {r['company_name']} · {r['stage']} · {amount} · {r['subsector']}{flag} · conf {r['confidence']:.2f}")


def cmd_show(args) -> None:
    print(json.dumps(_load_pending(args.ids[0]), indent=2, ensure_ascii=False))


def approve_records(ids: list[str], reviewed: bool) -> list[str]:
    """Move pending rounds into data/*.json. `reviewed=False` marks them as auto-published."""
    companies = config.load_json(config.COMPANIES_FILE, [])
    investors = config.load_json(config.INVESTORS_FILE, [])
    rounds = config.load_json(config.ROUNDS_FILE, [])
    company_slugs = {c["slug"] for c in companies}
    investor_by_slug = {i["slug"]: i for i in investors}
    round_ids = {r["id"] for r in rounds}
    approved: list[str] = []

    for rid in ids:
        r = _load_pending(rid)
        if not r.get("announced_on"):
            print(f"! {rid}: set announced_on before approving")
            continue
        if rid in round_ids:
            print(f"! {rid}: already published; dropping duplicate from queue")
            _pending_path(rid).unlink()
            continue
        if r["company_slug"] not in company_slugs:
            companies.append({
                "slug": r["company_slug"],
                "name": r["company_name"],
                "website": None,
                "city": r.get("city") or "",
                "founded_year": None,
                "vertical": r["vertical"],
                "subsector": r["subsector"],
                "is_adjacent": r["is_adjacent"],
                "description": r["company_description"],
            })
            company_slugs.add(r["company_slug"])

        round_investors = []
        for inv in r["investors"]:
            name = canonical_investor(inv["name"])
            slug = slugify(name)
            if slug not in investor_by_slug:
                # Type defaults to vc; correct it in data/investors.json if needed.
                investor_by_slug[slug] = {"slug": slug, "name": name, "type": "vc"}
                investors.append(investor_by_slug[slug])
            round_investors.append({"slug": slug, "is_lead": inv["is_lead"]})

        rounds.append({
            "id": r["id"],
            "company": r["company_slug"],
            "announced_on": r["announced_on"],
            "kind": r["kind"],
            "stage": r["stage"],
            "amount_inr": r["amount_inr"],
            "amount_usd": r["amount_usd"],
            "currency_original": r["currency_original"],
            "is_undisclosed": r["is_undisclosed"],
            "investors": round_investors,
            "sources": [{"url": s["url"], "publisher": s["publisher"]} for s in r["sources"]],
            "reviewed": reviewed,
            "note": None,
        })
        round_ids.add(rid)
        _pending_path(rid).unlink()
        approved.append(rid)
        print(f"✓ {'approved' if reviewed else 'auto-published'} {rid}")

    config.save_json(config.COMPANIES_FILE, companies)
    config.save_json(config.INVESTORS_FILE, investors)
    config.save_json(config.ROUNDS_FILE, rounds)
    return approved


def cmd_approve(args) -> None:
    approve_records(args.ids, reviewed=True)


def cmd_verify(args) -> None:
    """Mark auto-published rounds as checked by a person (removes the "Unreviewed" badge)."""
    rounds = config.load_json(config.ROUNDS_FILE, [])
    for r in rounds:
        if r["id"] in args.ids:
            r["reviewed"] = True
            print(f"✓ verified {r['id']}")
    config.save_json(config.ROUNDS_FILE, rounds)


def cmd_unreviewed(_args) -> None:
    rounds = [r for r in config.load_json(config.ROUNDS_FILE, []) if r.get("reviewed") is False]
    if not rounds:
        print("No unreviewed published rounds.")
    for r in rounds:
        print(f"{r['id']}  ({r['sources'][0]['url'] if r['sources'] else 'no source'})")


def cmd_reject(args) -> None:
    for rid in args.ids:
        _pending_path(rid).unlink(missing_ok=True)
        print(f"✗ rejected {rid}")


def cmd_note(args) -> None:
    rounds = config.load_json(config.ROUNDS_FILE, [])
    target = next((r for r in rounds if r["id"] == args.ids[0]), None)
    if target is None:
        sys.exit(f"No approved round {args.ids[0]!r} (approve it first)")
    print(f"Writing note for {target['id']}. Leave a field blank to keep the current value.\n")
    old = target.get("note") or {}
    fields = [
        ("one_liner", "One-liner (what they build, plain words)"),
        ("core_tech", "Core tech (physics/chemistry/ML underneath)"),
        ("trl", "TRL 1-9"),
        ("trl_reason", "TRL reason"),
        ("technical_risk", "Technical risk (hardest unsolved problem)"),
        ("comparables", "Comparables (comma-separated)"),
        ("take", "Take (is the round size sensible?)"),
    ]
    note = dict(old)
    for key, label in fields:
        current = old.get(key)
        shown = ", ".join(current) if isinstance(current, list) else current
        value = input(f"{label}{f' [{shown}]' if shown else ''}: ").strip()
        if not value:
            continue
        if key == "trl":
            note[key] = max(1, min(9, int(value)))
        elif key == "comparables":
            note[key] = [c.strip() for c in value.split(",") if c.strip()]
        else:
            note[key] = value
    note["written_on"] = date.today().isoformat()
    target["note"] = note
    config.save_json(config.ROUNDS_FILE, rounds)
    print("\n✓ note saved")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = {
        "list": cmd_list,
        "show": cmd_show,
        "approve": cmd_approve,
        "reject": cmd_reject,
        "note": cmd_note,
        "verify": cmd_verify,
        "unreviewed": cmd_unreviewed,
    }
    ap.add_argument("command", choices=list(commands))
    ap.add_argument("ids", nargs="*")
    args = ap.parse_args()
    if args.command not in ("list", "unreviewed") and not args.ids:
        ap.error(f"{args.command} needs at least one ID")
    commands[args.command](args)


if __name__ == "__main__":
    main()
