# V0.9.0 R22 — AI Guest Lock + Tenant Self-Registration

## Security invariant

Unauthenticated visitors can read Platform/Global published learning content, but **cannot invoke any learner AI capability**.

The server-side guard `requireAuthenticatedLearner()` is required before:
- ModelBridge chat
- ModelBridge STT/TTS
- Azure pronunciation assessment
- AI-backed vocabulary enrichment
- AI-backed summary review
- AI-backed writing review
- AI-backed oral evaluation
- AI-backed Question Bank evaluation jobs

The regression audit is `scripts/test_ai_guest_guard.py`.

## Account flow

1. Visitor opens `/register`.
2. Visitor creates an organisation (tenant) and Tenant Admin account.
3. The server creates the tenant, admin membership, password credential and default P5/P6 learning availability.
4. The visitor is signed in automatically as Tenant Admin.
5. Tenant Admin opens **Admin → Settings → Integrations** and enters the tenant-owned ModelBridge API key/models.
6. Tenant Admin opens **Students** and creates student login name + PIN accounts.
7. Students sign in and can use tenant ModelBridge AI.

Platform-managed integrations such as YouTube and Azure remain inherited from Platform Admin; ModelBridge is intentionally tenant-owned.

## Guest AI behaviour

Guest requests to `/api/ai/chat` and all other learner AI routes return HTTP 401 before any external AI provider is called or any AI job is queued.

Browser-only speech APIs may still exist in the UI as local browser functionality, but no guest request can invoke server-side AI services.

## Registration safeguards

- Password minimum: 10 characters.
- Email must be unique.
- Organisation slug must be unique.
- 5 registrations/hour per IP hash.
- 3 registrations/24 hours per email hash.
- Existing accounts cannot be overwritten by public registration.
