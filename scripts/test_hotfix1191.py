#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []

def source(path: str) -> str:
    target = ROOT / path
    if not target.exists():
        errors.append(f"missing {path}")
        return ""
    return target.read_text(errors="ignore")

button = source("components/route-back-button.tsx")
for marker in [
    'usePathname',
    'useRouter',
    'window.history.length > 1',
    'router.back()',
    'pathname === sectionRoot ? "/" : sectionRoot',
    'aria-label="Page navigation"',
    'type="button"',
    '←',
    'Back',
]:
    if marker not in button:
        errors.append(f"route back button missing {marker}")

for section in ["learn", "practice"]:
    layout = source(f"app/{section}/layout.tsx")
    if 'RouteBackButton' not in layout:
        errors.append(f"{section} layout does not render the shared back button")
    if f'sectionRoot="/{section}"' not in layout:
        errors.append(f"{section} layout has the wrong fallback section root")

learn = source("app/learn/page.tsx")
mission = learn.find("Today&apos;s learning mission")
momentum = learn.find("<LearningMomentum/>")
daily = learn.find("<LearningProgressCalendar/>")
if min(mission, momentum, daily) < 0:
    errors.append("Learn page is missing mission, momentum or daily progress")
elif not mission < momentum < daily:
    errors.append("Learn page order must be Today's Learning Mission, Learning Momentum, Daily Progress")

css = source("app/globals.css")
for marker in [".routeBackNav", ".routeBackButton"]:
    if marker not in css:
        errors.append(f"back-navigation styling missing {marker}")

if errors:
    print("HOTFIX11.9.1 TEST FAIL")
    for error in errors:
        print("-", error)
    sys.exit(1)

print("HOTFIX11.9.1 TEST PASS: Learn/Practice back navigation and Learn dashboard order validated")
