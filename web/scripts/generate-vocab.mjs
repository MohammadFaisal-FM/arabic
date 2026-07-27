import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const vocabDir = path.join(repoRoot, 'Saudi-Arabic', 'vocab');
const rootsDir = path.join(repoRoot, 'Saudi-Arabic', 'roots');
const publicDir = path.join(repoRoot, 'web', 'public');

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
  if (!ch) return 'أ';
  if ('اأإآءؤئ'.includes(ch)) return 'أ';
  if (ch === 'ة') return 'ت';
  if (ch === 'ى') return 'ي';
  return ch;
}

function firstLetterFromArabic(arabic) {
  const cleaned = arabic.replace(/^[ال]+/, '').replace(/[؟?\s]/g, '');
  return normalizeLetter(cleaned[0] ?? 'أ');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function clearGeneratedMd(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name.endsWith('.md') && name !== 'README.md') {
      fs.unlinkSync(path.join(dir, name));
    }
  }
}

function writeManifest(name, data) {
  fs.writeFileSync(path.join(publicDir, name), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function lettersMeta() {
  return LETTER_ORDER.map((letter) => ({ letter, name: LETTER_NAMES[letter] }));
}

// --- load sources ---
const rootsSource = JSON.parse(
  fs.readFileSync(path.join(rootsDir, 'roots-source.json'), 'utf8')
);
const ismSource = JSON.parse(fs.readFileSync(path.join(vocabDir, 'ism-source.json'), 'utf8'));
const harfSource = JSON.parse(fs.readFileSync(path.join(vocabDir, 'harf-source.json'), 'utf8'));

const rootById = new Map(rootsSource.roots.map((r) => [r.id, r]));

// --- Fiʿl from roots ---
const filDir = path.join(vocabDir, 'fil');
ensureDir(filDir);
clearGeneratedMd(filDir);

const filItems = rootsSource.roots.map((root) => {
  const [past, present] = root.formI.split(/\s*\/\s*/).map((s) => s.trim());
  const id = root.id;
  const arabic = past;
  const letter = firstLetterFromArabic(arabic);
  const file = `vocab/fil/${id}.md`;
  const md = `# ${arabic}

| Field | Value |
|-------|-------|
| **Type** | فعل · fiʿl (verb) |
| **Arabic** | ${arabic} |
| **Present** | ${present ?? '—'} |
| **Meaning** | ${root.meaning} |
| **Root** | ${root.root} (\`${root.id}\`) |
| **Form I** | ${root.formI} |

---

## Example

| Arabic · English |
|------------------|
| ${root.example} |

---

## Overlap

This verb also lives under **Roots → ${root.root}**. Ask in Cursor: \`drill verb ${arabic}\` for full conjugations (أنا → هم).
`;
  fs.writeFileSync(path.join(filDir, `${id}.md`), md, 'utf8');
  return {
    id,
    arabic,
    past,
    present: present ?? '',
    meaning: root.meaning,
    letter,
    rootId: root.id,
    root: root.root,
    formI: root.formI,
    example: root.example,
    file,
  };
});

writeManifest('fil-manifest.json', {
  title: 'Fiʿl — Verbs',
  description:
    'Everyday verbs (fiʿl). Overlaps with Roots: each verb belongs to a root family.',
  kind: 'fil',
  letters: lettersMeta(),
  items: filItems,
});

// --- Ism ---
const ismDir = path.join(vocabDir, 'ism');
ensureDir(ismDir);
clearGeneratedMd(ismDir);

const ismItems = ismSource.items.map((item) => {
  const letter = firstLetterFromArabic(item.arabic);
  const root = item.rootId ? rootById.get(item.rootId) : null;
  const file = `vocab/ism/${item.id}.md`;
  const subtype = item.subtype ?? 'noun';
  const md = `# ${item.arabic}

| Field | Value |
|-------|-------|
| **Type** | اسم · ism (noun) |
| **Subtype** | ${subtype} |
| **Arabic** | ${item.arabic} |
| **Meaning** | ${item.meaning} |
| **Root** | ${root ? `${root.root} (\`${root.id}\`)` : '— (loan / no everyday root)'} |

---

## Example

| Arabic · English |
|------------------|
| ${item.example} |

---

## Notes

${
  subtype === 'loan'
    ? 'Loanword — learn as a whole. No useful Arabic root family.'
    : root
      ? `Overlaps with **Roots → ${root.root}** and often with related verbs under **Fiʿl**.`
      : 'Common everyday noun. May not share a productive root in daily speech.'
}
`;
  fs.writeFileSync(path.join(ismDir, `${item.id}.md`), md, 'utf8');
  return {
    id: item.id,
    arabic: item.arabic,
    meaning: item.meaning,
    letter,
    subtype,
    rootId: item.rootId ?? null,
    root: root?.root ?? null,
    example: item.example,
    file,
  };
});

writeManifest('ism-manifest.json', {
  title: 'Ism — Nouns',
  description: ismSource.note,
  kind: 'ism',
  letters: lettersMeta(),
  items: ismItems,
});

// --- Ḥarf ---
const harfDir = path.join(vocabDir, 'harf');
ensureDir(harfDir);
clearGeneratedMd(harfDir);

const harfItems = harfSource.items.map((item) => {
  const letter = firstLetterFromArabic(item.arabic);
  const file = `vocab/harf/${item.id}.md`;
  const md = `# ${item.arabic}

| Field | Value |
|-------|-------|
| **Type** | حرف · ḥarf (particle) |
| **Arabic** | ${item.arabic} |
| **Meaning** | ${item.meaning} |
| **Usage** | ${item.usage} |
| **Root** | — (particles are not built from roots) |

---

## Example

| Arabic · English |
|------------------|
| ${item.example} |
`;
  fs.writeFileSync(path.join(harfDir, `${item.id}.md`), md, 'utf8');
  return {
    id: item.id,
    arabic: item.arabic,
    meaning: item.meaning,
    letter,
    usage: item.usage,
    example: item.example,
    file,
  };
});

writeManifest('harf-manifest.json', {
  title: 'Ḥarf — Particles',
  description: harfSource.note,
  kind: 'harf',
  letters: lettersMeta(),
  items: harfItems,
});

// --- Enrich roots with family links ---
const ismsByRoot = new Map();
for (const ism of ismItems) {
  if (!ism.rootId) continue;
  const list = ismsByRoot.get(ism.rootId) ?? [];
  list.push(ism);
  ismsByRoot.set(ism.rootId, list);
}

for (const root of rootsSource.roots) {
  const rootPath = path.join(rootsDir, `${root.id}.md`);
  if (!fs.existsSync(rootPath)) continue;
  let md = fs.readFileSync(rootPath, 'utf8');
  // strip old family section if re-run
  md = md.replace(/\n---\n\n## Word family[\s\S]*$/m, '');
  const fil = filItems.find((f) => f.rootId === root.id);
  const relatedIsms = ismsByRoot.get(root.id) ?? [];
  const ismRows =
    relatedIsms.length > 0
      ? relatedIsms.map((i) => `| اسم | ${i.arabic} | ${i.meaning} | \`#ism/${i.id}\` |`).join('\n')
      : '| — | — | No linked isms yet | — |';
  const family = `

---

## Word family (overlap)

| Type | Arabic | Meaning | App link |
|------|--------|---------|----------|
| فعل | ${fil?.arabic ?? '—'} | ${fil?.meaning ?? '—'} | \`#fil/${root.id}\` |
${ismRows}

Ism and Fiʿl tabs list these words by type; this Roots page groups them by جذر.
`;
  fs.writeFileSync(rootPath, md.trimEnd() + family + '\n', 'utf8');
}

// Patch roots manifest with related ids
const rootsManifestPath = path.join(publicDir, 'roots-manifest.json');
if (fs.existsSync(rootsManifestPath)) {
  const rootsManifest = JSON.parse(fs.readFileSync(rootsManifestPath, 'utf8'));
  rootsManifest.roots = rootsManifest.roots.map((r) => ({
    ...r,
    filId: r.id,
    ismIds: (ismsByRoot.get(r.id) ?? []).map((i) => i.id),
  }));
  writeManifest('roots-manifest.json', rootsManifest);
}

const readme = `# Vocab libraries

Three word-type libraries used by the app tabs. They **overlap** with Roots for content words.

| Tab | Folder | Count | Notes |
|-----|--------|------:|-------|
| **Ism** | [ism/](ism/) | ${ismItems.length} | Nouns + loanwords |
| **Fiʿl** | [fil/](fil/) | ${filItems.length} | Verbs (from roots) |
| **Ḥarf** | [harf/](harf/) | ${harfItems.length} | Particles (no roots) |

Edit sources:
- \`ism-source.json\`
- \`harf-source.json\`
- Fiʿl is generated from \`../roots/roots-source.json\`

Then run:

\`\`\`bash
node web/scripts/generate-roots.mjs
node web/scripts/generate-vocab.mjs
\`\`\`
`;
fs.writeFileSync(path.join(vocabDir, 'README.md'), readme, 'utf8');

console.log(
  `Generated vocab → ism ${ismItems.length}, fil ${filItems.length}, harf ${harfItems.length}`
);
