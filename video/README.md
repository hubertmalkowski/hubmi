# Zaczyn: showcase video

A 1920x1080, 30 fps, 41 s promo video built from real recordings of the app.
This is a standalone package with its own `node_modules`. The app does not depend on it.

- `capture/record.mjs` drives the running app with Playwright. It records each scene as a sharp 3200x1800 clip via CDP screencast, draws a fake cursor with click ripples, and writes `public/clips/<scene>.mp4` plus `<scene>.json` (marker times and element boxes).
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

## Timeline (for music sync)

| Time   | Scene                                     | Caption                                                        |
| ------ | ----------------------------------------- | -------------------------------------------------------------- |
| 0:00   | Logo intro                                | Opisz problem. Znajdź sprawdzone rozwiązanie.                  |
| 0:02.3 | Browser tilts in, resident types a report | Mieszkaniec · Opisuje problem własnymi słowami                 |
|        | Gmina detected, Library preview           | Na bieżąco · Rozpoznana gmina i podobne rozwiązania            |
|        | Results: personal data redacted           | Prywatność · Dane osobowe usunięte automatycznie               |
|        | Matching solution                         | Biblioteka Innowacji · Sprawdzone rozwiązanie z Małopolski     |
| 0:17.2 | Whip to the county map                    | Brak rozwiązania? · Powstaje otwarte wyzwanie na mapie regionu |
| 0:23.0 | Whip to open challenges                   | Innowatorzy · Organizacje i gminy zgłaszają pomysły            |
| 0:28.0 | Zoom to ROPS trends                       | Zespół ROPS · Trendy i luki w całym regionie                   |
| 0:32.8 | Accessibility split                       | Dostępny dla każdego                                           |
| 0:36.4 | Screen wall → logo outro                  | Małopolski Hub Innowacji Społecznych                           |

The video is silent. The whip transitions at 0:17.2 and 0:23.0 are the strongest hits to put on a beat.
