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
import time

from pydantic import ValidationError

from . import config
from .models import ArticleExtraction, ExtractedDeal

SYSTEM = """You extract startup funding facts from Indian news articles for a deeptech and healthtech funding database.

Find every funding round, debt round, government grant or acquisition of an Indian company that the article announces. Roundup articles often list many deals, sometimes as table rows written "cell | cell | ..."; check each one. Ignore deals that are only mentioned as background.

Return ONLY the in-scope deals (including adjacent ones). Leave out-of-scope deals out of the response entirely; most roundup deals are out of scope, and an empty list is a normal answer.

In scope means the company's core value depends on science, hardware or defensible IP:
  space-defence: launch, satellites-eo, space-propulsion, drones, defence-electronics
  energy-climate: batteries, hydrogen, fusion-plasma, solar-materials, ccus, grid-tech
  semis-computing: chip-design, fabs-osat, photonics, quantum
  advanced-manufacturing: robotics, advanced-materials, 3d-printing, industrial-iot
  healthtech: ai-diagnostics, medical-devices, biotech, genomics, digital-therapeutics
Out of scope: pure SaaS, AI software without a hardware or science core, consumer apps, fintech, D2C, quick commerce, telemedicine marketplaces, edtech.
is_adjacent: true when the company sits in a vertical but buys rather than builds the core technology (for example an EV brand that buys its battery packs).

confidence: how sure you are that the deal belongs in its vertical and subsector. Use 0.9 or above when the company's business plainly matches (a satellite maker in satellites-eo), 0.7-0.85 when it fits but the article says little about the technology, and below 0.7 only when it might not belong at all.

Use only facts stated in the article. If a field is not stated, use null. Do not guess amounts.

Stage mapping: "Pre-Seed" -> pre-seed; "Seed", "Angel", "Pre-Series A" -> seed; "Series A" (including A1, extensions, bridges to A) -> A; "Series B" -> B; "Series C" or later, "Pre-IPO" -> C+; grants -> grant; debt or venture debt -> debt; acquisitions -> acquisition. Use "unknown" only when no stage is given at all.

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


CLAUDE_CODE_TIMEOUT = 300  # seconds per article
_consecutive_failures = 0


def _run_claude(system: str, prompt: str, timeout: int, tools: str = "") -> dict:
    """Run `claude -p` once and return its JSON envelope. Raises ExtractionUnavailable on hard failure.

    `tools` is a comma-separated list of built-in tools to allow (e.g. "WebSearch,WebFetch"); empty means none.
    """
    cmd = [
        _claude_bin(), "-p",
        "--model", config.CLAUDE_CODE_MODEL,
        "--tools", tools,
        "--system-prompt", system,
        "--output-format", "json",
        "--no-session-persistence",
    ]
    if tools:
        cmd += ["--allowedTools", tools]
    # An empty API key variable (e.g. an unset GitHub secret) must not shadow the subscription token.
    env = {k: v for k, v in os.environ.items() if not (k == "ANTHROPIC_API_KEY" and not v)}
    # The prompt goes in on stdin to stay clear of command-line length limits.
    proc = subprocess.run(
        cmd, input=prompt, capture_output=True, text=True, encoding="utf-8", timeout=timeout, env=env
    )
    try:
        out = json.loads(proc.stdout)
    except json.JSONDecodeError:
        detail = (proc.stderr or proc.stdout).strip()[:300]
        raise ExtractionUnavailable(f"Claude Code failed (exit {proc.returncode}): {detail}")
    if out.get("is_error"):
        raise ExtractionUnavailable(str(out.get("result") or out.get("subtype") or "unknown error")[:300])
    return out


def check_available() -> None:
    """Fail fast with a clear message if Claude can't be reached, instead of hanging on article 1."""
    if backend() == "api":
        return
    try:
        out = _run_claude("Reply with the single word OK.", "ping", timeout=90)
    except subprocess.TimeoutExpired:
        raise ExtractionUnavailable("Claude Code did not answer a 1-word test prompt within 90s")
    models = ", ".join(out.get("modelUsage", {}) or {}) or "unknown"
    print(f"Claude Code check: {str(out.get('result', '')).strip()[:40]!r} (model: {models})")


def _parse_json_object(text: str) -> dict | None:
    """Pull the JSON object out of a reply, tolerating ```json fences or stray text around it."""
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


def _call_claude_code(user: str) -> ArticleExtraction | None:
    global _consecutive_failures
    schema = json.dumps(ArticleExtraction.model_json_schema())
    system = (
        SYSTEM
        + "\n\nRespond with a single JSON object and nothing else, matching this JSON Schema:\n"
        + schema
    )
    started = time.monotonic()
    try:
        out = _run_claude(system, user, timeout=CLAUDE_CODE_TIMEOUT)
    except subprocess.TimeoutExpired:
        _consecutive_failures += 1
        print(f"  ! Claude Code timed out after {CLAUDE_CODE_TIMEOUT}s; skipping article")
        if _consecutive_failures >= 3:
            raise ExtractionUnavailable("Claude Code timed out three times in a row")
        return None
    _consecutive_failures = 0
    print(f"  ({time.monotonic() - started:.0f}s)")

    payload = _parse_json_object(str(out.get("result", "")))
    if payload is None:
        print("  ! reply was not valid JSON; skipping article")
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
