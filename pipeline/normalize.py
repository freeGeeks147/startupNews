"""Normalize: amounts to INR and USD at the announcement-date rate, slugs, investor aliases."""

import re
from functools import lru_cache

import httpx

from . import config

UNIT_MULTIPLIER = {
    "crore": 10_000_000,
    "lakh": 100_000,
    "billion": 1_000_000_000,
    "million": 1_000_000,
    "thousand": 1_000,
    "units": 1,
}

# Used only when the rates API is unreachable. Approximate; update occasionally.
FALLBACK_INR_PER_UNIT = {"INR": 1.0, "USD": 84.0, "EUR": 92.0, "GBP": 108.0, "SGD": 64.0, "JPY": 0.57}


@lru_cache(maxsize=512)
def inr_per_unit(currency: str, on_date: str | None) -> float:
    """INR per 1 unit of `currency` on `on_date`, from the free ECB-based Frankfurter API."""
    if currency == "INR":
        return 1.0
    day = on_date or "latest"
    try:
        r = httpx.get(
            f"https://api.frankfurter.dev/v1/{day}",
            params={"base": currency, "symbols": "INR"},
            timeout=10,
        )
        r.raise_for_status()
        return float(r.json()["rates"]["INR"])
    except (httpx.HTTPError, KeyError, ValueError):
        print(f"  ! FX lookup failed for {currency} on {day}; using fallback rate")
        return FALLBACK_INR_PER_UNIT[currency]


def amounts(value: float | None, unit: str | None, currency: str | None, on_date: str | None):
    """Returns (amount_inr, amount_usd) or (None, None) if the amount is missing."""
    if value is None or unit is None or currency is None:
        return None, None
    original = value * UNIT_MULTIPLIER[unit]
    inr = original * inr_per_unit(currency, on_date)
    usd = inr / inr_per_unit("USD", on_date)
    return round(inr), round(usd)


def slugify(name: str) -> str:
    s = name.lower()
    s = re.sub(r"\b(pvt|private|ltd|limited|llp|inc|technologies|technology)\b\.?", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "unknown"


def canonical_investor(name: str) -> str:
    """Resolve aliases such as "Peak XV" -> "Peak XV Partners" using data/investor_aliases.json."""
    aliases: dict[str, str] = config.load_json(config.ALIASES_FILE, {})
    lookup = {k.lower(): v for k, v in aliases.items()}
    return lookup.get(name.strip().lower(), name.strip())
