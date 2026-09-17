# V0.9.0 R5 — Light UI System

## Goal

R5 unifies English Mastery into a light workspace-style interface while preserving all existing learning behavior. The visual direction uses the same kind of clean, low-chrome, card-based layout used in modern SmartEnX workspaces: pale application background, white navigation and content surfaces, subtle borders, restrained shadows and one consistent primary accent.

## Global design tokens

- App background: soft blue-grey `#f6f8fc`
- Surface: white
- Primary: blue-violet `#5267e8`
- Primary soft surface: `#eef1ff`
- Text: deep navy `#192236`
- Muted text: `#667085`
- Border: `#e4e9f2`
- Card radius: 18–22px depending on hierarchy
- Minimum font size: 17px

## Shell

Desktop sidebar is now white with a subtle divider. Active navigation uses a pale blue surface and a slim primary indicator instead of the previous dark block. The top bar remains sticky and is translucent white with blur.

The same shell is used for Student, Tenant Admin and Platform Admin modes.

## Surface hierarchy

Dark dashboard, vocabulary and science hero panels are converted to light gradients. Cards use a white surface, thin border and shallow shadow. Hover elevation is deliberately small so the product remains a learning application rather than a marketing page.

## Controls

Buttons, inputs, selects and textareas share one radius and focus treatment. Primary actions use the blue-violet accent; secondary and selected states use the pale primary surface. Tabs, chips and filters no longer switch to black backgrounds.

## Learning pages covered

- Home / dashboard
- Learn / Daily Plan
- Listening
- Speaking
- Reading
- Writing and Past work
- Vocabulary and Daily Vocabulary
- Grammar
- Practice
- Exam
- Singapore Science and Science Daily
- Daily Game Rewards
- Student account
- Tenant Admin
- Platform Admin

## Accessibility and regression constraints

R5 preserves the R4 minimum text-size rule: no explicit CSS font size may be below 17px. Focus-visible outlines remain present for keyboard navigation. Existing responsive breakpoints and mobile bottom navigation remain intact.

R5 introduces no database migration.
