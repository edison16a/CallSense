# CallSense

We created CallSense, which is designed to help 911 operators manage high call
volumes by transcribing and summarizing dispatcher calls in real time using the
Google Gemini API. It highlights key information, guides dispatchers with
targeted questions, and uses a classification model to prioritize incidents,
helping reduce operator burden, improve reporting accuracy, and support faster,
better decisions.

Built in ~24 hours. Winner of Milpitas Hacks!

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm test` | Run the tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | All four of the above checks in one go |

Live dictation uses the Web Speech API, so it needs a Chromium based browser.
Everywhere else the microphone button does nothing and the rest of the
dashboard works fine.

### API key

The Gemini calls read the `GEMINI_KEY` environment variable.

Heads up: the dashboard is a client component, and Next.js only exposes
environment variables to the browser when they start with `NEXT_PUBLIC_`.
`GEMINI_KEY` does not, so the key never reaches the request and every Gemini
call fails. The app quietly falls back to keyword matching, which is why it
looks like it works without a key.

This was left alone because both fixes change how the product works. Renaming
the variable would ship your API key to every visitor. The better fix is a
Next.js route handler that keeps the key on the server.

## Architecture

The dashboard used to be one 970 line `app/page.tsx` holding the API clients,
the types, the data, the hooks and all five screens. It is now layered.

```
app/
  layout.tsx          Root layout, renders design tokens into a <style> element
  page.tsx            Composition only: chrome plus the active screen
  globals.css         Imports the style partials, in order
  styles/*.css        One partial per concern (base, header, sidebar, calls)

components/
  layout/             AppHeader, Sidebar, AppFooter, BrandMark
  ui/                 Modal, ToastStack
  views/              One component per screen
  calls/              CallDetailModal

hooks/
  useCallCenter       Composes the hooks below into one object for the page
  useCallRecords      The queue, the history and the open screen, all persisted
  useCallAnalysis     The end of call pipeline, the only code that calls Gemini
  useToast            Notification queue
  useTheme            Light and dark preference, persisted
  useTicker           Forces the re-render that animates dispatch progress
  useSpeechRecognition  Web Speech dictation
  useKeyboardShortcuts  Single key navigation, driven by the nav data
  useNotificationSounds Audio cues

lib/
  gemini/             One request function, four ways of reading the reply
  classification      Levels, plus model and keyword resolution
  config, content, messages, navigation, theme   Typed loaders over data/
  csv, details, dispatch, format, stats, storage  Pure helpers

types/                Domain types
data/                 All content and configuration, see below
scripts/              Extraction and verification scripts
tests/                Vitest suite
```

Two decisions worth knowing about:

**Design tokens are injected by the layout.** They live in `data/theme.json`,
and the root layout is a server component, so the generated `:root` and `.dark`
rules are in the server rendered HTML. Writing them from a client effect would
flash unstyled layout on first paint.

**The screen table is exhaustive.** `page.tsx` maps every `ViewName` to a
component through a `Record`, so adding a screen name without writing the screen
is a compile error rather than a blank page.

## Data files

Nothing user facing is hard coded in a component. Everything below loads from
`data/`, so adding or changing an entry is a JSON edit.

| File | Holds |
| --- | --- |
| `app-config.json` | Storage keys, timings, limits, CSV settings, feature flags |
| `classification.json` | Danger levels, reply keywords, keyword fallback |
| `content.json` | Every user facing string, grouped by screen |
| `demo-transcripts.json` | Canned transcripts for the Demo button |
| `gemini.json` | Endpoint, model name, and the four prompt templates |
| `messages.json` | Toast copy and generated transcript lines |
| `navigation.json` | Sidebar items: label, icon, view, keyboard shortcut |
| `theme.json` | Every design token, light and dark |

Each file has a `$comment` key saying what it is for. Values are read through a
typed loader in `lib/`, so a bad entry fails at startup with a message naming
it instead of rendering a blank screen.

### Adding an entry without writing code

**A demo transcript.** Append an array of lines to
`data/demo-transcripts.json`. Lines must start with `Caller: ` or `Operator: `,
which a test checks. The Demo button picks it up right away.

**A triage keyword.** Add a pattern to `keywordFallback` in
`data/classification.json`. Rules run most severe first and the first match
wins, so put a new `High` rule above the `Medium` ones.

**A danger level.** Add it to `levels` and `responseKeywords` in
`data/classification.json`, most severe first. The filter chips and the Home
counters both derive from that list, so they pick it up on their own. You still
need a `.priority-badge` rule in `app/styles/calls.css` to give it a color, and
a tile in `content.json` if you want it on the Home screen.

**New wording.** Find the string in `data/content.json` (grouped by screen) or
`data/messages.json` (toasts and transcript lines). `{{placeholders}}` are
filled in at runtime, and an unknown one stays visible so a typo is obvious.

**A color or a restyle.** Edit `data/theme.json`. `light` defines `:root`, and
`dark` only needs the tokens that differ. Anything in `dark` must also exist in
`light`, and a test checks that.

**A prompt change.** Edit `data/gemini.json`. Each prompt is an array of parts
matching Gemini's own request shape, because part order affects the reply.
`{{transcript}}` is replaced with the joined transcript.

**A feature flag.** See `features` in `data/app-config.json`.
`showComfortingQuestions` reveals the suggested questions panel on the Live
Call screen, and `redirectToPriorityOnEndCall` jumps to the queue when a call
ends. Both ship off.

### Adding a screen (this one needs code)

Add the name to `VIEW_NAMES` in `types/view.ts`, add an entry to
`data/navigation.json`, write the component under `components/views/`, and add
it to the screen table in `app/page.tsx`. The sidebar button, the keyboard
shortcut and the hint line all come from that one data entry, and the compiler
will not let you skip the last step.

## Scripts

`scripts/` holds the tools used to do and check the extraction. Each one
verifies its own work and can be re-run.

- `extract-theme.mjs` pulls design tokens out of a stylesheet into
  `data/theme.json`.
- `tokenize-colors.mjs` swaps color literals in the CSS for tokens, then
  expands them back and checks the result is byte identical.
- `split-css.mjs` cuts a monolithic stylesheet into partials, then reassembles
  them and checks they match the original.
- `verify-content.mjs` checks every extracted string appears verbatim in the
  pre-refactor source.

## Known limitations

All of these predate the refactor and are documented where they happen in the
code:

- The Gemini API key does not reach the browser, so classification falls back
  to keyword matching. See above.
- Audio cues are silent. The data URIs in `data/app-config.json` are truncated
  placeholders that do not decode.
- The modal's exit animation never plays, because `Modal` returns `null` before
  `AnimatePresence` can run it.
- Dark mode can flash on first paint. The theme is read from `localStorage`
  during the first client render, but the server rendered the default.
- Wait times are made up. Nothing models real dispatch capacity, so the queue's
  "N min" and its progress bar are placeholder data.
- Timestamps are UTC, not the dispatcher's local time.

## Stack

Next.js 15 (App Router), React 19, TypeScript, Framer Motion, Vitest. Styling
is hand written CSS with custom properties. There is no CSS framework.
