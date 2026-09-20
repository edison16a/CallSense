# CallSense

CallSense helps 911 operators manage high call volumes by transcribing and
summarising dispatcher calls in real time using the Google Gemini API. It
highlights key information, guides dispatchers with targeted follow-up
questions, and classifies each incident by urgency — reducing operator burden,
improving reporting accuracy, and supporting faster, better decisions.

## Screenshots

<img width="1906" height="926" alt="CallSense home dashboard" src="https://github.com/user-attachments/assets/f7f54ee8-744e-4438-b383-5fb1114d9b31" />

<img width="1901" height="926" alt="CallSense live call view" src="https://github.com/user-attachments/assets/72c750d7-c336-438d-94ea-4da44abbb8a3" />

<img width="1905" height="831" alt="CallSense call priority queue" src="https://github.com/user-attachments/assets/fc74bfc8-f92e-4d7a-bdc6-28255b1c6663" />

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Development server (Turbopack)                |
| `npm run build`     | Production build                              |
| `npm start`         | Serve the production build                    |
| `npm test`          | Run the test suite once                       |
| `npm run test:watch`| Run the test suite in watch mode              |
| `npm run lint`      | ESLint                                        |
| `npm run typecheck` | TypeScript, no emit                           |

### Browser support

Live dictation uses the Web Speech API, which today means a Chromium-based
browser. Everywhere else the microphone button is inert and the rest of the
dashboard works normally.

### API key

Classification and detail extraction call the Gemini API with the key in the
`GEMINI_KEY` environment variable.

> **Known limitation.** The dashboard is a client component, and Next.js only
> exposes environment variables to the browser when they are prefixed
> `NEXT_PUBLIC_`. `GEMINI_KEY` is not, so in practice the key never reaches the
> request and every Gemini call fails. The app then falls back to keyword
> classification (see `data/classification.json`), which is why it appears to
> work without a key.
>
> This is deliberately left as-is. The two obvious fixes both change how the
> product works: renaming the variable would ship your API key to every
> visitor, and proxying through a Next.js route handler would add a server tier
> this app does not currently have. The route handler is the right answer if
> you want real classification.

## Architecture

The dashboard used to be one 970-line `app/page.tsx` containing the API
clients, the types, the data, the hooks and all five screens. It is now
layered, and every layer only depends on the ones below it.

```
app/
  layout.tsx          Root layout; renders design tokens into a <style> element
  page.tsx            Composition only: chrome + a switch over the active view
  globals.css         Imports the style partials, in order
  styles/*.css        One partial per concern (base, header, sidebar, calls, …)

components/
  layout/             AppHeader, Sidebar, AppFooter, BrandMark
  ui/                 Modal, ToastStack
  views/              HomeView, PriorityView, CurrentCallsView, LiveCallView, SettingsView
  calls/              CallDetailModal

hooks/
  useCallCenter       Composes everything below into the dashboard state machine
  useToast            Transient notification queue
  useTheme            Light/dark preference, persisted
  useTicker           Forces the re-render that animates dispatch progress
  useSpeechRecognition  Web Speech dictation
  useKeyboardShortcuts  Single-key navigation, driven by the nav data
  useNotificationSounds Audio cues

lib/
  gemini/client       One request function shared by every prompt
  gemini/analysis     Four interpretations of a model reply
  classification      Level taxonomy + model/keyword resolution
  config, content, messages, navigation, theme   Typed loaders over data/
  csv, details, dispatch, format, storage        Pure helpers

types/                Domain types (calls, views, Web Speech)
data/                 All content and configuration — see below
scripts/              One-off extraction and verification scripts
tests/                Vitest suite
```

**Why a single `useCallCenter` rather than several hooks per screen?** Ending a
call touches the live transcript, the queue, the call history, the
classification banner and the toast stack in one sequence. Splitting that
across hooks would mean prop-drilling through every screen or introducing a
context, neither of which pays for itself while the state is this
interconnected.

**Why are design tokens injected by the layout?** They live in
`data/theme.json`, and the root layout is a server component, so the generated
`:root` / `.dark` rule is in the server-rendered HTML. A client effect writing
the same properties would produce a flash of untokenised layout on first paint.

## Data files

Nothing user-visible is hard-coded in a component. Everything below is loaded
at runtime from `data/`, so adding or changing an entry is a JSON edit.

| File                        | Holds                                                                 |
| --------------------------- | --------------------------------------------------------------------- |
| `app-config.json`           | Storage keys, timings, limits, CSV settings, feature flags, audio cues |
| `classification.json`       | Danger levels, model-reply keywords, the offline keyword fallback      |
| `content.json`              | Every user-facing string, grouped by screen                            |
| `demo-transcripts.json`     | Canned transcripts for the Demo button                                 |
| `gemini.json`               | API endpoint, model name, and the four prompt templates                |
| `messages.json`             | Toast copy and generated transcript lines                              |
| `navigation.json`           | Sidebar items — label, icon, view, and keyboard shortcut               |
| `theme.json`                | Every design token, for light and dark                                 |

Each file carries a `$comment` key explaining what it is for. Values are
consumed through a typed loader in `lib/`, so a malformed entry fails at
startup with a message naming it rather than rendering a blank screen.

### Adding an entry without writing code

**A new demo transcript** — append an array of lines to
`data/demo-transcripts.json`. Lines must begin with `Caller: ` or `Operator: `,
which a test enforces. It is picked up by the Demo button immediately.

**A new triage keyword** — add a pattern to `keywordFallback` in
`data/classification.json`. Rules are evaluated most severe first and the first
match wins, so place a new `High` rule above the `Medium` ones.

**New wording anywhere in the UI** — find the string in `data/content.json`
(grouped by screen) or `data/messages.json` (toasts and transcript lines) and
change it. `{{placeholders}}` in messages are substituted at runtime; an
unrecognised one is left visible rather than blanked, so a typo shows up
instead of leaving a hole in the sentence.

**A new colour or a restyle** — edit `data/theme.json`. `light` defines
`:root`; `dark` only needs the tokens that actually differ. Any token added to
`dark` must also exist in `light`, and a test enforces that.

**A prompt change** — edit `data/gemini.json`. Each prompt is an array of
parts matching Gemini's own request shape, because part order affects the
reply. `{{transcript}}` is substituted with the joined transcript.

**Turning a feature on** — `features` in `data/app-config.json`.
`showComfortingQuestions` reveals the suggested-questions panel on the Live
Call screen; `redirectToPriorityOnEndCall` jumps to the queue when a call ends.
Both ship off.

### Adding a screen (this one does need code)

Add the view name to `ViewName` in `types/view.ts`, add an entry to
`data/navigation.json`, write the component under `components/views/`, and add
one branch in `app/page.tsx`. The sidebar button, the keyboard shortcut and the
shortcut hint line all come from that single data entry — they used to be three
separate lists that could disagree.

## Scripts

`scripts/` holds the tools used to perform and verify the extraction. They are
re-runnable and each proves its own work:

- `extract-theme.mjs` — parses design tokens out of a stylesheet into
  `data/theme.json`, and writes the fixture the regeneration test diffs against.
- `tokenize-colors.mjs` — replaces colour literals in the CSS partials with
  tokens, then expands them back and asserts the result is byte-identical.
- `split-css.mjs` — cuts a monolithic stylesheet into partials, then
  reassembles them and asserts they reproduce the original.
- `verify-content.mjs` — asserts every extracted string occurs verbatim in the
  pre-refactor source.

## Known limitations

These are pre-existing behaviours, left unchanged and documented where they
occur in the code:

- **The Gemini API key does not reach the browser.** See above. Classification
  falls back to keyword matching.
- **Audio cues are silent.** The data URIs in `data/app-config.json` are
  truncated placeholders that do not decode.
- **The modal's exit animation never plays.** `Modal` returns `null` before
  `AnimatePresence` gets to run the exit.
- **Dark mode can flash on first paint.** The theme is read from
  `localStorage` during the first client render, but the server rendered the
  default, so a returning dark-mode user hydrates with a mismatch.
- **Wait times are invented.** Nothing models real dispatch capacity; the
  queue's "N min" and its progress bar are placeholder data.
- **Timestamps are UTC**, derived from the ISO string rather than the
  dispatcher's local time.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Framer Motion · Vitest.
Styling is hand-written CSS with custom properties; there is no CSS framework.
