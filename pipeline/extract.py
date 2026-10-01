"""Extract + classify: one Claude call per article, returning validated deals.

Two ways to reach Claude, chosen automatically:
- ANTHROPIC_API_KEY set: the Anthropic SDK (pay per token).
- Otherwise: the Claude Code CLI (`claude -p`), which uses your Claude subscription. In GitHub
  Actions it reads CLAUDE_CODE_OAUTH_TOKEN (create one with `claude setup-token`); locally it
  uses your existing Claude Code login.
"""

import json
import os
import shutil
import subprocess

from pydantic import ValidationError

from . import config
from .models import ArticleExtraction, ExtractedDeal

SYSTEM = """You extract startup funding facts from Indian news articles for a deeptech and healthtech funding database.

Return every funding round, debt round, government grant or acquisition of an Indian company that the article announces. Roundup articles often list many deals, sometimes as table rows written "cell | cell | ..."; return each one. Ignore deals that are only mentioned as background.

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

For amounts, copy the number and unit as written: "Rs 40 crore" is amount_value 40, amount_unit "crore", currency "INR"; "$4.5 million" or "$4.5 Mn" is 4.5, "million", "USD"."""


class ExtractionUnavailable(Exception):
    """Claude can't be reached right now (usage limit, auth, outage). Stop the run and retry later."""


def backend() -> str:
    return "api" if os.environ.get("ANTHROPIC_API_KEY") else "claude-code"


def _call_api(user: str) -> ArticleExtraction | None:
    import anthropic

    client = anthropic.Anthropic()
    try:
        response = client.messages.parse(
            model=config.MODEL,
            max_tokens=16000,
            system=SYSTEM,
            messages=[{"role": "user", "content": user}],
            output_format=ArticleExtraction,
        )
    except ValidationError as exc:
        print(f"  ! schema validation failed: {exc.error_count()} errors")
        return None
    except (anthropic.RateLimitError, anthropic.AuthenticationError) as exc:
        raise ExtractionUnavailable(str(exc)) from exc
    except anthropic.APIStatusError as exc:
        print(f"  ! API error {exc.status_code}: {exc.message}")
        return None
    except anthropic.APIConnectionError as exc:
        raise ExtractionUnavailable(f"connection error: {exc}") from exc

    if response.stop_reason == "max_tokens":
        print("  ! response truncated at max_tokens; skipping article")
        return None
    return response.parsed_output


def _claude_bin() -> str:
    path = os.environ.get("CLAUDE_BIN") or shutil.which("claude")
    if not path:
        raise ExtractionUnavailable(
            "Claude Code CLI not found. Install it (npm install -g @anthropic-ai/claude-code) "
            "or set ANTHROPIC_API_KEY."
        )
    return path


def _call_claude_code(user: str) -> ArticleExtraction | None:
    schema = json.dumps(ArticleExtraction.model_json_schema())
    cmd = [
        _claude_bin(), "-p",
        "--model", config.CLAUDE_CODE_MODEL,
        "--tools", "",
        "--system-prompt", SYSTEM,
        "--json-schema", schema,
        "--output-format", "json",
        "--no-session-persistence",
    ]
    # An empty API key variable (e.g. an unset GitHub secret) must not shadow the subscription token.
    env = {k: v for k, v in os.environ.items() if not (k == "ANTHROPIC_API_KEY" and not v)}
    try:
        # The article goes in on stdin to stay clear of command-line length limits.
        proc = subprocess.run(
            cmd, input=user, capture_output=True, text=True, encoding="utf-8", timeout=600, env=env
        )
    except subprocess.TimeoutExpired:
        print("  ! Claude Code timed out; skipping article")
        return None

    try:
        out = json.loads(proc.stdout)
    except json.JSONDecodeError:
        detail = (proc.stderr or proc.stdout).strip()[:300]
        raise ExtractionUnavailable(f"Claude Code failed (exit {proc.returncode}): {detail}")

    if out.get("is_error"):
        message = str(out.get("result") or out.get("subtype") or "unknown error")
        lowered = message.lower()
        if any(k in lowered for k in ("limit", "auth", "login", "credit", "overloaded", "token")):
            raise ExtractionUnavailable(message[:300])
        print(f"  ! Claude Code error: {message[:200]}")
        return None

    payload = out.get("structured_output")
    if payload is None:
        # Fall back to the text result if the CLI version doesn't return structured_output.
        try:
            payload = json.loads(out.get("result", ""))
        except (TypeError, json.JSONDecodeError):
            print("  ! no structured output returned; skipping article")
            return None
    try:
        return ArticleExtraction.model_validate(payload)
    except ValidationError as exc:
        print(f"  ! schema validation failed: {exc.error_count()} errors")
        return None


def extract_deals(title: str, text: str, published: str | None) -> list[ExtractedDeal]:
    """Returns in-scope deals above the confidence threshold. Out-of-scope deals are discarded here.

    Raises ExtractionUnavailable when Claude can't be reached, so the caller can stop and retry later.
    """
    # Cap very long pages to keep usage predictable; log it so a missed deal can be traced.
    body = text[:60_000]
    if len(text) > len(body):
        print(f"  ! article trimmed from {len(text)} to {len(body)} chars: {title}")
    user = f"Title: {title}\nPublished: {published or 'unknown'}\n\n{body}"

    parsed = _call_api(user) if backend() == "api" else _call_claude_code(user)
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
