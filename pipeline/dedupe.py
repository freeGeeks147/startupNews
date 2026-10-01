"""Dedupe: the same round reported by several outlets becomes one record with several sources."""

from datetime import date

from rapidfuzz import fuzz

from . import config


def _days_apart(a: str | None, b: str | None) -> int:
    if not a or not b:
        return 0
    return abs((date.fromisoformat(a) - date.fromisoformat(b)).days)


def _amounts_close(a: float | None, b: float | None) -> bool:
    if a is None or b is None:
        return True  # an undisclosed report can match a disclosed one
    hi, lo = max(a, b), min(a, b)
    return hi == 0 or lo / hi >= 0.75


def find_match(candidate: dict, existing: list[dict]) -> dict | None:
    """`candidate` and `existing` items are pending-record dicts with company_name, announced_on, amount_inr."""
    for e in existing:
        if fuzz.token_sort_ratio(candidate["company_name"].lower(), e["company_name"].lower()) < config.FUZZ_THRESHOLD:
            continue
        if _days_apart(candidate["announced_on"], e["announced_on"]) > config.DEDUPE_WINDOW_DAYS:
            continue
        if not _amounts_close(candidate["amount_inr"], e["amount_inr"]):
            continue
        return e
    return None
