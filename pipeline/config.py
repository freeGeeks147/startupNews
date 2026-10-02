"""Paths, sources and settings shared by the pipeline steps."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
PENDING = DATA / "pending"
STATE = DATA / "pipeline_state"

COMPANIES_FILE = DATA / "companies.json"
INVESTORS_FILE = DATA / "investors.json"
ROUNDS_FILE = DATA / "rounds.json"
TAXONOMY_FILE = DATA / "taxonomy.json"
ALIASES_FILE = DATA / "investor_aliases.json"
SEEN_FILE = STATE / "seen.json"

MODEL = "claude-haiku-4-5"            # used with ANTHROPIC_API_KEY
CLAUDE_CODE_MODEL = "haiku"           # used via the Claude Code CLI on your subscription

# Articles sent to Claude per run. Keeps each run well inside a Pro plan's usage window;
# anything left over is picked up by the next daily run.
MAX_ARTICLES_PER_RUN = 20

# Claude calls in flight at once. With 20 articles at ~30-60s each, 4 keeps a run near 5-10 minutes.
EXTRACT_WORKERS = 4

# Companies looked up on the web per run (website, city, founding year, description).
ENRICH_PER_RUN = 8

# RSS feeds to poll (checked 1 Oct 2026). Most keep only ~1 week of items, so the ingest runs
# daily even though the site publishes weekly. A failing feed is logged and skipped.
FEEDS = [
    # Weekly roundup; the feed reaches back ~5 months, so the first run doubles as a backfill.
    {"publisher": "Inc42 Funding Galore", "url": "https://inc42.com/tag/funding-galore/feed/"},
    {"publisher": "Inc42", "url": "https://inc42.com/feed/"},
    {"publisher": "Entrackr", "url": "https://entrackr.com/rss"},
    {"publisher": "YourStory", "url": "https://yourstory.com/category/funding/feed"},
    {"publisher": "Indian Startup News", "url": "https://indianstartupnews.com/rss"},
]

# Only articles whose title matches one of these are sent to the LLM, to keep costs down.
TITLE_KEYWORDS = [
    "raise", "raises", "raised", "funding", "secures", "bags", "series", "seed",
    "pre-seed", "grant", "invests", "investment", "backed", "round", "acquire",
]

USER_AGENT = "DeepFundIndiaBot/0.1 (+https://github.com/freeGeeks147/startupNews)"
REQUEST_DELAY_SECONDS = 3.0

# Dedupe: same company if names match at this fuzz score within this many days.
FUZZ_THRESHOLD = 90
DEDUPE_WINDOW_DAYS = 14

# Minimum classifier confidence for a deal to enter the review queue.
MIN_CONFIDENCE = 0.5

# Weekly publish: pending deals at or above this confidence go live automatically, marked
# "unreviewed". Lower-confidence deals wait for manual review. Set AUTO_PUBLISH = False to
# publish only what you approve by hand.
AUTO_PUBLISH = True
AUTO_PUBLISH_MIN_CONFIDENCE = 0.8


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def taxonomy() -> dict:
    return load_json(TAXONOMY_FILE, {})


def subsector_label(slug: str) -> str:
    for v in taxonomy().get("verticals", []):
        for s in v["subsectors"]:
            if s["slug"] == slug:
                return f"{s['name']} ({v['name']})"
    return slug


def subsector_slugs(vertical: str) -> set[str]:
    for v in taxonomy().get("verticals", []):
        if v["slug"] == vertical:
            return {s["slug"] for s in v["subsectors"]}
    return set()
