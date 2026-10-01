"""Extract + classify: one Claude call per article, returning validated deals."""

import anthropic
from pydantic import ValidationError

from . import config
from .models import ArticleExtraction, ExtractedDeal

SYSTEM = """You extract startup funding facts from Indian news articles for a deeptech and healthtech funding database.

Return every funding round, debt round, government grant or acquisition of an Indian company that the article announces. Roundup articles often list many deals; return each one. Ignore deals that are only mentioned as background.

Use only facts stated in the article. If a field is not stated, use null (or "unknown" for stage). Do not guess amounts.

Classify each company:
- In scope: the company's core value depends on science, hardware or defensible IP.
  space-defence: launch, satellites-eo, space-propulsion, drones, defence-electronics
  energy-climate: batteries, hydrogen, fusion-plasma, solar-materials, ccus, grid-tech
  semis-computing: chip-design, fabs-osat, photonics, quantum
  advanced-manufacturing: robotics, advanced-materials, 3d-printing, industrial-iot
  healthtech: ai-diagnostics, medical-devices, biotech, genomics, digital-therapeutics
- out_of_scope (subsector "none"): pure SaaS, consumer apps, fintech, D2C, quick commerce, telemedicine marketplaces, edtech, and anything else without a science or hardware core.
- is_adjacent: true when the company sits in a vertical but buys rather than builds the core technology (for example an EV brand that buys its battery packs).

For amounts, copy the number and unit as written: "Rs 40 crore" is amount_value 40, amount_unit "crore", currency "INR"; "$4.5 million" is 4.5, "million", "USD"."""

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def extract_deals(title: str, text: str, published: str | None) -> list[ExtractedDeal]:
    """Returns in-scope deals above the confidence threshold. Out-of-scope deals are discarded here."""
    # Cap very long pages to keep cost predictable; log it so a missed deal can be traced.
    body = text[:60_000]
    if len(text) > len(body):
        print(f"  ! article trimmed from {len(text)} to {len(body)} chars: {title}")
    user = f"Title: {title}\nPublished: {published or 'unknown'}\n\n{body}"
    try:
        response = _get_client().messages.parse(
            model=config.MODEL,
            max_tokens=8000,
            system=SYSTEM,
            messages=[{"role": "user", "content": user}],
            output_format=ArticleExtraction,
        )
    except ValidationError as exc:
        print(f"  ! schema validation failed: {exc.error_count()} errors")
        return []
    except anthropic.RateLimitError:
        raise
    except anthropic.APIStatusError as exc:
        print(f"  ! API error {exc.status_code}: {exc.message}")
        return []
    except anthropic.APIConnectionError as exc:
        print(f"  ! connection error: {exc}")
        return []

    if response.stop_reason == "max_tokens":
        print("  ! response truncated at max_tokens; skipping article")
        return []
    parsed = response.parsed_output
    if parsed is None:
        return []

    keep = []
    for d in parsed.deals:
        if d.vertical == "out_of_scope":
            continue
        if d.subsector not in config.subsector_slugs(d.vertical):
            print(f"  ! {d.company}: subsector {d.subsector!r} not in {d.vertical}; dropped")
            continue
        if d.confidence < config.MIN_CONFIDENCE:
            print(f"  ! {d.company}: low confidence {d.confidence:.2f}; dropped")
            continue
        if not d.announced_on:
            d.announced_on = published
        keep.append(d)
    return keep
