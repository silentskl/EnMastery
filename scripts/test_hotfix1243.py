#!/usr/bin/env python3
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
deploy = (root / "scripts/deploy.sh").read_text()
installer = (root / "scripts/install-deps-resilient.sh").read_text()
package = (root / "package.json").read_text()

assert "node_deps_ready" in deploy
assert 'node_modules/.bin/$bin' in deploy
assert "bins+=(tsc next opennextjs-cloudflare)" in deploy
assert "required npm commands are missing" in deploy
assert "scripts/install-deps-resilient.sh" in deploy
assert "--include=dev" in installer
assert '"typescript"' in package

# Regression guard: merely having node_modules must never be enough to skip install.
old_pattern = re.compile(r'if\s+\[\[\s+!\s+-d\s+node_modules\s+\]\].*?node_modules exists; dependency install skipped', re.S)
assert not old_pattern.search(deploy)

print("PASS hotfix12.4.3 dependency readiness gate")
