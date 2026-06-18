import { marked } from 'marked';

const BASE = import.meta.env.BASE_URL;

type Tab = 'home' | 'track' | 'learn' | 'agent';

interface Stats {
  roots: number;
  verbs: number;
  drilled: number;
  passages: number;
}

const DOCS = {
  track: [
    { id: 'tracker', label: 'Verbs & Roots', file: 'verb-root-tracker.md' },
    { id: 'progress', label: 'Progress', file: 'progress.md' },
  ],
  learn: [
    { id: 'week1', label: 'Week 1', file: 'week1-session.md' },
    { id: 'framework', label: 'Framework', file: 'Arabic-Learning-Framework.md' },
    { id: 'instructions', label: 'Commands', file: 'Arabic_Instruction.txt' },
  ],
} as const;

const COMMANDS = [
  'drill word في',
  'drill root ج-ل-س',
  'drill verb قال',
  'passage',
  'coverage',
];

let activeTab: Tab = 'home';
let activeDoc = '';

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
    { id: 'track', icon: '📊', label: 'Track' },
    { id: 'learn', icon: '📖', label: 'Learn' },
    { id: 'agent', icon: '🤖', label: 'Agent' },
  ];
  nav.innerHTML = '';
  tabs.forEach((t) => {
    const btn = el('button', activeTab === t.id ? 'active' : '');
    btn.innerHTML = `<span class="icon">${t.icon}</span>${t.label}`;
    btn.onclick = () => {
      activeTab = t.id;
      if (t.id === 'track') activeDoc = DOCS.track[0].file;
      if (t.id === 'learn') activeDoc = DOCS.learn[0].file;
      renderNav();
      renderMain();
    };
    nav.appendChild(btn);
  });
}

async function renderHome(main: HTMLElement) {
  main.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const [tracker, progress] = await Promise.all([
      fetchText('verb-root-tracker.md'),
      fetchText('progress.md'),
    ]);
    const stats = parseStats(tracker, progress);
    main.innerHTML = '';

    const grid = el('div', 'stats');
    grid.innerHTML = `
      <div class="stat-card"><div class="num">${stats.roots}</div><div class="label">Roots</div></div>
      <div class="stat-card"><div class="num">${stats.verbs}</div><div class="label">Verbs</div></div>
      <div class="stat-card"><div class="num">${stats.drilled}</div><div class="label">Drilled</div></div>
    `;
    main.appendChild(grid);

    const passCard = el('div', 'card');
    passCard.innerHTML = `<h3>Passages completed</h3><p>${stats.passages} / 10 until next summary</p>`;
    main.appendChild(passCard);

    main.appendChild(el('p', 'section-title', 'Quick commands'));
    const chips = el('div', 'chips');
    COMMANDS.forEach((cmd) => {
      const chip = el('button', 'chip', cmd);
      chip.onclick = () => copyCommand(cmd);
      chips.appendChild(chip);
    });
    main.appendChild(chips);
    main.appendChild(el('p', 'section-title', 'Today'));
    const today = el('div', 'card');
    today.innerHTML = `
      <h3>Week 2 · Tuesday</h3>
      <p>Run <code>drill verb راح</code> or <code>drill verb قال</code> in Cursor Agent.</p>
      <button class="btn btn-outline" id="copy-drill">Copy: drill verb قال</button>
    `;
    main.appendChild(today);
    document.getElementById('copy-drill')!.onclick = () => copyCommand('drill verb قال');
  } catch {
    main.innerHTML = '<p class="loading">Could not load content. Check connection.</p>';
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

function renderAgent(main: HTMLElement) {
  main.innerHTML = `
    <div class="card">
      <h3>Cursor Cloud Agent</h3>
      <p>Run live drills, passages, and get feedback from the AI tutor on your phone.</p>
      <a class="btn" href="https://cursor.com/agents" target="_blank" rel="noopener">Open Cursor Agents</a>
    </div>
    <p class="section-title">Install Cursor as PWA</p>
    <div class="card">
      <ul class="agent-steps">
        <li>Open <strong>cursor.com/agents</strong> in Safari (iOS) or Chrome (Android)</li>
        <li>Connect your GitHub repo: <strong>najdi-arabic</strong></li>
        <li>iOS: Share → Add to Home Screen</li>
        <li>Android: Menu → Install app</li>
      </ul>
    </div>
    <p class="section-title">Install this app</p>
    <div class="card">
      <p>Add <strong>Najdi Arabic Tutor</strong> to your home screen from the browser menu for offline tracker &amp; lessons.</p>
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
    case 'track':
      await renderDocView(main, DOCS.track);
      break;
    case 'learn':
      await renderDocView(main, DOCS.learn);
      break;
    case 'agent':
      renderAgent(main);
      break;
  }
}

renderNav();
renderMain();
