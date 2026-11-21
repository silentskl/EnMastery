#!/usr/bin/env python3
"""PSLE Oral, Listening and everyday role-play deployment preflight.

This validates the *currently supported product*. Historic D1 migrations remain
immutable and are executed end-to-end, but removed Vocabulary / Science /
Writing / Daily Plan pages are intentionally NOT required at runtime.

Run: python3 scripts/validate_release.py
"""
from __future__ import annotations

from collections import Counter
import json
from pathlib import Path
import re
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
warnings: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def require(path: str, *markers: str) -> str:
    file = ROOT / path
    if not file.is_file():
        fail("Required PSLE release file is missing: " + path)
        return ""
    try:
        source = file.read_text(encoding="utf-8")
    except OSError as error:
        fail("Cannot read " + path + ": " + str(error))
        return ""
    for marker in markers:
        if marker not in source:
            fail(path + ": missing required marker " + repr(marker))
    return source


def check_files() -> None:
    # These are the supported routes and their actual implementation surfaces.
    required = [
        "package.json", "VERSION", "scripts/deploy.sh",
        "scripts/test_psle_focus.py", "scripts/test_d1_migrations.py",
        "wrangler.jsonc", "workers/task-runner/wrangler.jsonc",
        "workers/syllabus-monitor/wrangler.jsonc",
        "app/page.tsx", "app/oral/conversation/page.tsx",
        "app/oral/reading-aloud/page.tsx", "app/oral/roleplay/page.tsx",
        "app/learn/listen/page.tsx", "app/learn/listen/[id]/page.tsx",
        "app/api/student/speaking/config/route.ts",
        "app/api/student/speaking/prompts/route.ts",
        "app/api/student/speaking/respond/route.ts",
        "app/api/student/speaking/assess/route.ts",
        "app/api/student/speaking/transcribe/route.ts",
        "app/api/student/speaking/tts/route.ts",
        "app/api/student/roleplay/route.ts",
        "app/api/student/listening/route.ts",
        "app/api/student/listening/[id]/route.ts",
        "app/api/admin/speaking/route.ts",
        "app/api/platform/speaking/route.ts",
        "app/admin/(protected)/speaking/page.tsx",
        "app/admin/(protected)/listening/page.tsx",
        "app/platform/(protected)/speaking/page.tsx",
        "app/platform/(protected)/listening/page.tsx",
        "components/app-shell.tsx", "components/student-dashboard.tsx",
        "components/speaking-workspace.tsx", "components/roleplay-workspace.tsx",
        "lib/browser/use-conversation-voice.ts",
        "components/student-listening-player.tsx",
        "lib/speaking/daily-prompt-assignment.ts",
        "lib/speaking/evaluate.ts", "lib/student/speaking-daily.ts",
        "lib/roleplay/scenarios.ts", "lib/roleplay/engine.ts",
        "lib/settings/learner-runtime.ts",
        "lib/auth/tenant.ts", "lib/tenant/usage.ts",
        "app/globals.css",
        "migrations/0008_v04_speaking_intensive_planner.sql",
        "migrations/0061_v102_hotfix1245_speaking_daily_prompt_rotation.sql",
        "migrations/0066_v102_reading_aloud_50_original_passages.sql",
        "migrations/0067_psle_picture_dialogue_tasks.sql",
        "migrations/0068_psle_daily_study_goal.sql",
        "app/api/student/daily-goal/route.ts",
        "components/daily-goal-panel.tsx",
        "lib/student/daily-goal.ts",
        "scripts/test_daily_goal.py",
    ]
    for path in required:
        require(path)

    # Detect accidental restoration of removed student features; old SQL data is
    # retained intentionally for upgrade compatibility.
    removed = [
        "app/plan", "app/practice", "app/science", "app/grammar",
        "app/vocabulary", "app/assignments", "app/rewards",
        "app/learn/write", "app/learn/vocabulary",
        "app/api/student/plan", "app/api/student/science",
        "app/api/student/grammar", "app/api/student/vocabulary",
        "app/api/student/writing", "app/api/student/question-bank",
    ]
    for path in removed:
        if (ROOT / path).exists():
            fail("Removed learner module unexpectedly exists: " + path)

    shell = require("components/app-shell.tsx")
    for route in ["/oral/conversation", "/oral/reading-aloud",
                  "/oral/roleplay", "/learn/listen"]:
        if route not in shell:
            fail("Student navigation missing " + route)
    page = require("components/student-dashboard.tsx")
    for route in ["/oral/conversation", "/oral/reading-aloud",
                  "/oral/roleplay", "/learn/listen"]:
        if route not in page:
            fail("Home page missing " + route)

    # Conversation must be picture-first and grade the full exchange, not the
    # learner's one-way description. A submitted prompt must belong to today.
    require("components/speaking-workspace.tsx",
            "stimulusImageUrl", "imageReady", "examinerQuestion",
            'setPhase(body.completed?"completed":"questions")')
    require("lib/speaking/evaluate.ts",
            "PSLE_CONVERSATION_QUESTION_COUNT=4",
            "evaluatePsleConversationTurn", "nextQuestion",
            "args.history")
    require("app/api/student/speaking/respond/route.ts",
            "requireAuthenticatedLearner",
            "speaking_daily_prompt_assignments", "a.child_id=?",
            "a.task_date=?", "turn_count", "speaking_turns",
            "recordDailySpeakingModeScore", "const completed=evaluation.completed")
    require("lib/speaking/daily-prompt-assignment.ts",
            "ensureDailySpeakingPromptAssignments",
            "speaking_daily_prompt_assignments",
            "stimulusImageUrl", "getTenantLessonRepeatCooldownDays")
    require("lib/student/speaking-daily.ts",
            '["reading_aloud","stimulus"]', "completeMatchingTasks")

    # Role play uses server-owned characters/scenes, authenticated D1 sessions,
    # a stored conversation history and feedback only when explicitly finished.
    require("app/api/student/roleplay/route.ts",
            "requireAuthenticatedLearner", "findRoleplayScenario",
            "loadSession(env.DB,session.childId,sessionId)",
            "nextRoleplayReply", "speaking_turns", "assessRoleplay",
            'action==="finish"')
    require("lib/roleplay/engine.ts",
            "nextRoleplayReply", "assessRoleplay",
            "OPEN-ENDED interactive role-play", "args.history")
    require("components/roleplay-workspace.tsx",
            'action:"start"', 'action:"reply"', 'action:"finish"',
            "startRecording", "stopRecording", "voice.play(data.reply,true)")
    require("app/api/student/speaking/assess/route.ts",
            "requireAuthenticatedLearner")
    require("app/api/student/speaking/transcribe/route.ts",
            "requireAuthenticatedLearner")
    require("app/api/student/speaking/tts/route.ts",
            "requireAuthenticatedLearner")

    # Every Tenant's AI and usage records must resolve through its own
    # authenticated context, not the Platform's provider credentials.
    tenant = require("lib/settings/learner-runtime.ts",
                     "ensureLearnerSession", "tenantIdForChild",
                     "resolveTenantIntegrations", "tenantAiQuotaStatus")
    if not tenant:
        return


def check_roleplay_catalogue() -> None:
    source = require("lib/roleplay/scenarios.ts",
                     "ROLEPLAY_CATEGORIES", "ROLEPLAY_SCENARIOS")
    categories = re.findall(r'^\s+"id": "([^"]+)",?$', source, re.M)
    scenes = re.findall(r'^\s*\{"id":"([^"]+)","category":"([^"]+)",', source, re.M)
    if len(categories) < 12:
        fail("Expected at least 12 real-life scenario categories, got " + str(len(categories)))
    if len(set(categories)) != len(categories):
        fail("Duplicate role-play category ID")
    if len(scenes) < 100:
        fail("Expected at least 100 real-life practice scenes, got " + str(len(scenes)))
    ids = [scene_id for scene_id, _ in scenes]
    if len(ids) != len(set(ids)):
        fail("Duplicate role-play scenario ID")
    invalid = sorted({category for _, category in scenes} - set(categories))
    if invalid:
        fail("Role-play scenes reference undefined categories: " + str(invalid))
    required = {"hawker-order", "restaurant-order", "hotel-checkin",
                "hotel-checkout", "mrt-directions", "clinic-registration",
                "lost-in-mall"}
    if required - set(ids):
        fail("Missing key role-play scenarios: " + str(sorted(required - set(ids))))
    used_categories = Counter(category for _, category in scenes)
    if any(category not in used_categories for category in categories):
        fail("One or more role-play categories have no scenes")
    print("Role-play catalogue: %d scenes in %d categories" % (len(scenes), len(categories)))


def check_package() -> None:
    try:
        pkg = json.loads(require("package.json"))
        version = require("VERSION").strip()
        if pkg.get("version") != version:
            fail("package.json version disagrees with VERSION")
        if int(pkg.get("engines", {}).get("node", "").lstrip(">= ").split(".")[0]) < 22:
            fail("Node.js 22+ is required by this release")
        scripts = pkg.get("scripts", {})
        commands = {
            "selfcheck": "python3 scripts/validate_release.py",
            "test:psle-focus": "python3 scripts/test_psle_focus.py",
            "test:daily-goal": "python3 scripts/test_daily_goal.py",
            "test:d1-migrations": "python3 scripts/test_d1_migrations.py",
        }
        for name, command in commands.items():
            if scripts.get(name) != command:
                fail("package.json script " + name + " must run " + command)
        if scripts.get("typecheck") != "node scripts/refresh-next-types.mjs && tsc --noEmit":
            fail("typecheck must refresh generated Next.js routes before running tsc")
        require("scripts/refresh-next-types.mjs",
                'join(root, ".next", "types")',
                'join(root, ".next", "dev", "types")',
                '"typegen"', '"validator.ts"')
        release = scripts.get("check:release", "")
        for command in ["npm run selfcheck", "npm run test:psle-focus", "npm run test:daily-goal",
                        "npm run test:d1-migrations", "npm run typecheck",
                        "npm run typecheck:workers", "npm run build",
                        "npm run build:cloudflare"]:
            if command not in release:
                fail("check:release missing " + command)
        deploy = require("scripts/deploy.sh", "npm run selfcheck",
                         'apply_migrations', 'deploy_workers')
        if deploy.index("build_verify\napply_migrations") < 0:
            fail("Deploy must run verification before applying production migrations")
    except (OSError, ValueError, TypeError, AttributeError) as error:
        fail("Package/deploy validation failed: " + str(error))


def check_cloudflare() -> None:
    configs = [
        "wrangler.jsonc", "workers/task-runner/wrangler.jsonc",
        "workers/syllabus-monitor/wrangler.jsonc",
    ]
    for path in configs:
        try:
            cfg = json.loads(require(path))
            if cfg.get("compatibility_date", "") < "2026-08-04":
                fail(path + ": nodejs_compat requires a newer compatibility date")
            if "nodejs_compat" not in cfg.get("compatibility_flags", []):
                fail(path + ": nodejs_compat flag missing")
            d1 = cfg.get("d1_databases", [])
            if not any(x.get("binding") == "DB"
                       and x.get("database_name") == "english-mastery" for x in d1):
                fail(path + ": DB D1 binding missing")
            r2 = cfg.get("r2_buckets", [])
            if not any(x.get("binding") == "MEDIA"
                       and x.get("bucket_name") == "english-mastery-media" for x in r2):
                fail(path + ": MEDIA R2 binding missing")
        except (OSError, ValueError, TypeError, AttributeError) as error:
            fail("Cloudflare configuration " + path + ": " + str(error))
    try:
        web = json.loads(require("wrangler.jsonc"))
        task = json.loads(require("workers/task-runner/wrangler.jsonc"))
        if not any(x.get("binding") == "TASK_QUEUE"
                   and x.get("queue") == "english-mastery-jobs"
                   for x in web.get("queues", {}).get("producers", [])):
            fail("Web Worker is missing its TASK_QUEUE producer binding")
        if not any(x.get("queue") == "english-mastery-jobs"
                   and x.get("max_batch_size") == 1
                   and x.get("max_concurrency") == 1
                   and x.get("dead_letter_queue") == "english-mastery-jobs-dlq"
                   for x in task.get("queues", {}).get("consumers", [])):
            fail("Task Worker requires serialized job execution and dead-letter queue")
    except (OSError, ValueError, TypeError, AttributeError) as error:
        fail("Cloudflare queue validation: " + str(error))


def check_migrations() -> None:
    migrations = sorted((ROOT / "migrations").glob("*.sql"))
    numbers = [int(m.name[:4]) for m in migrations]
    if len(migrations) < 68 or 67 not in numbers or 68 not in numbers:
        fail("PSLE picture conversation and daily study goal migrations 0067–0068 are required")
        return
    if numbers != list(range(1, len(numbers) + 1)):
        fail("D1 migration files must remain a contiguous, ordered sequence")
    db = sqlite3.connect(":memory:")
    try:
        for migration in migrations:
            try:
                db.executescript(migration.read_text(encoding="utf-8"))
            except (OSError, sqlite3.Error) as error:
                fail("D1 migration " + migration.name + " failed: " + str(error))
                return
        names = {name for (name,) in db.execute(
            "SELECT name FROM sqlite_master WHERE type='table'")}
        required = {
            "users", "tenants", "tenant_members", "child_profiles",
            "speaking_sessions", "speaking_turns",
            "speaking_daily_prompt_assignments",
            "speaking_daily_mode_progress",
            "content_items", "content_versions", "content_media",
            "questions", "generation_jobs",
        }
        for table in sorted(required - names):
            fail("D1 database missing required table " + table)
        for table, columns in {
            "speaking_sessions": {"id", "child_id", "mode", "prompt_text",
                                  "prompt_title", "status", "turn_count", "feedback_json"},
            "speaking_turns": {"id", "session_id", "child_id", "speaker",
                               "transcript", "reply_text"},
            "speaking_daily_prompt_assignments": {
                "child_id", "task_date", "mode", "prompt_id"},
        }.items():
            if table in names:
                existing = {row[1] for row in db.execute("PRAGMA table_info(" + table + ")")}
                for column in sorted(columns - existing):
                    fail("D1 " + table + " is missing " + column)
        if "speaking_sessions" in names:
            sql = db.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='speaking_sessions'"
            ).fetchone()[0]
            if "'conversation'" not in sql or "'stimulus'" not in sql:
                fail("D1 speaking_sessions must support both role-play and picture conversation")

        # Migration 0067 is the published picture-first PSLE corpus.
        picture_rows = db.execute(
            "SELECT c.id,c.school_level,v.body_json FROM content_items c "
            "JOIN content_versions v ON v.content_id=c.id AND v.version=c.active_version "
            "WHERE c.id LIKE 'psle-sbc-%' AND c.content_type='oral_prompt' "
            "AND c.status='published'"
        ).fetchall()
        stages = Counter()
        for identifier, stage, raw in picture_rows:
            stages[stage] += 1
            try:
                body = json.loads(raw)
                if body.get("mode") != "stimulus":
                    fail(identifier + ": expected picture conversation mode")
                if not str(body.get("stimulusImageUrl", "")).startswith("https://"):
                    fail(identifier + ": missing HTTPS image URL")
                if not body.get("stimulusAlt") or not body.get("prompt"):
                    fail(identifier + ": scene description or prompt missing")
            except (ValueError, TypeError) as error:
                fail(identifier + ": invalid picture prompt JSON: " + str(error))
        for stage in ["P5", "P6"]:
            if stages[stage] < 8:
                fail("PSLE " + stage + " requires at least 8 picture prompts; got " + str(stages[stage]))

        # Published reading passages must remain available for both grades.
        for stage in ["P5", "P6"]:
            count = db.execute(
                "SELECT COUNT(*) FROM content_items c JOIN content_versions v "
                "ON v.content_id=c.id AND v.version=c.active_version "
                "WHERE c.status='published' AND c.content_type='oral_prompt' "
                "AND c.school_level=? AND json_extract(v.body_json,'$.mode')='reading_aloud'",
                (stage,),
            ).fetchone()[0]
            if count < 8:
                fail("PSLE " + stage + " needs at least 8 published Reading Aloud passages")
        table_count = db.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' "
            "AND name NOT LIKE 'sqlite_%'").fetchone()[0]
        print("D1: %d migrations applied; %d tables; %d P5 and %d P6 picture prompts" %
              (len(migrations), table_count, stages["P5"], stages["P6"]))
        if table_count < 100:
            fail("Unexpected D1 schema regression: fewer than 100 tables")
    finally:
        db.close()


def main() -> int:
    check_files()
    check_roleplay_catalogue()
    check_package()
    check_cloudflare()
    check_migrations()
    if warnings:
        for warning in warnings:
            print("WARN:", warning)
    if errors:
        print("PSLE RELEASE SELF-CHECK FAILED (%d errors)" % len(errors))
        for item in errors:
            print(" - " + item)
        return 1
    print("PSLE RELEASE SELF-CHECK PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
