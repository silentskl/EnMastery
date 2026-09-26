# English Mastery v1.0.2 Hotfix 12.4.6.1

## Release-gate repair

This patch keeps all Hotfix 12.4.6 Speaking stimulus-image functionality and repairs release-validation regressions introduced while formatting `components/speaking-workspace.tsx`.

### Fixed
- Restored the exact source markers required by the existing Hotfix 11.7 Web Speech de-duplication / duplicate-recording-start regression gate.
- Preserved `committedSpeechResultsRef` reset and one-time cumulative Web Speech result handling.
- Preserved the duplicate recording-start guard using `startingRef`.
- Raised the new stimulus-image fallback hint from 14px to 17px so it complies with the project-wide minimum explicit font-size rule.

### Validation
- `python3 scripts/validate_release.py` PASS.
- `python3 scripts/test_hotfix117.py` PASS.
- `python3 scripts/test_hotfix1245.py` PASS.
- All `scripts/test_hotfix*.py` PASS.
- `python3 scripts/test_d1_migrations.py` PASS through migration 0061.
- `python3 scripts/audit_styles.py` PASS; minimum explicit font-size is 17px.

No database migration is added. Schema remains 61 migrations / 114 application tables.
