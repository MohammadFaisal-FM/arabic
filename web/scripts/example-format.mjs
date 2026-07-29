/** Bilingual example formatting — Arabic and English on separate lines (RTL/LTR safe). */

export function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeTableCell(text) {
  return String(text || '').replace(/\|/g, '\\|');
}

/** Split a stored line like "Arabic — English" into parts. */
export function splitBilingualLine(line) {
  const t = (line || '').trim();
  if (!t) return { ar: '', en: '' };
  const idx = t.indexOf(' — ');
  if (idx >= 0) {
    return { ar: t.slice(0, idx).trim(), en: t.slice(idx + 3).trim() };
  }
  return { ar: t, en: '' };
}

/** One table cell: Arabic line, then English line (for mixed-type columns). */
export function formatExampleCell(arabicExample, englishExample) {
  const ar = (arabicExample || '').trim();
  const en = (englishExample || '').trim();
  if (!ar && !en) return '—';
  if (ar && en) {
    return `<span class="example-ar" dir="rtl" lang="ar">${escapeHtml(ar)}</span><br><span class="example-en" dir="ltr" lang="en">${escapeHtml(en)}</span>`;
  }
  if (ar) return `<span class="example-ar" dir="rtl" lang="ar">${escapeHtml(ar)}</span>`;
  return `<span class="example-en" dir="ltr" lang="en">${escapeHtml(en)}</span>`;
}

/** Two-column example table (Arabic | English). */
export function examplePairsTableSection(entries) {
  const rows =
    entries.length > 0
      ? entries
          .map((ex) => {
            const ar = escapeTableCell(
              `<span class="example-ar" dir="rtl" lang="ar">${escapeHtml(ex.ar)}</span>`
            );
            const en = escapeTableCell(
              ex.en
                ? `<span class="example-en" dir="ltr" lang="en">${escapeHtml(ex.en)}</span>`
                : '—'
            );
            return `| ${ar} | ${en} |`;
          })
          .join('\n')
      : '| — | — |';

  return `## Example

| Arabic | English |
|--------|---------|
${rows}
`;
}
