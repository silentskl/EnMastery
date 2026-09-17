from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
s=(root/"workers/task-runner/index.ts").read_text()
assert "MessageBatch<unknown>" in s
assert "MessageBatch<Body>" not in s
ts=json.loads((root/"tsconfig.json").read_text())
assert "**/workers/**" in ts.get("exclude", [])
print("PASS: R24 hotfix1 queue handler typing / nested workers exclusion")
