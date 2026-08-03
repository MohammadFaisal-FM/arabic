import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { examplePairsTableSection, splitBilingualLine } from './example-format.mjs';
import { enrichRootExample, isRichExample, seedEnrichmentBans } from './enrich-examples.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const rootsDir = path.join(repoRoot, 'Saudi-Arabic', 'roots');
const sourcePath = path.join(rootsDir, 'roots-source.json');
const manifestPath = path.join(repoRoot, 'web', 'public', 'roots-manifest.json');

const LETTER_NAMES = {
  أ: 'ألف',
  ب: 'باء',
  ت: 'تاء',
  ث: 'ثاء',
  ج: 'جيم',
  ح: 'حاء',
  خ: 'خاء',
  د: 'دال',
  ذ: 'ذال',
  ر: 'راء',
  ز: 'زاي',
  س: 'سين',
  ش: 'شين',
  ص: 'صاد',
  ض: 'ضاد',
  ط: 'طاء',
  ظ: 'ظاء',
  ع: 'عين',
  غ: 'غين',
  ف: 'فاء',
  ق: 'قاف',
  ك: 'كاف',
  ل: 'لام',
  م: 'ميم',
  ن: 'نون',
  ه: 'هاء',
  و: 'واو',
  ي: 'ياء',
};

const LETTER_ORDER = Object.keys(LETTER_NAMES);

function normalizeLetter(ch) {
  if ('اأإآءؤئ'.includes(ch)) return 'أ';
  if (ch === 'ة') return 'ت';
  return ch;
}

function firstLetter(root) {
  const first = root.split('-')[0]?.trim()?.[0] ?? '';
  return normalizeLetter(first);
}

/** Skip placeholders like "—" so ism-only roots don't list fake Form I verbs. */
function isUsableVerb(verb) {
  const v = String(verb ?? '').trim();
  if (!v) return false;
  if (/^[—–\-]+$/.test(v)) return false;
  if (/^[—–\-]+\s*\/\s*[—–\-]+$/.test(v)) return false;
  return true;
}

/** Main everyday forms only (skip rare / classical awzan). */
function mainForms(root) {
  const mapped = [];
  if (Array.isArray(root.forms) && root.forms.length > 0) {
    for (const f of root.forms) {
      if (!isUsableVerb(f.verb)) continue;
      mapped.push({
        form: String(f.form),
        verb: f.verb,
        note: f.note ?? '',
        filId: f.filId ?? root.id,
      });
    }
    return mapped;
  }
  if (!isUsableVerb(root.formI)) return [];
  return [
    {
      form: 'I',
      verb: root.formI,
      note: '',
      filId: root.id,
    },
  ];
}

function formDifferenceNote(root, form) {
  const explicit = (form.note || '').trim();
  if (explicit) return explicit;
  if (String(form.form) === 'I') return `base meaning: ${root.meaning}`;
  return `derived from Form I (${root.formI})`;
}

function howToUseSection(root) {
  const forms = mainForms(root);
  if (forms.length === 0) {
    return `## Forms Widely Used

No everyday **fiʿl** (verb) for this root — learn the **ism** (noun) forms instead.
`;
  }
  const rows = forms
    .map((f) => {
      const label = `${f.verb} · ${formDifferenceNote(root, f)}`;
      return `| ${f.form} | ${label} | [Open](#fil/${f.filId}) |`;
    })
    .join('\n');
  return `## Forms Widely Used

| Form | Past / present | Fiʿl |
|------|----------------|------|
${rows}
`;
}

function mdFor(root) {
  const { ar: rawAr, en: rawEn } = splitBilingualLine(root.example);
  const enriched =
    isRichExample(rawAr) ? { ar: rawAr, en: rawEn } : enrichRootExample(root.example, root.meaning);
  return `# ${root.root}

| Field | Value |
|-------|-------|
| **Root** | ${root.root} |
| **Meaning** | ${root.meaning} |
| **Dialect** | Everyday Saudi / Najdi + MSA where common |

---

${examplePairsTableSection(enriched.ar ? [{ ar: enriched.ar, en: enriched.en }] : [])}

---

${howToUseSection(root)}`;
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
seedEnrichmentBans(
  source.roots.flatMap((r) => {
    const texts = [r.example, r.meaning, r.formI];
    if (Array.isArray(r.forms)) {
      for (const f of r.forms) {
        texts.push(f.example, f.note);
        if (Array.isArray(f.conjExamples)) {
          for (const ex of f.conjExamples) texts.push(ex.ar, ex.en);
        }
      }
    }
    return texts.filter(Boolean);
  })
);
const roots = source.roots.map((r) => ({
  ...r,
  letter: firstLetter(r.root),
  file: `roots/${r.id}.md`,
}));

// Remove old numbered root pages (01-ktb.md etc.) but keep source + README
for (const name of fs.readdirSync(rootsDir)) {
  if (/^\d{2}-.+\.md$/.test(name) || (/^[a-z0-9]+\.md$/.test(name) && name !== 'README.md')) {
    fs.unlinkSync(path.join(rootsDir, name));
  }
}

for (const root of roots) {
  fs.writeFileSync(path.join(rootsDir, `${root.id}.md`), mdFor(root), 'utf8');
}

const byLetter = {};
for (const root of roots) {
  (byLetter[root.letter] ??= []).push(root);
}

const readmeRows = LETTER_ORDER.filter((L) => byLetter[L])
  .map((L) => {
    const items = byLetter[L]
      .map((r) => `| ${r.root} | ${r.meaning} | [${r.id}.md](${r.id}.md) |`)
      .join('\n');
    return `### ${L} · ${LETTER_NAMES[L]}\n\n| Root | Meaning | File |\n|------|---------|------|\n${items}\n`;
  })
  .join('\n');

const readme = `# Roots Library

Searchable A–Z index in the app (**Roots** tab). Grouped by first letter of the root.

**Live:** https://mohammadfaisal-fm.github.io/arabic/#roots

${source.note}

**Total roots:** ${roots.length}

${readmeRows}

When a new root is added, put it in \`roots-source.json\` and run:

\`\`\`bash
npm run content
\`\`\`
`;

fs.writeFileSync(path.join(rootsDir, 'README.md'), readme, 'utf8');

const manifest = {
  title: 'Roots Library',
  description: source.note,
  letters: LETTER_ORDER.map((letter) => ({
    letter,
    name: LETTER_NAMES[letter],
  })),
  roots: roots.map(({ id, root, letter, meaning, formI, example, file, forms }) => ({
    id,
    root,
    letter,
    meaning,
    formI,
    example,
    file,
    forms: forms ?? null,
  })),
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(`Generated ${roots.length} roots → Saudi-Arabic/roots + web/public/roots-manifest.json`);
