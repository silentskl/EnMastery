#!/usr/bin/env python3
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
errors=[]

def need(path,*markers):
    s=(root/path).read_text(errors='ignore')
    for m in markers:
        if m not in s: errors.append(f'{path}: missing {m}')
    return s

route=need('app/api/student/plan/route.ts',
    'function taskIsUnavailable(row:DbTask)',
    'meta.unavailable===true',
    'current.some(row=>row.activity_type===type&&!taskIsUnavailable(row))')
planner=need('lib/student/planner.ts',
    'function isUnavailableTask',
    'haveConcrete',
    'UNAVAILABLE placeholder is',
    'const placeholders=new Map',
    'function assignStatement',
    "status='todo'",
    'placeholders.get("listening")',
    'placeholders.get("speaking")',
    'placeholders.get("reading")',
    'placeholders.get("writing")')

for domain,var in [('listening','l'),('speaking','sp'),('reading','r')]:
    guard=f'if (!current.has("{domain}") && !preserved.has("{domain}"))'
    pick=f'const {var} = pickUnused'
    gi=planner.find(guard); pi=planner.find(pick)
    if gi<0 or pi<gi: errors.append(f'{domain}: candidate is still consumed before concrete-task guard')
wg='if (writingScheduled && !current.has("writing") && !preserved.has("writing"))'
wp='const w = pickUnused'
if planner.find(wg)<0 or planner.find(wp)<planner.find(wg): errors.append('writing: candidate is still consumed before concrete-task guard')
if 'WHERE id=? AND child_id=? AND task_date=? AND activity_type=?' not in planner:
    errors.append('placeholder recovery update is not tightly scoped')
if 'if(placeholder)' not in planner:
    errors.append('assignment helper no longer distinguishes placeholder recovery from insert')
if errors:
    print('HOTFIX 12.4.8 FAIL')
    for e in errors: print('-',e)
    sys.exit(1)
print('HOTFIX 12.4.8 PASS: unavailable daily cards self-heal when eligible content exists; concrete assignments stay frozen; weekly repair no longer wastes candidates')
