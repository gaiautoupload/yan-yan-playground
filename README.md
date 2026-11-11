# 彥彥配對樂園

Release 412 — 2026-11-11 (Asia/Taipei).

## Changes

- Direct game selection replaces duplicate random/relay entry points and extra cross-game actions on win dialogs.
- Ordinary launches never enable relay. Returning restores the original category. Existing save keys and catalogue indices are preserved.
- Phone game cards use readable single-column rows. Similar/simple activities live under “更多練習”. Delivery and photo quiz no longer inject large home promotions.
- Fixed passport badges covering category names. Drawing and composing appear only in relevant categories.
- Fixed small-phone Sokoban tools clipping and blocked touch scrolling; optional assistance is collapsed.
- Edge TTS Taiwan Mandarin (`zh-TW-HsiaoChenNeural`) via `/api/speech`: bounded input, timeout, cached audio, cancellation on screen changes and mute.
- Invalid saved game modes recover to the default adventure.

## Checks

```
node verification/check.cjs
node verification/save-recovery.cjs
node verification/speech.cjs
```

Original v411 hashes remain in `verification/production-audit.json`. `check.cjs --snapshot` checks those original hashes with text line-ending normalization; it intentionally rejects modified application files. Normal checks validate current syntax and resource references.

Manual browser checks: 390×844 and 320×568, category selection, original delivery level completion, Sokoban level completion/next level, reload recovery, return to category, real Edge TTS playback via the local API. Physical iOS/Android touch and every level of every game are not yet covered.

## Deployment

Vercel: `yan-yan-playground` (`prj_9FAgRuyuCbzLKkt48XoqX7fikUAx`) in `pioter` (`team_Im5St1qEFYRCzY0LTXHV6szY`). Static frontend plus Python Function; dependencies pinned in `requirements.txt`.

Vercel's GitHub connection lacks repository write access. Deploy reviewed source files directly until the correct GitHub account is connected. Exclude verification reports, scratch files, credentials and `.env` files.

Original v411 site: https://yan-yan-excavator-dots.vercel.app/ on a different team. This release targets the new project selected by the owner.

## Next passes

Audit remaining game screens at phone sizes, consolidate similar mechanics, improve delivery gameplay instead of adding repetitive rounds, and test Edge TTS timing in the red-light game on physical phones. Avoid new random navigation or duplicate entry points.
