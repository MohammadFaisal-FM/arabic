/**
 * Everyday Saudi / Najdi conjugation helper for Fiʿl pages.
 * Best-effort from Form past/present dictionary forms (sound patterns).
 */

const PRONOUNS = [
  { ar: 'أنا', en: 'I' },
  { ar: 'إحنا', en: 'we' },
  { ar: 'أنت', en: 'you (m.)' },
  { ar: 'أنتِ', en: 'you (f.)' },
  { ar: 'أنتم', en: 'you (pl.)' },
  { ar: 'هو', en: 'he' },
  { ar: 'هي', en: 'she' },
  { ar: 'هم', en: 'they' },
];

function extractPresentStem(present) {
  const p = (present || '').trim();
  if (!p) return '';
  // Strip imperfect prefix ي / ت / أ / ن / ا
  if (/^[يتأنا]/.test(p) && p.length > 2) return p.slice(1);
  return p;
}

function pastForms(pastBase) {
  const base = pastBase.trim();
  return {
    أنا: `${base}ت`,
    إحنا: `${base}نا`,
    أنت: `${base}ت`,
    أنتِ: `${base}تي`,
    أنتم: `${base}توا`,
    هو: base,
    هي: `${base}ت`,
    هم: `${base}وا`,
  };
}

function presentForms(stem) {
  const s = stem.trim();
  return {
    أنا: `أ${s}`,
    إحنا: `ن${s}`,
    أنت: `ت${s}`,
    أنتِ: `ت${s}ين`,
    أنتم: `ت${s}ون`,
    هو: `ي${s}`,
    هي: `ت${s}`,
    هم: `ي${s}ون`,
  };
}

/** Najdi future with بـ */
function futureForms(stem) {
  const s = stem.trim();
  return {
    أنا: `ب${s}`,
    إحنا: `بن${s}`,
    أنت: `بت${s}`,
    أنتِ: `بت${s}ين`,
    أنتم: `بت${s}ون`,
    هو: `بي${s}`,
    هي: `بت${s}`,
    هم: `بي${s}ون`,
  };
}

function glossFromMeaning(meaning) {
  return (meaning || 'this')
    .split('·')[0]
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * @param {string} past dictionary past (هو)
 * @param {string} present dictionary present (هو)
 * @param {string} meaning
 * @returns {string} markdown section
 */
export function conjugationSection(past, present, meaning) {
  const pastBase = (past || '').trim();
  const stem = extractPresentStem(present) || pastBase;
  const pastMap = pastForms(pastBase);
  const presentMap = presentForms(stem);
  const futureMap = futureForms(stem);
  const gloss = glossFromMeaning(meaning);

  const conjRows = PRONOUNS.map(
    (p) =>
      `| ${p.ar} | ${pastMap[p.ar]} | ${presentMap[p.ar]} | ${futureMap[p.ar]} |`
  ).join('\n');

  // Cycle tenses in examples so past / present / future all appear
  const tenseCycle = ['past', 'present', 'future'];
  const exampleRows = PRONOUNS.map((p, i) => {
    const tense = tenseCycle[i % 3];
    const form =
      tense === 'past'
        ? pastMap[p.ar]
        : tense === 'present'
          ? presentMap[p.ar]
          : futureMap[p.ar];
    const en =
      tense === 'past'
        ? `${p.en} did (${gloss})`
        : tense === 'present'
          ? `${p.en} do/does (${gloss})`
          : `${p.en} will (${gloss})`;
    return `| ${p.ar} | ${form} — ${en} |`;
  }).join('\n');

  return `## Conjugation

Everyday Saudi / Najdi. Future uses **بـ**.

| Pronoun | Past | Present | Future |
|---------|------|---------|--------|
${conjRows}

### Examples

| Pronoun | Arabic · English |
|---------|------------------|
${exampleRows}
`;
}
