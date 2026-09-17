# English Mastery V1.0.2

## Changes
- Student Account now shows the active student profile when a student session already exists; Tenant Admin sign-in remains available.
- Publishing a lesson triggers an immediate lesson-library refresh signal, with the existing polling refresh retained as a fallback.
- Reading lesson Review pages include an explicit in-app Back to lesson library action.
- Content creation now deduplicates before create/queue across Reading, Listening, Speaking, Writing and Cloze; duplicates return `skipped` rather than creating new records/jobs. Question Bank keeps its existing fingerprint/semantic duplicate rejection.
- Platform Integrations now includes managed SMTP configuration. System email notifications, including syllabus-monitor alerts, use SMTP. Port 25 is rejected for Cloudflare Workers; use 587 STARTTLS or 465 TLS.
