# 彥彥配對樂園

Release 425 — 2026-11-12 (Asia/Taipei).

## Follow-up browser verification — 2026-11-12

Production release 424 was played using browser pointer holds and viewport overrides. These checks are not physical iOS/Android touch tests.

| Viewport | Woodman full round | Additional evidence |
| --- | --- | --- |
| 320×568 | Level 1 completed; one red-light retry; final segment in slow practice | Reload at 52% restored 52%; switching speed at 91% retained progress; Next opened level 2 |
| 360×800 | Level 2 completed in slow practice with no retry recorded | Next opened level 3; reload retained level 3 |
| 390×844 | Level 3 completed in slow practice with no retry recorded | Next opened level 4 |
| 844×390 | Level 4 completed in slow practice with no retry recorded | Scrollable win dialog; Next reachable; Other Games returned to category |

Hide-and-seek rounds also completed at all four sizes. Completed boards survived home/re-entry at each size. Leaving after replaying guidance paused and cleared that speech player. Baby-care activities and saved sleeping/food feedback were verified in releases 422–423.

Outstanding: physical touch cancellation, mobile browser focus/background behavior, normal-speed full rounds at the three larger sizes, and coverage of later Woodman levels. A butterfly revealed after all animals can replace the completion status with its own discovery message; Replay stays visible, but completion guidance should be reviewed in the next interaction pass.

This follow-up only records observed tests; it does not change deployed application files.

## Release 425

- Hide-and-seek keeps replay guidance when the butterfly is revealed after all animals, when found spots are tapped again, and when voice guidance is replayed.
- Completion wording is shared so the visible replay control remains the spoken next action.

## Release 424

- Corrected hide-and-seek completion voice to point at the visible monkey/replay control. The home entry resumes completed boards and does not start a new round.
- Copy-only change; syntax/resource and checkpoint tests passed. No new mobile layout or complete-level manual testing in this pass.

## Release 423

- Tapping the already-selected baby-care activity repeats its guidance without clearing feeding or clean-bath feedback. Switching to a different activity still begins that interaction normally.
- At 320×568, 360×800, 390×844 and 844×390, played feeding, bathing and sleeping, tapped each selected activity again, checked feedback stayed visible, and returned home/reopened. Regression coverage includes preserved feedback after restart and switching activities.
- This is browser viewport testing, not physical phone testing. Woodman timing is covered by the existing automated suite this pass, not a newly completed manual level.

## Release 422

- Baby care now saves activity, selected food, sleeping, bathing and feeding feedback through the shared local save. Returning home or reloading restores the room without replaying the action.
- Sleeping voice guidance explains how to wake the baby; invalid or incompatible checkpoints safely use the default room.
- Played feeding, bathing, hugging, sleeping and waking at 320×568, 360×800, 390×844 and 844×390; sleeping survived home navigation and reload at every size. Also verified selected strawberry/feeding feedback after reload and audio cancellation on home.
- Regression tests cover restored sleeping, waking guidance, invalid checkpoints and existing drag cancellation. Physical phone touch testing remains outstanding.

## Release 421

- Hide-and-seek saves hiding positions and opened spots in the existing unified local save. Returning home or reloading resumes the same board and target animal.
- Completed boards stay completed; only Replay clears found animals and shuffles a new board. Restoring the board does not replay each discovery sound or victory sound.
- Checkpoint validation rejects duplicate/missing animals, invalid opened spots and unknown versions; corrupt checkpoints safely start a fresh board without changing other game progress.
- At all four phone sizes, resumed after leaving and completed the round. Also verified partial reload, completed reload and explicit replay reset. Baby-care activity persistence remains separate future work.

## Release 420

- Home launches for hide-and-seek and baby care now use the shared routing path and update last-played. Reloading then choosing Continue no longer opens the older game.
- Added an Together Play category to the full catalogue. Free-play entries do not add completion requirements or medals to the existing passport; existing group IDs and indices are unchanged.
- Continue reopens the same game; it does not restore a partially uncovered hide-and-seek board or baby-care activity.
- Completed hide-and-seek at 320×568 and 360×800, all baby-care activities at 390×844 and 844×390, and verified home/category launches, reload, last-played and return. Routing regression tests cover old indices and free-play passport exclusion.

## Release 419

- Food can be dragged onto the baby to feed once, with a moving food image and highlighted drop area. Dropping outside returns without feeding. Tap selection plus tapping the baby remains available.
- Pointer capture, cancellation, capture loss, focus loss, hidden page, activity change and leaving the room clear the drag. Late releases cannot feed a new activity.
- Actual browser drag/drop succeeded at 320×568, 360×800, 390×844 and 844×390; checked a missed drop and tap fallback. Touch cancellation is covered by a Node event harness because the browser tool does not support injecting touch-cancel; physical phone verification remains outstanding.

## Audience

Age 4–5, without reading. Use recognizable pictures, short Taiwan Mandarin prompts, observation and direct manipulation. Preserve free exploration without penalties or forced task sequences.

## Release 418

- Hide-and-seek now highlights the animal to look for and exposes drawn long, pointed or floppy ears above hiding places. Ear shapes are CSS rather than cropped platform emoji.
- Voice replay and hints follow the current unfound animal. Finding a different animal still counts; the guide skips already-found animals and clears after completion.
- Completed rounds at 320×568, 360×800, 390×844 and 844×390. Explicitly tested finding the cat before the requested rabbit, then skipping the cat in subsequent guidance. All four layouts stayed within viewport width.

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
node verification/pretend-drag.cjs
node verification/play-routing.cjs
node verification/seek-save.cjs
```

Original v411 hashes remain in `verification/production-audit.json`. `check.cjs --snapshot` checks those original hashes with text line-ending normalization; it intentionally rejects modified application files. Normal checks validate current syntax and resource references.

Manual browser checks: 390×844 and 320×568, category selection, original delivery level completion, Sokoban level completion/next level, reload recovery, return to category, real Edge TTS playback via the local API. Physical iOS/Android touch and every level of every game are not yet covered.

## Deployment

Vercel: `yan-yan-playground` (`prj_9FAgRuyuCbzLKkt48XoqX7fikUAx`) in `pioter` (`team_Im5St1qEFYRCzY0LTXHV6szY`). Static frontend plus Python Function; dependencies pinned in `requirements.txt`.

Vercel's GitHub connection lacks repository write access. Deploy reviewed source files directly until the correct GitHub account is connected. Exclude verification reports, scratch files, credentials and `.env` files.

Original v411 site: https://yan-yan-excavator-dots.vercel.app/ on a different team. This release targets the new project selected by the owner.

## Next passes

Audit remaining game screens at phone sizes, consolidate similar mechanics, improve delivery gameplay instead of adding repetitive rounds, and test Edge TTS timing in the red-light game on physical phones. Avoid new random navigation or duplicate entry points.
