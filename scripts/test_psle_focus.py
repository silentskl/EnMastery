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

# Oral route must not mark a one-way description as the completed conversation.
examiner=(root/"lib/speaking/evaluate.ts").read_text()
conversation=(root/"app/api/student/speaking/respond/route.ts").read_text()
workspace=(root/"components/speaking-workspace.tsx").read_text()
assert "PSLE_CONVERSATION_QUESTION_COUNT" in examiner
assert "args.currentQuestion" in examiner and "nextQuestion" in examiner and "passed" in examiner
assert "completed?" in conversation and "recordDailySpeakingModeScore" in conversation
assert "speaking_turns" in conversation and "turn_count" in conversation
assert 'setPhase(body.completed?"completed":body.passed?"questions":"retry")' in workspace
assert "examinerQuestion" in workspace
assert "PSLE_ORAL_PASS_MARK = 90" in (root/"lib/speaking/psle-oral.ts").read_text()
assert "PSLE_CONVERSATION_QUESTION_COUNT = 3" in (root/"lib/speaking/psle-oral.ts").read_text()
assert "questionIndex" in conversation and "evaluation.passed" in conversation
assert "currentQuestion" in conversation and "retry" in conversation
assert "recordDailyGoalEvent" in conversation
print("PASS: 3 photo oral questions, per-answer coaching and repeated 90-point gate")

# Everyday scenario role-play is separate from the PSLE photograph assessment.
assert (root/"app/oral/roleplay/page.tsx").is_file()
assert (root/"app/api/student/roleplay/route.ts").is_file()
assert (root/"components/roleplay-workspace.tsx").is_file()
catalogue=(root/"lib/roleplay/scenarios.ts").read_text()
assert catalogue.count('{"id":')>=90, "Role-play must include a broad situation library"
for topic in ["hawker-order","restaurant-order","hotel-checkin","hotel-checkout","mrt-directions","clinic-registration","lost-in-mall"]:
 assert topic in catalogue, f"Missing core role-play situation: {topic}"
roleplay_api=(root/"app/api/student/roleplay/route.ts").read_text()
for action in ['action==="start"','action==="finish"','nextRoleplayReply','speaking_turns','assessRoleplay']:
 assert action in roleplay_api, f"Missing open-ended role-play implementation: {action}"
assert "/oral/roleplay" in shell
print("PASS: broad open-ended real-life AI role-play and independent completion")


# Both conversational AI paths use user-role framing: our ModelBridge gateway
# may map "system" to upstream "developer", which some models reject.
dialogue=(root/"lib/roleplay/engine.ts").read_text()
photo_examiner=(root/"lib/speaking/evaluate.ts").read_text()
assert 'role:"system"' not in dialogue and 'role:"system"' not in photo_examiner
assert 'role:"user"' in dialogue and 'role:"user"' in photo_examiner
print("PASS: ModelBridge-compatible conversation message roles")

# Shared hands-free voice loop: no AI audio captured, endpoint-based playback,
# voice activity plus three-second silence, guarded submissions and fallback STT.
voice=(root/"lib/browser/use-conversation-voice.ts").read_text()
picture=(root/"components/speaking-workspace.tsx").read_text()
roleplay=(root/"components/roleplay-workspace.tsx").read_text()
for marker in ["SILENCE_MS = 3000","NO_SPEECH_MS = 30000","MAX_TURN_MS = 90000",
               "recognition.onresult","processingRef.current","lastVoiceRef.current",
               "await serverSpeech(text)","await browserSpeech(text)","listenAfter",
               "await submitRef.current(message)","URL.revokeObjectURL"]:
 assert marker in voice, "Missing hands-free guard: "+marker
assert 'body.passed?" "+(body.examinerQuestion||"")' in picture
assert "voice.play(data.reply,data.phase!==\"ready_final\")" in roleplay and "begin_final" in roleplay
assert "voice.stopRecording(voice.handsFree)" in picture and "voice.stopRecording(voice.handsFree)" in roleplay
assert "assessReading()" in picture and "PronunciationAssessment" in picture
print("PASS: three-round voice practice with automatic 3-second silence submission")
passMark=(root/"lib/student/speaking-daily.ts").read_text()
reading=(root/"app/api/student/speaking/assess/route.ts").read_text()
roleplay=(root/"app/api/student/roleplay/route.ts").read_text()
engine=(root/"lib/roleplay/engine.ts").read_text()
assert "passMark=PSLE_ORAL_PASS_MARK" in passMark
assert 'if(assessment.pronunciation>=PSLE_ORAL_PASS_MARK)await recordDailyGoalEvent' in reading
assert 'if(passed)await recordDailyGoalEvent' in roleplay
assert '"rehearse","begin_final"' in roleplay
assert "transcriptMatch(expected,transcript)" in roleplay
assert 'score>=PSLE_ORAL_PASS_MARK' in roleplay
assert "improvedLines" in engine
assert "ready_final" in roleplay and "phaseStartLine" in roleplay
print("PASS: no daily credit for <90 reading / unpassed role-play; guided script cannot be skipped")

# Voice setup: microphone permission and speech provider are distinct errors.
setup=(root/"components/oral-setup-dialog.tsx").read_text()
reading_workspace=(root/"components/speaking-workspace.tsx").read_text()
roleplay_workspace=(root/"components/roleplay-workspace.tsx").read_text()
reading_api=(root/"app/api/student/speaking/assess/route.ts").read_text()
assert "Microphone permission required" in setup
assert "Speech recognition / assessment is unavailable" in setup
assert "Microphone → Allow" in setup
assert "onRetry" in setup
assert "micIssue" in voice and "microphoneIssue(reason)" in voice
assert "getSpeechRecognitionCtor()" in reading_workspace and "config?.azurePronunciation" in reading_workspace
assert "rec.onend=finish" in reading_workspace, "Reading Aloud must wait for the final browser transcript"
assert "transcriptRef.current" in reading_workspace
assert "OralSetupDialog" in reading_workspace and "OralSetupDialog" in roleplay_workspace
assert 'code:"SPEECH_RECOGNITION_UNAVAILABLE"' in reading_api
print("PASS: explicit microphone permission dialog, missing STT guidance and late transcript protection")
