from pathlib import Path
import re, sys, collections

root = Path(__file__).resolve().parents[1]
css_path = root / "app" / "globals.css"
css = css_path.read_text(errors="ignore")
errors: list[str] = []
warnings: list[str] = []

# 1) CSS structural sanity.
if css.count("{") != css.count("}"):
    errors.append(f"globals.css brace mismatch: {css.count('{')} open / {css.count('}')} close")

# 2) Product readability contract: no explicit CSS/inline font size below 17px.
for match in re.finditer(r"font-size\s*:\s*(\d+)px", css):
    size = int(match.group(1))
    if size < 17:
        errors.append(f"globals.css explicit font-size below 17px: {size}px at offset {match.start()}")

for base in [root / "app", root / "components"]:
    for src in list(base.rglob("*.tsx")) + list(base.rglob("*.jsx")):
        text = src.read_text(errors="ignore")
        for match in re.finditer(r"fontSize\s*:\s*(?:[\'\"](\d+)px[\'\"]|(\d+)(?=\s*[,}]))", text):
            size = int(match.group(1) or match.group(2))
            if size < 17:
                errors.append(f"{src.relative_to(root)} inline fontSize below 17px: {size}px")

# 3) Literal class-name coverage. Some classes are semantic wrappers intentionally styled by descendants/parents.
css_classes = set(re.findall(r"\.([A-Za-z_][\w-]*)", css))
used: collections.Counter[str] = collections.Counter()
for src in list((root / "app").rglob("*.tsx")) + list((root / "components").rglob("*.tsx")):
    text = src.read_text(errors="ignore")
    for match in re.finditer(r"className\s*=\s*['\"]([^'\"]+)['\"]", text):
        for cls in match.group(1).split():
            if re.fullmatch(r"[A-Za-z_][\w-]*", cls):
                used[cls] += 1
    for match in re.finditer(r"className\s*=\s*\{`([^`]+)`\}", text):
        literal = re.sub(r"\$\{[^}]+\}", " ", match.group(1))
        for cls in re.findall(r"\b[A-Za-z_][\w-]*\b", literal):
            used[cls] += 1

allow_unstyled = {"selectableText", "small", "tone"}
missing = sorted((cls, count) for cls, count in used.items() if cls not in css_classes and cls not in allow_unstyled)
if missing:
    errors.append("literal classes without CSS contracts: " + ", ".join(f"{c}({n})" for c, n in missing))

# 4) Form/layout contracts that protect against inline-label regressions such as the Writing screenshot.
required = [
    "label.fieldLabel{display:grid",
    "textarea{width:100%;display:block",
    ".writingTaskField",
    ".writingPlanInput",
    ".writingDraftInput",
    ".writingActions",
    ".sectionHeading h1{font-size:34px",
]
for token in required:
    if token not in css:
        errors.append(f"missing style contract: {token}")

# 5) Flag raw textarea inline sizing in the Writing workspace.
writing = (root / "components" / "writing" / "writing-workspace.tsx").read_text(errors="ignore")
if "style={{minHeight" in writing:
    errors.append("Writing workspace still contains inline minHeight styling")

print(f"CSS rules/classes: {len(css_classes)} classes")
print(f"Literal UI classes checked: {len(used)}")
print(f"Minimum explicit CSS font-size: {min([int(x) for x in re.findall(r'font-size\s*:\s*(\d+)px', css)] or [0])}px")
if warnings:
    print("Warnings:")
    for warning in warnings:
        print(" -", warning)
if errors:
    print("STYLE AUDIT FAILED")
    for error in errors:
        print(" -", error)
    sys.exit(1)
print("STYLE AUDIT PASS")
