import { marked } from 'marked';
import './style.css';

const BASE = import.meta.env.BASE_URL;

type Tab = 'home' | 'course' | 'lyrics';

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

function goToTab(tab: Tab) {
  activeTab = tab;
  if (tab === 'course' && !activeLessonFile) {
    activeLessonFile = 'course/00-start/00-welcome.md';
  }
  if (tab === 'lyrics') {
    activeSongFile = '';
    lyricsManifest = null;
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

  const segment = raw.split('/')[0];
  const songId = raw.split('/')[1];

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

  if (segment === 'home' || segment === 'course') {
    activeTab = segment;
    if (activeTab === 'course' && !activeLessonFile) {
      activeLessonFile = 'course/00-start/00-welcome.md';
    }
    renderNav();
    await renderMain();
    return true;
  }

  // Old public routes (#practice / #agent / #track) go home — no personal tooling in the public app.
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
    const [tracker, progress, manifest, lyrics] = await Promise.all([
      fetchText('verb-root-tracker.md'),
      fetchText('progress.md'),
      loadCourseManifest(),
      loadLyricsManifest(),
    ]);
    const stats = parseStats(tracker, progress);
    main.innerHTML = '';

    const shell = el('div', 'shell home-shell');
    main.appendChild(shell);

    const intro = el('div', 'card intro-card');
    intro.innerHTML = `
      <span class="mini-label">For English speakers</span>
      <h3>How Arabic connects to English</h3>
      <p class="intro-lead">English uses many word types. Arabic groups almost every word into <strong>three</strong> kinds — learn these first and the language becomes readable.</p>
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
          <span class="speech-en">Preposition / conjunction / particle</span>
          <span class="speech-ar" lang="ar" dir="rtl">حرف <small>ḥarf</small></span>
        </div>
      </div>
      <p class="intro-note">Then you learn <strong>roots</strong> (جذر) — the 3-letter core of a word family — and build sentences with <strong>Sarf</strong> (word forms) + <strong>Nahw</strong> (sentence grammar).</p>
    `;
    shell.appendChild(intro);

    const continueCard = el('div', 'card hero-card');
    continueCard.innerHTML = `
      <span class="mini-label">Continue</span>
      <h3>Pick up your lesson</h3>
      <p style="margin-top:0.4rem;">Follow the path: Start → Basics → Grammar → Conversation.</p>
    `;
    const startBtn = el('button', 'btn', 'Continue course →');
    startBtn.onclick = () => {
      activeLessonFile = activeLessonFile || manifest.startLesson;
      goToTab('course');
    };
    continueCard.appendChild(startBtn);
    shell.appendChild(continueCard);

    const grid = el('div', 'stats stats-main');
    grid.innerHTML = `
      <div class="stat-card"><div class="num">${stats.roots}</div><div class="label">Roots</div></div>
      <div class="stat-card"><div class="num">${stats.verbs}</div><div class="label">Verbs</div></div>
      <div class="stat-card"><div class="num">${lyrics.songs.length}</div><div class="label">Songs</div></div>
    `;
    shell.appendChild(grid);
    shell.appendChild(el('p', 'tracker-hint', 'Main trackers: Roots (word families) · Verbs (actions) · Songs (listening practice)'));

    const shortcuts = el('div', 'home-shortcuts');
    const lyricsBtn = el('button', 'card home-shortcut');
    lyricsBtn.innerHTML = `
      <span class="mini-label">Lyrics</span>
      <strong>Open library</strong>
      <span class="home-shortcut-sub">Arabic · English songs</span>
    `;
    lyricsBtn.onclick = () => goToTab('lyrics');

    const courseBtn = el('button', 'card home-shortcut');
    courseBtn.innerHTML = `
      <span class="mini-label">Course</span>
      <strong>Browse lessons</strong>
      <span class="home-shortcut-sub">Organized by phase</span>
    `;
    courseBtn.onclick = () => goToTab('course');

    shortcuts.appendChild(lyricsBtn);
    shortcuts.appendChild(courseBtn);
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

    main.innerHTML = '';

    const layout = el('div', 'course-layout');

    const sidebar = el('div', 'course-sidebar');
    sidebar.appendChild(el('h2', 'page-title contents-title', 'Contents'));
    manifest.phases.forEach((phase, phaseIndex) => {
      const phaseBlock = el('div', 'phase-block');
      phaseBlock.innerHTML = `<p class="phase-label">Phase ${phaseIndex + 1} · ${phase.title}</p>`;
      phase.modules.forEach((mod) => {
        phaseBlock.appendChild(
          el('p', 'module-label', mod.title.replace(/^Module \d+\s*[—-]\s*/, ''))
        );
        mod.lessons.forEach((lesson) => {
          const btn = el(
            'button',
            `lesson-btn${activeLessonFile === lesson.file ? ' active' : ''}`,
            `${lesson.id} · ${lesson.title}`
          );
          btn.onclick = () => {
            activeLessonFile = lesson.file;
            renderMain();
          };
          phaseBlock.appendChild(btn);
        });
      });
      sidebar.appendChild(phaseBlock);
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
