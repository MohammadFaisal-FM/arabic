import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

/** Main everyday forms only (skip rare / classical awzan). */
function mainForms(root) {
  if (Array.isArray(root.forms) && root.forms.length > 0) {
    return root.forms.map((f) => ({
      form: String(f.form),
      verb: f.verb,
      note: f.note ?? '',
      filId: f.filId ?? root.id,
    }));
  }
  return [
    {
      form: 'I',
      verb: root.formI,
      note: '',
      filId: root.id,
    },
  ];
}

function howToUseSection(root) {
  const forms = mainForms(root);
  const rows = forms
    .map((f) => {
      const label = f.note ? `${f.verb} · ${f.note}` : f.verb;
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
  return `# ${root.root}

| Field | Value |
|-------|-------|
| **Root** | ${root.root} |
| **Meaning** | ${root.meaning} |
| **Dialect** | Everyday Saudi / Najdi + MSA where common |

---

## Example

| Arabic · English |
|------------------|
| ${root.example} |

---

${howToUseSection(root)}`;
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
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
