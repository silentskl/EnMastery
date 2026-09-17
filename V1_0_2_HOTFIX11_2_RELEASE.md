# English Mastery v1.0.2 Hotfix 11.2

## Model JSON recovery and safe vocabulary re-import

This hotfix addresses malformed JSON occasionally returned by the configured ModelBridge chat model during vocabulary enrichment and reading-material generation.

### JSON recovery

Vocabulary enrichment and reading adaptation now use a shared model-JSON parser that:

1. extracts JSON from fenced or prose-wrapped responses;
2. retries common local repairs such as trailing commas, comments and literal control characters inside strings;
3. if still invalid, asks ModelBridge once to repair JSON syntax without changing the data;
4. validates the repaired root shape before the domain-specific validator runs;
5. if repair still fails, includes the initial/repair parse errors and a bounded response excerpt in the task error.

For vocabulary batch imports, a failed batch no longer destroys the whole chunk. The runner logs the batch failure and retries missing terms individually. Successfully imported terms remain committed.

### De-duplication and safe rerun

Vocabulary imports are idempotent for a target Tenant word book:

- the uploaded/editor list is normalized and de-duplicated before the job is created;
- matching ignores case, leading/trailing whitespace and repeated internal whitespace;
- each chunk checks the target word book before enrichment, so already-imported terms are not sent to AI again;
- collection insertion also checks normalized term text, protecting against legacy vocabulary IDs that represent the same term;
- repeated terms are counted under `duplicates` / `skipped` instead of being inserted twice;
- new synonym annotations for an existing term are merged rather than creating a duplicate.

This means a failed or partially completed vocabulary import can safely be run again against the same word book.

No database migration is required. Migration count remains 51.
