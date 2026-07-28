import { marked } from 'marked';
import './style.css';

const BASE = import.meta.env.BASE_URL;

type Tab = 'home' | 'course' | 'ism' | 'fil' | 'harf' | 'roots' | 'lyrics';
type WordKind = 'ism' | 'fil' | 'harf';

interface Stats {
  roots: number;
  verbs: number;
  drilled: number;
  passages: number;
}

interface Lesson {
  id: string;
  title: string;
  file: string;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Phase {
  id: string;
  title: string;
  modules: Module[];
}

interface CourseManifest {
  title: string;
  startLesson: string;
  phases: Phase[];
}

interface SongEntry {
  id: string;
  title: string;
  artist: string;
  dialect: string;
  file: string;
  added: string;
}

interface LyricsManifest {
  title: string;
  description: string;
  songs: SongEntry[];
}

interface RootEntry {
  id: string;
  root: string;
  letter: string;
  meaning: string;
  formI: string;
  example?: string;
  file: string;
  filId?: string;
  ismIds?: string[];
}

interface RootLetterMeta {
  letter: string;
  name: string;
}

interface RootsManifest {
  title: string;
  description: string;
  letters: RootLetterMeta[];
  roots: RootEntry[];
}

interface WordEntry {
  id: string;
  arabic: string;
  meaning: string;
  letter: string;
  file: string;
  example?: string;
  rootId?: string | null;
  root?: string | null;
  subtype?: string;
  past?: string;
  present?: string;
  formI?: string;
  usage?: string;
}

interface WordManifest {
  title: string;
  description: string;
  kind: WordKind;
  letters: RootLetterMeta[];
  items: WordEntry[];
}

interface LyricsLine {
  arabic: string;
  english: string;
}

interface ParsedLyricsSong {
  title: string;
  artist?: string;
  dialect?: string;
  lines: LyricsLine[];
  footerMd: string;
}

let activeTab: Tab = 'home';
let activeLessonFile = '';
let activeSongFile = '';
let activeRootFile = '';
let activeWordFile = '';
let activeWordKind: WordKind | null = null;
let activeSearchQ = '';
let courseManifest: CourseManifest | null = null;
let lyricsManifest: LyricsManifest | null = null;
let rootsManifest: RootsManifest | null = null;
const wordManifests: Partial<Record<WordKind, WordManifest>> = {};

const WORD_TAB_META: Record<
  WordKind,
  { title: string; sub: string; empty: string }
> = {
  ism: {
    title: 'Ism',
    sub: 'Nouns (اسم) — including loanwords · A–Z',
    empty: 'No nouns yet.',
  },
  fil: {
    title: 'Fiʿl',
    sub: 'Verbs (فعل) — overlaps with Roots · A–Z',
    empty: 'No verbs yet.',
  },
  harf: {
    title: 'Ḥarf',
    sub: 'Particles (حرف) — small grammar words · A–Z',
    empty: 'No particles yet.',
  },
};

marked.setOptions({ gfm: true, breaks: true });

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  html?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function goToTab(tab: Tab) {
  activeTab = tab;
  activeSearchQ = '';
  if (tab === 'course' && !activeLessonFile) {
    activeLessonFile = 'course/00-start/00-welcome.md';
  }
  if (tab === 'lyrics') {
    activeSongFile = '';
    lyricsManifest = null;
  }
  if (tab === 'roots') {
    activeRootFile = '';
    rootsManifest = null;
  }
  if (tab === 'ism' || tab === 'fil' || tab === 'harf') {
    activeWordFile = '';
    activeWordKind = tab;
    delete wordManifests[tab];
  }
  setHash(tab);
  renderNav();
  renderMain();
}

async function fetchText(file: string): Promise<string> {
  const res = await fetch(`${BASE}content/${file}`);
  if (!res.ok) throw new Error(`Failed to load ${file}`);
  return res.text();
}

async function loadCourseManifest(): Promise<CourseManifest> {
  if (courseManifest) return courseManifest;
  const res = await fetch(`${BASE}course-manifest.json`);
  if (!res.ok) throw new Error('Failed to load course');
  courseManifest = await res.json();
  return courseManifest!;
}

async function loadLyricsManifest(): Promise<LyricsManifest> {
  if (lyricsManifest) return lyricsManifest;
  const res = await fetch(`${BASE}lyrics-manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load lyrics');
  lyricsManifest = await res.json();
  return lyricsManifest!;
}

async function loadRootsManifest(): Promise<RootsManifest> {
  if (rootsManifest) return rootsManifest;
  const res = await fetch(`${BASE}roots-manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load roots');
  rootsManifest = await res.json();
  return rootsManifest!;
}

async function loadWordManifest(kind: WordKind): Promise<WordManifest> {
  if (wordManifests[kind]) return wordManifests[kind]!;
  const res = await fetch(`${BASE}${kind}-manifest.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${kind}`);
  wordManifests[kind] = await res.json();
  return wordManifests[kind]!;
}

function setHash(tab: Tab, idOrOpts?: string | { id?: string; q?: string }) {
  if (tab === 'home') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return;
  }
  const opts = typeof idOrOpts === 'string' ? { id: idOrOpts } : idOrOpts ?? {};
  let hash = `#${tab}`;
  if (opts.id) {
    hash += `/${opts.id}`;
  } else if (opts.q && opts.q.trim()) {
    hash += `?q=${encodeURIComponent(opts.q.trim())}`;
  }
  history.replaceState(null, '', hash);
}

function parseHashParts(): { segment: string; itemId: string; q: string } | null {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return null;
  const qIndex = raw.indexOf('?');
  const path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const query = qIndex >= 0 ? raw.slice(qIndex + 1) : '';
  const [segment, itemId = ''] = path.split('/');
  const q = new URLSearchParams(query).get('q') ?? '';
  return { segment, itemId, q };
}

async function applyHashRoute(): Promise<boolean> {
  const parts = parseHashParts();
  if (!parts) return false;

  const { segment, itemId, q } = parts;
  activeSearchQ = q;

  if (segment === 'lyrics') {
    activeTab = 'lyrics';
    lyricsManifest = null;
    activeSongFile = '';
    if (itemId) {
      const manifest = await loadLyricsManifest();
      const song = manifest.songs.find((s) => s.id === itemId);
      if (song) activeSongFile = song.file;
    }
    renderNav();
    await renderMain();
    return true;
  }

  if (segment === 'roots') {
    activeTab = 'roots';
    rootsManifest = null;
    activeRootFile = '';
    if (itemId) {
      const manifest = await loadRootsManifest();
      const root = manifest.roots.find((r) => r.id === itemId);
      if (root) activeRootFile = root.file;
    }
    renderNav();
    await renderMain();
    return true;
  }

  if (segment === 'ism' || segment === 'fil' || segment === 'harf') {
    activeTab = segment;
    activeWordKind = segment;
    activeWordFile = '';
    delete wordManifests[segment];
    if (itemId) {
      const manifest = await loadWordManifest(segment);
      const item = manifest.items.find((w) => w.id === itemId);
      if (item) activeWordFile = item.file;
    }
    renderNav();
    await renderMain();
    return true;
  }

  if (segment === 'home' || segment === 'course') {
    activeTab = segment;
    if (activeTab === 'course' && !activeLessonFile) {
      activeLessonFile = 'course/00-start/00-welcome.md';
    }
    renderNav();
    await renderMain();
    return true;
  }

  if (segment === 'practice' || segment === 'agent' || segment === 'track') {
    activeTab = 'home';
    renderNav();
    await renderMain();
    return true;
  }

  return false;
}

function parseStats(trackerMd: string, progressMd: string): Stats {
  const roots = trackerMd.match(/\*\*Roots covered\*\*\s*\|\s*(\d+)/)?.[1];
  const verbs = trackerMd.match(/\*\*Verbs encountered\*\*\s*\|\s*(\d+)/)?.[1];
  const drilled = trackerMd.match(/\*\*Verbs drilled\*\*[^|]*\|\s*(\d+)/)?.[1];
  const passages = progressMd.match(/\*\*Total passages completed:\*\*\s*(\d+)/)?.[1];
  return {
    roots: Number(roots ?? 0),
    verbs: Number(verbs ?? 0),
    drilled: Number(drilled ?? 0),
    passages: Number(passages ?? 0),
  };
}

function parseLyricsMarkdown(md: string): ParsedLyricsSong {
  const title = (md.match(/^#\s+(.+)$/m)?.[1] ?? 'Song').trim();
  const artist = md.match(/\*\*Artist\*\*\s*\|\s*(.+)/)?.[1]?.trim();
  const dialect = md.match(/\*\*Dialect[^|]*\*\*\s*\|\s*(.+)/)?.[1]?.trim();

  const footerStart = md.search(/^## (Vocab|Lines to practice)/m);
  const footerMd = footerStart >= 0 ? md.slice(footerStart) : '';

  const lines: LyricsLine[] = [];
  const section = md.match(/## Arabic\s*[·\-]\s*English\s*\n+([\s\S]*?)(?=\n## |\n---\s*\n## |$)/i);
  if (section) {
    const rows = section[1].split('\n').filter((line) => line.trim().startsWith('|'));
    rows.slice(2).forEach((row) => {
      const cells = row
        .split('|')
        .map((cell) => cell.trim().replace(/\*\*/g, ''))
        .filter((_, index, all) => index > 0 && index < all.length - 1);
      if (cells.length < 2) return;
      const arabic = cells[0];
      const english = cells[1];
      if (!arabic && !english) return;
      lines.push({ arabic, english });
    });
  }

  return { title, artist, dialect, lines, footerMd };
}

function setLyricsSongMode(enabled: boolean) {
  document.getElementById('app')?.classList.toggle('lyrics-song-mode', enabled);
}

function renderNav() {
  const nav = document.getElementById('nav')!;
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'course', icon: '📚', label: 'Course' },
    { id: 'roots', icon: '🌱', label: 'Roots' },
    { id: 'ism', icon: 'اسم', label: 'Ism' },
    { id: 'fil', icon: 'فعل', label: 'Fiʿl' },
    { id: 'harf', icon: 'حرف', label: 'Ḥarf' },
    { id: 'lyrics', icon: '🎵', label: 'Lyrics' },
  ];
  nav.innerHTML = '';
  tabs.forEach((t) => {
    const btn = el('button', activeTab === t.id ? 'active' : '');
    btn.innerHTML = `<span class="icon">${t.icon}</span>${t.label}`;
    btn.onclick = () => goToTab(t.id);
    nav.appendChild(btn);
  });
}

async function renderHome(main: HTMLElement) {
  main.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const [, , manifest, lyrics, rootsLib, ismLib, filLib, harfLib] = await Promise.all([
      fetchText('verb-root-tracker.md'),
      fetchText('progress.md'),
      loadCourseManifest(),
      loadLyricsManifest(),
      loadRootsManifest(),
      loadWordManifest('ism'),
      loadWordManifest('fil'),
      loadWordManifest('harf'),
    ]);
    main.innerHTML = '';

    const shell = el('div', 'shell home-shell');
    main.appendChild(shell);

    const path = el('div', 'card path-card');
    path.innerHTML = `
      <span class="mini-label">Absolute beginner path</span>
      <h3>Learn Arabic from zero — in order</h3>
      <p class="intro-lead">If you know English but no Arabic, follow these four steps. Do not skip ahead.</p>
      <ol class="beginner-steps">
        <li>
          <strong>Start</strong>
          <span>How Arabic differs from English (roots, RTL, word types)</span>
        </li>
        <li>
          <strong>Basics</strong>
          <span>Read letters → then classify words: noun (ism), verb (fiʿl), particle (ḥarf)</span>
        </li>
        <li>
          <strong>Grammar</strong>
          <span>Build words from roots (Sarf) → build sentences (Nahw)</span>
        </li>
        <li>
          <strong>Conversation</strong>
          <span>Everyday phrases — greetings, family, daily talk</span>
        </li>
      </ol>
    `;
    const startBtn = el('button', 'btn', 'Start from Lesson 0.1 →');
    startBtn.onclick = () => {
      activeLessonFile = manifest.startLesson;
      goToTab('course');
    };
    path.appendChild(startBtn);
    shell.appendChild(path);

    const intro = el('div', 'card intro-card');
    intro.innerHTML = `
      <span class="mini-label">English → Arabic map</span>
      <h3>Parts of speech (learn early)</h3>
      <p class="intro-lead">English has many labels. Arabic puts almost every word into <strong>three</strong> buckets:</p>
      <div class="speech-map">
        <div class="speech-row">
          <span class="speech-en">Noun / pronoun / adjective</span>
          <span class="speech-ar" lang="ar" dir="rtl">اسم <small>ism</small></span>
        </div>
        <div class="speech-row">
          <span class="speech-en">Verb</span>
          <span class="speech-ar" lang="ar" dir="rtl">فعل <small>fiʿl</small></span>
        </div>
        <div class="speech-row">
          <span class="speech-en">Preposition / “small” grammar words</span>
          <span class="speech-ar" lang="ar" dir="rtl">حرف <small>ḥarf</small></span>
        </div>
      </div>
      <p class="intro-note"><strong>Root tip:</strong> many words share a 3-letter <strong>root</strong> (جذر). Example: ك-ت-ب → write / book / writer. You learn that after Basics.</p>
    `;
    shell.appendChild(intro);

    const grid = el('div', 'stats stats-main stats-4');
    grid.innerHTML = `
      <div class="stat-card"><div class="num">${rootsLib.roots.length}</div><div class="label">Roots</div></div>
      <div class="stat-card"><div class="num">${ismLib.items.length}</div><div class="label">Ism</div></div>
      <div class="stat-card"><div class="num">${filLib.items.length}</div><div class="label">Fiʿl</div></div>
      <div class="stat-card"><div class="num">${harfLib.items.length}</div><div class="label">Ḥarf</div></div>
    `;
    shell.appendChild(grid);
    shell.appendChild(
      el(
        'p',
        'tracker-hint',
        'Hierarchy: Roots → Ism · Fiʿl · Ḥarf. Roots groups families; the next three sort by word type. Lyrics optional after Basics.'
      )
    );

    const shortcuts = el('div', 'home-shortcuts home-shortcuts-4');
    const makeShortcut = (label: string, title: string, sub: string, tab: Tab) => {
      const btn = el('button', 'card home-shortcut');
      btn.innerHTML = `
        <span class="mini-label">${label}</span>
        <strong>${title}</strong>
        <span class="home-shortcut-sub">${sub}</span>
      `;
      btn.onclick = () => {
        if (tab === 'course') {
          activeLessonFile = activeLessonFile || manifest.startLesson;
        }
        goToTab(tab);
      };
      return btn;
    };
    shortcuts.appendChild(makeShortcut('1st', 'Course', 'Learn in order', 'course'));
    shortcuts.appendChild(
      makeShortcut('جذر', 'Roots', `${rootsLib.roots.length} families`, 'roots')
    );
    shortcuts.appendChild(
      makeShortcut('اسم', 'Ism', `${ismLib.items.length} nouns + loans`, 'ism')
    );
    shortcuts.appendChild(
      makeShortcut('فعل', 'Fiʿl', `${filLib.items.length} verbs`, 'fil')
    );
    shortcuts.appendChild(
      makeShortcut('حرف', 'Ḥarf', `${harfLib.items.length} particles`, 'harf')
    );
    shortcuts.appendChild(
      makeShortcut('Later', 'Lyrics', `${lyrics.songs.length} songs`, 'lyrics')
    );
    shell.appendChild(shortcuts);
  } catch {
    main.innerHTML = '<p class="loading">Could not load content. Check connection.</p>';
  }
}

async function renderCourse(main: HTMLElement) {
  main.innerHTML = '<p class="loading">Loading course…</p>';
  try {
    const manifest = await loadCourseManifest();
    if (!activeLessonFile) activeLessonFile = manifest.startLesson;

    const phaseHint: Record<string, string> = {
      start: 'Do first — orientation for English speakers',
      basics: 'Next — reading + parts of speech',
      grammar: 'After Basics — roots & sentences',
      najdi: 'Last — everyday conversation',
    };

    main.innerHTML = '';

    const layout = el('div', 'course-layout');

    const sidebar = el('div', 'course-sidebar');
    sidebar.appendChild(el('h2', 'page-title contents-title', 'Contents'));
    const guide = el('p', 'contents-guide', 'Follow top → bottom. Start at 0.1 if you are new.');
    sidebar.appendChild(guide);

    const index = el('div', 'course-index');
    manifest.phases.forEach((phase, phaseIndex) => {
      const phaseBlock = el('div', 'phase-block');
      const hint = phaseHint[phase.id] || '';
      phaseBlock.innerHTML = `
        <p class="phase-label">Step ${phaseIndex + 1} · ${phase.title}</p>
        ${hint ? `<p class="phase-hint">${hint}</p>` : ''}
      `;
      phase.modules.forEach((mod) => {
        phaseBlock.appendChild(
          el('p', 'module-label', mod.title.replace(/^Module \d+\s*[—-]\s*/, ''))
        );
        mod.lessons.forEach((lesson) => {
          const isFirst = lesson.file === manifest.startLesson;
          const btn = el(
            'button',
            `lesson-btn${activeLessonFile === lesson.file ? ' active' : ''}${isFirst ? ' lesson-start' : ''}`,
            `${lesson.id} · ${lesson.title}${isFirst ? '  · start here' : ''}`
          );
          btn.onclick = () => {
            activeLessonFile = lesson.file;
            renderMain();
          };
          phaseBlock.appendChild(btn);
        });
      });
      index.appendChild(phaseBlock);
    });
    sidebar.appendChild(index);
    layout.appendChild(sidebar);

    const content = el('div', 'course-content');
    const body = el('div', 'md-content');
    body.innerHTML = '<p class="loading">Loading lesson…</p>';
    content.appendChild(body);
    layout.appendChild(content);
    main.appendChild(layout);

    const text = await fetchText(activeLessonFile);
    body.innerHTML = await marked.parse(text);
  } catch {
    main.innerHTML = '<p class="loading">Could not load course.</p>';
  }
}

function wordMatchesQuery(word: WordEntry, q: string): boolean {
  if (!q) return true;
  const hay = [
    word.arabic,
    word.meaning,
    word.example ?? '',
    word.root ?? '',
    word.rootId ?? '',
    word.subtype ?? '',
    word.formI ?? '',
    word.usage ?? '',
    word.id,
  ]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function buildWordIndex(
  manifest: WordManifest,
  query: string,
  expanded: Set<string>,
  onOpen: (word: WordEntry) => void
): HTMLElement {
  const q = query.trim().toLowerCase();
  const filtered = manifest.items.filter((w) => wordMatchesQuery(w, q));
  const letterMeta = new Map(manifest.letters.map((L) => [L.letter, L.name]));
  const order = manifest.letters.map((L) => L.letter);
  const byLetter = new Map<string, WordEntry[]>();
  for (const word of filtered) {
    const letter = word.letter || '?';
    const list = byLetter.get(letter) ?? [];
    list.push(word);
    byLetter.set(letter, list);
  }

  const wrap = el('div', 'roots-index');
  if (filtered.length === 0) {
    wrap.innerHTML = '<p class="roots-empty">No words match your search.</p>';
    return wrap;
  }

  const lettersPresent = order.filter((L) => byLetter.has(L));
  const openAllSearch = q.length > 0;

  for (const letter of lettersPresent) {
    const words = byLetter.get(letter)!;
    const name = letterMeta.get(letter) ?? letter;
    const details = document.createElement('details');
    details.className = 'roots-letter';
    details.open = openAllSearch || expanded.has(letter);
    details.dataset.letter = letter;

    const summary = document.createElement('summary');
    summary.className = 'roots-letter-summary';
    summary.innerHTML = `
      <span class="roots-letter-glyph" lang="ar">${letter}</span>
      <span class="roots-letter-name">${name}</span>
      <span class="roots-letter-count">${words.length}</span>
    `;
    details.appendChild(summary);
    details.addEventListener('toggle', () => {
      if (details.open) expanded.add(letter);
      else expanded.delete(letter);
    });

    const list = el('nav', 'library-list roots-letter-list');
    for (const word of words) {
      const link = el('button', 'library-link root-link');
      const metaBits = [
        word.meaning,
        word.subtype && word.subtype !== 'noun' ? word.subtype : '',
        word.formI || word.present || '',
        word.usage || '',
      ].filter(Boolean);
      link.innerHTML = `
        <span class="library-link-title" lang="ar" dir="rtl">${word.arabic}</span>
        <span class="library-link-meta">${metaBits.join(' · ')}</span>
      `;
      link.onclick = () => onOpen(word);
      list.appendChild(link);
    }
    details.appendChild(list);
    wrap.appendChild(details);
  }
  return wrap;
}

function appendCrossLinks(
  host: HTMLElement,
  word: WordEntry,
  kind: WordKind
) {
  if (kind === 'harf' || !word.rootId) return;
  const row = el('div', 'cross-links');

  const rootBtn = el(
    'button',
    'btn btn-outline cross-link-btn',
    `Root ${word.root ?? word.rootId}`
  );
  rootBtn.onclick = () => {
    activeRootFile = `roots/${word.rootId}.md`;
    activeTab = 'roots';
    setHash('roots', word.rootId!);
    renderNav();
    renderMain();
  };
  row.appendChild(rootBtn);

  if (kind === 'ism') {
    const filBtn = el('button', 'btn btn-outline cross-link-btn', 'Fiʿl (verb)');
    filBtn.onclick = () => {
      activeWordKind = 'fil';
      activeWordFile = `vocab/fil/${word.rootId}.md`;
      activeTab = 'fil';
      setHash('fil', word.rootId!);
      renderNav();
      renderMain();
    };
    row.appendChild(filBtn);
  }

  host.appendChild(row);
}

async function renderWordLibrary(main: HTMLElement, kind: WordKind) {
  if (activeWordFile && activeWordKind === kind) {
    await renderWordDetail(main, kind);
    return;
  }

  const meta = WORD_TAB_META[kind];
  main.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const manifest = await loadWordManifest(kind);
    main.innerHTML = '';
    main.className = 'main roots-library-page';

    const header = el('div', 'library-header');
    header.innerHTML = `
      <h2 class="page-title">${meta.title}</h2>
      <p class="page-sub">${manifest.items.length} · ${meta.sub}</p>
      <p class="page-note">${manifest.description}</p>
    `;
    main.appendChild(header);

    if (manifest.items.length === 0) {
      const empty = el('div', 'card');
      empty.innerHTML = `<p>${meta.empty}</p>`;
      main.appendChild(empty);
      return;
    }

    const tools = el('div', 'roots-tools');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'roots-search';
    search.placeholder =
      kind === 'harf'
        ? 'Search particle, meaning…'
        : kind === 'fil'
          ? 'Search verb, meaning, root…'
          : 'Search noun, loanword, meaning…';
    search.setAttribute('aria-label', `Search ${kind}`);
    search.value = activeSearchQ;
    tools.appendChild(search);

    const actions = el('div', 'roots-actions');
    const expandAll = el('button', 'btn btn-outline roots-action-btn', 'Expand all');
    const collapseAll = el('button', 'btn btn-outline roots-action-btn', 'Collapse all');
    actions.appendChild(expandAll);
    actions.appendChild(collapseAll);
    tools.appendChild(actions);
    main.appendChild(tools);

    const indexHost = el('div', 'roots-index-host');
    main.appendChild(indexHost);
    const expanded = new Set<string>([manifest.letters[0]?.letter].filter(Boolean) as string[]);

    const paint = () => {
      indexHost.innerHTML = '';
      indexHost.appendChild(
        buildWordIndex(manifest, search.value, expanded, (word) => {
          activeWordKind = kind;
          activeWordFile = word.file;
          activeSearchQ = '';
          setHash(kind, word.id);
          renderMain();
        })
      );
    };
    expandAll.onclick = () => {
      manifest.letters.forEach((L) => expanded.add(L.letter));
      paint();
    };
    collapseAll.onclick = () => {
      expanded.clear();
      paint();
    };
    search.addEventListener('input', () => {
      activeSearchQ = search.value;
      setHash(kind, { q: search.value });
      paint();
    });
    paint();
  } catch {
    main.innerHTML = `<p class="loading">Could not load ${kind} library.</p>`;
  }
}

async function renderWordDetail(main: HTMLElement, kind: WordKind) {
  main.innerHTML = '<p class="loading">Loading…</p>';
  main.className = 'main root-detail-page';
  try {
    const manifest = await loadWordManifest(kind);
    const word = manifest.items.find((w) => w.file === activeWordFile);
    const text = await fetchText(activeWordFile);
    main.innerHTML = '';

    const back = el('button', 'btn btn-outline', `← All ${WORD_TAB_META[kind].title}`);
    back.onclick = () => {
      activeWordFile = '';
      setHash(kind);
      renderMain();
    };
    main.appendChild(back);

    if (word) appendCrossLinks(main, word, kind);

    const body = el('div', 'md-content root-content');
    body.style.marginTop = '0.75rem';
    body.innerHTML = await marked.parse(text);
    main.appendChild(body);
  } catch {
    main.innerHTML = '<p class="loading">Could not load word.</p>';
  }
}

function rootMatchesQuery(root: RootEntry, q: string): boolean {
  if (!q) return true;
  const hay = [root.root, root.meaning, root.formI, root.example ?? '', root.letter, root.id]
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function buildRootsIndex(
  manifest: RootsManifest,
  query: string,
  expanded: Set<string>
): HTMLElement {
  const q = query.trim().toLowerCase();
  const filtered = manifest.roots.filter((r) => rootMatchesQuery(r, q));
  const letterMeta = new Map(manifest.letters.map((L) => [L.letter, L.name]));
  const order = manifest.letters.map((L) => L.letter);

  const byLetter = new Map<string, RootEntry[]>();
  for (const root of filtered) {
    const letter = root.letter || '?';
    const list = byLetter.get(letter) ?? [];
    list.push(root);
    byLetter.set(letter, list);
  }

  const wrap = el('div', 'roots-index');
  if (filtered.length === 0) {
    wrap.innerHTML = '<p class="roots-empty">No roots match your search.</p>';
    return wrap;
  }

  const lettersPresent = order.filter((L) => byLetter.has(L));
  // When searching, auto-expand matching letter groups
  const openAllSearch = q.length > 0;

  for (const letter of lettersPresent) {
    const roots = byLetter.get(letter)!;
    const name = letterMeta.get(letter) ?? letter;
    const open = openAllSearch || expanded.has(letter);

    const details = document.createElement('details');
    details.className = 'roots-letter';
    details.open = open;
    details.dataset.letter = letter;

    const summary = document.createElement('summary');
    summary.className = 'roots-letter-summary';
    summary.innerHTML = `
      <span class="roots-letter-glyph" lang="ar">${letter}</span>
      <span class="roots-letter-name">${name}</span>
      <span class="roots-letter-count">${roots.length}</span>
    `;
    details.appendChild(summary);

    details.addEventListener('toggle', () => {
      if (details.open) expanded.add(letter);
      else expanded.delete(letter);
    });

    const list = el('nav', 'library-list roots-letter-list');
    for (const root of roots) {
      const link = el('button', 'library-link root-link');
      link.innerHTML = `
        <span class="library-link-title" lang="ar" dir="rtl">${root.root}</span>
        <span class="library-link-meta">${root.meaning} · ${root.formI}</span>
      `;
      link.onclick = () => {
        activeRootFile = root.file;
        activeSearchQ = '';
        setHash('roots', root.id);
        renderMain();
      };
      list.appendChild(link);
    }
    details.appendChild(list);
    wrap.appendChild(details);
  }

  return wrap;
}

async function renderRoots(main: HTMLElement) {
  if (activeRootFile) {
    await renderRootDetail(main);
    return;
  }

  main.innerHTML = '<p class="loading">Loading roots…</p>';
  try {
    const manifest = await loadRootsManifest();
    main.innerHTML = '';
    main.className = 'main roots-library-page';

    const header = el('div', 'library-header');
    header.innerHTML = `
      <h2 class="page-title">Roots</h2>
      <p class="page-sub">${manifest.roots.length} common everyday roots · A–Z by first letter</p>
      <p class="page-note">${manifest.description}</p>
    `;
    main.appendChild(header);

    if (manifest.roots.length === 0) {
      const empty = el('div', 'card');
      empty.innerHTML = '<p>No roots yet.</p>';
      main.appendChild(empty);
      return;
    }

    const tools = el('div', 'roots-tools');
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'roots-search';
    search.placeholder = 'Search root, meaning, verb…';
    search.setAttribute('aria-label', 'Search roots');
    search.value = activeSearchQ;
    tools.appendChild(search);

    const actions = el('div', 'roots-actions');
    const expandAll = el('button', 'btn btn-outline roots-action-btn', 'Expand all');
    const collapseAll = el('button', 'btn btn-outline roots-action-btn', 'Collapse all');
    actions.appendChild(expandAll);
    actions.appendChild(collapseAll);
    tools.appendChild(actions);
    main.appendChild(tools);

    const indexHost = el('div', 'roots-index-host');
    main.appendChild(indexHost);

    const expanded = new Set<string>([manifest.letters[0]?.letter].filter(Boolean) as string[]);

    const paint = () => {
      indexHost.innerHTML = '';
      indexHost.appendChild(buildRootsIndex(manifest, search.value, expanded));
    };

    expandAll.onclick = () => {
      manifest.letters.forEach((L) => expanded.add(L.letter));
      paint();
    };
    collapseAll.onclick = () => {
      expanded.clear();
      paint();
    };
    search.addEventListener('input', () => {
      activeSearchQ = search.value;
      setHash('roots', { q: search.value });
      paint();
    });
    paint();
  } catch {
    main.innerHTML = '<p class="loading">Could not load roots library.</p>';
  }
}

async function renderRootDetail(main: HTMLElement) {
  main.innerHTML = '<p class="loading">Loading root…</p>';
  main.className = 'main root-detail-page';
  try {
    const manifest = await loadRootsManifest();
    const root = manifest.roots.find((r) => r.file === activeRootFile);
    const text = await fetchText(activeRootFile);
    main.innerHTML = '';

    const back = el('button', 'btn btn-outline', '← All roots');
    back.onclick = () => {
      activeRootFile = '';
      setHash('roots');
      renderMain();
    };
    main.appendChild(back);

    if (root) {
      const row = el('div', 'cross-links');
      const filBtn = el('button', 'btn btn-outline cross-link-btn', 'Fiʿl (verb)');
      filBtn.onclick = () => {
        activeWordKind = 'fil';
        activeWordFile = `vocab/fil/${root.id}.md`;
        activeTab = 'fil';
        setHash('fil', root.id);
        renderNav();
        renderMain();
      };
      row.appendChild(filBtn);

      if ((root.ismIds ?? []).length) {
        const ismLib = await loadWordManifest('ism');
        for (const ismId of root.ismIds!) {
          const ism = ismLib.items.find((i) => i.id === ismId);
          const label = ism ? `Ism · ${ism.arabic}` : `Ism · ${ismId}`;
          const btn = el('button', 'btn btn-outline cross-link-btn', label);
          btn.onclick = () => {
            activeWordKind = 'ism';
            activeWordFile = `vocab/ism/${ismId}.md`;
            activeTab = 'ism';
            setHash('ism', ismId);
            renderNav();
            renderMain();
          };
          row.appendChild(btn);
        }
      }
      main.appendChild(row);
    }

    const body = el('div', 'md-content root-content');
    body.style.marginTop = '0.75rem';
    body.innerHTML = await marked.parse(text);
    main.appendChild(body);
  } catch {
    main.innerHTML = '<p class="loading">Could not load root.</p>';
  }
}

async function renderLyrics(main: HTMLElement) {
  if (activeSongFile) {
    setLyricsSongMode(true);
    await renderLyricsSong(main);
    return;
  }

  setLyricsSongMode(false);
  main.innerHTML = '<p class="loading">Loading library…</p>';
  try {
    const manifest = await loadLyricsManifest();
    main.innerHTML = '';
    main.className = 'main lyrics-library-page';

    const header = el('div', 'library-header');
    header.innerHTML = `
      <h2 class="page-title">Library</h2>
      <p class="page-sub">${manifest.songs.length} song${manifest.songs.length === 1 ? '' : 's'}</p>
    `;
    main.appendChild(header);

    if (manifest.songs.length === 0) {
      const empty = el('div', 'card');
      empty.innerHTML = '<p>No songs yet. Songs you add will appear here.</p>';
      main.appendChild(empty);
      return;
    }

    const list = el('nav', 'library-list');
    manifest.songs.forEach((song) => {
      const link = el('button', 'library-link');
      link.innerHTML = `
        <span class="library-link-title">${song.title}</span>
        <span class="library-link-meta">${song.artist || 'Unknown'} · ${song.dialect || '—'}</span>
      `;
      link.onclick = () => {
        activeSongFile = song.file;
        setHash('lyrics', song.id);
        renderMain();
      };
      list.appendChild(link);
    });
    main.appendChild(list);
  } catch {
    main.innerHTML = '<p class="loading">Could not load lyrics library.</p>';
  }
}

async function renderLyricsSong(main: HTMLElement) {
  main.innerHTML = '<p class="loading lyrics-loading">Loading lyrics…</p>';
  main.className = 'main lyrics-song-page';
  try {
    const text = await fetchText(activeSongFile);
    const parsed = parseLyricsMarkdown(text);

    main.innerHTML = '';

    const shell = el('div', 'lyrics-song');
    shell.innerHTML = `
      <button type="button" class="lyrics-back">← Library</button>
      <p class="lyrics-song-title">${parsed.title}</p>
      ${parsed.artist ? `<p class="lyrics-song-meta">${parsed.artist}${parsed.dialect ? ` · ${parsed.dialect}` : ''}</p>` : ''}
      <h1 class="lyrics-headline">Arabic · English</h1>
    `;

    shell.querySelector('.lyrics-back')!.addEventListener('click', () => {
      activeSongFile = '';
      setHash('lyrics');
      renderMain();
    });

    const linesWrap = el('div', 'lyrics-lines');
    if (parsed.lines.length === 0) {
      linesWrap.innerHTML = '<p class="lyrics-empty">No line pairs yet. Add an <code>Arabic · English</code> table to this song file.</p>';
    } else {
      parsed.lines.forEach((line) => {
        const row = el('div', 'lyrics-line');
        row.innerHTML = `
          <p class="lyrics-ar" dir="rtl" lang="ar">${line.arabic}</p>
          <p class="lyrics-en" lang="en">${line.english}</p>
        `;
        linesWrap.appendChild(row);
      });
    }
    shell.appendChild(linesWrap);

    if (parsed.footerMd.trim()) {
      const footer = el('div', 'lyrics-footer md-content');
      footer.innerHTML = await marked.parse(parsed.footerMd);
      shell.appendChild(footer);
    }

    main.appendChild(shell);
  } catch {
    setLyricsSongMode(false);
    main.innerHTML = '<p class="loading">Could not load lyrics.</p>';
  }
}

async function renderMain() {
  const main = document.getElementById('main')!;
  main.innerHTML = '';
  if (activeTab !== 'lyrics' || !activeSongFile) {
    setLyricsSongMode(false);
    main.className = 'main';
  }

  switch (activeTab) {
    case 'home':
      await renderHome(main);
      break;
    case 'course':
      await renderCourse(main);
      break;
    case 'ism':
      await renderWordLibrary(main, 'ism');
      break;
    case 'fil':
      await renderWordLibrary(main, 'fil');
      break;
    case 'harf':
      await renderWordLibrary(main, 'harf');
      break;
    case 'roots':
      await renderRoots(main);
      break;
    case 'lyrics':
      await renderLyrics(main);
      break;
  }
}

renderNav();
applyHashRoute().then((handled) => {
  if (!handled) renderMain();
});
window.addEventListener('hashchange', () => {
  applyHashRoute();
});
