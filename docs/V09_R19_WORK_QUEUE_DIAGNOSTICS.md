# V0.9.0 R19 — Work Queue diagnostics

- Fixes listening_import D1_TYPE_ERROR by validating and normalising AI-generated listening questions before any D1 bind.
- Adds persistent `generation_job_logs` timeline storage.
- Work Queue exposes Details / Logs for every job.
- Listening AI jobs record ModelBridge request/response/error details, HTTP status and raw response, with secrets redacted and large fields truncated.
- Job status/stage/progress transitions and terminal errors are persisted.
- Queued/running deletion policy and FIFO semantics are unchanged.
