# English Mastery v1.0.2 Hotfix 12.4.6

## Fix: Speaking picture stimulus display

This hotfix repairs Speaking stimulus lessons where a prompt is intended to show a picture but no image appears on the student page.

### What changed
- Added optional stimulus image support to Speaking prompt payloads.
- Student Speaking page now renders a stimulus image when the prompt provides one.
- If the image fails to load, the learner still sees the written scene description as a fallback.
- Daily Speaking prompt parsing now accepts several legacy image key aliases such as `imageUrl`, `image_url`, `stimulusImageUrl`, and `image`.
- Admin / tenant Speaking creation forms now allow an optional stimulus image URL and image caption / alt text.
- Existing text-only stimulus prompts continue to work unchanged.

### Compatibility
- No schema migration is required.
- Old prompts without images still render exactly as before.
- Prompts that already stored image URLs under legacy field names now display properly.
