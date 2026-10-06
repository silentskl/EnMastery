from pathlib import Path
import json, sqlite3, sys, re
root=Path(__file__).resolve().parents[1]
errors=[];warnings=[];counts={}
def need(path,*markers):
 p=root/path
 if not p.exists(): errors.append(f'missing {path}'); return ''
 text=p.read_text(errors='ignore')
 for m in markers:
  if m not in text: errors.append(f'{path}: missing release marker {m}')
 return text

required=[
 'V1_0_2_HOTFIX12_4_5_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_4_5_FINAL.txt','scripts/test_hotfix1245.py','migrations/0061_v102_hotfix1245_speaking_daily_prompt_rotation.sql','migrations/0062_v102_hotfix1249_learning_history_restore.sql','migrations/0063_v102_pet_speaking_picture_description.sql','migrations/0064_v102_pet_pictured_events_questions.sql','lib/speaking/daily-prompt-assignment.ts',
 'V1_0_2_HOTFIX12_4_4_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_4_4_FINAL.txt','scripts/test_hotfix1244.py',
 'V1_0_2_HOTFIX12_4_1_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_4_1_FINAL.txt','scripts/test_hotfix1241.py',
 'V1_0_2_HOTFIX12_4_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_4_FINAL.txt','scripts/test_hotfix124.py','migrations/0060_v102_hotfix124_vocabulary_specialist.sql','lib/vocabulary-specialist/policy.ts','lib/vocabulary-specialist/generate.ts','app/api/student/vocabulary-specialist/route.ts','app/api/admin/vocabulary-specialist/route.ts','components/vocabulary-specialist/vocabulary-specialist-workspace.tsx','components/vocabulary-specialist/tenant-vocabulary-specialist-admin.tsx','app/practice/vocabulary-specialist/page.tsx','app/admin/(protected)/vocabulary-specialist/page.tsx',
 'V1_0_2_HOTFIX12_3_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_3_FINAL.txt','scripts/test_hotfix123.py','migrations/0059_v102_hotfix123_effective_study_time.sql','components/effective-study-time-tracker.tsx','app/api/student/study-time/route.ts',
 'V1_0_2_HOTFIX12_2_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_2_FINAL.txt','scripts/test_hotfix122.py','migrations/0058_v102_hotfix122_embedded_reward_games.sql','components/reward-game-workspace.tsx','components/embedded-reward-games.tsx','app/rewards/game/page.tsx',
 'V1_0_2_HOTFIX12_1_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_1_FINAL.txt','scripts/test_hotfix121.py','V1_0_2_HOTFIX12_0_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX12_0_FINAL.txt','scripts/test_hotfix120.py',
 'V1_0_2_HOTFIX11_9_1_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_9_1_FINAL.txt','scripts/test_hotfix1191.py','components/route-back-button.tsx','app/learn/layout.tsx','app/practice/layout.tsx',
 'V1_0_2_HOTFIX11_9_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_9_FINAL.txt','scripts/test_hotfix119.py','lib/d1/indexed-sample.ts','migrations/0056_v102_hotfix119_d1_rows_read_optimization.sql',
 'package.json','VERSION','V1_0_2_HOTFIX11_8_3_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_8_3_FINAL.txt','V1_0_2_HOTFIX11_8_2_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_8_2_FINAL.txt','V1_0_2_HOTFIX11_8_1_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_8_1_FINAL.txt','V1_0_2_HOTFIX11_8_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_8_FINAL.txt','V1_0_2_HOTFIX11_7_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_7_FINAL.txt','V1_0_2_HOTFIX11_6_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_6_FINAL.txt','V1_0_2_HOTFIX11_5_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_5_FINAL.txt','V1_0_2_HOTFIX11_4_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_4_FINAL.txt','V1_0_2_HOTFIX11_3_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_3_FINAL.txt','V1_0_2_HOTFIX11_2_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_2_FINAL.txt','V1_0_2_HOTFIX11_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX11_FINAL.txt','V1_0_2_HOTFIX10_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX10_FINAL.txt','V1_0_2_HOTFIX9_RELEASE.md','TEST_REPORT_V1.0.2_HOTFIX9_FINAL.txt','RELEASE_MANIFEST.txt','data/p5-p6-story-bank-r9.json','wrangler.jsonc','open-next.config.ts','cloudflare-env.d.ts','scripts/deploy.sh','scripts/test_d1_migrations.py','scripts/test_hotfix8.py','scripts/test_hotfix9.py','scripts/test_hotfix10.py','scripts/test_hotfix11.py','scripts/test_hotfix112.py','scripts/test_hotfix113.py','scripts/test_hotfix114.py','scripts/test_hotfix115.py','scripts/test_hotfix116.py','scripts/test_hotfix117.py','scripts/test_hotfix118.py','scripts/test_hotfix1181.py','scripts/test_hotfix1182.py','scripts/test_hotfix1183.py',
 'migrations/0017_v06_multitenant.sql','migrations/0018_v06_r2_parent_student_roles.sql','migrations/0019_v06_r3_single_tenant_admin.sql','migrations/0020_v06_r4_legacy_admin_ownership.sql','migrations/0021_v07_language_foundations.sql','migrations/0022_v08_exam_wordbooks_training.sql','migrations/0023_v09_singapore_science.sql','migrations/0024_v09_daily_game_rewards.sql','migrations/0025_v09_writing_progression_history.sql','migrations/0026_v09_mastery_gates_daily_reward.sql','migrations/0027_v09_r8_learn_availability_speaking_writing.sql','migrations/0028_v09_r9_curated_story_bank.sql','migrations/0029_v09_r10_learning_status_retry_history.sql','migrations/0030_v09_r12_work_queue_fifo.sql','migrations/0031_v09_r14_summary_mastery_cloze.sql','migrations/0032_v09_r15_unified_pass_score_cloze_summary.sql','migrations/0033_v09_r19_job_event_logs.sql','migrations/0034_v09_r19_hotfix4_publisher_fallback.sql','migrations/0035_v09_r19_hotfix5_british_council_publisher_first.sql','migrations/0036_v09_r19_hotfix7_external_video_media_kind.sql','migrations/0037_v09_r19_hotfix9_youtube_setting_alias.sql','migrations/0038_v09_r20_visibility_speaking_sources.sql','migrations/0039_v09_r21_public_tenant_registration.sql','migrations/0040_v101_content_source_domains.sql','migrations/0041_v102_psle_prelim_mindpath_source.sql','migrations/0042_v102_account_email_password_reset.sql','migrations/0043_v102_daily_task_filters_learning_stages.sql','migrations/0044_v102_learning_vocabulary_practice_policy.sql','migrations/0045_v102_practice_vocab_review_and_settings_tables.sql','migrations/0046_v102_daily_learning_reward_writing_speaking_cache.sql','migrations/0047_v102_vocabulary_synonym_annotations.sql','migrations/0048_v102_vocabulary_grammar_completeness.sql','migrations/0049_v102_hotfix7_vocab_books.sql','migrations/0050_v102_hotfix10_tenant_vocabulary_import.sql','migrations/0051_v102_hotfix11_queue_timeout.sql','migrations/0052_v102_hotfix113_tenant_wordbooks_planner.sql','migrations/0053_v102_hotfix114_system_wordbook_visibility.sql','migrations/0054_v102_hotfix115_daily_plan_resource_indexes.sql','migrations/0055_v102_hotfix118_speaking_cooldown.sql','migrations/0056_v102_hotfix119_d1_rows_read_optimization.sql','migrations/0057_v102_hotfix120_vocab_daily_new_review.sql','migrations/0058_v102_hotfix122_embedded_reward_games.sql','migrations/0059_v102_hotfix123_effective_study_time.sql','migrations/0060_v102_hotfix124_vocabulary_specialist.sql','migrations/0061_v102_hotfix1245_speaking_daily_prompt_rotation.sql',
 'lib/listening/catalog.ts','lib/listening/catalog-queue.ts','lib/auth/admin.ts','lib/auth/tenant.ts','lib/auth/accounts.ts','lib/auth/user.ts','lib/auth/password-reset.ts','lib/notifications/account-emails.ts','lib/settings/tenant-runtime.ts','lib/vocabulary/import.ts','lib/jobs/dispatch.ts','lib/jobs/store.ts','lib/jobs/timeout.ts','lib/jobs/lesson-create.ts',
 'app/platform/login/page.tsx','app/api/platform/listening/catalog/route.ts','app/platform/(protected)/tenants/page.tsx','app/api/platform/tenants/route.ts','app/api/platform/tenants/[id]/admin/route.ts','app/register/page.tsx','app/api/auth/tenant/register/route.ts','app/api/auth/tenant/forgot-password/route.ts','app/api/auth/tenant/reset-password/route.ts','components/tenant-registration-form.tsx','components/tenant-forgot-password-form.tsx','components/tenant-reset-password-form.tsx','app/admin/forgot-password/page.tsx','app/admin/reset-password/page.tsx',
 'app/admin/login/page.tsx','app/admin/(protected)/layout.tsx','app/admin/(protected)/learn-settings/page.tsx','app/admin/(protected)/practice-settings/page.tsx','app/admin/(protected)/vocabulary/page.tsx','app/admin/(protected)/speaking/page.tsx','app/admin/(protected)/students/page.tsx','app/admin/(protected)/sources/page.tsx','app/admin/(protected)/content/page.tsx','app/admin/(protected)/listening/page.tsx','app/admin/(protected)/writing/page.tsx','app/admin/(protected)/questions/page.tsx','app/admin/(protected)/question-bank/page.tsx','app/admin/(protected)/practice/page.tsx','app/admin/(protected)/jobs/page.tsx','app/admin/(protected)/courses/page.tsx','app/admin/(protected)/assignments/page.tsx',
 'app/api/admin/session/route.ts','app/api/admin/dashboard/route.ts','app/api/admin/listening/catalog/route.ts','app/api/admin/learn-settings/route.ts','app/api/admin/practice-settings/route.ts','app/api/admin/vocabulary/collections/route.ts','app/api/admin/vocabulary/collections/[id]/route.ts','app/api/admin/vocabulary/collections/[id]/items/[vocabularyId]/route.ts','app/api/admin/vocabulary/import/route.ts','app/api/admin/speaking/route.ts','app/api/admin/students/route.ts','app/api/admin/sources/route.ts','app/api/admin/content/route.ts','app/api/admin/listening/content/route.ts','app/api/admin/writing/route.ts','app/api/admin/questions/route.ts','app/api/admin/question-bank/generate/route.ts','app/api/admin/question-bank/review/route.ts','app/api/admin/practice-sets/route.ts','app/api/admin/jobs/route.ts','app/api/admin/resources/route.ts','app/api/admin/courses/route.ts','app/api/admin/assignments/route.ts',
 'app/api/student/progress/calendar/route.ts','components/learning-progress-calendar.tsx','components/student-plan.tsx','lib/student/tasks.ts',
 'components/platform-tenant-manager.tsx','components/tenant-vocabulary-manager.tsx','components/curated-story-bank.tsx','components/tenant-learn-settings.tsx','components/tenant-practice-settings.tsx','components/practice-policy-hub.tsx','components/speaking-task-manager.tsx','components/tenant-login-form.tsx','components/writing/writing-workspace.tsx','components/writing/writing-history.tsx','app/learn/write/history/page.tsx','app/api/student/writing/submissions/route.ts','app/api/student/writing/submissions/[id]/route.ts','app/api/student/writing/submissions/[id]/review/route.ts','components/reading-history.tsx','app/learn/read/history/page.tsx','app/api/student/reading/history/route.ts','app/api/student/reading/history/[id]/route.ts','components/tenant-dashboard.tsx','components/tenant-student-manager.tsx','components/tenant-source-manager.tsx','components/tenant-content-manager.tsx','components/tenant-listening-manager.tsx','components/tenant-writing-manager.tsx','components/tenant-question-manager.tsx','components/question-bank/tenant-bank.tsx','components/tenant-practice-builder.tsx','components/tenant-job-manager.tsx','components/app-shell.tsx',
 'app/vocabulary/page.tsx','app/grammar/page.tsx','app/science/page.tsx','app/science/daily/page.tsx','components/science/science-learning-hub.tsx','components/science/science-daily-trainer.tsx','lib/science/catalog.ts','app/api/student/science/catalog/route.ts','app/api/student/science/settings/route.ts','app/api/student/science/daily/start/route.ts','app/api/student/science/daily/answer/route.ts','app/api/student/science/daily/complete/route.ts','app/api/student/science/daily/status/route.ts','app/api/student/science/practice/route.ts','app/api/student/language-stage/route.ts','app/api/student/vocabulary/import/route.ts','app/api/student/vocabulary/catalog/route.ts','app/api/student/vocabulary/reinforcement/route.ts','app/api/student/grammar/topics/route.ts','app/api/student/grammar/topics/[id]/route.ts','app/api/student/grammar/topics/[id]/answer/route.ts','components/language/stage-selector.tsx','components/vocabulary/vocabulary-learning-hub.tsx','components/vocabulary/vocabulary-wordbooks.tsx','components/vocabulary/custom-wordbook-picker.tsx','components/vocabulary/vocabulary-daily-trainer.tsx','app/learn/vocabulary/page.tsx','app/api/student/vocabulary/collections/route.ts','app/api/student/vocabulary/training/route.ts','app/api/student/vocabulary/training/pronunciation/route.ts','components/grammar/grammar-learning-hub.tsx','components/daily-game-reward.tsx','lib/student/game-rewards.ts','app/api/student/rewards/route.ts','app/api/student/rewards/play/route.ts','lib/language/stages.ts','lib/language/preferences.ts','lib/language/grammar.ts','lib/vocabulary/catalog.ts'
]
for f in required:
 if not (root/f).exists(): errors.append(f'missing {f}')

try:
 pkg=json.loads((root/'package.json').read_text())
 if pkg.get('version')!='1.0.2': errors.append(f"package version must be 1.0.2, found {pkg.get('version')}")
 if pkg.get('name')!='english-mastery-v1.0.2': errors.append(f"package name must be english-mastery-v1.0.2, found {pkg.get('name')}")
 if (root/'VERSION').read_text().strip()!='1.0.2': errors.append('VERSION must be 1.0.2')
 if '@types/node' not in pkg.get('devDependencies',{}): errors.append('@types/node is required for node:net/node:tls Worker compatibility types')
 scripts=pkg.get('scripts',{})
 if scripts.get('build:cloudflare')!='opennextjs-cloudflare build': errors.append('build:cloudflare script missing or unexpected')
 expected_check='npm run typecheck && npm run typecheck:workers && npm run test:d1-migrations && npm run test:hotfix5 && npm run test:hotfix52 && npm run test:hotfix6 && npm run test:hotfix61 && npm run test:hotfix7 && npm run test:hotfix8 && npm run test:hotfix9 && npm run test:hotfix10 && npm run test:hotfix11 && npm run test:hotfix112 && npm run test:hotfix113 && npm run test:hotfix114 && npm run test:hotfix115 && npm run test:hotfix116 && npm run test:hotfix117 && npm run test:hotfix118 && npm run test:hotfix1181 && npm run test:hotfix1182 && npm run test:hotfix1183 && npm run build && npm run build:cloudflare && npm run selfcheck && npm run stylecheck'
 expected_check=expected_check.replace(' && npm run build',' && npm run test:hotfix119 && npm run test:hotfix1191 && npm run test:hotfix120 && npm run test:hotfix121 && npm run test:hotfix122 && npm run test:hotfix123 && npm run test:hotfix1231 && npm run test:hotfix124 && npm run test:hotfix1241 && npm run test:hotfix1242 && npm run test:hotfix1243 && npm run test:hotfix1244 && npm run test:hotfix1245 && npm run test:hotfix1247 && npm run build',1)
 if scripts.get('check:release')!=expected_check: errors.append('check:release must cover main TS, Worker TS, D1 migration compatibility, Hotfix5 behavior tests, Next build, OpenNext build, selfcheck and stylecheck')
 if scripts.get('test:d1-migrations')!='python3 scripts/test_d1_migrations.py': errors.append('test:d1-migrations script missing or unexpected')
 if scripts.get('test:hotfix5')!='python3 scripts/test_hotfix5.py': errors.append('test:hotfix5 script missing or unexpected')
 if scripts.get('test:hotfix1241')!='python3 scripts/test_hotfix1241.py': errors.append('test:hotfix1241 script missing or unexpected')
 if scripts.get('test:hotfix1242')!='python3 scripts/test_hotfix1242.py': errors.append('test:hotfix1242 script missing or unexpected')
 if scripts.get('test:hotfix1243')!='python3 scripts/test_hotfix1243.py': errors.append('test:hotfix1243 script missing or unexpected')
 if scripts.get('test:hotfix1244')!='python3 scripts/test_hotfix1244.py': errors.append('test:hotfix1244 script missing or unexpected')
 if scripts.get('test:hotfix1245')!='python3 scripts/test_hotfix1245.py': errors.append('test:hotfix1245 script missing or unexpected')
 if scripts.get('test:hotfix1247')!='python3 scripts/test_hotfix1247.py': errors.append('test:hotfix1247 script missing or unexpected')
 if scripts.get('test:hotfix61')!='python3 scripts/test_hotfix61.py': errors.append('test:hotfix61 script missing or unexpected')
 if scripts.get('test:hotfix7')!='python3 scripts/test_hotfix7.py': errors.append('test:hotfix7 script missing or unexpected')
 if scripts.get('test:hotfix8')!='python3 scripts/test_hotfix8.py': errors.append('test:hotfix8 script missing or unexpected')
 if scripts.get('test:hotfix9')!='python3 scripts/test_hotfix9.py': errors.append('test:hotfix9 script missing or unexpected')
 if scripts.get('test:hotfix1231')!='python3 scripts/test_hotfix1231.py': errors.append('test:hotfix1231 script missing or unexpected')
 if scripts.get('test:hotfix10')!='python3 scripts/test_hotfix10.py': errors.append('test:hotfix10 script missing or unexpected')
 if scripts.get('test:hotfix11')!='python3 scripts/test_hotfix11.py': errors.append('test:hotfix11 script missing or unexpected')
 if scripts.get('test:hotfix112')!='python3 scripts/test_hotfix112.py': errors.append('test:hotfix112 script missing or unexpected')
 if scripts.get('test:hotfix114')!='python3 scripts/test_hotfix114.py': errors.append('test:hotfix114 script missing or unexpected')
 if scripts.get('test:hotfix115')!='python3 scripts/test_hotfix115.py': errors.append('test:hotfix115 script missing or unexpected')
 if scripts.get('test:hotfix116')!='python3 scripts/test_hotfix116.py': errors.append('test:hotfix116 script missing or unexpected')
 if scripts.get('test:hotfix117')!='python3 scripts/test_hotfix117.py': errors.append('test:hotfix117 script missing or unexpected')
 if scripts.get('test:hotfix118')!='python3 scripts/test_hotfix118.py': errors.append('test:hotfix118 script missing or unexpected')
 if scripts.get('test:hotfix1181')!='python3 scripts/test_hotfix1181.py': errors.append('test:hotfix1181 script missing or unexpected')
 if scripts.get('test:hotfix1182')!='python3 scripts/test_hotfix1182.py': errors.append('test:hotfix1182 script missing or unexpected')
 if scripts.get('test:hotfix120')!='python3 scripts/test_hotfix120.py': errors.append('test:hotfix120 script missing or unexpected')
 if scripts.get('test:hotfix121')!='python3 scripts/test_hotfix121.py': errors.append('test:hotfix121 script missing or unexpected')
 if scripts.get('test:hotfix122')!='python3 scripts/test_hotfix122.py': errors.append('test:hotfix122 script missing or unexpected')
 if scripts.get('test:hotfix123')!='python3 scripts/test_hotfix123.py': errors.append('test:hotfix123 script missing or unexpected')
 if scripts.get('test:hotfix124')!='python3 scripts/test_hotfix124.py': errors.append('test:hotfix124 script missing or unexpected')
 if 'npm run test:hotfix124' not in scripts.get('check:release',''): errors.append('check:release missing Hotfix12.4 gate')
 if scripts.get('test:hotfix1183')!='python3 scripts/test_hotfix1183.py': errors.append('test:hotfix1183 script missing or unexpected')
 if scripts.get('test:hotfix119')!='python3 scripts/test_hotfix119.py': errors.append('test:hotfix119 script missing or unexpected')
 if scripts.get('test:hotfix1191')!='python3 scripts/test_hotfix1191.py': errors.append('test:hotfix1191 script missing or unexpected')
 for cfg_name in ['tsconfig.json','tsconfig.workers.json']:
  cfg=json.loads((root/cfg_name).read_text())
  type_names=cfg.get('compilerOptions',{}).get('types',[])
  for required_type in ['@cloudflare/workers-types','node']:
   if required_type not in type_names: errors.append(f'{cfg_name}: compilerOptions.types must include {required_type}')
 smtp=(root/'lib/notifications/smtp.ts').read_text(errors='ignore')
 if 'from "node:net"' not in smtp or 'from "node:tls"' not in smtp: errors.append('SMTP transport must use Node-compatible node:net and node:tls imports')
 if 'cloudflare:sockets' in smtp: errors.append('SMTP transport must not import cloudflare:sockets in shared Next/Worker code')
 # Node net/tls are runtime-supported for compatibility dates >= 2026-08-04.
 for wrangler_path in ['wrangler.jsonc','workers/task-runner/wrangler.jsonc','workers/syllabus-monitor/wrangler.jsonc']:
  text=(root/wrangler_path).read_text(errors='ignore')
  m=re.search(r'"compatibility_date"\s*:\s*"(\d{4}-\d{2}-\d{2})"',text)
  if not m: errors.append(f'{wrangler_path}: compatibility_date missing')
  elif m.group(1)<'2026-08-04': errors.append(f'{wrangler_path}: compatibility_date {m.group(1)} is too old for default Node.js compatibility')
except Exception as e: errors.append(f'package/version/compile config validation: {e}')

# D1 remote migration compatibility: 0043/0044 must not use multi-term compound SELECT seeding.
try:
 for migration_name in ['0043_v102_daily_task_filters_learning_stages.sql','0044_v102_learning_vocabulary_practice_policy.sql']:
  sql=(root/'migrations'/migration_name).read_text(errors='ignore')
  executable='\n'.join(line.split('--',1)[0] for line in sql.splitlines())
  if re.search(r'\bUNION(?:\s+ALL)?\b',executable,re.I): errors.append(f'{migration_name}: D1-sensitive compound SELECT remains; seed with VALUES CTEs')
  if 'VALUES' not in executable.upper(): errors.append(f'{migration_name}: expected VALUES CTE seed missing')
except Exception as e: errors.append(f'D1 migration compatibility validation: {e}')

# R4 readability invariant: the current specialised Exam question body (17px) is the global minimum.
try:
 css=(root/'app/globals.css').read_text()
 if 'font-size:17px;font-family:' not in css: errors.append('R4 global base font must be 17px')
 if 'button,textarea,input,select,option{font:inherit}' not in css: errors.append('R4 form controls must inherit product typography')
 if 'small{font-size:17px}' not in css: errors.append('R4 semantic small text must not shrink below 17px')
 bp=re.search(r'\.bankPrompt\{[^}]*font-size:(\d+)px',css)
 if not bp or int(bp.group(1))!=17: errors.append('Exam bankPrompt readability baseline must remain 17px')
 op=re.search(r'\.optionRow\{[^}]*font-size:(\d+)px',css)
 if not op or int(op.group(1))<17: errors.append('Exam option text must be at least 17px')
 for m in re.finditer(r'font-size:(\d+)px',css):
  if int(m.group(1))<17: errors.append(f'CSS font-size below 17px remains at offset {m.start()}: {m.group(1)}px')
 for base in [root/'app',root/'components']:
  for src in list(base.rglob('*.ts'))+list(base.rglob('*.tsx')):
   text=src.read_text(errors='ignore')
   for m in re.finditer(r'fontSize\s*:\s*(?:[\"\'])(\d+)px(?:[\"\'])|fontSize\s*:\s*(\d+)(?=\s*[,}])',text):
    size=int(m.group(1) or m.group(2))
    if size<17: errors.append(f'{src.relative_to(root)}: inline fontSize below 17px ({size}px)')
except Exception as e: errors.append(f'R4 typography validation: {e}')

# R3 style-system regression: Writing must use block/grid form controls and common UI must have visual contracts.
try:
 css=(root/'app/globals.css').read_text()
 for required_css in [
  'label.fieldLabel{display:grid',
  '.sectionHeading h1{font-size:34px',
  '.writingLayout{grid-template-columns:minmax(0,1fr) minmax(300px,360px)',
  '.writingPaper{max-width:none;width:100%;min-width:0}',
  '.writingPlanInput{min-height:150px!important}',
  '.writingDraftInput{min-height:420px!important}',
  '.masteryRow{display:flex',
  '.panel{background:var(--surface)',
  '.reviewBlock{display:grid',
 ]:
  if required_css not in css: errors.append(f'R3 style contract missing: {required_css}')
 writing=(root/'components/writing/writing-workspace.tsx').read_text(errors='ignore')
 for required_markup in ['writingTaskField','writingEditorGrid','writingPlanInput','writingDraftInput','writingActions','writingScoreList']:
  if required_markup not in writing: errors.append(f'Writing workspace missing R3 layout marker: {required_markup}')
 if 'style={{minHeight:360}}' in writing: errors.append('Writing workspace still relies on legacy inline textarea sizing')
 # Structural CSS sanity.
 if css.count('{')!=css.count('}'): errors.append('globals.css has unbalanced braces')
except Exception as e: errors.append(f'R3 style validation: {e}')

# Fresh migration and final role/schema invariants.
try:
 db=sqlite3.connect(':memory:');migrations=sorted((root/'migrations').glob('*.sql'))
 if len(migrations)<56: errors.append(f'expected at least 56 migrations, found {len(migrations)}')
 if not migrations or migrations[-1].name!='0064_v102_pet_pictured_events_questions.sql': errors.append('latest migration must be 0064_v102_pet_pictured_events_questions.sql')
 for m in migrations: db.executescript(m.read_text())
 counts['tables']=db.execute("select count(*) from sqlite_master where type='table' and name not like 'sqlite_%'").fetchone()[0]
 counts['skills']=db.execute('select count(*) from skills').fetchone()[0]
 counts['questions']=db.execute("select count(*) from questions where status='published'").fetchone()[0]
 counts['qbank_sources']=db.execute('select count(*) from question_bank_sources').fetchone()[0]
 counts['qbank_items']=db.execute('select count(*) from question_bank_items').fetchone()[0]
 counts['practice']=db.execute("select count(*) from practice_sets where status='published'").fetchone()[0]
 counts['diagnostics']=db.execute("select count(*) from assessments where assessment_type='diagnostic' and status='published'").fetchone()[0]
 expected={'skills':39,'questions':98,'qbank_sources':28,'qbank_items':92,'practice':4,'diagnostics':2}
 for k,v in expected.items():
  if counts[k]<v: errors.append(f'expected {k} >= {v}, found {counts[k]}')
 if counts['tables']<106: errors.append(f'expected at least 106 application tables, found {counts["tables"]}')
 cols=lambda t:{r[1] for r in db.execute(f'pragma table_info({t})')}
 if 'tenant_type' in cols('tenants'): errors.append('tenants.tenant_type must remain removed')
 default=db.execute("select slug,status,plan,ai_request_quota_monthly from tenants where id='tenant-default'").fetchone()
 if default!=('default','active','platform',None): errors.append(f'unexpected default tenant: {default}')
 tm_sql=db.execute("select sql from sqlite_master where type='table' and name='tenant_members'").fetchone()[0].lower().replace(' ','')
 if "'admin','student'" not in tm_sql: errors.append('tenant_members must allow only admin/student roles')
 if "'parent'" in tm_sql or "'teacher'" in tm_sql: errors.append('tenant_members still exposes parent/teacher role')
 ss_sql=db.execute("select sql from sqlite_master where type='table' and name='staff_sessions'").fetchone()[0].lower().replace(' ','')
 if "role='admin'" not in ss_sql: errors.append('staff_sessions must be Tenant Admin-only')
 if not db.execute("select 1 from sqlite_master where type='index' and name='idx_tenant_single_active_admin'").fetchone(): errors.append('single active Tenant Admin unique index missing')
 for t in ['content_items','questions','practice_sets','assessments','generation_jobs','question_generation_batches']:
  for c in ['tenant_id','scope']:
   if c not in cols(t): errors.append(f'{t} missing {c}')
 # V1.0.2 hotfix3 PSLE Prelim source seed.
 source_row=db.execute("SELECT name,base_url,allowed_host,topic,usage_mode,enabled,domains_json FROM content_sources WHERE id='src-mindpath-psle-prelim'").fetchone()
 expected_source=("MindPath Education / 领思教育 · PSLE Prelim","https://www.mindpathedu.com/","mindpathedu.com","2026 PSLE Prelim English · Composition & Exam Questions","reference_only",1,'["writing"]')
 if source_row!=expected_source: errors.append(f'MindPath PSLE Prelim source seed mismatch: {source_row}')
 qsource_row=db.execute("SELECT name,url,provider,source_kind,categories_json,usage_mode,enabled,priority FROM question_bank_sources WHERE id='qsrc-mindpath-psle-prelim'").fetchone()
 expected_qsource=("MindPath Education / 领思教育 · PSLE Prelim","https://www.mindpathedu.com/","MindPath Education / 领思教育","psle_prelim_reference",'["writing"]',"reference_only",1,85)
 if qsource_row!=expected_qsource: errors.append(f'MindPath PSLE Prelim Question Bank source seed mismatch: {qsource_row}')
 # V1.0.2 hotfix4 welcome email + secure Tenant Admin password reset schema.
 for t in ['tenant_password_reset_attempts','tenant_password_reset_tokens']:
  if not db.execute("select 1 from sqlite_master where type='table' and name=?",(t,)).fetchone(): errors.append(f'Hotfix4 password reset table missing: {t}')
 for idx in ['idx_tenant_password_reset_attempts_account_date','idx_tenant_password_reset_attempts_ip_date','idx_tenant_password_reset_tokens_lookup','idx_tenant_password_reset_tokens_user']:
  if not db.execute("select 1 from sqlite_master where type='index' and name=?",(idx,)).fetchone(): errors.append(f'Hotfix4 password reset index missing: {idx}')
 # V0.7 Language Foundations: independent P1-S4 stage pathway without changing legacy P5/P6 account schema.
 counts['catalog_distinct']=db.execute("select count(*) from vocabulary_items where is_catalog=1").fetchone()[0]
 counts['catalog_memberships']=db.execute("select count(*) from vocabulary_catalog_stages").fetchone()[0]
 counts['vocab_passages']=db.execute("select count(*) from vocabulary_reinforcement_passages where status='published'").fetchone()[0]
 counts['grammar_topics']=db.execute("select count(*) from grammar_topics where status='published'").fetchone()[0]
 counts['grammar_exercises']=db.execute("select count(*) from grammar_exercises where status='published'").fetchone()[0]
 if counts['catalog_distinct']<135: errors.append(f'expected at least 135 distinct catalog vocabulary entries, found {counts["catalog_distinct"]}')
 if counts['catalog_memberships']<700: errors.append(f'expected expanded stage vocabulary memberships >=700, found {counts["catalog_memberships"]}')
 if counts['vocab_passages']<14: errors.append(f'expected at least 14 vocabulary reinforcement passages, found {counts["vocab_passages"]}')
 if counts['grammar_topics']<84: errors.append(f'expected at least 84 grammar topics, found {counts["grammar_topics"]}')
 if counts['grammar_exercises']<168: errors.append(f'expected at least 168 grammar exercises, found {counts["grammar_exercises"]}')
 stages=['P1-P4','P5','P6','S1','S2','S3','S4']
 for stage in stages:
  vc=db.execute("select count(*) from vocabulary_catalog_stages where stage=?",(stage,)).fetchone()[0]
  gt=db.execute("select count(*) from grammar_topics where stage=? and status='published'",(stage,)).fetchone()[0]
  if vc<60: errors.append(f'{stage}: expected at least 60 vocabulary stage memberships, found {vc}')
  if gt<12: errors.append(f'{stage}: expected at least 12 grammar topics, found {gt}')
 modalities={r[0] for r in db.execute("select distinct modality from grammar_exercises")}
 if modalities!={'reading','writing','listening','speaking'}: errors.append(f'grammar exercise modalities incomplete: {sorted(modalities)}')
 for t in ['learner_language_preferences','vocabulary_catalog_stages','vocabulary_catalog_progress','vocabulary_practice_events','vocabulary_reinforcement_passages','grammar_topics','grammar_exercises','grammar_topic_progress','grammar_attempts']:
  if not db.execute("select 1 from sqlite_master where type='table' and name=?",(t,)).fetchone(): errors.append(f'V0.7 table missing: {t}')
 # V0.8 exam/custom word books and daily retrieval.
 counts['vocab_collections']=db.execute("select count(*) from vocabulary_collections").fetchone()[0]
 counts['exam_wordbook_items']=db.execute("select count(*) from vocabulary_collection_items ci join vocabulary_collections c on c.id=ci.collection_id where c.code in ('KET','PET','FCE','CAE','CPE')").fetchone()[0]
 if counts['vocab_collections']<12: errors.append(f'expected at least 12 seeded vocabulary collections, found {counts["vocab_collections"]}')
 if counts['exam_wordbook_items']!=250: errors.append(f'expected 250 exam word-book memberships, found {counts["exam_wordbook_items"]}')
 for code,cefr in [('KET','A2'),('PET','B1'),('FCE','B2'),('CAE','C1'),('CPE','C2')]:
  row=db.execute("select c.cefr_level,count(ci.vocabulary_id) from vocabulary_collections c left join vocabulary_collection_items ci on ci.collection_id=c.id where c.code=? group by c.id",(code,)).fetchone()
  if row!=(cefr,50): errors.append(f'{code}: expected CEFR {cefr} with 50 starter entries, found {row}')
 for t in ['vocabulary_collections','vocabulary_collection_items','learner_vocabulary_training_settings','vocabulary_training_progress','vocabulary_training_events']:
  if not db.execute("select 1 from sqlite_master where type='table' and name=?",(t,)).fetchone(): errors.append(f'V0.8 table missing: {t}')
 # V0.9 Science remains independent.
 counts['science_topics']=db.execute("select count(*) from science_topics").fetchone()[0]
 counts['science_vocabulary']=db.execute("select count(*) from science_vocabulary").fetchone()[0]
 counts['science_questions']=db.execute("select count(*) from science_questions").fetchone()[0]
 if counts['science_topics']!=18: errors.append(f'expected 18 Science topics, found {counts["science_topics"]}')
 if counts['science_vocabulary']!=180: errors.append(f'expected 180 Science vocabulary rows, found {counts["science_vocabulary"]}')
 if counts['science_questions']!=144: errors.append(f'expected 144 Science questions, found {counts["science_questions"]}')
 # V0.9 R2 reward catalogue and idempotent entitlement schema.
 counts['reward_games']=db.execute("select count(*) from reward_game_catalog where enabled=1").fetchone()[0]
 if counts['reward_games']!=8: errors.append(f'expected 8 enabled reward games, found {counts["reward_games"]}')
 for url,enabled in db.execute("select url,enabled from reward_game_catalog"):
  if enabled and not url.startswith('/rewards/game?game='): errors.append(f'non-embedded enabled reward URL seeded: {url}')
 for t in ['reward_game_catalog','daily_game_rewards']:
  if not db.execute("select 1 from sqlite_master where type='table' and name=?",(t,)).fetchone(): errors.append(f'V0.9 R2 reward table missing: {t}')
except Exception as e: errors.append(f'SQL migration validation: {e}')

# Simulate R2 -> R3 with multiple Parent operators. Explicitly preserve xiaoganglau@gmail.com for tenant-default.
try:
 db=sqlite3.connect(':memory:');migrations=sorted((root/'migrations').glob('*.sql'))
 for m in migrations[:18]: db.executescript(m.read_text())
 rows=[
  ('u-xg','parent','xiaoganglau@gmail.com','Xiaogang Admin'),
  ('u-g1','parent','parent+guest1@guest.invalid','Guest Parent'),
  ('u-g2','parent','parent+guest2@guest.invalid','Guest Parent'),
  ('u-student','student','student@test.invalid','Student')]
 for uid,role,email,name in rows:
  db.execute('insert into users(id,email,role,display_name) values(?,?,?,?)',(uid,email,role,name))
  db.execute("insert into tenant_members(tenant_id,user_id,role,status) values('tenant-default',?,?, 'active')",(uid,role))
 db.execute("insert into staff_credentials(user_id,password_hash) values('u-xg','pbkdf2$100000$salt$hash')")
 db.execute("insert into staff_credentials(user_id,password_hash) values('u-g1','pbkdf2$100000$salt$hash')")
 db.execute("insert into staff_sessions(id,user_id,tenant_id,role,token_hash,expires_at) values('s-xg','u-xg','tenant-default','parent','hx','2099-01-01')")
 db.execute("insert into staff_sessions(id,user_id,tenant_id,role,token_hash,expires_at) values('s-g1','u-g1','tenant-default','parent','hg','2099-01-01')")
 db.execute("insert into child_profiles(id,parent_user_id,learner_user_id,nickname,school_level,target_al,tenant_id) values('c1','u-g1','u-student','Student','P6','AL2','tenant-default')")
 db.executescript(migrations[18].read_text())
 active=db.execute("select m.user_id,m.role,u.email from tenant_members m join users u on u.id=m.user_id where m.tenant_id='tenant-default' and m.role='admin' and m.status='active'").fetchall()
 if active!=[('u-xg','admin','xiaoganglau@gmail.com')]: errors.append(f'R2->R3 default Admin preservation failed: {active}')
 if db.execute("select count(*) from tenant_members where tenant_id='tenant-default' and role not in ('admin','student')").fetchone()[0]: errors.append('R2->R3 left obsolete tenant roles')
 if db.execute("select parent_user_id from child_profiles where id='c1'").fetchone()[0]!='u-xg': errors.append('historical Student ownership was not reassigned to retained Tenant Admin')
 sessions=db.execute("select user_id,role from staff_sessions order by user_id").fetchall()
 if sessions!=[('u-xg','admin')]: errors.append(f'obsolete tenant operator sessions not removed: {sessions}')
 try:
  db.execute("insert into users(id,email,role) values('u-other','other@example.com','admin')")
  db.execute("insert into tenant_members(tenant_id,user_id,role,status) values('tenant-default','u-other','admin','active')")
  errors.append('database allowed a second active Tenant Admin')
 except sqlite3.IntegrityError: pass
except Exception as e: errors.append(f'R2->R3 migration validation: {e}')

# Simulate V0.5 R9 -> R4 ownership recovery with legacy Admin-created resources.
try:
 db=sqlite3.connect(':memory:');migrations=sorted((root/'migrations').glob('*.sql'))
 # Build the exact V0.5 R9 baseline first.
 for m in migrations[:16]: db.executescript(m.read_text())
 legacy_time='2026-08-25 00:00:00'
 # Legacy Queue-generated Reading lesson + question.
 db.execute("INSERT INTO content_items(id,content_type,title,school_level,topic,status,active_version,created_at,updated_at,generation_job_id,generation_stage) VALUES('content-legacy-queue','article','Legacy Queue Lesson','P6','Legacy','draft',1,?,?, 'job-legacy-read','complete')",(legacy_time,legacy_time))
 db.execute("INSERT INTO content_versions(id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES('content-legacy-queue-v1','content-legacy-queue',1,'{}','legacy-model','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved')")
 db.execute("INSERT INTO generation_jobs(id,job_type,entity_type,entity_id,status,stage,progress,request_json,result_json,created_by,created_at,updated_at) VALUES('job-legacy-read','reading_import','content','content-legacy-queue','succeeded','complete',100,'{}','{}','admin',?,?)",(legacy_time,legacy_time))
 db.execute("INSERT INTO questions(id,question_type,school_level,difficulty,stem_json,answer_json,status,source_content_id,curriculum_version_id,generation_model,created_at) VALUES('q-legacy-reading','reading_mcq','P6',3,'{\"prompt\":\"Legacy?\"}','{\"answer\":\"Yes\"}','draft','content-legacy-queue','SG-PRIMARY-ENGLISH-2020-PSLE-2026','legacy-model',?)",(legacy_time,))
 # Legacy manual Reading and Writing resources had no queue job.
 db.execute("INSERT INTO content_items(id,content_type,title,school_level,topic,status,active_version,created_at,updated_at) VALUES('content-legacy-manual','article','Legacy Manual Lesson','P6','Legacy','draft',1,?,?)",(legacy_time,legacy_time))
 db.execute("INSERT INTO content_versions(id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES('content-legacy-manual-v1','content-legacy-manual',1,'{}','admin','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved')")
 db.execute("INSERT INTO content_items(id,content_type,title,school_level,topic,status,active_version,created_at,updated_at) VALUES('write-legacy-custom','writing_prompt','Legacy Writing','P6','Legacy','published',1,?,?)",(legacy_time,legacy_time))
 db.execute("INSERT INTO content_versions(id,content_id,version,body_json,generation_model,curriculum_version_id,review_status) VALUES('write-legacy-custom-v1','write-legacy-custom',1,'{}','admin','SG-PRIMARY-ENGLISH-2020-PSLE-2026','approved')")
 # Legacy Paper 2 generation result is linked only through generation_jobs.result_json.
 db.execute("INSERT INTO questions(id,question_type,school_level,difficulty,stem_json,answer_json,status,curriculum_version_id,generation_model,created_at) VALUES('q-legacy-paper2','grammar_mcq','P6',3,'{\"prompt\":\"Legacy paper2?\"}','{\"answer\":\"Yes\"}','draft','SG-PRIMARY-ENGLISH-2020-PSLE-2026','legacy-model',?)",(legacy_time,))
 db.execute("INSERT INTO generation_jobs(id,job_type,entity_type,status,stage,progress,request_json,result_json,created_by,created_at,updated_at) VALUES('job-legacy-paper2','paper2_generate','question_draft','succeeded','complete',100,'{}','{\"questionId\":\"q-legacy-paper2\"}','admin',?,?)",(legacy_time,legacy_time))
 # Legacy Question Bank expansion batch + question/job.
 db.execute("INSERT INTO question_generation_batches(id,source_id,school_level,category,subcategory,skill_id,topic,difficulty,requested_count,status,created_by,created_at,updated_at) VALUES('qbatch-legacy','qsrc-internal','P6','cloze','grammar','R-GRAMMAR','Legacy',3,1,'completed','admin',?,?)",(legacy_time,legacy_time))
 db.execute("INSERT INTO questions(id,question_type,school_level,difficulty,stem_json,answer_json,status,curriculum_version_id,generation_model,created_at) VALUES('qbank-legacy','grammar_cloze','P6',3,'{\"prompt\":\"Legacy bank?\"}','{\"answer\":\"Yes\"}','draft','SG-PRIMARY-ENGLISH-2020-PSLE-2026','legacy-model',?)",(legacy_time,))
 db.execute("INSERT INTO generation_jobs(id,job_type,entity_type,entity_id,status,stage,progress,request_json,result_json,created_by,created_at,updated_at) VALUES('job-legacy-bank','question_bank_generate','question_bank_question','qbank-legacy','succeeded','complete',100,'{}','{\"questionId\":\"qbank-legacy\"}','admin',?,?)",(legacy_time,legacy_time))
 db.execute("INSERT INTO question_bank_items(question_id,source_id,category,subcategory,provenance,source_reference,tags_json,batch_id,generation_job_id,review_status,created_at,updated_at) VALUES('qbank-legacy','qsrc-internal','cloze','grammar','ai_original','Legacy','[]','qbatch-legacy','job-legacy-bank','needs_review',?,?)",(legacy_time,legacy_time))
 # Defensive legacy custom Practice/Assessment rows.
 db.execute("INSERT INTO practice_sets(id,name,school_level,set_type,status,created_at,updated_at) VALUES('practice-legacy-custom','Legacy Practice','P6','skill','published',?,?)",(legacy_time,legacy_time))
 db.execute("INSERT INTO assessments(id,name,assessment_type,school_level,curriculum_version_id,status,created_at) VALUES('assessment-legacy-custom','Legacy Assessment','practice','P6','SG-PRIMARY-ENGLISH-2020-PSLE-2026','published',?)",(legacy_time,))
 db.commit()
 # Apply the three earlier multi-tenant migrations.
 for m in migrations[16:19]: db.executescript(m.read_text())
 # R1-R3 course data must survive ownership recovery unchanged.
 db.execute("INSERT INTO courses(id,tenant_id,title,school_level,status) VALUES('course-r3-existing','tenant-default','Existing Course','P6','draft')")
 db.execute("INSERT INTO course_items(id,course_id,item_type,resource_id,item_order) VALUES('course-item-r3-existing','course-r3-existing','content','content-legacy-queue',1)")
 # A Platform Admin global resource created after V0.6 must NOT be stolen by R4.
 db.execute("INSERT INTO content_items(id,content_type,title,school_level,topic,status,active_version,created_at,updated_at,generation_job_id) VALUES('content-platform-after-v06','article','Platform New','P6','Platform','draft',1,'2099-01-01 00:00:00','2099-01-01 00:00:00','job-platform-after-v06')")
 db.execute("INSERT INTO generation_jobs(id,job_type,entity_type,entity_id,status,stage,progress,request_json,created_by,created_at,updated_at,scope) VALUES('job-platform-after-v06','reading_import','content','content-platform-after-v06','queued','queued',0,'{}','admin','2099-01-01 00:00:00','2099-01-01 00:00:00','global')")
 db.commit()
 # Apply R4.
 db.executescript(migrations[19].read_text())
 def owned(table,id): return db.execute(f"SELECT tenant_id,scope FROM {table} WHERE id=?",(id,)).fetchone()
 for table,id in [('content_items','content-legacy-queue'),('content_items','content-legacy-manual'),('content_items','write-legacy-custom'),('questions','q-legacy-reading'),('questions','q-legacy-paper2'),('questions','qbank-legacy'),('practice_sets','practice-legacy-custom'),('assessments','assessment-legacy-custom'),('generation_jobs','job-legacy-read'),('generation_jobs','job-legacy-paper2'),('generation_jobs','job-legacy-bank'),('question_generation_batches','qbatch-legacy')]:
  if owned(table,id)!=('tenant-default','tenant'): errors.append(f'R4 legacy ownership recovery failed for {table}.{id}: {owned(table,id)}')
 for table,id in [('content_items','starter-mangroves'),('questions','q-v05-01'),('practice_sets','practice-p5-core'),('assessments','diag-p5-paper2')]:
  if owned(table,id)!=(None,'global'): errors.append(f'R4 incorrectly moved seeded global {table}.{id}: {owned(table,id)}')
 if owned('content_items','content-platform-after-v06')!=(None,'global') or owned('generation_jobs','job-platform-after-v06')!=(None,'global'):
  errors.append('R4 incorrectly moved post-V0.6 Platform global resources')
 course=db.execute("SELECT tenant_id FROM courses WHERE id='course-r3-existing'").fetchone()
 item=db.execute("SELECT resource_id FROM course_items WHERE id='course-item-r3-existing'").fetchone()
 if course!=('tenant-default',) or item!=('content-legacy-queue',): errors.append('R4 changed existing R1-R3 course ownership/reference')
 # Default Tenant Admin compatibility view must expose seed globals + recovered tenant resources, but not post-V0.6 platform drafts.
 visible=[r[0] for r in db.execute("SELECT id FROM content_items WHERE ((scope='global' AND status='published') OR (scope='tenant' AND tenant_id='tenant-default'))")]
 for id in ['starter-mangroves','content-legacy-queue','content-legacy-manual','write-legacy-custom']:
  if id not in visible: errors.append(f'R4 Tenant Admin compatibility view missing {id}')
 if 'content-platform-after-v06' in visible: errors.append('R4 Tenant Admin compatibility view leaks Platform global draft')
except Exception as e: errors.append(f'R9->R4 legacy ownership validation: {e}')

# Cloudflare topology and queue seriality.
try:
 main=json.loads((root/'wrangler.jsonc').read_text());task=json.loads((root/'workers/task-runner/wrangler.jsonc').read_text())
 c=next((x for x in task.get('queues',{}).get('consumers',[]) if x.get('queue')=='english-mastery-jobs'),None)
 if not c or c.get('max_batch_size')!=1 or c.get('max_concurrency')!=1: errors.append('task runner must remain strict serial')
 if not any(x.get('binding')=='TASK_QUEUE' for x in main.get('queues',{}).get('producers',[])): errors.append('main TASK_QUEUE producer missing')
except Exception as e: errors.append(f'Cloudflare config validation: {e}')

# Product account model: Platform Admin -> one Tenant Admin -> Students. No tenant-side Parent/Teacher/Learner management.
for obsolete in ['app/admin/(protected)/team','app/api/admin/team','components/tenant-team-manager.tsx','app/api/platform/tenants/[id]/parent','app/admin/(protected)/learners','app/api/admin/learners','app/parent','app/api/parent','app/api/auth/parent']:
 if (root/obsolete).exists(): errors.append(f'obsolete role surface must be removed: {obsolete}')
for base in [root/'app',root/'components',root/'lib',root/'workers']:
 for src in list(base.rglob('*.ts'))+list(base.rglob('*.tsx')):
  text=src.read_text(errors='ignore')
  if 'tenant_type' in text: errors.append(f'{src.relative_to(root)}: runtime tenant_type reference remains')
  if re.search(r'\bParents?\b',text): errors.append(f'{src.relative_to(root)}: Parent product terminology remains')

migration19=need('migrations/0019_v06_r3_single_tenant_admin.sql','xiaoganglau@gmail.com',"role IN ('admin','student')","idx_tenant_single_active_admin","role='admin'")
if 'PRAGMA foreign_keys = OFF' in migration19: errors.append('R3 migration must use D1-compatible defer_foreign_keys')
migration20=need('migrations/0020_v06_r4_legacy_admin_ownership.sql',"tenant-default.created_at","created_by,'admin'","generation_job_id","json_extract(CASE WHEN json_valid(result_json) THEN result_json ELSE '{}' END,'$.questionId')","practice-p5-core","diag-p5-paper2")
if 'PRAGMA foreign_keys = OFF' in migration20: errors.append('R4 migration must use D1-compatible defer_foreign_keys')
need('app/api/platform/tenants/[id]/admin/route.ts','setTenantAdmin','tenant.admin.set')
need('app/register/page.tsx','TenantRegistrationForm')
need('app/api/auth/tenant/register/route.ts','registerPublicTenant','tenant.self_register')
need('components/tenant-registration-form.tsx','Create organisation','/api/auth/tenant/register')
need('lib/auth/tenant.ts','role:"admin"','setTenantAdmin','verifyTenantAdminLogin','Tenant Admin authentication required')
need('app/api/admin/session/route.ts','verifyTenantAdminLogin','createTenantAdminSession','role:"admin"')
platform_tenants=need('components/platform-tenant-manager.tsx','one Tenant Admin account','Set / reset Tenant Admin','Admin login')
if 'Parents' in platform_tenants or '/parent' in platform_tenants: errors.append('Platform Tenants UI still exposes Parent management')

# All tenant APIs derive scope from server Tenant Admin session.
for route in (root/'app/api/admin').rglob('route.ts'):
 rel=route.relative_to(root).as_posix();text=route.read_text(errors='ignore')
 if rel=='app/api/admin/session/route.ts': continue
 if 'requireTenantSession' not in text: errors.append(f'{rel}: tenant API missing requireTenantSession')
 if re.search(r'\b(?:body|payload)\.(?:tenantId|tenant_id)\b',text): errors.append(f'{rel}: client tenant id must not be authorization input')

# Tenant Admin content production stays tenant-private, while legacy-compatible reads show published global + own tenant.
need('app/api/admin/sources/route.ts','readOnly:true')
need('app/api/admin/content/route.ts',"c.scope='global' AND c.status='published'","c.scope='tenant' AND c.tenant_id=?",'tenantId:s.tenant_id')
need('app/api/admin/listening/content/route.ts',"c.scope='global' AND c.status='published'","c.scope='tenant' AND c.tenant_id=?")
need('app/api/admin/writing/route.ts',"c.scope='global' AND c.status='published'","c.scope='tenant' AND c.tenant_id=?")
need('app/api/admin/questions/route.ts',"q.scope='global' AND q.status='published'","q.scope='tenant' AND q.tenant_id=?",'tenantId:s.tenant_id')
need('app/api/admin/practice-sets/route.ts',"scope='global' AND status='published'","scope='tenant' AND tenant_id=?")
qgen=need('app/api/admin/question-bank/generate/route.ts',"scope='tenant'",'tenantId:s.tenant_id','question_generation_batches')
if qgen.find('INSERT INTO questions')>qgen.find('dispatchJob('): errors.append('tenant Question Bank placeholders must persist before queue dispatch')
need('app/api/admin/practice-sets/route.ts',"scope='tenant'","q.scope='global'","q.tenant_id=?")
need('lib/jobs/dispatch.ts',"q.scope='global' OR (q.scope='tenant' AND q.tenant_id=?)",'Question Bank tenant scope mismatch')

# Tenant ModelBridge isolation regression: tenant-default must resolve its own stored integration, never return platform env.
tenant_runtime=need('lib/settings/tenant-runtime.ts','Every tenant, including tenant-default, is an isolated partner workspace.','out.MODELBRIDGE_API_KEY=""','tenantRows(env.DB,tenantId)','decryptManagedSecret')
if 'tenant.id==="tenant-default"' in tenant_runtime or 'tenant.plan==="platform"' in tenant_runtime or 'return env;' in tenant_runtime:
 errors.append('tenant-default still bypasses tenant ModelBridge configuration')
if 'out.MODELBRIDGE_CHAT_MODEL=""' not in tenant_runtime:
 errors.append('tenant resolver can still inherit platform chat model')
if 'effective=await resolveTenantIntegrations(env,tenantId)' not in tenant_runtime:
 errors.append('tenant integration status is not based on effective decryptable runtime')

# Student account management: reset supported, no PIN reveal; new Students belong to Tenant Admin.
need('lib/auth/accounts.ts','Tenant Admin account is not active in this tenant','Historical Student requires both a new login and PIN','DELETE FROM user_sessions')
students=need('components/tenant-student-manager.tsx','Current PIN is never displayed','New PIN','No login configured')
if 'pin_hash' in students or 'password_hash' in students: errors.append('Student UI must never expose credential hashes')

# Student route visibility remains global + own tenant.
for f in ['app/api/student/content/route.ts','app/api/student/content/[id]/route.ts','app/api/student/listening/route.ts','app/api/student/listening/[id]/route.ts','app/api/student/practice/route.ts','app/api/student/practice/[id]/route.ts','app/api/student/diagnostics/route.ts','app/api/student/diagnostics/[id]/route.ts','app/api/student/question-bank/sessions/route.ts']:
 text=need(f)
 if "scope='global'" not in text or "scope='tenant'" not in text: errors.append(f'{f}: missing global/current-tenant visibility predicate')

# PBKDF2 Cloudflare cap regression.
auth=need('lib/auth/user.ts','const ITERATIONS = 100_000;','const MAX_PBKDF2_ITERATIONS = 100_000;','iterations>MAX_PBKDF2_ITERATIONS')
if '120_000' in auth or '120000' in auth: errors.append('unsupported PBKDF2 120000 iterations remains')

# Route-group protection.
for base,label in [(root/'app/platform','platform'),(root/'app/admin','tenant-admin')]:
 for page in base.rglob('page.tsx'):
  rel=page.relative_to(base).as_posix()
  if rel in {'login/page.tsx','forgot-password/page.tsx','reset-password/page.tsx'}: continue
  if not rel.startswith('(protected)/'): errors.append(f'unprotected {label} page: {base.name}/{rel}')

need('lib/language/stages.ts','P1-P4','P5','P6','S1','S2','S3','S4')
need('components/vocabulary/vocabulary-learning-hub.tsx','Dictionary','Word books','Quick choices','Reading boost','My vocabulary','collectionStrip','Explain “')
need('lib/vocabulary/store.ts','SELECT id,is_catalog','existing&&!existing.is_catalog','else if(!existing)')
need('components/grammar/grammar-learning-hub.tsx','Grammar pathway','reading','writing','listening','speaking')
need('components/student-dashboard.tsx','Foundations & Singapore Science','/vocabulary','/grammar','/science','56 topics · 112 exercises')
need('app/api/student/language-stage/route.ts','module==="grammar"','module==="vocabulary"','isLearningStage')
need('migrations/0021_v07_language_foundations.sql','learner_language_preferences','vocabulary_catalog_stages','vocabulary_reinforcement_passages','grammar_topics','grammar_exercises')
need('migrations/0022_v08_exam_wordbooks_training.sql','vocabulary_collections','KET','PET','FCE','CAE','CPE','vocabulary_training_progress')
need('components/vocabulary/vocabulary-wordbooks.tsx','Daily Learning assignment is managed by Tenant Admin','TXT / CSV import, word-book creation and Daily Learning assignment are not exposed in Student view.','Custom word books')
need('components/student-vocabulary-manager.tsx','＋ Add word / phrase','Review due')
need('app/api/student/vocabulary/import/route.ts','bulk import is managed by Tenant Admin')
trainer_v08=need('components/vocabulary/vocabulary-daily-trainer.tsx','Chinese meaning · listen & read aloud','Record pronunciation','Stop & check','Microphone required','Record again','Listen & spell','Choose the English definition','Complete the sentence','spellingRepetitions','New learning','Review')
if 'I read it aloud' in trainer_v08: errors.append('Daily Vocabulary pronunciation still contains the old self-confirmation bypass')
if 'mode===\"pronounce\"?\"Record again\"' not in trainer_v08: errors.append('Pronunciation failures must force Record again')
need('app/api/student/vocabulary/training/pronunciation/route.ts','A real microphone recording is required','matchScore','score>=85','ensureCollectionAccess','recordTrainingAttempt','vocabulary_pronunciation_stt')
need('lib/student/planner.ts','daily-cache-v12-eligible-before-limit','getTenantDailyTaskPolicy','ensureTodayPlan','/learn/vocabulary')
shell=need('components/app-shell.tsx','English Mastery Admin','Students','Practice & Exams','Tenant Admin')
if 'Parents' in shell or '/admin/team' in shell: errors.append('Tenant navigation still exposes Parent management')
m=re.search(r'const studentNav\s*=\s*(\[.*?\])\s*as const;',shell,re.S)
if m and ('/admin' in m.group(1) or '/platform' in m.group(1)): errors.append('Student navigation exposes admin/platform routes')

# R4 writing progression/history and Cloudflare update idempotency regression guards.
need('migrations/0025_v09_writing_progression_history.sql','prompt_title_snapshot','prompt_body_snapshot','idx_writing_submissions_child_prompt_status')
need('migrations/0026_v09_mastery_gates_daily_reward.sql','review_score','passed_at','DELETE FROM daily_game_rewards')

# R6 mastery-gate and practice-layout invariants.
for path,markers in {
 'components/writing/writing-workspace.tsx':['reviewScore','disabled={!passed||!hasNext}','Revision required','Start next writing'],
 'components/student-reader.tsx':['This Reading task does not pass until it reaches 100%','Next question →','Correct-answer progress','SelectionVocabulary'],
 'components/paper2/question-runner.tsx':['You must answer this question correctly before moving on','Next question →'],
 'lib/student/game-rewards.ts':['ALWAYS_REQUIRED','daily-mission:${date}'],
 'app/globals.css':['specialisedCardBody','grid-template-columns:repeat(2,minmax(0,1fr))'],
}.items():
 text=need(path)
 for m in markers:
  if m not in text: errors.append(f'{path}: missing R6 marker {m}')
workspace=need('components/writing/writing-workspace.tsx','Past work','nextPromptId','completed','Start next writing')
need('components/writing/writing-history.tsx','Your writing history','PASS','FAIL','Your submission','AI review','SelectionVocabulary','Edit','Review')
need('app/learn/write/history/page.tsx','WritingHistory')
need('app/api/student/writing/prompts/route.ts',"status='reviewed'",'nextPromptId','allCompleted','completedCount')
need('app/api/student/writing/submit/route.ts','prompt_title_snapshot','prompt_body_snapshot')
need('app/api/student/writing/submissions/route.ts','versionNumber','prompt_title_snapshot')
need('app/api/student/writing/submissions/[id]/route.ts','prompt_body_snapshot','prompt_title_snapshot')
planner=need('lib/student/planner.ts','daily-cache-v12-eligible-before-limit','getTenantDailyTaskPolicy','daily-task-lesson-filter','CANDIDATE_RETURN_LIMIT','ensureTodayPlan')
if "FROM writing_submissions recent_write" not in planner or "recent_write.passed=1" not in planner: errors.append('Writing planner does not apply passed-submission cooldown evidence')
if 'task choices are locked and reused unchanged' not in planner: errors.append('Daily planner must lock generated task choices')
deploy=need('scripts/deploy.sh','ensure_queue(){','code:[[:space:]]*11009','already[[:space:]]+(taken|exists)','continuing idempotently')
need('lib/jobs/dispatch.ts','completeMatchingTasks(env.DB,childId,"writing"')
if 'wrangler queues create "$name"' not in deploy: errors.append('Deploy queue ensure helper is not authoritative/conflict-tolerant')
try:
 r4db=sqlite3.connect(':memory:')
 for m in sorted((root/'migrations').glob('*.sql')): r4db.executescript(m.read_text())
 cols_ws={r[1] for r in r4db.execute('pragma table_info(writing_submissions)')}
 for c in ['prompt_title_snapshot','prompt_body_snapshot']:
  if c not in cols_ws: errors.append(f'writing_submissions missing R4 history snapshot column {c}')
 r4db.close()
except Exception as e: errors.append(f'R4 writing schema validation: {e}')

# Daily reward regression guards.
need('migrations/0024_v09_daily_game_rewards.sql','reward_game_catalog','daily_game_rewards')
need('migrations/0058_v102_hotfix122_embedded_reward_games.sql','game_minutes','em-memory-garden','em-reaction-sprint','enabled=0')
need('migrations/0059_v102_hotfix123_effective_study_time.sql','learner_study_sessions','client_idle_count','idle_count','idx_learner_study_sessions_child_date')
need('components/effective-study-time-tracker.tsx','IDLE_MS=60_000','pendingQuietSeconds','registerIdle','idleCount','mediaIsPlaying','voiceIsLive')
need('app/api/student/study-time/route.ts','reportedIdle','acceptedIdle','client_idle_count','idle_count')
need('app/api/student/progress/calendar/route.ts','SUM(active_seconds) study_seconds','SUM(idle_count) idle_count','idleCount')
need('components/learning-progress-calendar.tsx','effective study time and idle episodes','Idle {cell.record?.idleCount||0}×')
need('lib/student/tasks.ts','maybeGrantEnglishDailyReward','completeMatchingTasks')
need('app/api/student/science/daily/complete/route.ts','rewardUnlocked:false','Science session')
need('components/daily-game-reward.tsx','Play one game','/rewards/game?rewardId=','daily-game-reward-unlocked','current tab')
need('components/reward-game-workspace.tsx','EmbeddedRewardGame','expiresAt','Time&apos;s up!','router.replace')
need('components/embedded-reward-games.tsx','MemoryGame','MathGame','WordGame','ReactionGame')
need('app/api/student/rewards/play/route.ts','ORDER BY RANDOM()','/rewards/game?game=',"status='used'",'game_minutes','expiresAt')

# R8 Learn availability + original syllabus-aligned Writing/Speaking expansion.
need('migrations/0027_v09_r8_learn_availability_speaking_writing.sql','tenant_learn_availability','r8-write-p6-speak-up','r8-speak-p6-public-spaces','English Mastery original')
need('migrations/0043_v102_daily_task_filters_learning_stages.sql','tenant_daily_task_policy','P1-P4','S1','S2','S3','S4','listen_video_max_seconds','read_max_words')
need('migrations/0044_v102_learning_vocabulary_practice_policy.sql','tenant_practice_policy','vocabulary_daily_words','vocabulary_review_window_days','vocabulary_review_repetitions','grammar','cloze')
need('lib/settings/daily-task-policy.ts','getTenantDailyTaskPolicy','clampListenVideoMaxSeconds','clampReadMaxWords')
need('lib/student/daily-task-lesson-filter.ts','readingWordCount','readingMeetsDailyLimit','listeningMeetsDailyLimit','durationSeconds')
need('components/tenant-learn-settings.tsx','settingsTable','lessons','published','Mastery passing score','Daily Task','Vocabulary','P1-P4','S4')
need('components/tenant-practice-settings.tsx','settingsTable','Review window','Required reviews','vocabularyReviewWindowDays','vocabularyReviewRepetitions')
need('migrations/0045_v102_practice_vocab_review_and_settings_tables.sql','tenant_practice_policy','vocabulary_review_window_days','vocabulary_review_repetitions')
need('migrations/0046_v102_daily_learning_reward_writing_speaking_cache.sql','daily_game_minutes','writing_weekdays_json','writing_min_words','speaking_prompt_cache')
need('migrations/0047_v102_vocabulary_synonym_annotations.sql','import_synonyms_json','import_synonym_notes_json')
need('migrations/0048_v102_vocabulary_grammar_completeness.sql','synonymNotes','grammar_topics','grammar_exercises')
need('app/api/admin/learn-settings/route.ts','tenant_learn_availability','tenant_daily_task_policy','listenVideoMaxSeconds','readMaxWords','lessonLimit','published')
need('lib/auth/tenant.ts','LEARNING_STAGES','tenant_daily_task_policy','tenant_learn_availability')
need('app/api/platform/tenants/route.ts','LEARNING_STAGES','tenant_daily_task_policy','tenant_learn_availability')
need('components/speaking-task-manager.tsx','Create speaking task','Reading Aloud','Stimulus Conversation','AI Conversation')
need('app/api/admin/speaking/route.ts',"content_type='oral_prompt'",'Tenant Admin original')
need('app/api/student/skills/overview/route.ts','getVisibleLessonIds','learnCount:listenIds.size','learnCount:speakIds.size')
need('lib/student/planner.ts','readingCandidates','listeningCandidates','speakingCandidates','writingCandidates','lessonRepeatCooldownDays','Reading · No eligible lesson available','Listening · No eligible lesson available')
need('lib/student/speaking-daily.ts','REQUIRED_MODES','passedModes','REQUIRED_MODES.every','completeMatchingTasks')
try:
 r8db=sqlite3.connect(':memory:')
 for m in sorted((root/'migrations').glob('*.sql')): r8db.executescript(m.read_text())
 if r8db.execute("select count(*) from content_items where id like 'r8-write-%'").fetchone()[0]!=28: errors.append('R8 must seed 28 original writing tasks')
 if r8db.execute("select count(*) from content_items where id like 'r8-speak-%'").fetchone()[0]!=33: errors.append('R8 must seed 33 original speaking tasks')
 if r8db.execute("select count(*) from tenant_learn_availability").fetchone()[0]<8: errors.append('R8 availability defaults missing')
 r8db.close()
except Exception as e: errors.append(f'R8 availability/content validation: {e}')


# R9 curated P5/P6 publisher-hosted story bank.
need('migrations/0028_v09_r9_curated_story_bank.sql','listening_story_catalog','listen-yt-british-council-kids','listen-yt-oxford-owl','story-r9-120')
need('components/curated-story-bank.tsx','Curated P5/P6 Story Bank','Resolve & queue','120 publisher-hosted stories')
need('lib/listening/catalog.ts','resolveCuratedStory','companionAllowedHost','resolved_video_id')
need('lib/listening/youtube.ts','resolveYouTubeVideoByTitle','videoEmbeddable','safeSearch')
need('lib/jobs/dispatch.ts','companionAllowedHost','metadata_only','listening_story_catalog SET import_count=import_count+1')
need('app/api/platform/listening/catalog/route.ts','requireAdmin','queueCuratedStoryIds','listCuratedStories')
need('app/api/admin/listening/catalog/route.ts','requireTenantSession','queueCuratedStoryIds','tenantId: session.tenant_id')
try:
 story_manifest=json.loads((root/'data/p5-p6-story-bank-r9.json').read_text())
 if story_manifest.get('count')!=120 or len(story_manifest.get('stories',[]))!=120: errors.append('R9 JSON story manifest must contain 120 rows')
except Exception as e: errors.append(f'R9 story manifest validation: {e}')
try:
 r9db=sqlite3.connect(':memory:')
 for m in sorted((root/'migrations').glob('*.sql')): r9db.executescript(m.read_text())
 if r9db.execute('select count(*) from listening_story_catalog').fetchone()[0]!=120: errors.append('R9 must seed exactly 120 curated story rows')
 if dict(r9db.execute('select school_level,count(*) from listening_story_catalog group by school_level').fetchall())!={'P5':56,'P6':64}: errors.append('R9 P5/P6 story grading distribution changed unexpectedly')
 expected={'listen-yt-bbc':20,'listen-yt-british-council-kids':37,'listen-yt-oxford-owl':13,'listen-yt-teded':50}
 if dict(r9db.execute('select source_id,count(*) from listening_story_catalog group by source_id').fetchall())!=expected: errors.append('R9 story source distribution must remain BBC20/BC37/Oxford13/TED50')
 if r9db.execute("select count(*) from listening_story_catalog where difficulty_band not in ('foundation','standard','advanced') or difficulty_score<1 or difficulty_score>10").fetchone()[0]: errors.append('R9 story grading contains invalid bands/scores')
 if r9db.execute("select count(*) from listening_story_catalog where title='' or grading_reason='' or reference_url='' ").fetchone()[0]: errors.append('R9 curated story metadata is incomplete')
 if r9db.execute("select count(*) from content_items where id like 'story-r9-%'").fetchone()[0]!=0: errors.append('R9 migration must not auto-publish/generate 120 student lessons')
 r9db.close()
except Exception as e: errors.append(f'R9 curated story bank validation: {e}')

# V1.0.2 hotfix4 account-email/password-reset regression guards.
need('app/api/auth/tenant/register/route.ts','sendTenantWelcomeEmail','welcomeEmailSent')
need('app/api/platform/tenants/route.ts','sendTenantWelcomeEmail','welcomeEmail')
need('components/tenant-login-form.tsx','Forgot password? Reset it by email','/admin/forgot-password')
need('app/api/auth/tenant/forgot-password/route.ts','GENERIC_MESSAGE','sendTenantPasswordResetEmail','invalidateTenantPasswordReset')
need('app/api/auth/tenant/reset-password/route.ts','resetTenantAdminPassword','Password updated')
need('lib/auth/password-reset.ts','30*60_000','token_hash','consumed_at','datetime(r.expires_at)>CURRENT_TIMESTAMP','DELETE FROM staff_sessions','Too many password reset requests')
need('lib/notifications/account-emails.ts','Welcome to English Mastery','Reset your English Mastery password','does not contain your password')

# Known TypeScript regressions.
for tsx in (root/'components').rglob('*.tsx'):
 text=tsx.read_text(errors='ignore')
 if re.search(r'\.json\(\)\)\.then\(\(\s*[A-Za-z_$][\w$]*\s*:',text): errors.append(f'{tsx.relative_to(root)}: unsafe unknown Response.json callback narrowing')
admin_bank=need('components/question-bank/admin-bank.tsx')
if 'typeof stem.passage==="string"' not in admin_bank: errors.append('platform qbank ReactNode regression guard missing')
runner=need('components/question-bank/session-runner.tsx')
for marker in ['typeof current.stem.title==="string"','typeof current.stem.passage==="string"','typeof current.stem.referenceText==="string"']:
 if marker not in runner: errors.append(f'specialised session ReactNode regression guard missing: {marker}')

# R10 explicit PASS/FAIL retry history and selection-to-vocabulary regression guards.
need('migrations/0029_v09_r10_learning_status_retry_history.sql','revision_of_submission_id','idx_question_attempts_child_content_created')
need('app/api/student/writing/submit/route.ts','sourceSubmissionId','revision_of_submission_id','failedRevision')
need('app/api/student/writing/submissions/[id]/review/route.ts','revision_of_submission_id','writing_feedback','This submission is already being reviewed')
need('components/writing/writing-workspace.tsx','Loaded from Past work','Save revised version & review','SelectionVocabulary','FAIL')
need('components/reading-history.tsx','Your reading history','Learning records','Redo reading','SelectionVocabulary')
need('app/api/student/reading/history/route.ts','wrong_attempts','correct_questions','scorePercent')
need('app/api/student/reading/history/[id]/route.ts','question_attempts','wrongAttempts','correctQuestions')
need('components/student-library.tsx','FAIL · REDO','Past work','learningStatus pass')
need('app/api/student/attempt/route.ts','progress >= 100','completeMatchingTasks')

# R11 learner-facing AI feedback must remain selectable for vocabulary capture.
need('components/student-reader.tsx','SelectionVocabulary','Select any word or phrase in the reading text, questions or feedback')
need('components/writing/writing-workspace.tsx','SelectionVocabulary','Select any word or phrase in the AI review')
need('components/writing/writing-history.tsx','SelectionVocabulary','Select any word or phrase to add it to Vocabulary')
need('components/speaking-workspace.tsx','SelectionVocabulary','Select any word or phrase in AI feedback')
need('components/student-listening-player.tsx','SelectionVocabulary','answerFeedback')
need('components/intensive-listening-player.tsx','SelectionVocabulary','dict.feedback','shadow.feedback')
need('components/vocabulary/selection-vocabulary.tsx','up to 12 words','Add to my vocabulary','sourceSentence')

# R12 Work Queue / FIFO / timezone regression guards.
need('migrations/0030_v09_r12_work_queue_fifo.sql','enqueued_at','idx_generation_jobs_fifo','trg_generation_jobs_enqueued_at')
need('workers/task-runner/index.ts','COALESCE(enqueued_at,created_at)','max_concurrency=1')
need('lib/jobs/store.ts','deleteFinishedJob','enqueued_at=strftime','status IN (\'succeeded\',\'failed\')')
need('components/work-queue-manager.tsx','Work Queue','global FIFO queue','Task timeout (minutes)','Timed-out tasks are retriggered')
need('components/system-clock.tsx','Asia/Singapore','timeZoneName')
need('app/api/admin/jobs/[id]/route.ts','retriggerTimedOutJob','timed-out tasks can be retriggered')
need('app/api/platform/jobs/[id]/route.ts','retriggerTimedOutJob','timed-out tasks can be retriggered')

# R13 state-first filtering + bulk-selection regression guards.
need('components/curated-story-bank.tsx','Status','Curated only','Resolved only','Select up to 20 filtered')
need('components/admin-content-manager.tsx','statusFilter','Select filtered','Publish selected drafts')
need('components/tenant-content-manager.tsx','statusFilter','Select filtered','Publish selected drafts')
need('components/admin-listening-manager.tsx','libraryStatus','sourceStatus','Select filtered','Publish selected drafts')
need('components/tenant-listening-manager.tsx','libraryStatus','Select filtered','Publish selected drafts')
need('components/admin-source-manager.tsx','content sources','Discover latest items','Create & queue')
need('components/admin-question-manager.tsx','statusFilter','Select filtered','Publish selected','Delete selected unpublished')
need('components/tenant-question-manager.tsx','statusFilter','Select filtered','Publish selected','Delete selected unpublished')
need('components/question-bank/admin-bank.tsx','reviewFilter','Select filtered','Publish selected')
need('components/question-bank/tenant-bank.tsx','reviewFilter','Select filtered','Publish selected')
need('components/tenant-course-manager.tsx','courseStatus','Select filtered','Archive selected','Restore selected to draft')
need('app/api/admin/courses/route.ts','export async function PATCH','Bulk course status must be draft or archived')

# V1.0.2 Hotfix 7 release guards.
need('migrations/0049_v102_hotfix7_vocab_books.sql','vocabulary_collection_id')
need('app/api/admin/content/[id]/stage/route.ts','UPDATE questions SET school_level')
need('lib/content/cloze-config.ts','clozeMinChars','clozeMaxChars','clozeBlankCount')
need('components/tenant-learn-settings.tsx','Vocabulary learning word book')
need('components/tenant-practice-settings.tsx','Vocabulary practice word book')

# V1.0.2 Hotfix 10 Tenant Admin persistent vocabulary import guards.
need('migrations/0050_v102_hotfix10_tenant_vocabulary_import.sql','ADD COLUMN tenant_id','idx_vocab_collections_tenant')
need('app/admin/(protected)/vocabulary/page.tsx','TenantVocabularyManager')
need('components/tenant-vocabulary-manager.tsx','Create empty word book','Create & queue import','Queue import','Open Work Queue')
need('app/api/admin/vocabulary/import/route.ts','jobType:"vocabulary_import"','dispatchJob','scope:"tenant"')
need('lib/jobs/dispatch.ts','case"vocabulary_import"','slice(cursor,cursor+20)','vocabulary_chunk_complete','await dispatchJob(id,env)')
need('components/app-shell.tsx','vocabularyAdmin','/admin/vocabulary')
need('app/api/student/vocabulary/import/route.ts','managed by Tenant Admin')



# V1.0.2 Hotfix 11 queue timeout, diagnostics and Tenant word-book management guards.
need('migrations/0051_v102_hotfix11_queue_timeout.sql','task_timeout_minutes','120','queue_runtime_policy')
need('lib/ai/model-json.ts','parseModelJsonLocal','repairCommonJson','automatic repair')
need('lib/vocabulary/enrich.ts','parseModelJson','vocabulary batch enrichment')
need('lib/content/adapt.ts','parseModelJson','reading material adaptation')
need('lib/jobs/dispatch.ts','vocabulary_batch_json_recovery','existingMemberships','duplicates')

need('lib/jobs/timeout.ts','DEFAULT_TASK_TIMEOUT_MINUTES=120','sweepTimedOutJobs','job_timed_out')
need('workers/task-runner/index.ts','scheduled','sweepTimedOutJobs','max_concurrency=1')
need('workers/task-runner/wrangler.jsonc','*/5 * * * *','max_concurrency')
need('app/api/admin/jobs/route.ts','taskTimeoutMinutes','getQueueRuntimePolicy','sweepTimedOutJobs')
need('app/api/student/plan/route.ts','student_plan_failed','requestId','emergency_today_plan')
need('components/student-plan.tsx','student_plan_failed','request','Today mission loaded with diagnostics')
need('components/tenant-vocabulary-manager.tsx','Existing word books','View terms','Add more terms','System books are read-only')
need('lib/vocabulary/collections.ts','listTenantCollectionItems','updateTenantCustomCollection','removeVocabularyFromTenantCollection')


# V1.0.2 Hotfix 11.3 Tenant-only word books + D1-safe Today planner.
need('migrations/0052_v102_hotfix113_tenant_wordbooks_planner.sql','owner_child_id = NULL','tenant-default','idx_vocab_collections_tenant_stage')
need('lib/student/planner.ts','Persisted daily missions are immutable','Daily vocabulary assignment is controlled only by Tenant Admin policy','task choices are locked and reused unchanged')
need('app/api/student/plan/route.ts','daily-fallback-v4','SELECT DISTINCT activity_type','today-bounded')
need('app/api/student/vocabulary/training/settings/route.ts','policyLocked:true','Daily vocabulary word books are assigned by Tenant Admin')
need('components/vocabulary/vocabulary-wordbooks.tsx','Daily Learning assignment is managed by Tenant Admin')
need('components/tenant-learn-settings.tsx','Use for daily learning','Students cannot change the word book')
if ' LIKE ' in (root/'lib/student/planner.ts').read_text(errors='ignore').upper() or ' GLOB ' in (root/'lib/student/planner.ts').read_text(errors='ignore').upper(): errors.append('Hotfix11.3 planner must not use LIKE/GLOB')
if 'Use for daily learning' in (root/'components/vocabulary/vocabulary-wordbooks.tsx').read_text(errors='ignore'): errors.append('Student word-book view still exposes Use for daily learning')

need('migrations/0053_v102_hotfix114_system_wordbook_visibility.sql','tenant_system_vocabulary_visibility','collection_id','visible')
need('app/api/admin/vocabulary/system-visibility/route.ts','tenant_system_vocabulary_visibility',"collection_type='system'",'visible')
need('components/tenant-vocabulary-manager.tsx','Visible to students','studentVisible','/api/admin/vocabulary/system-visibility')
need('migrations/0054_v102_hotfix115_daily_plan_resource_indexes.sql','idx_content_items_daily_plan','idx_learning_tasks_daily_plan','idx_xp_ledger_child_created')
need('migrations/0055_v102_hotfix118_speaking_cooldown.sql','lesson_repeat_cooldown_days','DEFAULT 7','speaking_daily_mode_progress','idx_learning_tasks_repeat_window')
need('app/api/student/plan/route.ts','ensureTodayPlan','today-bounded','X-Plan-Mode')
need('lib/client/progress-calendar.ts','Deduplicate same-month calendar requests','non-JSON response')
need('lib/content/extract.ts','SourceExtractionError','SOURCE_FETCH_FAILED','SOURCE_EXTRACTION_BLOCKED','SOURCE_NOT_CONTENT_PAGE','SOURCE_TEXT_TOO_SHORT','json_ld','embedded_json','isLikelyNonContentUrl')
need('app/api/admin/content/import/batch/route.ts','isLikelyNonContentUrl','SOURCE_NOT_CONTENT_PAGE')
need('app/api/platform/content/import/batch/route.ts','isLikelyNonContentUrl','SOURCE_NOT_CONTENT_PAGE')
need('lib/jobs/dispatch.ts','eventType:"source_extracted"','extractionMethod','extractedCharacters')
need('lib/content/source-domain.ts','parseModelJson','source lesson generation')
need('lib/browser/speech-recognition.ts','getSpeechRecognitionCtor','SpeechRecognitionLike')
need('lib/student/speaking-daily.ts','REQUIRED_MODES','passedModes','progress.completed','completeMatchingTasks')
need('lib/settings/learning-policy.ts','DEFAULT_LESSON_REPEAT_COOLDOWN_DAYS=7','Math.max(7,Math.min(90,n))','getTenantLessonRepeatCooldownDays')
need('components/tenant-learn-settings.tsx','Lesson repeat cooldown','minimum and default is 7 days','min={7} max={90}')
need('app/learn/read/[id]/page.tsx','"use client"','StudentReader')
need('app/api/student/content/[id]/route.ts','isLessonVisible(env.DB,tenantId,level,"read",id,session.childId)')
need('components/student-plan.tsx','prefetch={false}','No eligible lesson is available under the current Tenant policy/cooldown.')
if 'choose a reading lesson' in (root/'lib/student/planner.ts').read_text(errors='ignore').lower(): errors.append('Hotfix11.8 planner still creates a Reading choose-placeholder')
if 'choose a listening lesson' in (root/'lib/student/planner.ts').read_text(errors='ignore').lower(): errors.append('Hotfix11.8 planner still creates a Listening choose-placeholder')
need('components/speaking-workspace.tsx','committedSpeechResultsRef=useRef<Set<number>>(new Set())','committedSpeechResultsRef.current.has(i)','committedSpeechResultsRef.current.add(i)','if(finalAdd)setTranscript')
need('components/question-bank/session-runner.tsx','committedSpeechResultsRef=useRef<Set<number>>(new Set())','committedSpeechResultsRef.current.has(i)','committedSpeechResultsRef.current.add(i)','if(add)setAnswer')
need('components/intensive-listening-player.tsx','committed=new Set<number>()','if(!committed.has(i))','finalParts.push(t)')
need('components/speaking-workspace.tsx','startingRef=useRef(false)','if(recording||startingRef.current)return')


print(f"Validated V1.0.2; {len(list((root/'migrations').glob('*.sql')))} migrations; {counts.get('tables',0)} tables; {counts.get('skills',0)} skills; {counts.get('questions',0)} published questions; {counts.get('qbank_sources',0)} qbank sources; {counts.get('qbank_items',0)} qbank items; {counts.get('catalog_memberships',0)} vocabulary memberships; {counts.get('grammar_topics',0)} grammar topics; {counts.get('grammar_exercises',0)} grammar exercises.")
if warnings:
 print('WARN');[print('-',w) for w in warnings]

# R27 staged-listening + source/content workspace invariants.
try:
 task=(root/'workers/task-runner/index.ts').read_text(errors='ignore')
 taskcfg=json.loads((root/'workers/task-runner/wrangler.jsonc').read_text())
 dispatch=(root/'lib/jobs/dispatch.ts').read_text(errors='ignore')
 shell=(root/'components/app-shell.tsx').read_text(errors='ignore')
 studio=(root/'components/source-content-studio.tsx').read_text(errors='ignore')
 if 'const[message,...overflow]=batch.messages' not in task.replace(' ',''): errors.append('R26 task runner must explicitly process at most one queue message per invocation')
 producers=taskcfg.get('queues',{}).get('producers',[])
 if not any(x.get('binding')=='TASK_QUEUE' and x.get('queue')=='english-mastery-jobs' for x in producers): errors.append('R26 task runner needs TASK_QUEUE producer binding for staged continuation')
 for marker in ['checkpointListeningJob','source_prepared','ai_generated','phase:"persist"']:
  if marker not in dispatch: errors.append(f'R26 staged listening marker missing: {marker}')
 if 'Sources & Content' not in shell: errors.append('R26 unified Sources & Content navigation missing')
 for marker in ['Reading','Listening','Speaking','Writing','Cloze','Question Bank','Content Library']:
  if marker not in studio: errors.append(f'R27 unified source studio missing tab: {marker}')
 if not (root/'scripts/sync-settings-master-key.sh').exists(): errors.append('R26 SETTINGS_MASTER_KEY sync script must live under scripts/')
except Exception as e: errors.append(f'R26 invariant validation: {e}')

# Hotfix 11.8.2 same-day completion preservation and completion-only cooldown.
_planner=(root/'lib/student/planner.ts').read_text(errors='ignore')
if 'daily-cache-v12-eligible-before-limit' not in _planner: errors.append('Hotfix11.8.3 planner version missing')
if 'restoreTodayCompletedAssignments' not in _planner: errors.append('Hotfix11.8.2 same-day completion recovery missing')
if "learned.status='completed' AND learned.progress_percent>=100" not in _planner: errors.append('Hotfix11.8.2 Reading/Listening cooldown is not completion-only')
if "Math.max(7,cooldownDays)" not in _planner: errors.append('Hotfix12.4.4 planner must enforce a hard minimum 7-day lesson cooldown')
for _activity in ('reading','listening','speaking','writing'):
    _marker=f"recent.activity_type='{_activity}' AND recent.activity_id=c.id"
    _pos=_planner.find(_marker)
    if _pos < 0 or 'recent.task_date>=?' not in _planner[_pos:_pos+220]: errors.append(f'Hotfix12.4.4 {_activity} assignment cooldown missing')
    elif "recent.status='done'" in _planner[_pos:_pos+220]: errors.append(f'Hotfix12.4.4 {_activity} cooldown still depends on completion')
_m55=(root/'migrations/0055_v102_hotfix118_speaking_cooldown.sql').read_text(errors='ignore')
if "task_date>=date('now','+8 hours')" in _m55: errors.append('0055 still destructively rewrites same-day completed tasks')

# Hotfix 11.8.3: apply cooldown eligibility before Tenant lesson-limit slicing.
if 'daily-cache-v12-eligible-before-limit' not in _planner: errors.append('Hotfix11.8.3 planner version missing')
for _name in ['readingCandidates','listeningCandidates','speakingCandidates','writingCandidates']:
 _m=re.search(rf"async function {_name}\([^)]*\)[^{{]*\{{.*?db\.prepare\(`(.*?)`\)",_planner,re.S)
 if not _m: errors.append(f'Hotfix11.8.3 {_name} SQL missing'); continue
 _sql=_m.group(1)
 if 'WITH allowed AS' in _sql: errors.append(f'Hotfix11.8.3 {_name} still pre-limits before eligibility')
if 'dailyLimitRelaxed:Boolean(r.daily_limit_relaxed)' not in _planner: errors.append('Hotfix11.8.3 Reading fallback metadata missing')
if 'dailyLimitRelaxed:Boolean(l.daily_limit_relaxed)' not in _planner: errors.append('Hotfix11.8.3 Listening fallback metadata missing')

# Hotfix 12.1 immutable Daily Mission + Writing PASS repair.
_h121_planner=(root/'lib/student/planner.ts').read_text(errors='ignore')
_h121_plan=(root/'app/api/student/plan/route.ts').read_text(errors='ignore')
_h121_tasks=(root/'lib/student/tasks.ts').read_text(errors='ignore')
_h121_admin=(root/'app/api/admin/learn-settings/route.ts').read_text(errors='ignore')
_h121_stage=(root/'app/api/admin/content/[id]/stage/route.ts').read_text(errors='ignore')
_h121_dispatch=(root/'lib/jobs/dispatch.ts').read_text(errors='ignore')
if 'daily-locked-v14-hard-7d-assignment-cooldown' not in _h121_planner: errors.append('Current immutable planner marker missing')
for _m in ['Persisted daily missions are immutable','Every persisted task is current','rows.length === 0 && writingScheduledForDate']:
 if _m not in _h121_planner: errors.append(f'Hotfix12.1 planner invariant missing: {_m}')
if 'repairTodayWritingTaskCompletion' not in _h121_plan or 'repair_today_writing' not in _h121_plan: errors.append('Hotfix12.1 Writing PASS self-heal is not wired to Today plan')
for _m in ['recoveredAfterPlannerRefresh','w.prompt_id=t.activity_id','datetime(t.created_at)>datetime']:
 if _m not in _h121_tasks: errors.append(f'Hotfix12.1 Writing recovery marker missing: {_m}')
if 'DELETE FROM learning_tasks' in _h121_admin: errors.append('Admin Learning Settings still invalidates persisted Daily Mission cards')
if 'DELETE FROM learning_tasks' in _h121_stage: errors.append('Content stage change still invalidates persisted Daily Mission cards')
if 'task_date>?' in _h121_dispatch and 'learning_tasks' in _h121_dispatch: errors.append('Writing PASS still deletes future persisted task cards')

# Hotfix 11.8.1 vocabulary pronunciation TypeScript contract.
_vtypes=(root/'lib/vocabulary/types.ts').read_text(errors='ignore')
_vtrainer=(root/'components/vocabulary/vocabulary-daily-trainer.tsx').read_text(errors='ignore')
if 'export type PronunciationResult' not in _vtypes: errors.append('PronunciationResult shared type missing')
if 'export type VocabularyTrainingProgress' not in _vtypes: errors.append('VocabularyTrainingProgress shared type missing')
if 'import type { PronunciationResult, VocabularyDetail } from "@/lib/vocabulary/types";' not in _vtrainer: errors.append('VocabularyDailyTrainer PronunciationResult import missing')


# V1.0.2 Hotfix 12.4 · Vocabulary Specialist invariants.
need('migrations/0060_v102_hotfix124_vocabulary_specialist.sql','tenant_vocabulary_specialist_policy','vocabulary_specialist_sessions','vocabulary_specialist_wordbook','vocabulary_specialist_question_attempts','vocabulary_specialist_cloze_attempts')
need('lib/vocabulary-specialist/generate.ts','400–500','{{1}}','generateSpecialistQuestion','generateSpecialistCloze')
need('app/api/student/vocabulary-specialist/route.ts','add_word','answer_question','generate_cloze','submit_cloze','correctCount===items.length')
need('components/vocabulary-specialist/vocabulary-specialist-workspace.tsx','PSLE-style','400–500','5 synonym/near-synonym choices and 5 direct fill-ins')
need('app/api/admin/vocabulary-specialist/route.ts','dailyWords','sessionId')
need('lib/vocabulary-specialist/generate.ts','const targetIsCorrect = randomBoolean()','The target term (word or phrase) MUST NOT be the correct answer','five synonym-choice terms and five fill-in terms','const chosen = shuffled(unique).slice(0, 10)')
need('lib/vocabulary-specialist/policy.ts','MIN_VOCABULARY_SPECIALIST_DAILY_WORDS = 10')
need('components/vocabulary-specialist/vocabulary-specialist-workspace.tsx','Blanks 1–5:','Blanks 6–10:','vocabSpecialChoice')
need('components/vocabulary-specialist/tenant-vocabulary-specialist-admin.tsx','Minimum 10 vocabulary terms','min={10}')

# Hotfix 12.4.5: Speaking's three tabs are a persisted daily bundle with their
# own per-mode >=7-day rotation.  The old prompt-cache catalogue must not choose
# the first item every day.
need('migrations/0061_v102_hotfix1245_speaking_daily_prompt_rotation.sql','speaking_daily_prompt_assignments','idx_speaking_daily_prompt_rotation','hf1245-speak-p5-practice-time','hf1245-speak-p6-balance')
need('lib/speaking/daily-prompt-assignment.ts','ensureDailySpeakingPromptAssignments','Math.max(7, await getTenantLessonRepeatCooldownDays','speaking_daily_prompt_assignments assigned','speaking_daily_mode_progress attempted',"recent_task.activity_type=\'speaking\'")
_h1245_prompts=need('app/api/student/speaking/prompts/route.ts','ensureDailySpeakingPromptAssignments','private, no-store','rotation:')
if 'ensureSpeakingModeCache' in _h1245_prompts: errors.append('Hotfix12.4.5 Speaking route still serves old first-item cache catalogue')
need('scripts/test_hotfix1245.py','HOTFIX 12.4.5 PASS')

if errors:
 print('FAIL');[print('-',e) for e in errors];sys.exit(1)
print('PASS')

need('migrations/0057_v102_hotfix120_vocab_daily_new_review.sql','vocabulary_new_words','vocabulary_review_words','vocabulary_spelling_repetitions','vocabulary_daily_group_completions')

# Hotfix 12.4.4: word/phrase specialist input + hard assignment-based 7-day Daily Mission cooldown.
need('scripts/test_hotfix1244.py','HOTFIX 12.4.4 PASS')
need('lib/vocabulary-specialist/generate.ts','term.length > 90','words.length > 12','word or phrase')
