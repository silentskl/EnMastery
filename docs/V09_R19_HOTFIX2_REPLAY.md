# R19 Hotfix 2 — Listening replay-first retry

For `listening_import`, a retry first searches the existing `generation_job_logs` for the latest successful `modelbridge_response` event (HTTP 2xx). If found, the stored response body is passed directly through the current listening normalizer/validator. No new ModelBridge request is sent.

Compatibility normalization accepts both canonical and common model aliases:

- `questionType` or `type`
- `prompt` or `question`
- `multiple_choice`, `multiple-choice`, `mcq`, `choice`, `single_choice`
- `short_answer`, `short-answer`, `short`, `free_text`, `text`
- Missing type with options => multiple choice; otherwise short answer.

Each execution logs `runner_version = 0.9.0-r19-hotfix2`. A replay logs `modelbridge_replay` with the source log id and original timestamp.

No migration is required beyond R19 migration 0033.
