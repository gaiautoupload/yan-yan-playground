# 彥彥配對樂園

Release 417 — 2026-11-11 (Asia/Taipei).

## Release 417

- Added picture-led pretend play: choose feeding, bathing, hugging or sleeping in any order, then tap the baby. Food choices, bubbles, hearts and day/night changes provide visual feedback; Taiwan Mandarin uses existing Edge TTS.
- No task sequence, score, timer or reading is required. Home now has four large entries including the baby room; other games remain collapsed.
- Played all four activities at 320×568, 360×800, 390×844 and 844×390. Tested food selection, waking the baby, switching activities and returning home with audio paused and cleared. This is browser emulation, not physical phone testing.
- Hourly follow-up now prioritizes preschool real-world play and pauses expansion of cargo puzzles.

## Release 416

- Added preschool hide-and-seek: tap four hiding places to uncover three animals and a butterfly surprise. No written questions, countdown, penalties or arithmetic.
- Large animal portraits show found/not-found visually. Optional hints highlight a hiding place and speak Taiwan Mandarin through the existing Edge TTS service. Replays shuffle hiding places; returning home cancels speech.
- Home prioritizes Woodman, Hide-and-seek and the catalogue; existing direct games remain in a collapsed parent section.
- Completed a hide-and-seek round at 320×568, 360×800, 390×844 and 844×390; checked hints, replay, return and audio cancellation. Pretend-play is not implemented yet.

## Release 415

- Replaced the repetitive 40 delivery rounds with six authored tasks: two trips, combined delivery, three stops, split large order, mixed loads and final challenge.
- Each task has a distinct capacity/order combination; tests demonstrate that its advertised minimum trip count is reachable.
- Existing stars remain unchanged. The equivalent first task and unfinished first-task cargo migrate; changed later tasks restart at task 2 when the first was already completed. Legacy progress fields remain preserved.
- Browser completed task 2 at 360×800, task 3 at 844×390, task 4 at 320×568 and task 5 at 390×844. Reload advanced to the saved next task. Physical device testing remains outstanding.

## Release 414

- Rebuilt delivery around orders, limited truck capacity, multiple stops and return trips to the depot. Wrong destinations retain cargo; goods can be removed at the depot.
- Persist each loading/travel action. Reload restores unfinished orders, cargo and trip count. Completion awards are granted once per level.
- Phone layout has a scrollable play area and separate navigation. Loading preserves scroll position. Return goes to Engineering; next stays in Delivery.
- Completed level 1 at 320×568, including full-truck rejection, wrong destination and reload/resume. Inspected 360×800, 390×844 and 844×390 layouts without horizontal overflow; verified next level and category return.
- Pure rule tests cover all 40 existing levels, checkpoint validation and completion locking. These are not 40 manually played levels.

## Release 413

- Red-light/green-light movement now waits for actual Edge TTS playback, with a bounded silent fallback on network failure.
- Timed speech is explicitly cancelled on pause, restart and navigation. Old timers cannot cancel audio belonging to a newer screen.
- Replay during the introductory prompt no longer waits for a stale fallback timer. Pause/resume labels match their current action.
- The home Woodman shortcut now uses the same hub route: last-played, completion stamps and return-to-category work consistently, without forced fullscreen.
- Phone toolbar controls have 44px minimum height; landscape layout uses smaller parent/prompt decoration.
- Verified a complete level at 320×568 with zero penalties, next level and pause. Timer regressions cover delayed playback, errors, cancellation, mute and a hung request.

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
node verification/timed-speech.cjs
node verification/delivery.cjs
```

Original v411 hashes remain in `verification/production-audit.json`. `check.cjs --snapshot` checks those original hashes with text line-ending normalization; it intentionally rejects modified application files. Normal checks validate current syntax and resource references.

Manual browser checks: 390×844 and 320×568, category selection, original delivery level completion, Sokoban level completion/next level, reload recovery, return to category, real Edge TTS playback via the local API. Physical iOS/Android touch and every level of every game are not yet covered.

## Deployment

Vercel: `yan-yan-playground` (`prj_9FAgRuyuCbzLKkt48XoqX7fikUAx`) in `pioter` (`team_Im5St1qEFYRCzY0LTXHV6szY`). Static frontend plus Python Function; dependencies pinned in `requirements.txt`.

Vercel's GitHub connection lacks repository write access. Deploy reviewed source files directly until the correct GitHub account is connected. Exclude verification reports, scratch files, credentials and `.env` files.

Original v411 site: https://yan-yan-excavator-dots.vercel.app/ on a different team. This release targets the new project selected by the owner.

## Next passes

Audit remaining game screens at phone sizes, consolidate similar mechanics, improve delivery gameplay instead of adding repetitive rounds, and test Edge TTS timing in the red-light game on physical phones. Avoid new random navigation or duplicate entry points.
