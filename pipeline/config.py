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

MODEL = "claude-haiku-4-5"

# RSS feeds to poll. Verify each URL before relying on it; a failing feed is logged and skipped.
FEEDS = [
    {"publisher": "Entrackr", "url": "https://entrackr.com/feed"},
    {"publisher": "Inc42", "url": "https://inc42.com/feed/"},
    {"publisher": "YourStory", "url": "https://yourstory.com/feed"},
    {"publisher": "Indian Startup News", "url": "https://indianstartupnews.com/feed"},
    {"publisher": "PIB", "url": "https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3"},
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


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def taxonomy() -> dict:
    return load_json(TAXONOMY_FILE, {})


def subsector_slugs(vertical: str) -> set[str]:
    for v in taxonomy().get("verticals", []):
        if v["slug"] == vertical:
            return {s["slug"] for s in v["subsectors"]}
    return set()
