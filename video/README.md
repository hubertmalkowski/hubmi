# Zaczyn: showcase video

A 1920x1080, 30 fps, ~58 s promo video with a Polish voiceover, built from real recordings of the app.
This is a standalone package with its own `node_modules`. The app does not depend on it.

- `capture/record.mjs` drives the running app with Playwright. It records each scene as a sharp 3200x1800 clip via CDP screencast, draws a fake cursor with click ripples, and writes `public/clips/<scene>.mp4` plus `<scene>.json` (marker times and element boxes).
- `capture/voiceover.mjs` cleans the recorded voiceover and writes the paragraph timings the timeline is built from.
- `src/` is a [Remotion](https://remotion.dev) composition. It adds the browser frame, camera zooms, callouts, kinetic captions, transitions, the intro and the outro.

## 1. Record the clips

Start the app in mock mode on a freshly seeded database (see the main README), from the repo root:

```sh
pnpm db:seed                              # the report scene expects the seeded data
AI_MOCK=1 pnpm dev --port 5173
PW_CHROMIUM_PATH=/path/to/chromium node video/capture/record.mjs          # all scenes
PW_CHROMIUM_PATH=/path/to/chromium node video/capture/record.mjs report   # one scene
```

Scenes: `report`, `map`, `challenges`, `idea` (recorded, not used in the cut), `trends`, `a11y`.
Re-seed before re-recording `report`, so the match and counts stay the same.
If you re-record, check the camera keyframes and callout boxes in `src/Main.tsx`. They are keyed to clip time (seconds) and page coordinates (1600x900), and the `.json` marker files show where things landed.

## 2. Preview and render

```sh
cd video
npm install
npx remotion studio src/index.ts            # live preview
REMOTION_BROWSER=/path/to/chrome-headless-shell npm run render   # -> out/zaczyn-showcase.mp4
```

Remotion needs `chrome-headless-shell` (Playwright's `chromium_headless_shell-*` works). Without `REMOTION_BROWSER` it downloads one.

## 3. Audio

The timeline follows the voiceover: each scene starts just before its paragraph.

```sh
node video/capture/voiceover.mjs path/to/recording.wav
```

This denoises the take, shortens long pauses, normalises to -16 LUFS and writes `public/audio/voiceover.wav` plus `src/voiceover.json` (paragraph start/end times). `BREAKS` at the top of the script lists where the paragraph breaks are in the raw recording; update it for a new take.

Optional music: put a licensed track at `public/audio/music.mp3`. It is ducked under the voice and faded in and out. Both files are picked up automatically when present.

## Timeline

| Time   | Voiceover paragraph                           | Scene                                           |
| ------ | --------------------------------------------- | ----------------------------------------------- |
| 0:00   | (voice starts at 0:01.5) Mama pani Ani…       | Logo intro, browser tilts in, home page         |
| 0:09.6 | Pani Ania opisuje to w Zaczynie…              | Typing, gmina + Library preview, match          |
| 0:22.3 | A jeśli takiego rozwiązania jeszcze nie ma?…  | County map, then open challenges (0:29.5)       |
| 0:35.9 | Zespół ROPS widzi to wszystko z góry…         | Trends                                          |
| 0:42.8 | Z Zaczyna skorzysta każdy…                    | Accessibility split, zooms on large text and UK |
| 0:50.2 | Bo wiele problemów ktoś już kiedyś rozwiązał… | Screen wall, logo outro                         |
