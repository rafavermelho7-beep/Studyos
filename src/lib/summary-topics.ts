// Resumo da aula → tópicos. No AI: the user marks what's a topic by
// starting a line with "#" (one to three, markdown-style), e.g.
//
//   # Sífilis
//   Treponema pallidum, VDRL...
//
// Pure so both the lesson page (live preview) and the server (the actual
// create) use the exact same rule.

export const MAX_SUMMARY_LENGTH = 50_000;
const MAX_TOPIC_NAME = 120;
const MAX_TOPICS_PER_SUMMARY = 40;

/** Case- and accent-insensitive key, so "Sífilis" and "sifilis" are the same topic. */
export function topicKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** The "# heading" lines of a summary, cleaned, in order, without repeats. */
export function extractHeadingTopics(summary: string) {
  const seen = new Set<string>();
  const topics: string[] = [];
  for (const line of summary.split(/\r?\n/)) {
    const match = /^\s*#{1,3}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;
    // Strip markdown emphasis people type out of habit: "# **HPV**".
    const name = match[1].replace(/[*_`]+/g, "").replace(/\s+/g, " ").trim().slice(0, MAX_TOPIC_NAME);
    const key = topicKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    topics.push(name);
    if (topics.length === MAX_TOPICS_PER_SUMMARY) break;
  }
  return topics;
}
