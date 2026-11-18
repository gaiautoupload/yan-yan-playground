# 彥彥配對樂園

Release 435 — 2026-11-18 (Asia/Taipei).

## Follow-up browser verification — 2026-11-12

Production release 424 was played using browser pointer holds and viewport overrides. These checks are not physical iOS/Android touch tests.

| Viewport | Woodman full round | Additional evidence |
| --- | --- | --- |
| 320×568 | Level 1 completed; one red-light retry; final segment in slow practice | Reload at 52% restored 52%; switching speed at 91% retained progress; Next opened level 2 |
| 360×800 | Level 2 completed in slow practice with no retry recorded | Next opened level 3; reload retained level 3 |
| 390×844 | Level 3 completed in slow practice with no retry recorded | Next opened level 4 |
| 844×390 | Level 4 completed in slow practice with no retry recorded | Scrollable win dialog; Next reachable; Other Games returned to category |

Hide-and-seek rounds also completed at all four sizes. Completed boards survived home/re-entry at each size. Leaving after replaying guidance paused and cleared that speech player. Baby-care activities and saved sleeping/food feedback were verified in releases 422–423.

Outstanding at this audit date: physical touch cancellation, mobile browser focus/background behavior, normal-speed full rounds at the three larger sizes, and coverage of later Woodman levels. See the release 426 follow-up below for later normal-speed results. The butterfly completion-guidance issue observed during this audit was fixed in release 425.

This follow-up only records observed tests; it does not change deployed application files.

## Release 425 follow-up — 2026-11-13 (Asia/Taipei)

- At 320×568, 360×800, 390×844 and 844×390, actual browser drags of banana onto the baby produced feeding feedback. Strawberry dropped outside the baby retained the strawberry effect rather than feeding, and left zero drag ghosts.
- An initial batch timed out with no usable results. The successful checks above were repeated as individual drag operations; the timeout was not classified as an application failure.
- At all four sizes, freely selected hugging, sleeping, bathing and feeding. Selected porridge and fed feedback survived reload; returning home paused and cleared speech.
- Hide-and-seek Replay reset found badges to zero and restored four covered spots. Reloading the fresh round did not restore old found badges, and each size completed a new round. Completion reload and speech cancellation were also checked at every size.
- Physical phone input, touch cancellation and background/focus behavior remain unverified by these browser drags. Automated cancellation tests are separate evidence.

## Release 435

- Later production visual follow-up at 320×568 used browser mouse press/move/release to hold a short rub: bubbles had the active `pretend-scrub` animation and a nonidentity transform. Emulating `prefers-reduced-motion: reduce` changed animation to `none` with a white drop shadow; screenshots captured both states. Release removed the active effect. Media emulation and viewport were restored. This closes the visual gap noted below, while physical touch remains unverified.
- Production Chrome follow-up: at 320×568, 360×800, 390×844 and 844×390, a short rub left bubbles and a longer rub washed clean; the scrubbing effect was absent after release/completion. The 320-size check occurred during release validation and the other three in a follow-up. In-motion animation and reduced-motion appearance were not visually captured; event tests cover the active class and cleanup. No physical phone coverage is implied.
- Valid short rubbing now moves the bubbles before washing completes, giving visual feedback without text. Releasing, moving outside, cancellation, activity changes and leaving stop the effect. Reduced-motion preferences use a static glow.
- Event checks cover early feedback and its cleanup; existing washing completion, feeding, cancellation and save tests still pass. This does not establish physical phone input coverage.

## Release 434

- Follow-up production Chrome pointer checks: separately dragged strawberry onto the baby at 320×568, 360×800, 390×844 and 844×390. Each produced fed feedback and zero remaining drag ghosts. These replace an earlier long batch that timed out without usable results; the timeout was not an application failure. Physical phone touch/cancellation remains unverified.
- Resuming a completed hide-and-seek board now names the monkey and circular-arrow replay picture, matching the completion and replay guidance. It no longer only asks whether the child wants another round.
- A reproducing voice regression failed before the change and passes afterward. Restoring a board speaks once, does not replay celebration effects, and partial restoration still names the next animal and matching ear clue.

## Release 433

- Additional production Chrome run at 844×390: level 8 completed at normal speed with 100% progress and no retry count. The win dialog scrolled to expose both Next and Other Games; Other Games returned to the action-game category. Release 433 now has full early-level normal-speed rounds at all four requested sizes (levels 5–8 across sizes), not all 60 levels or physical phone coverage.
- Additional production Chrome run at 390×844: level 7 completed at normal speed with 100% progress and no retry count. Next opened level 8; back returned to the action-game category. This run did not verify a physical phone or background transition.
- Additional production Chrome run at 360×800: level 6 completed at normal speed with no retry count. A paused 43% checkpoint survived reload and re-entry at 43%; the round then reached 100%. Next opened level 7 and back returned to the action-game category. No new physical device/background verification in this run.
- Production Chrome follow-up: 320×568 completed level 5 at normal speed, including manual pause/resume, with the result showing 100% and no retry count. Next opened level 6. At 360×800, 390×844 and 844×390 the level-6 pause/resume controls worked, followed by return to the action-game category. Only the smallest size completed a full round in this follow-up; physical background transitions remain unverified.
- Woodman pauses on window blur or a hidden document, cancels the current cue and timers, saves progress, and requires explicit resume. Leaving the game removes these listeners.
- Mocked visibility/blur tests cover preserved progress, no retry penalty, stale cue callbacks, explicit resume and listener cleanup. The hidden-pause assertion failed before the fix. Existing timed speech checks pass.
- A local Chrome manual-pause check passed at 320×568. Opening another automated tab did not establish a real background transition; physical phone/background behavior and a new full round remain unverified in this pass.

## Release 432

- Follow-up production browser checks: completed a fresh hide-and-seek board at 320×568, 360×800, 390×844 and 844×390. Home/re-entry retained completed boards at the three larger sizes. Screenshots at the smallest and landscape sizes showed the replay control. Final replay-guidance/home navigation left the speech player paused with no source. No physical phone or Woodman round was tested in this follow-up.
- Washing counts only movement whose two sampled endpoints are inside the baby. Leaving and returning no longer washes clean using distance travelled outside. Total gesture travel still suppresses accidental tap fallback.
- The outside-and-return regression fails before the fix and passes afterward. Existing cancellation, multi-pointer, feeding and save tests pass.
- Local Chrome browser drags completed washing at 320×568, 360×800, 390×844 and 844×390. These are browser pointer checks, not physical phone touch tests.

## Release 431

- A failed speech callback that starts a new prompt no longer attaches the old retry warning to the new prompt. Both media errors and rejected play requests recheck ownership after completion callbacks.
- A reproducing regression failed before the fix and passes afterward. No new manual phone run in this pass.

## Release 430

- Bathing shows a hand and left/right arrow instead of the tap-only finger, matching the rubbing voice instruction. Other activities retain the tap cue.

## Release 429

- A second pointer cannot replace an active washing gesture or interfere with an active food drag. First-pointer ownership and capture cleanup are covered by the event harness.
- This pass uses automated multi-pointer events; physical multi-touch remains unverified.
- Follow-up on the production site: Chrome at 320×568, 360×800, 390×844 and 844×390 completed rub-to-clean, tap-to-bubbles and switching to feeding. Earlier release 428 production checks also retained clean feedback after reload at every size.
- The event harness additionally verifies that a cancelled wash cannot feed on its late release, while the next intentional food drag feeds once. This does not substitute for physical multi-touch testing.
- Chrome 320×568 completed Woodman level 4 entirely at normal speed without a recorded retry and returned to category. All four requested sizes now have an early-level normal-speed full-round result; later levels and physical devices remain outside that coverage.

## Release 428

- Bathing supports rubbing across the baby to wash clean, while keeping tap interaction. Gesture completion saves once and suppresses the following synthetic click.
- Switching activity, blur, hidden page, cancellation and leaving clear the gesture; late events cannot feed or wash another activity.
- Actual Chrome drags succeeded at all four requested sizes. Automated tests cover cancellation, late events and synthetic click. Physical phone touch remains unverified.

## Release 427

- Baby-care replay guidance now acknowledges clean bathing and successful feeding, including after restoring saved activity. It explains the next optional action rather than repeating the initial instruction.
- Existing sleep/wake guidance and free activity order remain available.

## Release 426

- Speech playback failure now attaches retry guidance to hide-and-seek and baby-care voice buttons as well as older game buttons.
- Existing button actions remain available for retry. Automated speech lifecycle checks cover stale completion, navigation cancellation and mute. No new physical phone verification in this pass.

### Follow-up evidence — 2026-11-16

- `verification/speech.cjs` now checks playback errors for both preschool voice buttons, explicit replay and cancelled stale errors. Removing the preschool selector support in a temporary negative control causes the expected assertion failure.
- Visibility-event tests cover cancelling both pending and playing speech, ignoring late callbacks, remaining stopped on return to foreground, and allowing explicit replay. These use mocked browser events, not a physical device.
- Chrome completed feeding, bathing, hugging, sleeping and home return at all four requested viewport sizes with no horizontal overflow. A separate default-size Chrome session completed hide-and-seek and baby hugging.
- A Chrome tab-switch experiment observed cleared/paused audio, but querying the old tab brought it back to visible state. This is incomplete evidence for background behavior and does not close the physical lock-screen/background test gap.
- The live speech endpoint returned uncached `200 audio/mpeg` for a short Mandarin prompt; empty, whitespace-only and 241-character requests returned 400. Audio was not listened to during this endpoint check.
- Later Chrome normal-speed full rounds on release 426: 360×800 level 1 completed without a retry; 390×844 level 2 completed with one red-light retry; 844×390 level 3 completed without a retry. Next and category return worked. These were browser pointer holds, not physical phone input.
- Next priorities: improve visual feedback during direct baby-care interactions; physical touch cancellation and lock-screen/background checks; later Woodman levels. Bathing gained direct washing gestures in release 428, with tap fallback retained. Do not repeat unchanged deployment or count scheduled notifications as completed development.

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
