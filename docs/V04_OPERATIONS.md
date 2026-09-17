# V0.4 Operations Guide

## 1. Speaking

Open `/learn/speak`.

The learner can switch between:
- AI Conversation
- Reading Aloud
- Stimulus Conversation

### AI Conversation / Stimulus
1. Click **Speak**.
2. Speak naturally.
3. Stop recording.
4. The transcript is shown and can be corrected for obvious speech-recognition mistakes.
5. Click **Get response**.
6. ModelBridge evaluates relevance, idea development, grammar, vocabulary and interaction, then returns one follow-up question.
7. The tutor response is spoken using ModelBridge TTS when configured, otherwise browser TTS.

### Reading Aloud
1. Select Reading Aloud.
2. Read the reference passage.
3. Click **Assess reading aloud**.
4. If Azure Speech is configured, the result includes acoustic Accuracy / Fluency / Completeness / Prosody scores and low-scoring words.
5. Without Azure, the learner gets a clearly labelled free practice score using recognised-word alignment and speaking pace.

## 2. Configure optional speech providers

Run:

```bash
./scripts/deploy.sh update
```

The script asks for optional:
- ModelBridge STT model
- ModelBridge TTS model
- TTS voice
- Azure Speech region
- Azure Speech key

Leave optional fields blank to use browser fallbacks.

The expected ModelBridge endpoints are:

```text
POST /v1/audio/transcriptions
POST /v1/audio/speech
```

## 3. Create owned intensive-listening material

Go to:

`/platform/listening/owned`

Use audio that the organisation owns or is authorised to use.

Upload:
- title
- level P5/P6
- topic
- audio file
- timestamped transcript
- PSLE listening skill mapping

Transcript format:

```text
00:00-00:06 | The mangrove forest protects the coastline.
00:06-00:13 | Its roots slow down waves and trap sediment.
00:13-00:20 | Many young fish find shelter among the roots.
```

The audio is stored privately in R2. The exact transcript is stored because this is owned/authorised intensive-learning content.

After generation:
1. Open `/platform/listening`.
2. Review the draft.
3. Play the draft audio in Admin Review.
4. Check questions/answers and lesson design.
5. Publish.

Student playback then supports per-segment replay, dictation and shadowing.

## 4. Adaptive plan

Open `/plan` or view the compact plan on Student Home.

The system generates seven days of tasks from:
- due vocabulary items;
- weaker Skill Mastery nodes;
- incomplete Reading/Listening lessons;
- regular oral practice.

Tasks are idempotent: revisiting `/plan` does not create duplicate daily tasks.

Task status updates when the learner completes the real linked activity.

## 5. Streak

Streak uses Singapore local dates and counts consecutive days with learning evidence. If today has no activity yet, yesterday can still be the current streak endpoint until the learner studies today.

## 6. XP policy

- Correct/attempted questions: existing XP rules apply.
- Speaking turns/Reading Aloud: small learning XP is awarded.
- Adaptive task completion: XP is awarded once using a deterministic ledger ID.
- Listening media completion alone: no XP, preserving the V0.3 rule that simply consuming YouTube/podcast media is not gamified.
- Dictation/shadowing: small XP based on meaningful practice.

## 7. Vocabulary

V0.4 vocabulary functionality remains unchanged from dev.1. Continue using it and iterate based on learner feedback rather than expanding scope prematurely.
