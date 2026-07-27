import { marked } from 'marked';

const BASE = import.meta.env.BASE_URL;

type Tab = 'home' | 'course' | 'lyrics' | 'track' | 'agent';

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

const DOCS = {
  track: [
    { id: 'tracker', label: 'Verbs & Roots', file: 'verb-root-tracker.md' },
    { id: 'progress', label: 'Progress', file: 'progress.md' },
    { id: 'course-progress', label: 'Course', file: 'course-progress.md' },
    { id: 'lyrics-index', label: 'Lyrics index', file: 'lyrics/README.md' },
    { id: 'map', label: 'Map', file: 'course/COURSE-MAP.md' },
  ],
} as const;

const COMMANDS = [
  'drill word في',
  'drill root ج-ل-س',
  'drill verb قال',
  'passage',
  'coverage',
  'add lyrics',
];

let activeTab: Tab = 'home';
let activeDoc = '';
let activeLessonFile = '';
let activeSongFile = '';
let courseManifest: CourseManifest | null = null;
let lyricsManifest: LyricsManifest | null = null;

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

function showToast(msg: string) {
  const toast = document.getElementById('toast')!;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
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

function setHash(tab: Tab, songId?: string) {
  if (tab === 'home') {
    history.replaceState(null, '', window.location.pathname + window.location.search);
    return;
  }
  if (tab === 'lyrics' && songId) {
    history.replaceState(null, '', `#lyrics/${songId}`);
    return;
  }
  history.replaceState(null, '', `#${tab}`);
}

async function applyHashRoute(): Promise<boolean> {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return false;

  const [segment, songId] = raw.split('/');

  if (segment === 'lyrics') {
    activeTab = 'lyrics';
    lyricsManifest = null;
    activeSongFile = '';
    if (songId) {
      const manifest = await loadLyricsManifest();
      const song = manifest.songs.find((s) => s.id === songId);
      if (song) activeSongFile = song.file;
    }
    renderNav();
    await renderMain();
    return true;
  }

  const tab = segment as Tab;
  if (['home', 'course', 'track', 'agent'].includes(tab)) {
    activeTab = tab;
    if (tab === 'track') activeDoc = DOCS.track[0].file;
    if (tab === 'course' && !activeLessonFile) {
      activeLessonFile = 'course/00-start/00-welcome.md';
    }
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

function copyCommand(cmd: string) {
  navigator.clipboard.writeText(cmd).then(() => showToast(`Copied: ${cmd}`));
}

function renderNav() {
  const nav = document.getElementById('nav')!;
  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'course', icon: '📚', label: 'Course' },
    { id: 'lyrics', icon: '🎵', label: 'Lyrics' },
    { id: 'track', icon: '📊', label: 'Track' },
    { id: 'agent', icon: '🤖', label: 'Agent' },
  ];
  nav.innerHTML = '';
  tabs.forEach((t) => {
    const btn = el('button', activeTab === t.id ? 'active' : '');
    btn.innerHTML = `<span class="icon">${t.icon}</span>${t.label}`;
    btn.onclick = () => {
      activeTab = t.id;
      if (t.id === 'track') activeDoc = DOCS.track[0].file;
      if (t.id === 'course' && !activeLessonFile) {
        activeLessonFile = 'course/00-start/00-welcome.md';
      }
      if (t.id === 'lyrics') {
        activeSongFile = '';
        lyricsManifest = null;
        setHash('lyrics');
      } else {
        setHash(t.id);
      }
      renderNav();
      renderMain();
    };
    nav.appendChild(btn);
  });
}

async function renderHome(main: HTMLElement) {
  main.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const [tracker, progress, manifest] = await Promise.all([
      fetchText('verb-root-tracker.md'),
      fetchText('progress.md'),
      loadCourseManifest(),
    ]);
    const stats = parseStats(tracker, progress);
    main.innerHTML = '';

    const startBtn = el('button', 'btn', 'Start the course →');
    startBtn.onclick = () => {
      activeTab = 'course';
      activeLessonFile = manifest.startLesson;
      renderNav();
      renderMain();
    };
    main.appendChild(startBtn);

    const grid = el('div', 'stats');
    grid.innerHTML = `
      <div class="stat-card"><div class="num">${stats.roots}</div><div class="label">Roots</div></div>
      <div class="stat-card"><div class="num">${stats.verbs}</div><div class="label">Verbs</div></div>
      <div class="stat-card"><div class="num">${stats.drilled}</div><div class="label">Drilled</div></div>
    `;
    main.appendChild(grid);

    const pathCard = el('div', 'card');
    pathCard.innerHTML = `
      <h3>Course path</h3>
      <p><strong>Start</strong> → <strong>Basics</strong> → <strong>Grammar</strong> → <strong>Conversation</strong></p>
      <p style="margin-top:0.5rem;color:var(--muted);font-size:0.85rem">28 lessons · English grammar terms mapped to Arabic (ism, fi'l, harf, Sarf, Nahw)</p>
    `;
    main.appendChild(pathCard);

    main.appendChild(el('p', 'section-title', 'Quick commands'));
    const chips = el('div', 'chips');
    COMMANDS.forEach((cmd) => {
      const chip = el('button', 'chip', cmd);
      chip.onclick = () => copyCommand(cmd);
      chips.appendChild(chip);
    });
    main.appendChild(chips);
  } catch {
    main.innerHTML = '<p class="loading">Could not load content. Check connection.</p>';
  }
}

async function renderCourse(main: HTMLElement) {
  main.innerHTML = '<p class="loading">Loading course…</p>';
  try {
    const manifest = await loadCourseManifest();
    if (!activeLessonFile) activeLessonFile = manifest.startLesson;

    main.innerHTML = '';

    const layout = el('div', 'course-layout');

    const sidebar = el('div', 'course-sidebar');
    manifest.phases.forEach((phase) => {
      sidebar.appendChild(el('p', 'phase-label', phase.title));
      phase.modules.forEach((mod) => {
        sidebar.appendChild(el('p', 'module-label', mod.title.replace(/^Module \d+ — /, '')));
        mod.lessons.forEach((lesson) => {
          const btn = el(
            'button',
            `lesson-btn${activeLessonFile === lesson.file ? ' active' : ''}`,
            `${lesson.id} ${lesson.title}`
          );
          btn.onclick = () => {
            activeLessonFile = lesson.file;
            renderMain();
          };
          sidebar.appendChild(btn);
        });
      });
    });
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

async function renderDocView(main: HTMLElement, docs: readonly { id: string; label: string; file: string }[]) {
  if (!activeDoc) activeDoc = docs[0].file;

  const tabs = el('div', 'doc-tabs');
  docs.forEach((d) => {
    const tab = el('button', `doc-tab${activeDoc === d.file ? ' active' : ''}`, d.label);
    tab.onclick = () => {
      activeDoc = d.file;
      renderMain();
    };
    tabs.appendChild(tab);
  });
  main.appendChild(tabs);

  const body = el('div', 'md-content');
  body.innerHTML = '<p class="loading">Loading…</p>';
  main.appendChild(body);

  try {
    const text = await fetchText(activeDoc);
    body.innerHTML = await marked.parse(text);
  } catch {
    body.innerHTML = '<p>Failed to load document.</p>';
  }
}

async function renderLyrics(main: HTMLElement) {
  main.innerHTML = '<p class="loading">Loading lyrics…</p>';
  try {
    const manifest = await loadLyricsManifest();
    main.innerHTML = '';

    const intro = el('div', 'card');
    intro.innerHTML = `
      <h3>Lyrics library</h3>
      <p>${manifest.songs.length} song${manifest.songs.length === 1 ? '' : 's'} · share a song in Cursor or type <code>add lyrics</code></p>
    `;
    main.appendChild(intro);

    if (manifest.songs.length === 0) {
      const empty = el('div', 'card');
      empty.innerHTML = `<p>No songs yet. Paste lyrics or a song name in chat — they'll appear here after publish.</p>`;
      main.appendChild(empty);
      return;
    }

    if (!activeSongFile) {
      main.appendChild(el('p', 'section-title', 'Songs'));
      const list = el('div', 'chips');
      list.className = 'song-list';
      manifest.songs.forEach((song) => {
        const card = el('button', 'song-card');
        card.innerHTML = `<strong>${song.title}</strong><span>${song.artist || 'Unknown'} · ${song.dialect || '—'}</span>`;
        card.onclick = () => {
          activeSongFile = song.file;
          setHash('lyrics', song.id);
          renderMain();
        };
        list.appendChild(card);
      });
      main.appendChild(list);
      return;
    }

    const back = el('button', 'btn btn-outline', '← All songs');
    back.onclick = () => {
      activeSongFile = '';
      setHash('lyrics');
      renderMain();
    };
    main.appendChild(back);

    const body = el('div', 'md-content');
    body.style.marginTop = '0.75rem';
    body.innerHTML = '<p class="loading">Loading…</p>';
    main.appendChild(body);

    const text = await fetchText(activeSongFile);
    body.innerHTML = await marked.parse(text);
  } catch {
    main.innerHTML = '<p class="loading">Could not load lyrics library.</p>';
  }
}

function renderAgent(main: HTMLElement) {
  main.innerHTML = `
    <div class="card">
      <h3>Cursor Cloud Agent</h3>
      <p>Run live drills, passages, and get feedback. Follow the course lessons, then practice here.</p>
      <a class="btn" href="https://cursor.com/agents" target="_blank" rel="noopener">Open Cursor Agents</a>
    </div>
    <p class="section-title">Paste a command</p>
    <div class="chips" id="agent-chips"></div>
  `;
  const chips = main.querySelector('#agent-chips')!;
  COMMANDS.forEach((cmd) => {
    const chip = el('button', 'chip', cmd);
    chip.onclick = () => copyCommand(cmd);
    chips.appendChild(chip);
  });
}

async function renderMain() {
  const main = document.getElementById('main')!;
  main.innerHTML = '';

  switch (activeTab) {
    case 'home':
      await renderHome(main);
      break;
    case 'course':
      await renderCourse(main);
      break;
    case 'lyrics':
      await renderLyrics(main);
      break;
    case 'track':
      await renderDocView(main, DOCS.track);
      break;
    case 'agent':
      renderAgent(main);
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
