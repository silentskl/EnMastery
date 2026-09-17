# V0.9.0 R8 — Learn availability, Writing expansion and Speaking task studio

## 1. Tenant Admin → Learn settings

Route: `/admin/learn-settings`

The Tenant Admin selects P5 or P6 and sets the number of lessons visible to students for:

- Listen
- Speak
- Read
- Write

The page shows both **Published** and **Lessons visible to students**. A visibility limit cannot create content; the effective student count is `min(configured limit, currently published content)`.

The configuration affects:

- Learn-by-skill counts on `/learn`.
- Reading and Listening lesson libraries.
- Speaking prompt list.
- Writing prompt progression.
- The weekly adaptive planner's Learn content selection.
- Direct Reading / Listening / Writing content access checks.

Writing revision safety: if a student has a Writing submission below the 60% pass mark, that prompt remains accessible for revision even if the Tenant Admin lowers the Write limit.

## 2. Upgrade compatibility

`0027_v09_r8_learn_availability_speaking_writing.sql` creates `tenant_learn_availability` and snapshots every existing tenant's current counts **before** inserting the new R8 content.

Therefore a production tenant currently showing 10 / 3 / 4 / 2 does not automatically change to the expanded content counts after upgrade. The Admin raises the limits deliberately.

New tenants default to 10 / 3 / 4 / 2 for Listen / Speak / Read / Write, separately for P5 and P6.

## 3. Speaking task creation

Tenant route: `/admin/speaking`

Platform route: `/platform/speaking`

Supported modes:

### Reading Aloud
Required fields:
- Title
- Level
- Topic
- Task instruction
- Reference passage

### Stimulus Conversation
Required fields:
- Title
- Level
- Topic
- Task instruction
- Visual / scene description
- Optional follow-up goals

### AI Conversation
Required fields:
- Title
- Level
- Topic
- Open conversation prompt
- Optional follow-up goals

Tenant tasks use `scope='tenant'`; Platform tasks use `scope='global'`.

## 4. Original syllabus-aligned seed content

R8 adds:

| Domain | P5 | P6 | Total |
| --- | ---: | ---: | ---: |
| Writing | 12 | 16 | 28 |
| Speaking | 15 | 18 | 33 |

Speaking is balanced across:
- 11 Reading Aloud activities
- 11 Stimulus Conversation activities
- 11 AI/open Conversation activities

P6 Continuous Writing tasks include:
- topic-based writing instruction;
- 150-word minimum target;
- three original picture-prompt descriptions;
- planning prompts for idea generation, structure, development and revision.

Situational Writing tasks require students to identify purpose, audience and context and cover explicit information points with an appropriate tone.

The seed material is original English Mastery content. MOE/SEAB documents are used as curriculum and assessment references, not copied as a question bank.
