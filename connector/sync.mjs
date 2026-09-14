#!/usr/bin/env node
// StudyOS Local Connector — reads Anki review history via AnkiConnect and
// pushes it into StudyOS as StudyEvents. Run this on the machine that has
// Anki Desktop + the AnkiConnect add-on installed; it is NOT part of the
// StudyOS web app and never runs in a browser. See README.md for setup.
//
// NOT VERIFIED against a live Anki install: this was written in an
// environment without Anki Desktop available, strictly from AnkiConnect's
// published API docs (https://foosoft.net/projects/anki-connect/). Read
// this file before trusting it, and please report back anything that
// doesn't match reality — the `cardReviews` pagination in particular
// deserves a second look against a real deck history.

const ANKICONNECT_URL = process.env.ANKICONNECT_URL || "http://127.0.0.1:8765";
const STUDYOS_URL = process.env.STUDYOS_URL || "http://localhost:3000";
const STUDYOS_API_KEY = process.env.STUDYOS_API_KEY;
const LOOKBACK_DAYS = Number(process.env.STUDYOS_LOOKBACK_DAYS || 30);
const PAGE_SIZE_HINT = 100; // AnkiConnect doesn't document an explicit page size for cardReviews; used only as a "this page was short, stop paging" heuristic.

if (!STUDYOS_API_KEY) {
  console.error("Missing STUDYOS_API_KEY. Generate one in StudyOS -> Configurações, then:");
  console.error("  STUDYOS_API_KEY=sk_live_... node sync.mjs");
  process.exit(1);
}

async function ankiConnect(action, params = {}) {
  const res = await fetch(ANKICONNECT_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, version: 6, params }),
  });
  if (!res.ok) {
    throw new Error(`AnkiConnect HTTP ${res.status} — is Anki Desktop running with the AnkiConnect add-on installed?`);
  }
  const json = await res.json();
  if (json.error) throw new Error(`AnkiConnect error: ${json.error}`);
  return json.result;
}

function dayKey(epochMs) {
  return new Date(epochMs).toISOString().slice(0, 10);
}

async function collectDeckReviews(deckName, sinceMs) {
  // { dayKey -> { cardsReviewed, timeSpentMs } }
  const perDay = new Map();
  let cursor = sinceMs;

  for (;;) {
    // cardReviews(deck, startID) returns entries with reviewTime > startID,
    // each shaped [reviewTime, cardID, usn, buttonPressed, newInterval,
    // previousInterval, newFactor, reviewDuration, reviewType].
    const reviews = await ankiConnect("cardReviews", { deck: deckName, startID: cursor });
    if (!reviews || reviews.length === 0) break;

    for (const review of reviews) {
      const [reviewTime, , , , , , , reviewDuration] = review;
      const key = dayKey(reviewTime);
      const entry = perDay.get(key) ?? { cardsReviewed: 0, timeSpentMs: 0 };
      entry.cardsReviewed += 1;
      entry.timeSpentMs += reviewDuration;
      perDay.set(key, entry);
    }

    const lastReviewTime = reviews[reviews.length - 1][0];
    if (lastReviewTime <= cursor) break; // safety net against a non-advancing cursor
    cursor = lastReviewTime + 1;
    if (reviews.length < PAGE_SIZE_HINT) break;
  }

  return perDay;
}

async function main() {
  const deckNames = await ankiConnect("deckNames");
  const sinceMs = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;

  const reviews = [];
  for (const deckName of deckNames) {
    if (deckName === "Default") continue;
    const perDay = await collectDeckReviews(deckName, sinceMs);
    for (const [date, { cardsReviewed, timeSpentMs }] of perDay) {
      reviews.push({ deckName, date, cardsReviewed, timeSpentMs });
    }
  }

  if (reviews.length === 0) {
    console.log("Nothing to sync.");
    return;
  }

  const res = await fetch(`${STUDYOS_URL}/api/anki/sync`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${STUDYOS_API_KEY}` },
    body: JSON.stringify({ reviews }),
  });

  if (!res.ok) {
    console.error(`StudyOS sync failed: HTTP ${res.status}`, await res.text());
    process.exit(1);
  }

  const result = await res.json();
  console.log(`Synced ${result.synced} deck-day${result.synced === 1 ? "" : "s"} of review activity.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
