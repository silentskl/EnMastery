# English Mastery v1.0.2 Hotfix 10

Tenant Admin persistent vocabulary-import release.

- Bulk word-book import moved out of Student UI into Tenant Admin.
- Tenant Admin can create empty word books, create + queue import, or append to an existing Tenant word book.
- TXT, CSV and editor input are parsed server-side into a persisted generation job.
- Vocabulary imports reuse the existing Cloudflare Work Queue and `generation_jobs` table.
- Queue consumer remains `max_batch_size=1` and `max_concurrency=1`; persisted jobs are selected FIFO.
- Large imports are processed in 20-term chunks. The same oldest job is re-queued until complete, so later imports cannot overtake it.
- Refreshing, leaving the page, or signing in again does not cancel the import.
- Tenant-managed word books are visible to Tenant Students and can be selected in Learning / Practice settings.
- Students can save lesson vocabulary into available custom word books, but no longer see bulk-import/create/delete controls.
