# V0.9.0 R19 Hotfix 1 — Listening schema compatibility

Listening generation now accepts common model aliases without weakening validation.

- `type` is accepted as an alias for `questionType`.
- `question` is accepted as an alias for `prompt`.
- `multiple_choice`, `multiple-choice`, `mcq`, `choice`, and `single_choice` normalize to `multiple_choice`.
- `short_answer`, `short-answer`, `short`, `free_text`, and `text` normalize to `short_answer`.
- If the type is absent/unknown, non-empty `options` infer multiple choice; otherwise the safe fallback is short answer.
- `correctAnswer` / `answerIndex` are accepted as aliases for `correctOption`.
- `keywords` is accepted as an alias for `acceptedKeywords`; `answer` for `modelAnswer`.
- The generation prompt now explicitly asks for the canonical `questionType` + `prompt` schema.
