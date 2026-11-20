#!/usr/bin/env python3
"""Smoke test the PSLE-only route and module selection."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
required=[
 "app/page.tsx","app/oral/conversation/page.tsx","app/oral/reading-aloud/page.tsx",
 "app/learn/listen/page.tsx","app/learn/listen/[id]/page.tsx",
 "app/admin/(protected)/speaking/page.tsx","app/admin/(protected)/listening/page.tsx",
 "app/platform/(protected)/speaking/page.tsx","app/platform/(protected)/listening/page.tsx",
]
for path in required:
 assert (root/path).is_file(), f"PSLE route missing: {path}"
for path in ["app/science","app/grammar","app/vocabulary","app/exam",
             "app/practice","app/assignments","app/rewards","app/plan","app/progress"]:
 assert not (root/path).exists(), f"Out-of-scope learner module exists: {path}"
for path in ["app/api/student/science","app/api/student/vocabulary","app/api/student/writing",
             "app/api/student/grammar","app/api/student/question-bank","app/api/student/speaking/pet-prompts"]:
 assert not (root/path).exists(), f"Out-of-scope learner API exists: {path}"
shell=(root/"components/app-shell.tsx").read_text()
for title in ["Conversation","Reading Aloud","Listening"]:
 assert title in shell
assert "PET · Picture" not in (root/"components/speaking-workspace.tsx").read_text()
assert "SummaryGate" not in (root/"components/student-listening-player.tsx").read_text()
print("PASS: PSLE Oral and Listening routes, UI, and API surface")
