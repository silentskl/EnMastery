# V0.5.0 R6 — Four-skill Learn, Practice and Daily Mission

## Student information architecture

Both Learn and Practice are organised around the same four skills:

- Listen
- Speak
- Read
- Write

`/learn` shows published learning libraries and real mastery evidence.
`/practice` shows targeted practice entry points for the same four skills.

Paper 2 is no longer the whole Practice page. It is part of **Read practice**.

## Daily mission

The planner assembles one current task per core skill from the existing published course/practice library:

1. **Listen** — prefers unfinished published audio/video listening content.
2. **Speak** — chooses a published oral prompt and deep-links that prompt into the speaking workspace.
3. **Read** — prefers unfinished guided reading; alternates with a published Paper 2 set when available.
4. **Write** — chooses a published writing prompt, preferring prompts the learner has used least recently.

Due vocabulary review is added separately and does not replace any core skill.

## Mastery shown on Learn / Practice

The four skill cards are no longer demo values. The API computes mastery from real `skill_mastery` evidence:

- unassessed domains show `— / not assessed`;
- assessed domains show the average mastery of skills that actually have evidence;
- published lesson/practice counts are read from D1 for the learner's P5/P6 level.

## Task lifecycle

Daily tasks still use the existing `learning_tasks` table. No new migration is required.

Task completion is connected to real work:

- Reading lesson → completed after its published questions are completed.
- Listening lesson → existing listening completion/attempt lifecycle.
- Speaking → existing oral response / pronunciation assessment completion.
- Paper 2 Reading practice → final question completes the matching daily Reading task.
- Writing → successful async AI review completes the matching daily Writing task.

## Refresh behaviour

The planner tags generated tasks with:

```json
{"plannerVersion":"four-skills-v1"}
```

When upgrading from the old adaptive planner:

- completed or in-progress core tasks are preserved;
- old uncompleted adaptive tasks are replaced by the four-skill mission;
- future calls do not keep regenerating an already complete four-skill day.

## Student URLs

- `/learn`
- `/practice`
- `/practice/listen`
- `/practice/speak`
- `/practice/read`
- `/practice/write`
- `/plan`

## Upgrade

No D1 migration is added in R6. Deploy code only:

```bash
./scripts/deploy.sh update
```

The existing D1/R2/Queue resources remain unchanged.
