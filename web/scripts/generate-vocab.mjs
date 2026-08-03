import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conjugationSection, seedUsedExampleTokens } from './conjugate.mjs';
import {
  seedEnrichmentBans,
  isRichExample,
  enrichIsmExample,
  enrichHarfExampleSmart,
} from './enrich-examples.mjs';
import {
  escapeTableCell,
  formatExampleCell,
  examplePairsTableSection,
  splitBilingualLine,
} from './example-format.mjs';

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

// --- Fiʿl from roots (one page per everyday form / وزن) ---
const filDir = path.join(vocabDir, 'fil');
ensureDir(filDir);
clearGeneratedMd(filDir);

/** Skip placeholders like "—" so ism-only roots (أب، ابن) don't get fake Fiʿl pages. */
function isUsableVerb(verb) {
  const v = String(verb ?? '').trim();
  if (!v) return false;
  if (/^[—–\-]+$/.test(v)) return false;
  if (/^[—–\-]+\s*\/\s*[—–\-]+$/.test(v)) return false;
  return true;
}

function formsForRoot(root) {
  const mapped = [];
  if (Array.isArray(root.forms) && root.forms.length > 0) {
    for (const f of root.forms) {
      if (!isUsableVerb(f.verb)) continue;
      mapped.push({
        form: String(f.form),
        verb: f.verb,
        note: f.note ?? '',
        filId: f.filId ?? root.id,
        example: f.example ?? '',
        conjExamples: Array.isArray(f.conjExamples) ? f.conjExamples : null,
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
      example: root.example ?? '',
      conjExamples: Array.isArray(root.conjExamples) ? root.conjExamples : null,
    },
  ];
}

// Ban vocab already used in root / ism hero examples so Fiʿl sentences stay fresh.
{
  const seedTexts = [];
  for (const root of rootsSource.roots) {
    if (root.example) seedTexts.push(root.example);
    if (Array.isArray(root.forms)) {
      for (const f of root.forms) {
        if (f.example) seedTexts.push(f.example);
        if (Array.isArray(f.conjExamples)) {
          for (const ex of f.conjExamples) {
            seedTexts.push(`${ex.ar || ''} ${ex.en || ''}`);
          }
        }
      }
    }
  }
  for (const item of ismSource.items) {
    if (item.example) seedTexts.push(item.example);
    if (item.exampleEn) seedTexts.push(item.exampleEn);
  }
  seedUsedExampleTokens(seedTexts);
  seedEnrichmentBans(seedTexts);
}

function formDifferenceNote(root, form) {
  const explicit = (form.note || '').trim();
  if (explicit) return explicit;
  if (String(form.form) === 'I') return `base meaning: ${root.meaning}`;
  return `derived from Form I (${root.formI})`;
}

function formDisplayLabel(root, form) {
  return `${form.verb} · ${formDifferenceNote(root, form)}`;
}

const filItems = [];
const seenFilIds = new Set();

for (const root of rootsSource.roots) {
  for (const form of formsForRoot(root)) {
    if (seenFilIds.has(form.filId)) continue;
    seenFilIds.add(form.filId);

    const [past, present] = form.verb.split(/\s*\/\s*/).map((s) => s.trim());
    const id = form.filId;
    const arabic = past;
    const letter = firstLetterFromArabic(arabic);
    const file = `vocab/fil/${id}.md`;
    const meaning = form.note
      ? `${root.meaning} · ${form.note}`
      : root.meaning;
    const exampleRaw =
      id === root.id
        ? root.example
        : form.example || `${past} — Form ${form.form} of ${root.root}`;
    const { ar: exAr, en: exEn } = splitBilingualLine(exampleRaw);
    const md = `# ${arabic}

| Field | Value |
|-------|-------|
| **Type** | فعل · fiʿl (verb) |
| **Arabic** | ${arabic} |
| **Present** | ${present ?? '—'} |
| **Meaning** | ${meaning} |
| **Root** | [${root.root}](#roots/${root.id}) |
| **Form** | ${form.form} · ${formDisplayLabel(root, form)} |

---

${examplePairsTableSection(exAr ? [{ ar: exAr, en: exEn }] : [])}

---

${conjugationSection(past, present ?? '', meaning, form.conjExamples)}
`;
    fs.writeFileSync(path.join(filDir, `${id}.md`), md, 'utf8');
    filItems.push({
      id,
      arabic,
      past,
      present: present ?? '',
      meaning,
      letter,
      rootId: root.id,
      root: root.root,
      form: form.form,
      formI: form.verb,
      example: exampleRaw,
      file,
    });
  }
}

writeManifest('fil-manifest.json', {
  title: 'Fiʿl — Verbs',
  description:
    'Everyday verbs (fiʿl) by وزن (form). Overlaps with Roots: each verb belongs to a root family.',
  kind: 'fil',
  letters: lettersMeta(),
  items: filItems,
});

const filByRootId = new Map();
for (const fil of filItems) {
  if (!filByRootId.has(fil.rootId)) filByRootId.set(fil.rootId, fil);
}

function ismExampleEntries(item) {
  const rows = [];
  const seen = new Set();
  const push = (ar, en) => {
    const a = (ar || '').trim();
    if (!a || seen.has(a)) return;
    seen.add(a);
    rows.push({ ar: a, en: (en || '').trim() });
  };

  if (Array.isArray(item.examples)) {
    for (const ex of item.examples) {
      if (typeof ex === 'string') {
        if (isRichExample(ex)) push(ex, '');
        else {
          const rich = enrichIsmExample(item.arabic, item.meaning);
          push(rich.ar, rich.en);
        }
      } else if (isRichExample(ex.ar)) {
        push(ex.ar, ex.en);
      } else {
        const rich = enrichIsmExample(item.arabic, item.meaning);
        push(rich.ar, rich.en);
      }
    }
  }

  const primary = (item.example || '').trim();
  const primaryEn = (item.exampleEn || '').trim();
  if (primary && isRichExample(primary)) {
    push(primary, primaryEn);
  } else {
    const rich = enrichIsmExample(item.arabic, item.meaning);
    push(rich.ar, rich.en);
  }

  // One solid multi-clause example is enough for learning density.
  return rows.slice(0, 1);
}

function ismTypeLabel(subtype) {
  switch (subtype) {
    case 'masdar':
      return 'مصدر · masdar (verbal noun)';
    case 'doer':
      return 'اسم فاعل · ism fāʿil (doer)';
    case 'maful':
      return 'اسم مفعول · ism mafʿūl (done-to)';
    case 'place':
      return 'اسم مكان · ism makān (place)';
    case 'time':
      return 'اسم زمان · ism zamān (time)';
    case 'tool':
      return 'اسم آلة · ism ālah (tool)';
    case 'comparative':
      return 'اسم تفضيل · ism tafḍīl (comparative)';
    case 'loan':
      return 'دخيل · loanword';
    default:
      return 'اسم · ism (noun)';
  }
}

function ismExampleSection(item) {
  const entries = ismExampleEntries(item);
  return examplePairsTableSection(entries);
}

function ismLinksSection(item, root, fil) {
  if (!item.rootId || !root) return '';
  const filCell = fil
    ? `[${fil.arabic} / ${fil.present}](#fil/${fil.id})`
    : 'N/A — no everyday fiʿl for this root';
  return `
### Links

| | |
|-|-|
| **Root family** | [${root.root}](#roots/${root.id}) — see all word types |
| **Fiʿl** | ${filCell} |
`;
}

/** Map root.isms[].type → ism subtype */
function subtypeFromRootIsm(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('masdar')) return 'masdar';
  if (t.includes('fāʿil') || t.includes('fail') || t.includes('doer')) return 'doer';
  if (t.includes('mafʿūl') || t.includes('maful')) return 'maful';
  if (t.includes('place') || t.includes('makān')) return 'place';
  if (t.includes('time') || t.includes('zamān')) return 'time';
  if (t.includes('tool') || t.includes('ālah')) return 'tool';
  if (t.includes('comparative') || t.includes('tafḍīl')) return 'comparative';
  if (t.includes('loan')) return 'loan';
  return 'noun';
}

function normalizeArabicKey(s) {
  return String(s || '')
    .trim()
    .replace(/[ًٌٍَُِّْ]/g, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/أ|إ|آ/g, 'ا');
}

function slugForRootIsm(rootId, word) {
  const map = {
    ا: 'a',
    أ: 'a',
    إ: 'i',
    آ: 'a',
    ب: 'b',
    ت: 't',
    ث: 'th',
    ج: 'j',
    ح: 'h',
    خ: 'kh',
    د: 'd',
    ذ: 'dh',
    ر: 'r',
    ز: 'z',
    س: 's',
    ش: 'sh',
    ص: 's',
    ض: 'd',
    ط: 't',
    ظ: 'z',
    ع: 'a',
    غ: 'gh',
    ف: 'f',
    ق: 'q',
    ك: 'k',
    ل: 'l',
    م: 'm',
    ن: 'n',
    ه: 'h',
    و: 'w',
    ي: 'y',
    ى: 'y',
    ة: 'h',
    ء: '',
    ئ: 'y',
    ؤ: 'w',
  };
  let base = '';
  for (const ch of String(word || '').replace(/[ًٌٍَُِّْـ]/g, '')) {
    if (/[a-zA-Z0-9]/.test(ch)) base += ch.toLowerCase();
    else if (map[ch]) base += map[ch];
  }
  base = base.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24);
  return `${rootId}-${base || 'ism'}`;
}

/**
 * Promote root.isms into the Ism library so Roots pages can link to Ism tabs.
 * Also attaches rootId to existing ism entries that match the Arabic word.
 */
function mergeRootIsmsIntoIsmItems(items, roots) {
  const byKey = new Map();
  for (const item of items) {
    byKey.set(normalizeArabicKey(item.arabic), item);
  }
  const merged = items.map((item) => ({ ...item }));
  // refresh map to point at cloned objects
  byKey.clear();
  for (const item of merged) {
    byKey.set(normalizeArabicKey(item.arabic), item);
  }

  for (const root of roots) {
    if (!Array.isArray(root.isms)) continue;
    for (const ism of root.isms) {
      const word = (ism.word || '').trim();
      if (!word) continue;
      const key = normalizeArabicKey(word);
      const existing = byKey.get(key);
      const { ar, en } = splitBilingualLine(ism.example || '');
      if (existing) {
        if (!existing.rootId) existing.rootId = root.id;
        if (ar && (!existing.example || !isRichExample(existing.example))) {
          existing.example = ar;
          existing.exampleEn = en || existing.exampleEn;
        }
        continue;
      }
      const item = {
        id: slugForRootIsm(root.id, word),
        arabic: word,
        meaning: ism.meaning || root.meaning,
        subtype: subtypeFromRootIsm(ism.type),
        example: ar || word,
        exampleEn: en || '',
        rootId: root.id,
      };
      merged.push(item);
      byKey.set(key, item);
    }
  }
  return merged;
}

// --- Ism ---
const ismDir = path.join(vocabDir, 'ism');
ensureDir(ismDir);
clearGeneratedMd(ismDir);

const ismSourceItems = mergeRootIsmsIntoIsmItems(ismSource.items, rootsSource.roots);

const ismItems = ismSourceItems.map((item) => {
  const letter = firstLetterFromArabic(item.arabic);
  const root = item.rootId ? rootById.get(item.rootId) : null;
  const fil = item.rootId ? filByRootId.get(item.rootId) : null;
  const file = `vocab/ism/${item.id}.md`;
  const subtype = item.subtype ?? 'noun';
  const exampleEntries = ismExampleEntries(item);
  const md = `# ${item.arabic}

| Field | Value |
|-------|-------|
| **Type** | اسم · ism (noun) |
| **Subtype** | ${ismTypeLabel(subtype)} |
| **Arabic** | ${item.arabic} |
| **Meaning** | ${item.meaning} |
| **Root** | ${root ? `[${root.root}](#roots/${item.rootId})` : '— (loan / no everyday root)'} |

---

${examplePairsTableSection(exampleEntries)}
${ismLinksSection(item, root, fil)}
`;
  fs.writeFileSync(path.join(ismDir, `${item.id}.md`), md, 'utf8');
  const shown = exampleEntries[0] || {
    ar: item.example,
    en: item.exampleEn ?? '',
  };
  return {
    id: item.id,
    arabic: item.arabic,
    meaning: item.meaning,
    letter,
    subtype,
    rootId: item.rootId ?? null,
    root: root?.root ?? null,
    example: shown.ar,
    exampleEn: shown.en || null,
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
  const rich = enrichHarfExampleSmart(item);
  const md = `# ${item.arabic}

| Field | Value |
|-------|-------|
| **Type** | حرف · ḥarf (particle) |
| **Arabic** | ${item.arabic} |
| **Meaning** | ${item.meaning} |
| **Usage** | ${item.usage} |
| **Root** | — (particles are not built from roots) |

---

${examplePairsTableSection([{ ar: rich.ar, en: rich.en }])}
`;
  fs.writeFileSync(path.join(harfDir, `${item.id}.md`), md, 'utf8');
  return {
    id: item.id,
    arabic: item.arabic,
    meaning: item.meaning,
    letter,
    usage: item.usage,
    example: `${rich.ar} — ${rich.en}`,
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

// --- Enrich roots with Word types + Related-Words + manifest ism ids ---
const ismsByRoot = new Map();
for (const ism of ismItems) {
  if (!ism.rootId) continue;
  const list = ismsByRoot.get(ism.rootId) ?? [];
  list.push(ism);
  ismsByRoot.set(ism.rootId, list);
}

const ROOT_TYPE_SLOTS = [
  { key: 'masdar', label: 'مصدر · masdar (verbal noun)' },
  { key: 'doer', label: 'اسم فاعل · ism fāʿil (doer)' },
  { key: 'maful', label: 'اسم مفعول · ism mafʿūl (done-to)' },
  { key: 'place', label: 'اسم مكان · ism makān (place)' },
  { key: 'time', label: 'اسم زمان · ism zamān (time)' },
  { key: 'tool', label: 'اسم آلة · ism ālah (tool)' },
  { key: 'comparative', label: 'اسم تفضيل · ism tafḍīl (comparative)' },
  { key: 'noun', label: 'اسم · ism (noun / other)' },
];

function rootFormsFor(root) {
  return formsForRoot(root).map((f) => ({
    form: f.form,
    verb: f.verb,
    note: f.note ?? '',
    filId: f.filId,
    example: f.example ?? '',
  }));
}

function wordTypesSection(root, relatedIsms) {
  const rows = [];

  const forms = rootFormsFor(root);
  if (forms.length === 0) {
    rows.push('| فعل · fiʿl (verb) | N/A | ism-only root — no everyday verb |');
  } else {
    for (const f of forms) {
      const label = formDisplayLabel(root, f);
      const raw =
        typeof f.example === 'string' && f.example.trim() && f.example.trim() !== '—'
          ? f.example
          : typeof root.example === 'string' && root.example.trim()
            ? root.example
            : '';
      const { ar: exAr, en: exEn } = splitBilingualLine(raw);
      const exampleCell =
        exAr ? formatExampleCell(exAr, exEn) : 'verb — see Fiʿl';
      rows.push(
        `| فعل · fiʿl (Form ${f.form}) | [${escapeTableCell(label)}](#fil/${f.filId}) | ${escapeTableCell(exampleCell)} |`
      );
    }
  }

  // Inline root.isms that still have no Ism page (should be rare after merge)
  let filledNounFromRoot = false;
  if (Array.isArray(root.isms)) {
    for (const ism of root.isms) {
      const word = ism.word || '';
      if (!word) continue;
      const match = relatedIsms.find(
        (i) => normalizeArabicKey(i.arabic) === normalizeArabicKey(word)
      );
      if (match) continue;
      const { ar: exAr, en: exEn } = splitBilingualLine(ism.example || '');
      rows.push(
        `| اسم · ism (noun / other) | ${escapeTableCell(word)} | ${escapeTableCell(formatExampleCell(exAr, exEn))} |`
      );
      filledNounFromRoot = true;
    }
  }

  const bySubtype = new Map();
  for (const ism of relatedIsms) {
    const key = ism.subtype || 'noun';
    const list = bySubtype.get(key) ?? [];
    list.push(ism);
    bySubtype.set(key, list);
  }

  for (const slot of ROOT_TYPE_SLOTS) {
    const matches = bySubtype.get(slot.key) ?? [];
    if (matches.length === 0) {
      if (slot.key === 'noun' && filledNounFromRoot) continue;
      rows.push(`| ${slot.label} | N/A | not common / not listed yet |`);
      continue;
    }
    for (const ism of matches) {
      const word = `[${ism.arabic}](#ism/${ism.id})`;
      const example = escapeTableCell(
        formatExampleCell(ism.example, ism.exampleEn)
      );
      rows.push(`| ${slot.label} | ${word} | ${example} |`);
    }
  }

  return `## Word types from this root

| Type | Word | Notes / Example |
|------|------|-----------------|
${rows.join('\n')}
`;
}

for (const root of rootsSource.roots) {
  const rootPath = path.join(rootsDir, `${root.id}.md`);
  if (!fs.existsSync(rootPath)) continue;
  let md = fs.readFileSync(rootPath, 'utf8');
  md = md.replace(/\n---\n\n## Word types from this root[\s\S]*$/m, '');
  md = md.replace(/\n---\n\n## Related-Words[\s\S]*$/m, '');
  md = md.replace(/\n---\n\n## Word family[\s\S]*$/m, '');
  const relatedIsms = ismsByRoot.get(root.id) ?? [];

  const section = `

---

${wordTypesSection(root, relatedIsms)}`;
  fs.writeFileSync(rootPath, md.trimEnd() + section + '\n', 'utf8');
}

// Patch roots manifest with related ids
const rootsManifestPath = path.join(publicDir, 'roots-manifest.json');
if (fs.existsSync(rootsManifestPath)) {
  const rootsManifest = JSON.parse(fs.readFileSync(rootsManifestPath, 'utf8'));
  rootsManifest.roots = rootsManifest.roots.map((r) => ({
    ...r,
    filId: filByRootId.has(r.id) ? r.id : undefined,
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
