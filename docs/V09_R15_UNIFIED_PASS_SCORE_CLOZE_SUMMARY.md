# V0.9.0 R15 — Unified Pass Score + Cloze Summary Gate

## Unified mastery pass score
Tenant Admin → Learn settings now exposes **Passing score (%)**. Default: **60**.

The setting is stored per tenant in `tenant_learning_policy.pass_score` and is used by:
- Reading summary AI review
- Listening summary AI review
- Cloze summary AI review
- Writing AI review

Question-level Reading / Listening / Cloze mastery still requires the answer itself to be correct before progression; the configurable score applies to AI-scored review gates.

## Cloze workflow
Each Cloze item now follows:
1. Answer the cloze correctly.
2. Write a summary of that passage (minimum 15 words).
3. AI reviews main ideas, accuracy, organisation and language.
4. Score below the configured pass mark → `FAIL · REWRITE`; Next stays disabled.
5. Score at/above the configured pass mark → `PASS`; Next unlocks.

Every rewrite is stored in `cloze_summary_attempts`. AI feedback remains selectable so words/phrases can be added to Vocabulary.

## Migration
`0032_v09_r15_unified_pass_score_cloze_summary.sql`
