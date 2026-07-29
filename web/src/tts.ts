/**
 * Free in-browser Arabic TTS via Speech Synthesis.
 *
 * True Saudi sound needs a Saudi system voice (free to install), e.g. Windows
 * “Microsoft Naayf — Arabic (Saudi Arabia)”. Without that, browsers often fall
 * back to Egyptian/MSA voices (Hoda, Google ar) that sound Fuṣḥā.
 */

const VOICE_PREF_KEY = 'arabic-tts-voice-uri';
const HINT_KEY = 'arabic-tts-saudi-hint-seen';

let cachedVoices: SpeechSynthesisVoice[] | null = null;
let voicesReady: Promise<SpeechSynthesisVoice[]> | null = null;

function ensureVoices(): Promise<SpeechSynthesisVoice[]> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve([]);
      return;
    }
    const finish = () => {
      cachedVoices = speechSynthesis.getVoices();
      resolve(cachedVoices);
    };
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      finish();
      return;
    }
    speechSynthesis.addEventListener('voiceschanged', finish, { once: true });
    setTimeout(finish, 900);
  });
  return voicesReady;
}

function voiceMeta(v: SpeechSynthesisVoice) {
  const lang = (v.lang || '').toLowerCase();
  const name = (v.name || '').toLowerCase();
  const isSaudi =
    lang.startsWith('ar-sa') ||
    name.includes('saudi') ||
    name.includes('naayf') ||
    name.includes('نـايف') ||
    name.includes('نايف');
  const isGulf =
    isSaudi ||
    lang.startsWith('ar-ae') ||
    lang.startsWith('ar-kw') ||
    lang.startsWith('ar-qa') ||
    lang.startsWith('ar-bh') ||
    lang.startsWith('ar-om') ||
    name.includes('gulf') ||
    name.includes('emirati');
  const isEgyptian =
    lang.startsWith('ar-eg') || name.includes('hoda') || name.includes('egypt');
  const isNatural =
    name.includes('natural') || name.includes('online') || name.includes('neural');
  return { lang, name, isSaudi, isGulf, isEgyptian, isNatural };
}

/** Lower = better for our Saudi/Najdi learning goal. */
function voiceRank(v: SpeechSynthesisVoice): number {
  const m = voiceMeta(v);
  if (!m.lang.startsWith('ar') && !m.name.includes('arab')) return 999;
  if (m.isSaudi && m.isNatural) return 0;
  if (m.isSaudi) return 1;
  if (m.isGulf && m.isNatural) return 2;
  if (m.isGulf) return 3;
  if (m.isEgyptian) return 80; // Fuṣḥā/Egyptian default — last resort
  if (m.lang.startsWith('ar')) return 40;
  return 999;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export async function listArabicVoices(): Promise<SpeechSynthesisVoice[]> {
  const voices = await ensureVoices();
  return voices.filter((v) => voiceRank(v) < 900).sort((a, b) => voiceRank(a) - voiceRank(b));
}

function voiceUri(v: SpeechSynthesisVoice): string {
  return `${v.voiceURI}||${v.name}||${v.lang}`;
}

export async function pickArabicVoice(): Promise<SpeechSynthesisVoice | null> {
  const arabic = await listArabicVoices();
  if (arabic.length === 0) return null;

  try {
    const pref = localStorage.getItem(VOICE_PREF_KEY);
    if (pref) {
      const found = arabic.find((v) => voiceUri(v) === pref);
      if (found) return found;
    }
  } catch {
    /* ignore */
  }

  return arabic[0] ?? null;
}

export async function hasSaudiVoice(): Promise<boolean> {
  const arabic = await listArabicVoices();
  return arabic.some((v) => voiceMeta(v).isSaudi);
}

function showToast(msg: string) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.remove('hidden');
  window.setTimeout(() => toast.classList.add('hidden'), 5200);
}

async function maybeHintMissingSaudi(voice: SpeechSynthesisVoice | null) {
  try {
    if (localStorage.getItem(HINT_KEY) === '1') return;
  } catch {
    return;
  }
  const saudi = voice && voiceMeta(voice).isSaudi;
  if (saudi) return;
  try {
    localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* ignore */
  }
  showToast(
    'No Saudi voice found — install free “Arabic (Saudi Arabia)” speech (Naayf) in Windows Settings, then refresh. Edge works best.'
  );
}

let currentBtn: HTMLButtonElement | null = null;

function setPlaying(btn: HTMLButtonElement | null, playing: boolean) {
  if (currentBtn && currentBtn !== btn) {
    currentBtn.classList.remove('is-playing');
    currentBtn.setAttribute('aria-pressed', 'false');
    currentBtn.title = 'Play Arabic (Saudi voice if installed)';
  }
  currentBtn = playing ? btn : null;
  if (btn) {
    btn.classList.toggle('is-playing', playing);
    btn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    btn.title = playing ? 'Stop' : 'Play Arabic (Saudi voice if installed)';
  }
}

export function stopArabicSpeech() {
  if (typeof speechSynthesis === 'undefined') return;
  speechSynthesis.cancel();
  setPlaying(currentBtn, false);
}

/**
 * Light spoken-Najdi nudges for TTS (still free). Does not create a true accent,
 * but avoids some Fuṣḥā-leaning forms when the voice is generic.
 */
function najdiSpeakHints(text: string): string {
  let t = text;
  // Common MSA → everyday Gulf/Najdi orthography hints for TTS
  t = t.replace(/\bإلى\b/g, 'إلى');
  t = t.replace(/\bهذا\b/g, 'هذا');
  t = t.replace(/\bهذه\b/g, 'هذي');
  t = t.replace(/\bالذي\b/g, 'اللي');
  t = t.replace(/\bالتي\b/g, 'اللي');
  t = t.replace(/\bليس\b/g, 'مو');
  t = t.replace(/\bماذا\b/g, 'وش');
  t = t.replace(/\bأين\b/g, 'وين');
  t = t.replace(/\bلماذا\b/g, 'ليش');
  t = t.replace(/\bالآن\b/g, 'الحين');
  t = t.replace(/\bأيضاً\b/g, 'كمان');
  t = t.replace(/\bأيضا\b/g, 'كمان');
  t = t.replace(/\bفقط\b/g, 'بس');
  t = t.replace(/\bأريد\b/g, 'أبي');
  t = t.replace(/\bأذهب\b/g, 'أروح');
  t = t.replace(/\bذهب\b/g, 'راح');
  t = t.replace(/\bشاهد\b/g, 'شاف');
  t = t.replace(/\bانظر\b/g, 'شوف');
  return t.replace(/\s+/g, ' ').trim();
}

export async function speakArabic(text: string, btn?: HTMLButtonElement | null): Promise<void> {
  if (!ttsSupported()) return;
  const clean = najdiSpeakHints(text);
  if (!clean) return;

  if (btn?.classList.contains('is-playing')) {
    stopArabicSpeech();
    return;
  }

  stopArabicSpeech();
  const voice = await pickArabicVoice();
  await maybeHintMissingSaudi(voice);

  const u = new SpeechSynthesisUtterance(clean);
  // Always request Saudi locale — helps when OS has ar-SA pack
  u.lang = 'ar-SA';
  if (voice) {
    u.voice = voice;
    if (voice.lang) u.lang = voice.lang.startsWith('ar') ? voice.lang : 'ar-SA';
  }
  u.rate = 0.9;
  u.pitch = 1;
  u.onend = () => setPlaying(btn ?? null, false);
  u.onerror = () => setPlaying(btn ?? null, false);
  if (btn) setPlaying(btn, true);
  speechSynthesis.speak(u);
}

function voiceLabel(v: SpeechSynthesisVoice): string {
  const m = voiceMeta(v);
  const tag = m.isSaudi ? 'Saudi' : m.isGulf ? 'Gulf' : m.isEgyptian ? 'Egyptian' : 'Arabic';
  return `${v.name} · ${tag}`;
}

/** Optional voice picker (lists Arabic voices; prefer Saudi/Naayf). */
export async function mountTtsVoicePicker(host: HTMLElement) {
  if (!ttsSupported()) return;
  if (host.querySelector('.tts-voice-bar')) return;

  const voices = await listArabicVoices();
  const bar = document.createElement('div');
  bar.className = 'tts-voice-bar';

  const saudi = voices.some((v) => voiceMeta(v).isSaudi);
  const label = document.createElement('label');
  label.className = 'tts-voice-label';
  label.innerHTML = saudi
    ? 'Voice <span class="tts-voice-ok">Saudi available</span>'
    : 'Voice <span class="tts-voice-warn">install Saudi (Naayf) for dialect</span>';

  const select = document.createElement('select');
  select.className = 'tts-voice-select';
  select.setAttribute('aria-label', 'Arabic TTS voice');

  if (voices.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No Arabic voices on this device';
    select.appendChild(opt);
    select.disabled = true;
  } else {
    for (const v of voices) {
      const opt = document.createElement('option');
      opt.value = voiceUri(v);
      opt.textContent = voiceLabel(v);
      select.appendChild(opt);
    }
    const current = await pickArabicVoice();
    if (current) select.value = voiceUri(current);
    select.addEventListener('change', () => {
      try {
        localStorage.setItem(VOICE_PREF_KEY, select.value);
      } catch {
        /* ignore */
      }
      showToast('Voice saved — tap ▶ to hear it');
    });
  }

  bar.appendChild(label);
  bar.appendChild(select);
  host.prepend(bar);
}

/** Add ▶ buttons next to Arabic example spans / lyric lines. */
export function wireArabicAudio(container: HTMLElement) {
  if (!ttsSupported()) return;

  const targets = container.querySelectorAll<HTMLElement>(
    '.example-ar, .lyrics-ar, td .example-ar'
  );

  targets.forEach((node) => {
    if (node.dataset.audioWired === '1') return;
    const text = (node.textContent || '').trim();
    if (!text || text === '—') return;
    node.dataset.audioWired = '1';

    const wrap = document.createElement('span');
    wrap.className = 'example-ar-wrap';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tts-btn';
    btn.setAttribute('aria-label', 'Play Arabic audio');
    btn.setAttribute('aria-pressed', 'false');
    btn.title = 'Play Arabic (uses Saudi voice if installed on your device)';
    btn.textContent = '▶';

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void speakArabic(text, btn);
    });

    const parent = node.parentNode;
    if (!parent) return;
    parent.insertBefore(wrap, node);
    wrap.appendChild(btn);
    wrap.appendChild(node);
  });
}
