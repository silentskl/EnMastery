# V0.9.0 R14 — Summary mastery gate + staged Cloze

## Mastery gate
- Reading: all scored comprehension questions must be correct, then the learner writes a summary.
- Listening: all scored listening questions must be correct (if present), then the learner writes a summary.
- Summary is reviewed by ModelBridge through the existing Work Queue (`summary_feedback`).
- Summary pass mark is 30/100. Below 30 is `FAIL · REWRITE`; the learner must submit a revised summary.
- Daily Reading/Listening completion is written only after both the question gate and summary gate pass.
- Writing keeps its existing 60% AI-review pass mark.
- Next-question / next-writing / next-lesson controls are rendered disabled and grey until the current mastery gate passes.

## Cloze under Reading
New route: `/learn/read/cloze`.

Stages: P1–P4, P5, P6, S1, S2, S3, S4.

R14 adds 245 original published cloze items (35 per stage) on top of the existing bank. Coverage includes:
- Science: living things, plants, animals, human body, cells/microorganisms, matter, water cycle, weather/climate, light, heat, electricity, magnets, forces/motion, energy, ecosystems, environment/conservation, Earth/Moon/space, inventions/technology.
- Common PSLE contexts: community, health, transport/road safety, school, digital safety/media, food/nutrition, travel/culture, sports/teamwork, Singapore heritage.
- Fun contexts: gaming/puzzles, movies/animation, music, mysteries, theme parks, fantasy, pets, cooking challenges.

All R14 cloze text is original English Mastery content. External sources remain format/curriculum references only.
