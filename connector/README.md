# StudyOS Local Connector

A hosted web app cannot reach Anki Desktop on your machine directly — Anki
exposes its API (via the AnkiConnect add-on) only on `localhost`, to
whatever process asks from the same machine. This connector is that
process:

```
StudyOS Web  →  (you run this connector locally)  →  AnkiConnect  →  Anki Desktop
```

It never runs inside StudyOS's server or your browser. You run it on
whichever computer has Anki Desktop installed.

## ⚠️ Status

This was written without a live Anki Desktop installation available to test
against — it's built strictly from
[AnkiConnect's published API docs](https://foosoft.net/projects/anki-connect/),
and the server side it talks to (`POST /api/anki/sync`) **is** tested
end-to-end (see `../e2e/anki-sync.spec.ts`). Before relying on it:

- Confirm `cardReviews` pagination behaves as documented against a deck
  with real history (the loop in `sync.mjs` stops once a page comes back
  shorter than 100 entries — AnkiConnect doesn't document an exact page
  size, so treat that as a heuristic, not a guarantee).
- Watch the console output the first time you run it.

## Setup

1. Install [Anki Desktop](https://apps.ankiweb.net/) and the
   [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on (Tools →
   Add-ons → Get Add-ons, code `2055492159`), then restart Anki.
2. In StudyOS, go to **Configurações** and click **Gerar chave** under
   "Chave de API (conector Anki)". Copy it — it's shown once.
3. In StudyOS, still under Configurações, link your Anki deck names to
   subjects/topics (e.g. `Cardio::Arritmias` → Cardiologia / Arritmias). A
   link on a parent deck also covers its subdecks.
4. Run the connector (Node 18+ required — has built-in `fetch`):

   ```bash
   cd connector
   STUDYOS_API_KEY=sk_live_your_key_here node sync.mjs
   ```

   Optional environment variables:
   - `STUDYOS_URL` — defaults to `http://localhost:3000`; set this to your
     deployed StudyOS URL once you're not running it locally.
   - `ANKICONNECT_URL` — defaults to `http://127.0.0.1:8765`.
   - `STUDYOS_LOOKBACK_DAYS` — how many days of review history to consider
     each run, defaults to 30.

5. Re-run it whenever you want to sync (a cron job / scheduled task, or
   just after a study session). Syncing the same day twice is safe — the
   server replaces that day's Anki-sourced activity rather than
   duplicating it.

## What it does NOT do

- It does not modify anything in Anki — read-only against AnkiConnect.
- It does not send flashcard content anywhere, only aggregate counts
  (cards reviewed, time spent) per deck per day.
- It does not replace Anki's own scheduler — StudyOS's spaced-repetition
  system (`/review`) is independent and doesn't touch Anki-linked topics
  any differently.
