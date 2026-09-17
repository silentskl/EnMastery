# English Mastery v1.0.2 Hotfix 11.6

## Purpose

Hotfix 11.6 improves Source URL compatibility and prevents service/form pages from entering Reading, Speaking, Writing or Cloze generation as if they were educational articles.

## Source extraction changes

- Multi-strategy HTML extraction instead of one page-wide tag strip. Extraction candidates now include:
  - JSON-LD `articleBody` / structured text
  - `<article>`
  - `<main>`
  - common article/content containers
  - embedded `__NEXT_DATA__` / application JSON
  - cleaned page-wide text as the final fallback
- The best candidate is selected using readable-text/word-density scoring.
- Browser-like `User-Agent`, `Accept` and `Accept-Language` headers improve compatibility with public sites that return different content to bare programmatic clients.
- Redirects remain host-constrained for SSRF safety.
- Network failures, HTTP errors, challenge pages, unsupported content, PDF sources and short-text pages now use explicit error codes and structured diagnostics.
- `SourceExtractionError.details` is preserved by Work Queue logs, including source/final URL, HTTP status, content type, fetched bytes, extracted characters, extraction method and title when available.

## Non-content URL protection

High-confidence transaction/service paths such as Help & Feedback, login, forms, e-services, application/submission endpoints are rejected before a batch import is queued. Discovery also filters these links out. This specifically prevents pages such as PUB Regulatory Submissions from being treated as sustainability source articles.

## Model JSON compatibility

Source-generated Speaking/Writing/Cloze material now uses the same `parseModelJson()` repair pipeline already used by Reading and Vocabulary. A malformed trailing comma or similar recoverable model JSON issue no longer fails Source Domain generation on the first `JSON.parse()`.

## Database

No schema change. Migration count remains 54 and the latest migration remains `0054_v102_hotfix115_daily_plan_resource_indexes.sql`.

## Deployment

No new migration is required beyond the migrations already included through 0054. In a dependency-enabled environment run:

```bash
npm run verify:release
```
