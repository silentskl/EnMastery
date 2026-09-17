# V0.9.0 R21 — Content Visibility & Speaking Expansion

## Content visibility contract

1. **Guest / not signed in**
   - Can browse published Platform/global content.
   - Cannot see tenant-private content.
   - Cannot invoke any student AI endpoint.
   - Speaking recording, AI conversation, server STT/TTS and pronunciation assessment are disabled until sign-in.

2. **Signed-in student**
   - Can see all published Platform/global content.
   - Can see all published content owned by the student's tenant.
   - Tenant content is never exposed to guests.

The student content visibility helper no longer truncates the library by `tenant_learn_availability.lesson_limit`. The availability table remains for compatibility and future planner/UI policy use.

## Speaking starter library

R21 adds eight original global tasks:

- P5 Reading Aloud: A Visit to the School Library
- P5 Reading Aloud: A Helpful Neighbour
- P6 Reading Aloud: The School Exhibition
- P6 Reading Aloud: One Small Change
- P5 Stimulus Conversation: A Busy Playground
- P5 Stimulus Conversation: A Classroom Project
- P6 Stimulus Conversation: The Community Garden
- P6 Stimulus Conversation: Helping at a School Event

The stimulus tasks use text scene descriptions so they work without an external image asset.

## Speaking reference sources

Platform Question Bank now includes Cambridge English speaking reference sources. Platform Admin can also add additional oral reference sources from the Question Bank page. Reference-only sources guide level, skill, task family and topic; generated learner-facing content remains original.
