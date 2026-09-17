# English Mastery v1.0.2 Hotfix 11.4

- Tenant Admin can control which published System word books are visible in learner accounts.
- Defaults without an override: P1-P4, P5 and P6 are visible; S1-S4 and exam System books are hidden.
- The setting is an explicit Tenant override, so default-visible books can also be hidden.
- Tenant custom word books remain visible to learners in that Tenant.
- Visibility is independent from Daily Learning / Practice assignment; an explicitly assigned book can still execute even when hidden from normal browsing.
- Adds migration `0053_v102_hotfix114_system_wordbook_visibility.sql`.
