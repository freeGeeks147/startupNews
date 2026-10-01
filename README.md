# DeepFund India

A searchable database of Indian deeptech and healthtech funding — equity rounds and government grants — where every deal carries a short technical note.

> **Status:** preview. The deals in `data/` are **fictional sample records** that demonstrate the format. Replace them with real, reviewed deals from the pipeline before launch.

## What's here

| Path | What it is |
|---|---|
| `src/` | Next.js site (static export): deals table with filters, deal / company / investor / sector pages, pricing, methodology |
| `data/` | The database as JSON: `companies.json`, `investors.json`, `rounds.json`, `taxonomy.json` |
| `data/pending/` | Review queue written by the pipeline |
| `pipeline/` | Python ingest → Claude extraction → normalize → dedupe → review CLI |
| `supabase/schema.sql` | Postgres schema for the Supabase phase |
| `.github/workflows/` | `deploy.yml` (GitHub Pages), `update-data.yml` (collects daily, publishes Sundays; off until an API key is added) |

## How the data updates

| When | What happens |
|---|---|
| Every day, 08:00 IST | New funding articles from Inc42, Entrackr, YourStory and Indian Startup News are read; Claude extracts the deals into `data/pending/`. Nothing goes live. |
| Sundays | Deals with confidence ≥ 0.8 are published (marked **unreviewed** on the site), sample data is removed, and the site redeploys. Less certain deals stay in the queue. |
| Any time | **Actions → Update data → Run workflow** collects and publishes immediately. |

The first run also backfills: Inc42's weekly *Funding Galore* feed reaches back about five months.
To publish only what you approve by hand, set `AUTO_PUBLISH = False` in `pipeline/config.py`.

## Run the site locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static site in out/
```

## Run the pipeline

```bash
pip install -r pipeline/requirements.txt
export ANTHROPIC_API_KEY=...           # PowerShell: $env:ANTHROPIC_API_KEY="..."

python -m pipeline.run --dry-run --url https://example.com/some-funding-article   # test one article
python -m pipeline.run                 # poll RSS feeds in pipeline/config.py
python -m pipeline.review list         # see the review queue
python -m pipeline.review approve <id> # publish into data/*.json
python -m pipeline.review note <id>    # write the technical note
python -m pipeline.publish             # what the Sunday job runs
python -m pipeline.review unreviewed   # auto-published deals to check
python -m pipeline.review verify <id>  # remove the "unreviewed" badge
```

Extraction uses `claude-haiku-4-5` with structured outputs, validated by Pydantic. Amounts are converted to INR and USD at the announcement-date rate (Frankfurter / ECB rates). Only facts and source links are stored, never article text.

## Deploy on GitHub Pages

1. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main`. The site appears at `https://freegeeks147.github.io/startupNews/`.
3. To turn on real data, add an `ANTHROPIC_API_KEY` secret under **Settings → Secrets and variables → Actions**, then run **Actions → Update data**.

## Moving to a custom domain later

1. Buy the domain and add it under **Settings → Pages → Custom domain** (or move hosting to Vercel).
2. In `deploy.yml`, set `NEXT_PUBLIC_BASE_PATH` to `""` and add `NEXT_PUBLIC_SITE_URL: https://yourdomain`.
3. Then: Supabase (auth + database from `supabase/schema.sql`), Razorpay for Pro, Beehiiv/Buttondown for the digest (`NEXT_PUBLIC_NEWSLETTER_URL`).

## Roadmap

- [x] Static site with filters, deal / company / investor / sector pages
- [x] Extraction pipeline and review CLI
- [ ] Backfill 2024–2026 from roundup archives
- [ ] Weekly digest + chart
- [ ] Supabase auth, Razorpay, paywall on full history / notes / CSV
- [ ] Grants layer (BIRAC, iDEX, DST, state schemes)
- [ ] Alerts, co-investor network view, API
