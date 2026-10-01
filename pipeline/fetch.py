"""Ingest: poll RSS feeds, skip seen URLs, and fetch article text politely."""

import hashlib
import time
from dataclasses import dataclass
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import feedparser
import httpx
from selectolax.parser import HTMLParser

from . import config


@dataclass
class Article:
    url: str
    title: str
    published: str | None
    publisher: str
    text: str = ""


def url_hash(url: str) -> str:
    return hashlib.sha256(url.strip().lower().encode()).hexdigest()[:16]


def _looks_like_funding(title: str) -> bool:
    t = title.lower()
    return any(k in t for k in config.TITLE_KEYWORDS)


def new_articles(seen: set[str]) -> list[Article]:
    out: list[Article] = []
    client = httpx.Client(headers={"User-Agent": config.USER_AGENT}, timeout=20, follow_redirects=True)
    for feed in config.FEEDS:
        try:
            resp = client.get(feed["url"])
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            print(f"  ! feed failed: {feed['publisher']} ({exc})")
            continue
        parsed = feedparser.parse(resp.content)
        if parsed.bozo and not parsed.entries:
            print(f"  ! feed failed: {feed['publisher']} ({parsed.bozo_exception})")
            continue
        for e in parsed.entries:
            url = e.get("link")
            title = e.get("title", "")
            if not url or url_hash(url) in seen or not _looks_like_funding(title):
                continue
            published = None
            if e.get("published_parsed"):
                published = time.strftime("%Y-%m-%d", e.published_parsed)
            out.append(Article(url=url, title=title, published=published, publisher=feed["publisher"]))
    return out


class PoliteFetcher:
    """One request every few seconds per run, honouring robots.txt."""

    def __init__(self) -> None:
        self.client = httpx.Client(headers={"User-Agent": config.USER_AGENT}, timeout=20, follow_redirects=True)
        self.robots: dict[str, RobotFileParser] = {}
        self.last = 0.0

    def _allowed(self, url: str) -> bool:
        host = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
        if host not in self.robots:
            rp = RobotFileParser()
            try:
                r = self.client.get(f"{host}/robots.txt")
                rp.parse(r.text.splitlines() if r.status_code == 200 else [])
            except httpx.HTTPError:
                rp.parse([])
            self.robots[host] = rp
        return self.robots[host].can_fetch(config.USER_AGENT, url)

    def text(self, url: str) -> str | None:
        if not self._allowed(url):
            print(f"  ! robots.txt disallows {url}")
            return None
        wait = config.REQUEST_DELAY_SECONDS - (time.monotonic() - self.last)
        if wait > 0:
            time.sleep(wait)
        self.last = time.monotonic()
        try:
            r = self.client.get(url)
            r.raise_for_status()
        except httpx.HTTPError as exc:
            print(f"  ! fetch failed {url}: {exc}")
            return None
        tree = HTMLParser(r.text)
        root = tree.css_first("article") or tree.css_first("main") or tree.body
        if root is None:
            return None
        # Weekly roundups (e.g. Inc42 Funding Galore) list their deals in a table, so keep
        # table rows as "cell | cell | ..." lines alongside the prose.
        lines = []
        for node in root.css("p, li, h2, h3, tr"):
            if node.tag == "tr":
                lines.append(" | ".join(c.text(strip=True) for c in node.css("th, td")))
            elif not any(parent.tag == "td" or parent.tag == "th" for parent in _ancestors(node)):
                lines.append(node.text(strip=True))
        return "\n".join(line for line in lines if line)


def _ancestors(node):
    parent = node.parent
    while parent is not None:
        yield parent
        parent = parent.parent
